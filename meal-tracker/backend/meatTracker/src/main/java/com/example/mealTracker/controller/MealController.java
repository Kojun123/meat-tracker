package com.example.mealTracker.controller;


import com.example.mealTracker.domain.MealItem;
import com.example.mealTracker.domain.MealSession;
import com.example.mealTracker.domain.TodaySummary;
import com.example.mealTracker.dto.*;
import com.example.mealTracker.service.MealService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/meal")
public class MealController {

    private final MealService mealService;

    public MealController(MealService mealService) {
        this.mealService = mealService;
    }

    @PostMapping("/getSummary")
    public ResponseEntity<MealMessageResponse> getSummary() {
        Long sessionId = mealService.getSessionId();
        return ResponseEntity.ok(mealService.buildResponse("", sessionId));
    }

    @PostMapping("/message")
    public ResponseEntity<MealMessageResponse> message(@RequestBody MealMessageRequest req) {
        Long sessionId = mealService.getSessionId();
        return ResponseEntity.ok(mealService.handle(req, sessionId));
    }

    @PostMapping("/today")
    public ResponseEntity<TodayResponse> today() {
        Long sessionId = mealService.getSessionId();

        return ResponseEntity.ok(mealService.getToday(sessionId));
    }
}
