package com.example.mealTracker.controller;


import com.example.mealTracker.dto.*;
import com.example.mealTracker.service.MealService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@RestController
@RequestMapping("/api/meal")
public class MealController {

    private final MealService mealService;

    public MealController(MealService mealService) {
        this.mealService = mealService;
    }

    @PostMapping("/message")
    public ResponseEntity<MealMessageResponse> message(@RequestBody MealMessageRequest vo, @AuthenticationPrincipal UserDetails user) {
        String userId = user.getUsername();
        return ResponseEntity.ok(mealService.handle(vo, userId));
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
