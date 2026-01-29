package com.example.mealTracker.common;

import com.example.mealTracker.domain.MealTrackerUser;
import com.example.mealTracker.mapper.UserMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
public class OAuth2SuccessHandler implements AuthenticationSuccessHandler {

    private final JwtProvider jwtProvider;
    private final UserMapper userMapper;

    public OAuth2SuccessHandler(JwtProvider jwtProvider, UserMapper userMapper) {
        this.jwtProvider = jwtProvider;
        this.userMapper = userMapper;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException {
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();
        String email = oAuth2User.getAttribute("email");

        if(email == null || email.isBlank()) {
            response.sendError(HttpServletResponse.SC_BAD_REQUEST, "OAuth email is missing");
            return;
        }

        MealTrackerUser user = userMapper.findByEmail(email);
        Long userId = (user != null) ? user.getId() : null;

        if(userId == null) {
            userMapper.insert(new MealTrackerUser(email));
            userId = userMapper.findByEmail(email).getId();
            if (userId == null) {
                response.sendError(HttpServletResponse.SC_INTERNAL_SERVER_ERROR, "DB error - User Create Failed");
                return;
            }
        }

        String refreshToken = jwtProvider.createRefreshToken(userId, email);

        ResponseCookie cookie = ResponseCookie.from("refreshToken", refreshToken)
                .httpOnly(true)
                .secure(true)
                .path("/")
                .sameSite("Lax")
                .maxAge(14 * 24 * 60 * 60)
                .build();

        response.addHeader("Set-Cookie", cookie.toString());

        response.sendRedirect("http://localhost:5173/oauth/callback");
    }
}
