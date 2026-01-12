package com.example.mealTracker.service;

import com.example.mealTracker.domain.FoodMaster;
import com.example.mealTracker.domain.MealItem;
import com.example.mealTracker.domain.TodaySummary;
import com.example.mealTracker.dto.ManualRequest;
import com.example.mealTracker.dto.MealMessageRequest;
import com.example.mealTracker.dto.MealMessageResponse;
import com.example.mealTracker.dto.TodayResponse;
import com.example.mealTracker.mapper.FoodMasterMapper;
import com.example.mealTracker.mapper.MealItemMapper;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MealService {

    private final OpenAiService openAiService;
    private final MealItemMapper mealItemMapper;
    private final FoodMasterMapper foodMasterMapper;

    public List<MealItem> findItemsBySessionId(String userId) {
        LocalDate now = LocalDate.now(ZoneId.of("Asia/Seoul"));
        return mealItemMapper.findItemsByUser(userId, now);
    }


    public MealMessageResponse handle(MealMessageRequest vo, String userId) {

        String msg = vo.message() == null ? "" : vo.message().trim();
        if (msg.isBlank()) {
            return buildResponse("빈 입력값입니다.", userId);
        }

        JsonNode action = openAiService.parseMealAction(msg);
        String intent = action.path("intent").asText("UNKNOWN");
        JsonNode itemsNode = action.path("items");

        if ("MANUAL_RESET".equals(intent)) {
            String assistantText = "수동 초기화 요청 처리";
            return buildResponse(assistantText, userId);
        }

        if ("END_SUMMARY".equals(intent)) {
            String assistantText = "오늘 요약 종료";
            return buildResponse(assistantText, userId);
        }

        if ("LOG_FOOD".equals(intent)) {

            if (!itemsNode.isArray() || itemsNode.isEmpty()) {
                return buildResponse("기록할 음식이 없음", userId);
            }

            List<String> lines = new ArrayList<>();
            double addPro = 0;
            double addCal = 0;

            for (JsonNode it : itemsNode) {
                String rawName = it.path("name").asText();
                int count = it.path("count").asInt(1);
                if (count < 1) count = 1;

                FoodMaster fm = foodMasterMapper.findByName(rawName);
                if (fm == null) {
                    TodaySummary summary = calcSummary(userId);
                    List<MealItem> items = findItemsBySessionId(userId);
                    List<FoodMaster> suggestions = findSimilarByNameJava(rawName, 3);

                    return MealMessageResponse.needConfirm(
                            String.join("\n", lines) + "\n[" + rawName + "]는 등록된 음식이 아님",
                            rawName,
                            count,
                            suggestions,
                            summary,
                            items
                    );
                }

                double protein = fm.getProtein() * count;
                double calories = (fm.getKcal() == null ? 0 : fm.getKcal() * count);

                InsertItem(rawName, count, calories, protein, userId);

                addPro += protein;
                addCal += calories;

                lines.add(rawName + " x" + count + " 단백질 : " + protein + " 칼로리 : " + calories);
            }

            String assistantText =
                    String.join("\n", lines)
                            + "\n총 단백질 : " + addPro
                            + " 총 칼로리 : " + addCal;

            return buildResponse(assistantText, userId);
        }

        return buildResponse("", userId);
    }

    // 먹은 것 기록.
    private void InsertItem(String name, int addCount, double addCal, double addPro, String userId) {
       MealItem item = new MealItem(name, addCount, addCal, addPro, userId, LocalDate.now(ZoneId.of("Asia/Seoul")));
       mealItemMapper.insertItem(item);
    }

    public MealMessageResponse buildResponse(String assistantText, String userId) {
        TodaySummary summary = calcSummary(userId);
        LocalDate now = LocalDate.now(ZoneId.of("Asia/Seoul"));

        return MealMessageResponse.normal(
                assistantText + "\n" + remainText(summary),
                summary,
                List.copyOf(mealItemMapper.findItemsByUser(userId, now))
        );
    }

    // 오늘의 칼로리 계산
    public TodaySummary calcSummary(String userId) {
        double totalCal = 0;
        double totalPro = 0;
        int targetCal=0, targetPro=0;
        LocalDate now = LocalDate.now(ZoneId.of("Asia/Seoul"));

        for (MealItem it : mealItemMapper.findItemsByUser(userId, now)) {
            totalCal += it.getCalories();
            totalPro += it.getProtein();
        }

        return new TodaySummary(totalCal, totalPro, targetCal, targetPro);
    }

    //남은 단백질/칼로리 제공
    private String remainText(TodaySummary s) {
        double remainPro = Math.max(0, s.getTargetProtein() - s.getTotalProtein());
        double remainCal = Math.max(0, s.getTargetCalories() - s.getTotalCalories());

        return "\n" +
                "남은 단백질 " + Math.round(remainPro) + "/" + Math.round(s.getTargetProtein())
                + "\n" +
                "남은 칼로리 " + Math.round(remainCal) + "/" + Math.round(s.getTargetCalories());
    }

    public TodayResponse getToday(String userId) {

        if (userId == null) {
            return TodayResponse.empty();
        }

        TodaySummary summary = calcSummary(userId);
        List<MealItem> items = findItemsBySessionId(userId);

        return TodayResponse.of(summary, items);
    }

    private volatile List<String> foodNameCache = List.of();
    private volatile long foodNameCacheLoadedAt = 0L;
    private static final long FOOD_CACHE_TTL_MS = 5 * 60 * 1000; // 5분


    private List<String> getFoodNamesCached() {
        long now = System.currentTimeMillis();

        // 5분 이하면 돌려보내기
        if (!foodNameCache.isEmpty() && (now - foodNameCacheLoadedAt) < FOOD_CACHE_TTL_MS) {
            return foodNameCache;
        }

        // 동시성 대충 막기
        synchronized (this) {
            now = System.currentTimeMillis();
            if (!foodNameCache.isEmpty() && (now - foodNameCacheLoadedAt) < FOOD_CACHE_TTL_MS) {
                return foodNameCache;
            }

            List<String> names = foodMasterMapper.findAllNames().stream()
                    .map(n -> n.getName())
                    .filter(s -> s != null && !s.isBlank())
                    .toList();

            foodNameCache = names;
            foodNameCacheLoadedAt = now;
            return foodNameCache;
        }
    }

    private int levenshtein(String a, String b) {
        if (a == null) a = "";
        if (b == null) b = "";

        int n = a.length();
        int m = b.length();

        if (n == 0) return m;
        if (m == 0) return n;

        int[] prev = new int[m + 1];
        int[] curr = new int[m + 1];

        for (int j = 0; j <= m; j++) prev[j] = j;

        for (int i = 1; i <= n; i++) {
            curr[0] = i;
            char ca = a.charAt(i - 1);
            for (int j = 1; j <= m; j++) {
                int cost = (ca == b.charAt(j - 1)) ? 0 : 1;
                curr[j] = Math.min(
                        Math.min(curr[j - 1] + 1, prev[j] + 1),
                        prev[j - 1] + cost
                );
            }
            int[] tmp = prev; prev = curr; curr = tmp;
        }
        return prev[m];
    }

    private List<FoodMaster> findSimilarByNameJava(String normalized, int limit) {
        String q = normalized;
        if (q.isBlank()) return List.of();

        List<String> names = getFoodNamesCached();
        if (names.isEmpty()) return List.of();

        // 부분 포함 후보
        List<String> containHits = new java.util.ArrayList<>();
        for (String n : names) {
            if (n.contains(q) || q.contains(n)) {
                containHits.add(n);
            }
        }

        // 레벤슈타인으로 전체 후보 점수 계산
        record Scored(String name, int dist, int lenDiff, boolean contains) {}
        List<Scored> scored = new java.util.ArrayList<>(names.size());

        for (String n : names) {
            int dist = levenshtein(n, q);
            int lenDiff = Math.abs(n.length() - q.length());
            boolean contains = (n.contains(q) || q.contains(n));
            scored.add(new Scored(n, dist, lenDiff, contains));
        }

        scored.sort((x, y) -> {
            // contains 우선
            int c1 = Boolean.compare(y.contains, x.contains);
            if (c1 != 0) return c1;
            // 거리 낮은 순
            int c2 = Integer.compare(x.dist, y.dist);
            if (c2 != 0) return c2;
            // 길이 차이 낮은 순
            return Integer.compare(x.lenDiff, y.lenDiff);
        });

        // 너무 먼 후보는 컷
        int maxDist = Math.max(2, q.length() / 2);
        List<String> topNames = new java.util.ArrayList<>();

        for (Scored s : scored) {
            if (topNames.size() >= limit) break;
            if (s.dist > maxDist) continue;
            topNames.add(s.name);
        }

        if (topNames.isEmpty()) {
            // contains 후보라도 있으면 억지로
            for (String n : containHits) {
                topNames.add(n);
                if (topNames.size() >= limit) break;
            }
        }

        if (topNames.isEmpty()) return List.of();

        return foodMasterMapper.findByNames(topNames);
    }

    public MealMessageResponse manualInsert(ManualRequest vo) {
        double protein = vo.getProtein() * vo.getCount();
        double calories =  vo.getKcal() * vo.getCount();
        String rawName = vo.getRawName();
        String userId = vo.getUserId();
        int count = vo.getCount();

        InsertItem(rawName, count, calories, protein, userId);

        String assistantText =
                rawName + " x" + count + " 단백질 : " + protein + " 칼로리 : " + calories
                    + "\n총 단백질 : " + protein
                    + " 총 칼로리 : " + calories;

            return buildResponse(assistantText, userId);
    }





}

