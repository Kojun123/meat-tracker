package com.example.mealTracker.domain;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class MealTrackerUser {
    private Long id;
    private String email;
    private String password;
    private LocalDateTime createdAt;
}
