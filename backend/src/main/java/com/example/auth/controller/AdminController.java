package com.example.auth.controller;

import com.example.auth.dto.RegisterRequest;
import com.example.auth.entity.User;
import com.example.auth.repository.UserRepository;
import com.example.auth.service.AppSettingService;
import com.example.auth.service.AuthService;
import com.example.auth.service.TokenService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Controller pour les operations d administration.
 * Toutes les routes exigent un token valide d un utilisateur isAdmin=true.
 */
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private static final String FIELD_NAME = "name";
    private static final String FIELD_EMAIL = "email";
    private static final String FIELD_PASSWORD = "password";
    private static final String FIELD_EMAIL_VERIFIED = "emailVerified";
    private static final String FIELD_IS_ADMIN = "isAdmin";
    private static final String KEY_ERROR = "error";
    private static final String KEY_MESSAGE = "message";

    private final UserRepository userRepository;
    private final TokenService tokenService;
    private final AuthService authService;
    private final AppSettingService appSettingService;

    public AdminController(UserRepository userRepository,
                           TokenService tokenService,
                           AuthService authService,
                           AppSettingService appSettingService) {
        this.userRepository = userRepository;
        this.tokenService = tokenService;
        this.authService = authService;
        this.appSettingService = appSettingService;
    }

    /**
     * Liste tous les utilisateurs (admin only).
     */
    @GetMapping("/users")
    public ResponseEntity<Object> listUsers(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader
    ) {
        User admin = requireAdmin(authorizationHeader);
        if (admin == null) {
            return forbidden();
        }

        List<Map<String, Object>> users = new ArrayList<>();
        for (User u : userRepository.findAll()) {
            users.add(toAdminView(u));
        }
        return ResponseEntity.ok(users);
    }

    /**
     * Cree un nouvel utilisateur (admin only).
     * Body : { name, email, password, isAdmin? }
     * L email est marque comme verifie automatiquement.
     */
    @PostMapping("/users")
    public ResponseEntity<Object> createUser(
            @RequestBody Map<String, Object> body,
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader
    ) {
        User admin = requireAdmin(authorizationHeader);
        if (admin == null) {
            return forbidden();
        }

        String name = stringOrNull(body.get(FIELD_NAME));
        String email = stringOrNull(body.get(FIELD_EMAIL));
        String password = stringOrNull(body.get(FIELD_PASSWORD));
        boolean wantAdmin = Boolean.TRUE.equals(body.get(FIELD_IS_ADMIN));

        if (name == null || name.isBlank()
                || email == null || email.isBlank()
                || password == null || password.isBlank()) {
            Map<String, Object> err = new HashMap<>();
            err.put(KEY_ERROR, "Nom, email et mot de passe obligatoires");
            return ResponseEntity.badRequest().body(err);
        }

        RegisterRequest req = new RegisterRequest();
        req.setName(name);
        req.setEmail(email);
        req.setPassword(password);

        Map<String, Object> registerResp = authService.register(req);
        if (registerResp.containsKey(KEY_ERROR)) {
            return ResponseEntity.badRequest().body(registerResp);
        }

        User created = userRepository.findByEmail(email).orElse(null);
        if (created == null) {
            Map<String, Object> err = new HashMap<>();
            err.put(KEY_ERROR, "Creation echouee");
            return ResponseEntity.status(500).body(err);
        }

        created.setEmailVerified(true);
        created.setEmailVerificationToken(null);
        created.setAdmin(wantAdmin);
        userRepository.save(created);

        return ResponseEntity.status(201).body(toAdminView(created));
    }

    /**
     * Met a jour un utilisateur (admin only).
     * Champs modifiables : name, email, isAdmin, emailVerified.
     */
    @PutMapping("/users/{id}")
    public ResponseEntity<Object> updateUser(
            @PathVariable Long id,
            @RequestBody Map<String, Object> body,
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader
    ) {
        User admin = requireAdmin(authorizationHeader);
        if (admin == null) {
            return forbidden();
        }

        User user = userRepository.findById(id).orElse(null);
        if (user == null) {
            return notFound();
        }

        if (body.containsKey(FIELD_NAME) && body.get(FIELD_NAME) instanceof String name) {
            user.setName(name);
        }
        if (body.containsKey(FIELD_EMAIL) && body.get(FIELD_EMAIL) instanceof String email) {
            user.setEmail(email);
        }
        if (body.containsKey(FIELD_EMAIL_VERIFIED) && body.get(FIELD_EMAIL_VERIFIED) instanceof Boolean verified) {
            boolean v = verified.booleanValue();
            user.setEmailVerified(v);
            if (v) {
                user.setEmailVerificationToken(null);
            }
        }
        if (body.containsKey(FIELD_IS_ADMIN) && body.get(FIELD_IS_ADMIN) instanceof Boolean adminFlag) {
            boolean wantAdmin = adminFlag.booleanValue();
            if (!wantAdmin && user.getId().equals(admin.getId())) {
                Map<String, Object> err = new HashMap<>();
                err.put(KEY_ERROR, "Impossible de retirer son propre statut admin");
                return ResponseEntity.badRequest().body(err);
            }
            user.setAdmin(wantAdmin);
        }

        userRepository.save(user);
        return ResponseEntity.ok(toAdminView(user));
    }

    /**
     * Supprime un utilisateur (admin only).
     */
    @DeleteMapping("/users/{id}")
    public ResponseEntity<Object> deleteUser(
            @PathVariable Long id,
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader
    ) {
        User admin = requireAdmin(authorizationHeader);
        if (admin == null) {
            return forbidden();
        }

        if (admin.getId().equals(id)) {
            Map<String, Object> err = new HashMap<>();
            err.put(KEY_ERROR, "Impossible de supprimer son propre compte");
            return ResponseEntity.badRequest().body(err);
        }

        if (!userRepository.existsById(id)) {
            return notFound();
        }

        userRepository.deleteById(id);

        Map<String, Object> ok = new HashMap<>();
        ok.put(KEY_MESSAGE, "Utilisateur supprime");
        return ResponseEntity.ok(ok);
    }

    /**
     * Recupere le code d inscription admin actuel (admin only).
     */
    @GetMapping("/registration-code")
    public ResponseEntity<Object> getRegistrationCode(
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader
    ) {
        User admin = requireAdmin(authorizationHeader);
        if (admin == null) {
            return forbidden();
        }
        Map<String, Object> body = new HashMap<>();
        body.put("code", authService.getCurrentAdminRegistrationCode());
        return ResponseEntity.ok(body);
    }

    /**
     * Met a jour le code d inscription admin (admin only).
     * Body : { code: "..." }, minimum 8 caracteres.
     */
    @PutMapping("/registration-code")
    public ResponseEntity<Object> updateRegistrationCode(
            @RequestBody Map<String, Object> body,
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader
    ) {
        User admin = requireAdmin(authorizationHeader);
        if (admin == null) {
            return forbidden();
        }
        String newCode = stringOrNull(body.get("code"));
        if (newCode == null || newCode.trim().length() < 8) {
            Map<String, Object> err = new HashMap<>();
            err.put(KEY_ERROR, "Le code doit faire au moins 8 caracteres");
            return ResponseEntity.badRequest().body(err);
        }
        appSettingService.set(AuthService.SETTING_ADMIN_REGISTRATION_CODE, newCode.trim());
        Map<String, Object> resp = new HashMap<>();
        resp.put("code", newCode.trim());
        resp.put(KEY_MESSAGE, "Code d'inscription admin mis a jour");
        return ResponseEntity.ok(resp);
    }

    private User requireAdmin(String authorizationHeader) {
        User user = tokenService.getUserFromToken(authorizationHeader);
        if (user == null || !user.isAdmin()) {
            return null;
        }
        return user;
    }

    private Map<String, Object> toAdminView(User u) {
        Map<String, Object> view = new HashMap<>();
        view.put("id", u.getId());
        view.put(FIELD_NAME, u.getName());
        view.put(FIELD_EMAIL, u.getEmail());
        view.put(FIELD_EMAIL_VERIFIED, u.isEmailVerified());
        view.put(FIELD_IS_ADMIN, u.isAdmin());
        view.put("createdAt", u.getCreatedAt());
        return view;
    }

    private static String stringOrNull(Object value) {
        return value instanceof String s ? s : null;
    }

    private ResponseEntity<Object> forbidden() {
        Map<String, Object> err = new HashMap<>();
        err.put(KEY_ERROR, "Acces refuse : droits administrateur requis");
        return ResponseEntity.status(403).body(err);
    }

    private ResponseEntity<Object> notFound() {
        Map<String, Object> err = new HashMap<>();
        err.put(KEY_ERROR, "Utilisateur introuvable");
        return ResponseEntity.status(404).body(err);
    }
}
