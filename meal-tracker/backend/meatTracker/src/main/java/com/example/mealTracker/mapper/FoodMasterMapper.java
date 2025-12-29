package com.example.mealTracker.mapper;

import com.example.mealTracker.domain.FoodMaster;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface FoodMasterMapper {

        FoodMaster findByName(String name);
        List<FoodMaster> findByNames(@Param("names") List<String> name);
        List<FoodMaster> findAllNames();


}