package com.example.mealTracker.dto;

import com.example.mealTracker.domain.MealItem;
import com.example.mealTracker.domain.TodaySummary;

import java.util.List;

public record MealMessageResponse(
        String assistantText,
        TodaySummary todaySummary,
        List<MealItem> items,
        List<MealLogResponse> chatLog
) {

    public static MealMessageResponse normal(
            String assistantText,
            TodaySummary summary,
            List<MealItem> items,
            List<MealLogResponse> chatLog
    ) {
        return new MealMessageResponse(assistantText, summary, items, chatLog);
    }
}