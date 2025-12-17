package com.example.meattracker.Controller;


import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/meal")
public class MealController {

    @GetMapping("/ping")
    public Map<String, String> ping() {
        return Map.of("ok", "true");
    }


    @PostMapping("/message")
    public Map<String, String> message(@RequestBody Map<String, String> req) {
        String msg = req.get("message");

        String answer = "받음: " + msg;

        return Map.of("assistantText", answer);
    }
}
