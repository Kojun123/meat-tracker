package com.example.mealTracker.mapper;

import com.example.mealTracker.domain.MealItem;
import com.example.mealTracker.domain.TodaySummary;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.time.LocalDate;
import java.util.List;

@Mapper
public interface MealItemMapper {
    int insertItem(MealItem item);
    int deleteItem(@Param("userId") String userId, @Param("itemId") Long itemId);
    int updateItem(MealItem item);
    List<MealItem> findItemsByUser(@Param("userId") String userId, @Param("mealDate") LocalDate date);
    TodaySummary findSummaryByUser(@Param("userId") String userId);
}
