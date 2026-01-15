package com.example.mealTracker.mapper;

import com.example.mealTracker.domain.MealLog;
import com.example.mealTracker.dto.MealLogResponse;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Mapper
public interface MealLogMapper {
    void insertMealLog(MealLog log);

    List<MealLogResponse> getChatLogs(@Param("email") String userId, @Param("date") LocalDate date);
}
