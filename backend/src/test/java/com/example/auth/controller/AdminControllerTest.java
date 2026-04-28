package com.example.auth.controller;

import com.example.auth.AuthApplication;
import com.example.auth.dto.RegisterRequest;
import com.example.auth.entity.User;
import com.example.auth.repository.UserRepository;
import com.example.auth.service.AppSettingService;
import com.example.auth.service.AuthService;
import com.example.auth.service.JwtService;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Tests complets du AdminController.
 * Couvre indirectement TokenService et AppSettingService.
 */
@SpringBootTest(classes = AuthApplication.class)
@ActiveProfiles("test")
class AdminControllerTest {

    @Autowired
    private AdminController adminController;

    @Autowired
    private AuthService authService;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AppSettingService appSettingService;

    @BeforeEach
    void setUp() {
        userRepository.deleteAll();
    }

    private String createUser(String email, boolean isAdmin) {
        RegisterRequest req = new RegisterRequest();
        req.setName("Test " + email);
        req.setEmail(email);
        req.setPassword("Azerty1234!@");
        authService.register(req);

        User user = userRepository.findByEmail(email).orElseThrow();
        user.setEmailVerified(true);
        user.setEmailVerificationToken(null);
        user.setAdmin(isAdmin);

        String token = jwtService.generateToken(email);
        user.setToken(token);
        user.setTokenExpiresAt(LocalDateTime.now().plusMinutes(15));
        userRepository.save(user);

        return token;
    }

    private String bearer(String token) {
        return "Bearer " + token;
    }

    // ─── listUsers ────────────────────────────────────────────────────────────

    @Test
    void testListUsersAsAdmin() {
        String adminToken = createUser("admin@test.local", true);
        createUser("user1@test.local", false);
        createUser("user2@test.local", false);

        ResponseEntity<Object> response = adminController.listUsers(bearer(adminToken));

        Assertions.assertEquals(HttpStatus.OK, response.getStatusCode());
        Assertions.assertInstanceOf(List.class, response.getBody());
        @SuppressWarnings("unchecked")
        List<Map<String, Object>> users = (List<Map<String, Object>>) response.getBody();
        Assertions.assertEquals(3, users.size());
    }

