package com.example.mealTracker.domain;


import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class MealLog {
    private Long id;
    private String email;
    private String log;
    private Role role;
    private String createdAt;


    @Builder
    public MealLog(String email, String log, Role role) {
        this.email = email;
        this.log = log;
        this.role = role;
    }
}
