package com.example.mealTracker.service;

import com.example.mealTracker.domain.*;
import com.example.mealTracker.dto.*;
import com.example.mealTracker.mapper.MealItemMapper;
import com.example.mealTracker.mapper.MealLogMapper;
import com.example.mealTracker.mapper.UserMapper;
import com.fasterxml.jackson.databind.JsonNode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MealService {

    private final OpenAiService openAiService;
    private final MealItemMapper mealItemMapper;
    private final MealLogMapper mealLogMapper;
    private final UserMapper userMapper;

    public List<MealItem> findItemsBySessionId(String userId, LocalDate date) {
        return mealItemMapper.findItemsByUser(userId, date);
    }


    @Transactional
    public MealMessageResponse handle(MealMessageRequest vo, String userId) {
        String msg = vo.message() == null ? "" : vo.message().trim();

        if (msg.isBlank()) {
            return buildResponse("빈 입력값입니다.", userId);
        }
        //유저 요청 로그저장
        insertLog(new MealLogRequest(userId, msg, Role.USER));

        JsonNode action = openAiService.parseMealAction(msg);
        JsonNode itemsNode = action.path("items");

        if (!itemsNode.isArray() || itemsNode.isEmpty()) {
            return buildResponse("기록할 음식이 없음", userId);
        }

        List<String> lines = new ArrayList<>();
        double addPro = 0;
        double addCal = 0;

        for (JsonNode it : itemsNode) {
            String rawName = it.path("name").asText(); // 사용자가 입력한 음식이름
            int count = it.path("count").asInt(1); // 음식수량
            if (count < 1) count = 1;
            int calories = it.path("calories").asInt(0) * count;
            int protein = it.path("protein").asInt(0) * count;

            //음식이 db에 저장되어 있지 않은 경우 사용자에게 선택지 리턴
//            FoodMaster fm = foodMasterMapper.findByName(rawName);
//            if (fm == null) {
//            TodaySummary summary = calcSummary(userId);
//            List<MealItem> items = findItemsBySessionId(userId, LocalDate.now(ZoneId.of("Asia/Seoul")));
//                List<FoodMaster> suggestions = findSimilarByNameJava(rawName, 3);
//
//
//                return MealMessageResponse.needConfirm(
//                        String.join("\n", lines) + "\n[" + rawName + "]는 등록된 음식이 아님",
//                        rawName,
//                        count,
//                        suggestions,
//                        summary,
//                        items
//                );
//            }

            //사용자가 입력한 값이 모호할때 선택지 리턴, note : (true : 모호, false : 모호하지않음)
//            if (it.path("note").asBoolean()) {
//                return MealMessageResponse.needConfirm(
//                        assumption, summary, items
//                );
//            }

            insertItem(rawName, count, calories, protein, userId);

            addPro += protein;
            addCal += calories;

            lines.add(rawName + " x" + count + " 단백질 : " + protein + " 칼로리 : " + calories);
        }

        String assistantText =
                String.join("\n", action.path("assistantText").asText() )
                        + "\n총 단백질 : " + addPro
                        + " 총 칼로리 : " + addCal;

        //gpt응답 로그 저장
        insertLog(new MealLogRequest(userId, assistantText, Role.GPT));
        return buildResponse(assistantText, userId);
    }

    // 먹은 것 기록.
    private void insertItem(String name, int addCount, double addCal, double addPro, String userId) {
       MealItem item = new MealItem(name, addCount, addCal, addPro, userId, LocalDate.now(ZoneId.of("Asia/Seoul")));
       mealItemMapper.insertItem(item);
    }

    public void insertLog(MealLogRequest vo) {
        MealLog log = new MealLog(vo.getEmail(), vo.getLog(), vo.getRole());
        mealLogMapper.insertMealLog(log);
    }

    public MealMessageResponse buildResponse(String assistantText, String userId) {
        TodaySummary summary = calcSummary(userId);
        LocalDate now = LocalDate.now(ZoneId.of("Asia/Seoul"));

        return MealMessageResponse.normal(
                assistantText + "\n" + remainText(summary),
                summary,
                List.copyOf(mealItemMapper.findItemsByUser(userId, now)),
                List.copyOf(mealLogMapper.getChatLogs(userId, now))
        );
    }

    // 오늘의 칼로리 계산
    public TodaySummary calcSummary(String userId) {
        double totalCal = 0;
        double totalPro = 0;
        LocalDate now = LocalDate.now(ZoneId.of("Asia/Seoul"));

        for (MealItem it : mealItemMapper.findItemsByUser(userId, now)) {
            totalCal += it.getCalories();
            totalPro += it.getProtein();
        }

        MealTrackerUser user = userMapper.findByEmail(userId);
        return new TodaySummary(totalCal, totalPro, user.getTargetCalories(), user.getTargetProtein());
    }

    //남은 단백질/칼로리 제공
    private String remainText(TodaySummary s) {
        double remainPro = Math.max(0, s.getTargetProtein() - s.getTotalProtein());
        double remainCal = Math.max(0, s.getTargetCalories() - s.getTotalCalories());

        return "\n" +
                "남은 단백질 " + Math.round(remainPro) + "g"
                + "\n" +
                "남은 칼로리 " + Math.round(remainCal) + "kcal"
                ;
    }

    public TodayResponse getToday(String userId, LocalDate date) {
        if (userId == null) {
            return TodayResponse.empty();
        }

        TodaySummary summary = calcSummary(userId);
        List<MealItem> items = findItemsBySessionId(userId, date);
        List<MealLogResponse> chatLog = mealLogMapper.getChatLogs(userId, date);

        return TodayResponse.of(summary, items, chatLog);
    }

    public MealMessageResponse manualInsert(ManualRequest vo) {
        double protein = vo.getProtein() * vo.getCount();
        double calories =  vo.getKcal() * vo.getCount();
        String rawName = vo.getRawName();
        String userId = vo.getUserId();
        int count = vo.getCount();

        insertItem(rawName, count, calories, protein, userId);

        String assistantText =
                rawName + " x" + count + " 단백질 : " + protein + " 칼로리 : " + calories
                    + "\n총 단백질 : " + protein
                    + " 총 칼로리 : " + calories;

            return buildResponse(assistantText, userId);
    }







}