    @Test
    void testListUsersAsNonAdmin() {
        String userToken = createUser("user@test.local", false);

        ResponseEntity<Object> response = adminController.listUsers(bearer(userToken));

        Assertions.assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    @Test
    void testListUsersWithoutToken() {
        ResponseEntity<Object> response = adminController.listUsers(null);
        Assertions.assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    @Test
    void testListUsersWithMalformedHeader() {
        ResponseEntity<Object> response = adminController.listUsers("NotBearer xxx");
        Assertions.assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    // ─── createUser ───────────────────────────────────────────────────────────

    @Test
    void testCreateUserAsAdmin() {
        String adminToken = createUser("admin@test.local", true);
        Map<String, Object> body = new HashMap<>();
        body.put("name", "Bob");
        body.put("email", "bob@test.local");
        body.put("password", "Strong#Pass1");
        body.put("isAdmin", false);

        ResponseEntity<Object> response = adminController.createUser(body, bearer(adminToken));

        Assertions.assertEquals(HttpStatus.CREATED, response.getStatusCode());
        Assertions.assertTrue(userRepository.findByEmail("bob@test.local").isPresent());
        User created = userRepository.findByEmail("bob@test.local").orElseThrow();
        Assertions.assertTrue(created.isEmailVerified());
        Assertions.assertFalse(created.isAdmin());
    }

    @Test
    void testCreateUserAsAdminWithAdminFlag() {
        String adminToken = createUser("admin@test.local", true);
        Map<String, Object> body = new HashMap<>();
        body.put("name", "Alice");
        body.put("email", "alice@test.local");
        body.put("password", "Strong#Pass1");
        body.put("isAdmin", true);

        ResponseEntity<Object> response = adminController.createUser(body, bearer(adminToken));

        Assertions.assertEquals(HttpStatus.CREATED, response.getStatusCode());
        User created = userRepository.findByEmail("alice@test.local").orElseThrow();
        Assertions.assertTrue(created.isAdmin());
    }

    @Test
    void testCreateUserMissingFields() {
        String adminToken = createUser("admin@test.local", true);
        Map<String, Object> body = new HashMap<>();

        ResponseEntity<Object> response = adminController.createUser(body, bearer(adminToken));

        Assertions.assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    @Test
    void testCreateUserWeakPassword() {
        String adminToken = createUser("admin@test.local", true);
        Map<String, Object> body = new HashMap<>();
        body.put("name", "Weak");
        body.put("email", "weak@test.local");
        body.put("password", "123");

        ResponseEntity<Object> response = adminController.createUser(body, bearer(adminToken));

        Assertions.assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    @Test
    void testCreateUserAsNonAdmin() {
        String userToken = createUser("user@test.local", false);
        Map<String, Object> body = new HashMap<>();
        body.put("name", "X");
        body.put("email", "x@test.local");
        body.put("password", "Strong#Pass1");

        ResponseEntity<Object> response = adminController.createUser(body, bearer(userToken));

        Assertions.assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    // ─── updateUser ───────────────────────────────────────────────────────────

    @Test
    void testUpdateUserName() {
        String adminToken = createUser("admin@test.local", true);
        createUser("u@test.local", false);
        Long uid = userRepository.findByEmail("u@test.local").orElseThrow().getId();

        Map<String, Object> body = new HashMap<>();
        body.put("name", "Renamed");

        ResponseEntity<Object> response = adminController.updateUser(uid, body, bearer(adminToken));

        Assertions.assertEquals(HttpStatus.OK, response.getStatusCode());
        Assertions.assertEquals("Renamed", userRepository.findById(uid).orElseThrow().getName());
    }

    @Test
    void testUpdateUserEmailAndVerify() {
        String adminToken = createUser("admin@test.local", true);
        createUser("u@test.local", false);
        Long uid = userRepository.findByEmail("u@test.local").orElseThrow().getId();
        userRepository.findById(uid).ifPresent(u -> { u.setEmailVerified(false); userRepository.save(u); });

        Map<String, Object> body = new HashMap<>();
        body.put("email", "renamed@test.local");
        body.put("emailVerified", true);

        ResponseEntity<Object> response = adminController.updateUser(uid, body, bearer(adminToken));

        Assertions.assertEquals(HttpStatus.OK, response.getStatusCode());
        User updated = userRepository.findById(uid).orElseThrow();
        Assertions.assertEquals("renamed@test.local", updated.getEmail());
        Assertions.assertTrue(updated.isEmailVerified());
    }

    @Test
    void testUpdateUserPromoteAdmin() {
        String adminToken = createUser("admin@test.local", true);
        createUser("u@test.local", false);
        Long uid = userRepository.findByEmail("u@test.local").orElseThrow().getId();

        Map<String, Object> body = new HashMap<>();
        body.put("isAdmin", true);

        ResponseEntity<Object> response = adminController.updateUser(uid, body, bearer(adminToken));

        Assertions.assertEquals(HttpStatus.OK, response.getStatusCode());
        Assertions.assertTrue(userRepository.findById(uid).orElseThrow().isAdmin());
    }

    @Test
    void testUpdateUserCannotDemoteSelf() {
        String adminToken = createUser("admin@test.local", true);
        Long aid = userRepository.findByEmail("admin@test.local").orElseThrow().getId();

        Map<String, Object> body = new HashMap<>();
        body.put("isAdmin", false);

        ResponseEntity<Object> response = adminController.updateUser(aid, body, bearer(adminToken));

        Assertions.assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    @Test
    void testUpdateUserNotFound() {
        String adminToken = createUser("admin@test.local", true);
        Map<String, Object> body = new HashMap<>();
        body.put("name", "x");

        ResponseEntity<Object> response = adminController.updateUser(99999L, body, bearer(adminToken));

        Assertions.assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    @Test
    void testUpdateUserAsNonAdmin() {
        String userToken = createUser("user@test.local", false);
        Long uid = userRepository.findByEmail("user@test.local").orElseThrow().getId();

        Map<String, Object> body = new HashMap<>();
        body.put("name", "x");

        ResponseEntity<Object> response = adminController.updateUser(uid, body, bearer(userToken));

        Assertions.assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    // ─── deleteUser ───────────────────────────────────────────────────────────

    @Test
    void testDeleteUser() {
        String adminToken = createUser("admin@test.local", true);
        createUser("victim@test.local", false);
        Long uid = userRepository.findByEmail("victim@test.local").orElseThrow().getId();

        ResponseEntity<Object> response = adminController.deleteUser(uid, bearer(adminToken));

        Assertions.assertEquals(HttpStatus.OK, response.getStatusCode());
        Assertions.assertFalse(userRepository.findById(uid).isPresent());
    }

    @Test
    void testDeleteUserCannotDeleteSelf() {
        String adminToken = createUser("admin@test.local", true);
        Long aid = userRepository.findByEmail("admin@test.local").orElseThrow().getId();

        ResponseEntity<Object> response = adminController.deleteUser(aid, bearer(adminToken));

        Assertions.assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        Assertions.assertTrue(userRepository.findById(aid).isPresent());
    }

    @Test
    void testDeleteUserNotFound() {
        String adminToken = createUser("admin@test.local", true);
        ResponseEntity<Object> response = adminController.deleteUser(99999L, bearer(adminToken));
        Assertions.assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
    }

    @Test
    void testDeleteUserAsNonAdmin() {
        String userToken = createUser("user@test.local", false);
        Long uid = userRepository.findByEmail("user@test.local").orElseThrow().getId();

        ResponseEntity<Object> response = adminController.deleteUser(uid, bearer(userToken));

        Assertions.assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    // ─── registration code ───────────────────────────────────────────────────

    @Test
    void testGetRegistrationCode() {
        String adminToken = createUser("admin@test.local", true);

        ResponseEntity<Object> response = adminController.getRegistrationCode(bearer(adminToken));

        Assertions.assertEquals(HttpStatus.OK, response.getStatusCode());
        @SuppressWarnings("unchecked")
        Map<String, Object> body = (Map<String, Object>) response.getBody();
        Assertions.assertNotNull(body);
        Assertions.assertNotNull(body.get("code"));
    }

    @Test
    void testGetRegistrationCodeAsNonAdmin() {
        String userToken = createUser("user@test.local", false);
        ResponseEntity<Object> response = adminController.getRegistrationCode(bearer(userToken));
        Assertions.assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }

    @Test
    void testUpdateRegistrationCode() {
        String adminToken = createUser("admin@test.local", true);
        Map<String, Object> body = new HashMap<>();
        body.put("code", "NEW-SECRET-CODE-123");

        ResponseEntity<Object> response = adminController.updateRegistrationCode(body, bearer(adminToken));

        Assertions.assertEquals(HttpStatus.OK, response.getStatusCode());
        Assertions.assertEquals(
                "NEW-SECRET-CODE-123",
                appSettingService.getOrDefault(AuthService.SETTING_ADMIN_REGISTRATION_CODE, "x")
        );
    }

    @Test
    void testUpdateRegistrationCodeTooShort() {
        String adminToken = createUser("admin@test.local", true);
        Map<String, Object> body = new HashMap<>();
        body.put("code", "abc");

        ResponseEntity<Object> response = adminController.updateRegistrationCode(body, bearer(adminToken));

        Assertions.assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    @Test
    void testUpdateRegistrationCodeNullValue() {
        String adminToken = createUser("admin@test.local", true);
        Map<String, Object> body = new HashMap<>();

        ResponseEntity<Object> response = adminController.updateRegistrationCode(body, bearer(adminToken));

        Assertions.assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
    }

    @Test
    void testUpdateRegistrationCodeAsNonAdmin() {
        String userToken = createUser("user@test.local", false);
        Map<String, Object> body = new HashMap<>();
        body.put("code", "NEW-SECRET-CODE-123");

        ResponseEntity<Object> response = adminController.updateRegistrationCode(body, bearer(userToken));

        Assertions.assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
    }
}
