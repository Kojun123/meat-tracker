package com.example.mealTracker.service;

import com.example.mealTracker.domain.MealTrackerUser;
import com.example.mealTracker.mapper.UserMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.logging.Logger;

@Service
@RequiredArgsConstructor
public class UserDetailService implements UserDetailsService {

    private final UserMapper userMapper;
    private final Logger logger = Logger.getLogger(this.getClass().getName());

    @Override
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        logger.info("loadUserByUsername : " + email);
        MealTrackerUser user = userMapper.findByEmail(email);

        if (user == null) {
            throw new UsernameNotFoundException("User not found : " + email);
        }

        return org.springframework.security.core.userdetails.User
                .withUsername(user.getEmail())
                .password(user.getPassword())
                .authorities("USER")
                .build();
    }

}
