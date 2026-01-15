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
public class MealLogRequest
{
    public String email;
    public String log;
    public LocalDateTime createdAt;
    public Role role;

    @Builder
    public MealLogRequest(String email, String log, Role role) {
        this.email = email;
        this.log = log;
        this.role = role;
    }
}
