package com.example.mealTracker.common;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

public class JwtAuthFilter extends OncePerRequestFilter {
    private final JwtProvider jwtProvider;
    private final Logger logger = LoggerFactory.getLogger(this.getClass());

    public JwtAuthFilter(JwtProvider jwtProvider) {
        this.jwtProvider = jwtProvider;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        String auth = request.getHeader("Authorization");
        logger.info("authHeader={}", auth);

        if (auth != null && auth.startsWith("Bearer ")) {
            String token = auth.substring(7);
            if (jwtProvider.isType(token, "access")) {
                try {
                    String email = jwtProvider.getEmail(token);
                    var authentication = new UsernamePasswordAuthenticationToken(
                            email,
                            null,
                            List.of()
                    );
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                } catch (Exception e) {
                    SecurityContextHolder.clearContext();
                    logger.error(e.getMessage(), e);
                }
            }
        }

        filterChain.doFilter(request, response);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) throws ServletException {
        String uri = request.getRequestURI();
        return uri.startsWith("/oauth2/") || uri.startsWith("/login/oauth2/") || uri.startsWith("/login") || uri.startsWith("/error");
    }
}
