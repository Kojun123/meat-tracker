package com.example.mealTracker.dto;


import com.example.mealTracker.domain.MealItem;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class UpdateItemRequest {

    Long id;
    String userId;
    String name; // food name
    int count;
    double protein;
    double calories;

    public MealItem toEntity() {
        return MealItem.builder()
                .id(id)
                .userId(userId)
                .name(name)
                .count(count)
                .protein(protein)
                .calories(calories)
                .build();
    }

}
