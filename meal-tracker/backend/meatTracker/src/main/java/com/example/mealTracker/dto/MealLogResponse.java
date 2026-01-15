package com.example.mealTracker.dto;

import com.example.mealTracker.domain.Role;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;


@Getter
@Setter
@NoArgsConstructor
public class MealLogResponse
{
    String email;
    String log;
    Role role;
    LocalDateTime createdAt;

    public MealLogResponse(String userId, String log, Role role) {
        this.email = userId;
        this.log = log;
        this.role = role;
    }
}
