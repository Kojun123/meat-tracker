package com.example.mealTracker.mapper;

import com.example.mealTracker.domain.FoodMaster;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface FoodMasterMapper {
        //commit test
        FoodMaster findByName(String name);
        List<FoodMaster> findSimilarByName(@Param("name") String name);

}