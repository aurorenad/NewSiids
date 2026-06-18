package org.example.siidsbackend.Model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Integer id;
    
    @Column(name = "username", unique = true)
    private String username;
    
    @Column(name = "password")
    private String password;
    
    @Column(name = "role")
    private String role;
    
    @Column(name = "otp")
    private String otp;
    
    @Column(name = "otp_expiry_time")
    private LocalDateTime otpExpiryTime;

    @Column(name = "active", columnDefinition = "boolean default true")
    private Boolean active = true;

    @Column(name = "auth_provider")
    private String authProvider = "LOCAL";

    @Column(name = "external_subject_id")
    private String externalSubjectId;

    @Column(name = "password_setup_token")
    private String passwordSetupToken;

    @Column(name = "password_setup_expiry_time")
    private LocalDateTime passwordSetupExpiryTime;

    @Column(name = "must_change_password", columnDefinition = "boolean default false")
    private Boolean mustChangePassword = false;

    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }
    public String getOtp() {
        return otp;
    }

    public void setOtp(String otp) {
        this.otp = otp;
    }

    public LocalDateTime getOtpExpiryTime() {
        return otpExpiryTime;
    }

    public void setOtpExpiryTime(LocalDateTime otpExpiryTime) {
        this.otpExpiryTime = otpExpiryTime;
    }

    public Boolean getActive() {
        return active;
    }

    public void setActive(Boolean active) {
        this.active = active;
    }

    public String getAuthProvider() {
        return authProvider;
    }

    public void setAuthProvider(String authProvider) {
        this.authProvider = authProvider;
    }

    public String getExternalSubjectId() {
        return externalSubjectId;
    }

    public void setExternalSubjectId(String externalSubjectId) {
        this.externalSubjectId = externalSubjectId;
    }

    public String getPasswordSetupToken() {
        return passwordSetupToken;
    }

    public void setPasswordSetupToken(String passwordSetupToken) {
        this.passwordSetupToken = passwordSetupToken;
    }

    public LocalDateTime getPasswordSetupExpiryTime() {
        return passwordSetupExpiryTime;
    }

    public void setPasswordSetupExpiryTime(LocalDateTime passwordSetupExpiryTime) {
        this.passwordSetupExpiryTime = passwordSetupExpiryTime;
    }

    public Boolean getMustChangePassword() {
        return mustChangePassword;
    }

    public void setMustChangePassword(Boolean mustChangePassword) {
        this.mustChangePassword = mustChangePassword;
    }

    @Override
    public String toString() {
        return "User{" +
                "id=" + id +
                ", username='" + username + '\'' +
                ", role='" + role + '\'' +
                ", active=" + active +
                ", mustChangePassword=" + mustChangePassword +
                ", authProvider='" + authProvider + '\'' +
                '}';
    }
}
