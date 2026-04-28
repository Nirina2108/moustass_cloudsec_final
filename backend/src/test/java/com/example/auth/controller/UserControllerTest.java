package com.example.auth.controller;

import com.example.auth.AuthApplication;
import com.example.auth.dto.RegisterRequest;
import com.example.auth.entity.User;
import com.example.auth.repository.UserRepository;
import com.example.auth.service.AuthService;
import com.example.auth.service.JwtService;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@SpringBootTest(classes = AuthApplication.class)
@ActiveProfiles("test")
class UserControllerTest {

    @Autowired
    private UserController userController;

    @Autowired
    private AuthService authService;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
    }

    private String createUser(String email) {
        RegisterRequest req = new RegisterRequest();
        req.setName("Test " + email);
        req.setEmail(email);
        req.setPassword("Azerty1234!@");
        authService.register(req);

        User user = userRepository.findByEmail(email).orElseThrow();
        user.setEmailVerified(true);
        user.setEmailVerificationToken(null);
        String token = jwtService.generateToken(email);
        user.setToken(token);
        user.setTokenExpiresAt(LocalDateTime.now().plusMinutes(15));
        userRepository.save(user);
        return token;
    }

    @Test
    void testListUsersExcludesRequester() {
        String token = createUser("me@test.local");
        createUser("other1@test.local");
        createUser("other2@test.local");

        Object result = userController.getUsers("Bearer " + token);

        Assertions.assertInstanceOf(List.class, result);
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> users = (List<Map<String, Object>>) result;
        Assertions.assertEquals(2, users.size());
        Assertions.assertTrue(users.stream()
                .map(u -> (String) u.get("email"))
                .noneMatch("me@test.local"::equals));
    }

    @Test
    void testListUsersWithoutToken() {
        Object result = userController.getUsers(null);
        Assertions.assertInstanceOf(Map.class, result);
        @SuppressWarnings("unchecked")
        Map<String, Object> map = (Map<String, Object>) result;
        Assertions.assertNotNull(map.get("error"));
    }

    @Test
    void testListUsersWithInvalidToken() {
        Object result = userController.getUsers("Bearer invalid-token");
        Assertions.assertInstanceOf(Map.class, result);
        @SuppressWarnings("unchecked")
        Map<String, Object> map = (Map<String, Object>) result;
        Assertions.assertNotNull(map.get("error"));
    }

    @Test
    void testListUsersWithMalformedHeader() {
        Object result = userController.getUsers("NotBearer xxx");
        Assertions.assertInstanceOf(Map.class, result);
    }

    @Test
    void testListUsersWithExpiredToken() {
        String email = "expired@test.local";
        createUser(email);
        // Forcer expiration
        User u = userRepository.findByEmail(email).orElseThrow();
        u.setTokenExpiresAt(LocalDateTime.now().minusMinutes(1));
        userRepository.save(u);

        Object result = userController.getUsers("Bearer " + u.getToken());
        Assertions.assertInstanceOf(Map.class, result);
    }
}
