package com.example.auth.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

/**
 * DTO pour la requête d'inscription.
 *
 * @author Poun
 * @version 1.0
 */
public class RegisterRequest {

    private String name;
    private String email;
    private String password;

    @JsonProperty("isAdmin")
    private boolean isAdmin;

    private String adminCode;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    @JsonProperty("isAdmin")
    public boolean isAdmin() {
        return isAdmin;
    }

    @JsonProperty("isAdmin")
    public void setAdmin(boolean isAdmin) {
        this.isAdmin = isAdmin;
    }

    public String getAdminCode() {
        return adminCode;
    }

    public void setAdminCode(String adminCode) {
        this.adminCode = adminCode;
    }
}