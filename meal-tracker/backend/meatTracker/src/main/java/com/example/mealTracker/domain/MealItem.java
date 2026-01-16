package com.example.mealTracker.domain;

import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class MealItem {
    private Long id;
    private String userId; //user_id
    private String name;
    private Integer count;
    private Double calories;
    private Double protein;
    private String assumption;
    private LocalDateTime createdAt; //created_at
    private LocalDate mealDate; //meal_date


    public MealItem(String name, int count, double calories, double protein, String userId, LocalDate mealDate) {
        this.name = name;
        this.count = count;
        this.calories = calories;
        this.protein = protein;
        this.userId = userId;
        this.mealDate = mealDate;
    }
}
