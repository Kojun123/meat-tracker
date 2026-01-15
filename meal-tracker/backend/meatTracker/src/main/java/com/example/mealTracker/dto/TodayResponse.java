package com.example.mealTracker.dto;

import com.example.mealTracker.domain.MealItem;
import com.example.mealTracker.domain.TodaySummary;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
public class TodayResponse {

    private TodaySummary summary;
    private List<MealItem> items;
    private List<MealLogResponse> chatLog;

    public TodayResponse(TodaySummary summary, List<MealItem> items, List<MealLogResponse> chatLog) {
        this.summary = summary;
        this.items = items;
        this.chatLog = chatLog;
    }

    public static TodayResponse of(TodaySummary summary, List<MealItem> items, List<MealLogResponse> chatLog) {
        return new TodayResponse(
                summary,
                items,
                chatLog
        );
    }

   public static TodayResponse empty() {
       return new TodayResponse(null, List.of(), List.of());
   }

}
