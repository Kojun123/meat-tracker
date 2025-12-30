package com.example.mealTracker.service;

import com.example.mealTracker.domain.FoodMaster;
import com.example.mealTracker.domain.MealItem;
import com.example.mealTracker.domain.MealSession;
import com.example.mealTracker.domain.TodaySummary;
import com.example.mealTracker.dto.*;
import com.example.mealTracker.mapper.FoodMasterMapper;
import com.example.mealTracker.mapper.MealItemMapper;
import com.example.mealTracker.mapper.MealSessionMapper;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MealService {

    private static final double GOAL_CAL = 2500;
    private static final double GOAL_PRO = 150;

    private final OpenAiService openAiService;
    private final MealItemMapper mealItemMapper;
    private final MealSessionMapper mealSessionMapper;
    private final FoodMasterMapper foodMasterMapper;
    private final FoodEstimator estimator;

    Logger logger = LoggerFactory.getLogger(this.getClass());


    public Long getSessionId() {
        return mealSessionMapper.findActiveSessionId();
    }

    public MealSession findSessionInfo(Long sessionId) {
        return mealSessionMapper.findSessionInfo(sessionId);
    }

    public List<MealItem> findItemsBySessionId(Long sessionId) {
        return mealItemMapper.findItemsBySessionId(sessionId);
    }


    public MealMessageResponse handle(MealMessageRequest req, Long sessionId) {

        String msg = req.message() == null ? "" : req.message().trim();
        if (msg.isBlank()) {
            return buildResponse("빈 입력값입니다.", sessionId);
        }

        JsonNode action = openAiService.parseMealAction(msg);
        String intent = action.path("intent").asText("UNKNOWN");
        JsonNode itemsNode = action.path("items");

        if ("MANUAL_RESET".equals(intent)) {
            String assistantText = "수동 초기화 요청 처리";
            return buildResponse(assistantText, sessionId);
        }

        if ("END_SUMMARY".equals(intent)) {
            String assistantText = "오늘 요약 종료";
            return buildResponse(assistantText, sessionId);
        }

        if ("LOG_FOOD".equals(intent)) {

            if (!itemsNode.isArray() || itemsNode.isEmpty()) {
                return buildResponse("기록할 음식이 없음", sessionId);
            }


            List<String> text1 = new ArrayList<>();
            int i1 = 0;

            for (JsonNode it : itemsNode) {

                String rawName = it.path("name").asText();
                int count = it.path("count").asInt(1);
                if (count < 1) count = 1;

                String normalized = normalizeName(rawName);


                FoodMaster fm = foodMasterMapper.findByName(normalized);
                if (fm != null) {
                    InsertItem(normalized, count, fm.getKcal()*count, fm.getProtein()*count, sessionId);
                    text1.add(rawName + " x" + count + " 단백질 : " + fm.getProtein() + " 칼로리 : " + fm.getKcal());
                    continue;
                }

                TodaySummary summary = calcSummary(sessionId);
                List<MealItem> items = findItemsBySessionId(sessionId);

                List<FoodMaster> suggestions =
                        findSimilarByNameJava(normalized,3);

                    return MealMessageResponse.needConfirm(
                            String.join("\n", text1) + "\n [" + rawName + "]는 등록된 음식이 아님",
                            rawName,
                            count,
                            suggestions,
                            summary,
                            items
                    );
            }

            double addPro = 0;
            double addCal = 0;
            String [] text2 = new String[itemsNode.size()];
            int i2 = 0;
            for (JsonNode it : itemsNode) {

                String rawName = it.path("name").asText();
                int count = it.path("count").asInt(1);
                if (count < 1) count = 1;

                String normalized = normalizeName(rawName);

                double calories = 0;
                double protein = 0;

                FoodMaster fm = foodMasterMapper.findByName(normalized);


                if (fm != null) {
                    protein = fm.getProtein() * count;
                    calories = fm.getKcal() == null ? 0 : fm.getKcal() * count;
                } else {
                    EstimateResult est = estimator.estimate(normalized, count);
                    protein = est.protein();
                    calories = est.calories();
                }

                InsertItem(normalized, count, calories, protein, sessionId);

                addCal += calories;
                addPro += protein;
                text2[i2++] = rawName + " x" + count + " 단백질 : " + protein + " 칼로리 : " + calories + " \n";
            }

            String assistantText = Arrays.toString(text2) + "\n 총 단백질 : " + addPro + " 총 칼로리 : " + addCal ;


            return buildResponse(assistantText, sessionId);
        }
        return buildResponse("", sessionId);
    }


    public String normalizeName(String raw) {
        if (raw == null) return "";

        String s = raw.trim();

        // 1. 공백 정리
        s = s.replaceAll("\\s+", " ");

        // 2. 수량/불필요 단어 제거
        s = s.replaceAll("(한개|한 개|1개|두개|2개|세개|3개)", "");
        s = s.replaceAll("(먹음|먹었어|마심|마셨어)", "");

        // 3. 괄호 제거
        s = s.replaceAll("\\(.*?\\)", "");

        s = s.trim();

        // 4. 별칭 교정
        return aliasMap(s);
    }

    private String aliasMap(String s) {
        if (s.equalsIgnoreCase("셀릭스")) return "셀렉스";
        if (s.equalsIgnoreCase("셀릭스 프로틴")) return "셀렉스";
        if (s.equalsIgnoreCase("닭가슴")) return "닭가슴살";
        if (s.equalsIgnoreCase("계란")) return "계란"; // 그대로

        return s;
    }

    // 먹은 것 기록.
    private void InsertItem(String name, int addCount, double addCal, double addPro, long sessionId) {
       MealItem item = new MealItem(name, addCount, addCal, addPro, sessionId);
       mealItemMapper.insertItem(item);
    }

    public MealMessageResponse buildResponse(String assistantText, long sessionId) {
        TodaySummary summary = calcSummary(sessionId);
        return MealMessageResponse.normal(
                assistantText + "\n" + remainText(summary),
                summary,
                List.copyOf(mealItemMapper.findItemsBySessionId(sessionId))
        );
    }

    // 오늘의 칼로리 계산
    public TodaySummary calcSummary(long sessionId) {
        double totalCal = 0;
        double totalPro = 0;

        for (MealItem it : mealItemMapper.findItemsBySessionId(sessionId)) {
            totalCal += it.getCalories();
            totalPro += it.getProtein();
        }

        return new TodaySummary(totalCal, totalPro, GOAL_CAL, GOAL_PRO);
    }

    //남은 단백질/칼로리 제공
    private String remainText(TodaySummary s) {
        double remainPro = Math.max(0, s.getGoalProtein() - s.getTotalProtein());
        double remainCal = Math.max(0, s.getGoalCalories() - s.getTotalCalories());

        return "\n" +
                "남은 단백질 " + Math.round(remainPro) + "/" + Math.round(s.getGoalProtein())
                + "\n" +
                "남은 칼로리 " + Math.round(remainCal) + "/" + Math.round(s.getGoalCalories());
    }

    public TodayResponse getToday(Long sessionId) {

        if (sessionId == null) {
            return TodayResponse.empty();
        }

        TodaySummary summary = calcSummary(sessionId);
        MealSession session = findSessionInfo(sessionId);
        List<MealItem> items = findItemsBySessionId(sessionId);

        return TodayResponse.of(session, summary, items);
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
        String q = normalizeName(normalized);
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





}

