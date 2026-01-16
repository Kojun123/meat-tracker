package com.example.mealTracker.controller;


import com.example.mealTracker.dto.*;
import com.example.mealTracker.service.MealService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.ZoneId;

@RestController
@RequestMapping("/api/meal")
public class MealController {

    private final MealService mealService;

    public MealController(MealService mealService) {
        this.mealService = mealService;
    }

    @PostMapping("/item")
    public ResponseEntity<MealMessageResponse> insertItem(@RequestBody MealMessageRequest vo, @AuthenticationPrincipal UserDetails user) {
        String userId = user.getUsername();
        return ResponseEntity.ok(mealService.handle(vo, userId));
    }

    @DeleteMapping("/item/{itemId}")
    public ResponseEntity<Void> deleteItem(@AuthenticationPrincipal UserDetails user, @PathVariable Long itemId) {
        String userId = user.getUsername();
        mealService.deleteItem(userId, itemId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/today")
    public ResponseEntity<TodayResponse> today(@AuthenticationPrincipal UserDetails user, @RequestParam(required = false) LocalDate date) {
        String userId = user.getUsername();
        if (date == null) date = LocalDate.now(ZoneId.of("Asia/Seoul"));
        return ResponseEntity.ok(mealService.getToday(userId, date));
    }

    @PostMapping("/manual")
    public ResponseEntity<MealMessageResponse> manual(@RequestBody ManualRequest vo) {
        return ResponseEntity.ok(mealService.manualInsert(vo));
    }

    @PostMapping("/setLogs")
    public ResponseEntity<Void> setLogs(@AuthenticationPrincipal UserDetails user, @RequestBody MealLogRequest vo) {
        String userId = user.getUsername();
        vo.setEmail(userId);
        mealService.insertLog(vo);
        return ResponseEntity.ok().build();
    }


}
