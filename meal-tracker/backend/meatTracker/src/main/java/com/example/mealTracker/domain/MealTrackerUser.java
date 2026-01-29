package com.example.mealTracker.domain;

import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
public class MealTrackerUser {
    private Long id;
    private String email;
    private String password;
    private int targetCalories; // target_calories
    private int targetProtein; // target_protein
    private LocalDateTime createdAt;

    public MealTrackerUser(String email) {
        this.email = email;
    }
}
