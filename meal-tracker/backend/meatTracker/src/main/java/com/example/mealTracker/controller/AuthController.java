package com.example.mealTracker.controller;


import com.example.mealTracker.dto.MeResponse;
import com.example.mealTracker.dto.MealTrackerUserResponse;
import com.example.mealTracker.dto.SignupRequest;
import com.example.mealTracker.dto.UpdateTargetsResponse;
import com.example.mealTracker.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;

    @PostMapping("/me")
    public ResponseEntity<MealTrackerUserResponse> me(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }

        return ResponseEntity.ok(userService.getUser(authentication.getName()));
    }

    @PutMapping("/target")
    public ResponseEntity<MeResponse> target(@AuthenticationPrincipal UserDetails user, @RequestBody UpdateTargetsResponse vo) {
        String userId = user.getUsername();
        return ResponseEntity.ok(userService.updateTargets(userId, vo));
    }

    @PostMapping("/signup")
    public ResponseEntity<Void> signup(@RequestBody SignupRequest vo) {
        userService.sign(vo);
        return ResponseEntity.ok().build();
    }
}
