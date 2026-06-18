package org.example.siidsbackend.Service;

import lombok.extern.slf4j.Slf4j;
import org.example.siidsbackend.DTO.Response.PageResponseDTO;
import org.example.siidsbackend.DTO.Response.UserResponseDTO;
import org.example.siidsbackend.Model.AccountAuditLog;
import org.example.siidsbackend.Model.Employee;
import org.example.siidsbackend.Model.User;
import org.example.siidsbackend.Model.UserRoleHistory;
import org.example.siidsbackend.Repository.AccountAuditLogRepository;
import org.example.siidsbackend.Repository.EmployeeRepo;
import org.example.siidsbackend.Repository.UserRepo;
import org.example.siidsbackend.Repository.UserRoleHistoryRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import java.util.UUID;

@Service
@Transactional
@Slf4j
public class UserService {

    @Autowired
    private JWTService jwtService;

    @Autowired
    AuthenticationManager authManager;

    @Autowired
    private UserRepo repo;

    @Autowired
    private EmployeeRepo employeeRepo;

    @Autowired
    private EmailService emailService;

    @Autowired
    private UserRoleHistoryRepository userRoleHistoryRepository;

    @Autowired
    private AccountAuditLogRepository accountAuditLogRepository;

    @Autowired
    private RbacService rbacService;

    private BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(12);
    private static final String PROTECTED_ADMIN_ROLE = "ADMIN";

    private User getSingleUser(String username) {
        return repo.findByUsername(username).orElse(null);
    }

    public User register(User user) {
        user.setPassword(encoder.encode(user.getPassword()));
        repo.save(user);
        return user;
    }

    public Map<String, String> adminCreateUser(Map<String, String> request, String performedBy) {
        String employeeId = trim(request.getOrDefault("employeeId", request.get("username")));
        String role = trim(request.get("role"));
        String givenName = trim(request.get("givenName"));
        String familyName = trim(request.get("familyName"));
        String workEmail = trim(request.get("workEmail"));
        String phoneNumber = trim(request.get("phoneNumber"));
        String temporaryPassword = trim(request.get("temporaryPassword"));

        if (employeeId == null || role == null || givenName == null || familyName == null || workEmail == null || temporaryPassword == null) {
            throw new IllegalArgumentException("Employee ID, given name, family name, work email, role, and temporary password are required");
        }
        if (temporaryPassword.length() < 8) {
            throw new IllegalArgumentException("Temporary password must be at least 8 characters");
        }
        if (isProtectedAdminRole(role)) {
            throw new IllegalArgumentException("Admin is a protected system role and cannot be created from user management.");
        }

        if (repo.findByUsername(employeeId).isPresent()) {
            throw new IllegalStateException("A user account for this Employee ID already exists.");
        }

        Employee employee = employeeRepo.findByEmployeeId(employeeId).orElseGet(Employee::new);
        employee.setEmployeeId(employeeId);
        employee.setGivenName(givenName);
        employee.setFamilyName(familyName);
        employee.setWorkEmail(workEmail);
        employee.setPhoneNumber(phoneNumber);
        applyEmployeeDefaults(employee);
        employeeRepo.save(employee);

        User user = new User();
        user.setUsername(employeeId);
        user.setRole(role);
        user.setActive(true);
        user.setAuthProvider("LOCAL");
        user.setPassword(encoder.encode(temporaryPassword));
        user.setMustChangePassword(true);
        user.setPasswordSetupToken(null);
        user.setPasswordSetupExpiryTime(null);
        repo.save(user);

        recordRoleHistory(user, null, role, performedBy, "Initial user onboarding with temporary password");
        recordAccountAudit("USER_CREATED", employeeId, performedBy, "Created employee profile and user account with role " + role + "; temporary password requires change on first login");

        Map<String, String> response = new HashMap<>();
        response.put("message", "User created with temporary password. User must change password on first login.");
        response.put("username", employeeId);
        response.put("role", role);
        return response;
    }

    public Map<String, String> verify(User user) {
        System.out.println("=== Login Attempt ===");
        System.out.println("Username: " + user.getUsername());
        System.out.println("Password provided: " + (user.getPassword() != null ? "Yes" : "No"));

        Map<String, String> response = new HashMap<>();

        // Check if employee exists
        Optional<Employee> employee = employeeRepo.findByEmployeeId(user.getUsername());
        if (employee.isEmpty()) {
            System.out.println("Employee not found: " + user.getUsername());
            response.put("error", "Employee not found");
            return response;
        }

        System.out.println("Employee found: " + employee.get().getEmployeeId());

        User dbUser = getSingleUser(user.getUsername());
        if (dbUser != null && dbUser.getActive() != null && !dbUser.getActive()) {
            System.out.println("User is deactivated: " + user.getUsername());
            response.put("error", "Your account has been deactivated. Please contact the administrator.");
            return response;
        }

        try {
            Authentication authentication = authManager.authenticate(
                    new UsernamePasswordAuthenticationToken(user.getUsername(), user.getPassword()));

            if (authentication.isAuthenticated()) {
                System.out.println("Authentication successful");
                String token = jwtService.generateToken(user.getUsername());
                System.out.println("Login request received for user: " + user.getUsername());
                System.out.println("Token generated: " + token);

                if (dbUser != null) {
                    System.out.println("Returning role for user " + user.getUsername() + ": " + dbUser.getRole());
                    response.put("token", token);
                    response.put("role", dbUser.getRole());
                    response.put("permissions", String.join(",", rbacService.getPermissionsForRole(dbUser.getRole())));
                    response.put("mustChangePassword", String.valueOf(Boolean.TRUE.equals(dbUser.getMustChangePassword())));
                } else {
                    response.put("error", "User not found");
                }

                return response;
            } else {
                System.out.println("Authentication failed - not authenticated");
                response.put("error", "Authentication failed");
                return response;
            }
        } catch (BadCredentialsException e) {
            System.err.println("Bad credentials for user " + user.getUsername() + ": " + e.getMessage());
            response.put("error", "Invalid username or password");
            return response;
        } catch (AuthenticationException e) {
            System.err.println("Authentication exception for user " + user.getUsername() + ": " + e.getMessage());
            response.put("error", "Authentication error: " + e.getMessage());
            return response;
        } catch (Exception e) {
            System.err.println(
                    "Unexpected error during authentication for user " + user.getUsername() + ": " + e.getMessage());
            e.printStackTrace();
            response.put("error", "Server authentication error");
            return response;
        }
    }

    public Map<String, String> generateOtp(String username) {
        return generateOtpInternal(username, false);
    }

    public Map<String, String> generateRegistrationOtp(String username) {
        return generateOtpInternal(username, true);
    }

    public Map<String, String> sendWelcomeEmail(String username) {
        Map<String, String> response = new HashMap<>();
        try {
            User user = getSingleUser(username);
            if (user == null) {
                response.put("error", "User not found");
                return response;
            }

            Optional<Employee> employee = employeeRepo.findByEmployeeId(username);
            if (employee.isEmpty()) {
                response.put("error", "Employee not found");
                return response;
            }

            String email = employee.get().getWorkEmail();
            if (email == null || email.isEmpty()) {
                response.put("error", "No email found for employee");
                return response;
            }

            emailService.sendAccountCreatedWelcomeEmail(email, username);
            response.put("message", "Welcome email sent successfully");
            return response;
        } catch (Exception e) {
            log.error("Error sending welcome email", e);
            response.put("error", "Failed to send welcome email: " + e.getMessage());
            return response;
        }
    }

    private Map<String, String> generateOtpInternal(String username, boolean isRegistration) {
        Map<String, String> response = new HashMap<>();

        try {
            User user = getSingleUser(username);
            if (user == null) {
                response.put("error", "User not found");
                return response;
            }

            Optional<Employee> employee = employeeRepo.findByEmployeeId(username);
            if (employee.isEmpty()) {
                response.put("error", "Employee not found");
                return response;
            }

            // Generate 6-digit OTP
            String otp = String.format("%06d", new Random().nextInt(999999));

            // Update only OTP fields
            repo.updateOtpFields(user.getId(), otp, LocalDateTime.now().plusMinutes(10));

            // Send email
            String email = employee.get().getWorkEmail();
            if (email == null || email.isEmpty()) {
                response.put("error", "No email found for employee");
                return response;
            }

            if (isRegistration) {
                emailService.sendAccountCreatedEmail(email, username, otp);
            } else {
                emailService.sendOtpEmail(email, otp);
            }

            response.put("message", isRegistration ? "Welcome email sent" : "OTP sent to registered email");
            return response;
        } catch (Exception e) {
            log.error("Error generating OTP", e);
            response.put("error", "Failed to generate OTP: " + e.getMessage());
            return response;
        }
    }

    public Map<String, String> verifyOtp(String username, String otp) {
        Map<String, String> response = new HashMap<>();

        User user = getSingleUser(username);
        if (user == null) {
            response.put("error", "User not found");
            return response;
        }

        // Check if OTP matches and is not expired
        if (user.getOtp() == null || !user.getOtp().equals(otp)) {
            response.put("error", "Invalid OTP");
            return response;
        }

        if (user.getOtpExpiryTime().isBefore(LocalDateTime.now())) {
            response.put("error", "OTP expired");
            return response;
        }

        // OTP is valid
        response.put("message", "OTP verified");
        return response;
    }

    public Map<String, String> resetPassword(String username, String otp, String newPassword) {
        Map<String, String> response = new HashMap<>();

        // First verify OTP
        Map<String, String> otpResponse = verifyOtp(username, otp);
        if (otpResponse.containsKey("error")) {
            return otpResponse;
        }

        // OTP is valid, proceed with password reset
        User user = getSingleUser(username);
        user.setPassword(encoder.encode(newPassword));
        user.setMustChangePassword(false);
        user.setOtp(null); // Clear OTP after use
        user.setOtpExpiryTime(null);
        repo.save(user);

        response.put("message", "Password reset successfully");
        return response;
    }

    public Map<String, String> setupPassword(String token, String newPassword) {
        Map<String, String> response = new HashMap<>();

        if (token == null || token.isBlank() || newPassword == null || newPassword.isBlank()) {
            response.put("error", "Token and new password are required");
            return response;
        }

        User user = repo.findByPasswordSetupToken(hashToken(token))
                .orElse(null);

        if (user == null) {
            response.put("error", "Invalid password setup token");
            return response;
        }

        if (user.getPasswordSetupExpiryTime() == null || user.getPasswordSetupExpiryTime().isBefore(LocalDateTime.now())) {
            response.put("error", "Password setup token expired");
            return response;
        }

        user.setPassword(encoder.encode(newPassword));
        user.setPasswordSetupToken(null);
        user.setPasswordSetupExpiryTime(null);
        user.setActive(true);
        user.setMustChangePassword(false);
        repo.save(user);

        recordAccountAudit("PASSWORD_SETUP_COMPLETED", user.getUsername(), user.getUsername(), "User completed password setup");

        response.put("message", "Password created successfully");
        return response;
    }

    public Map<String, String> changePassword(String username, String currentPassword, String newPassword) {
        Map<String, String> response = new HashMap<>();

        if (username == null || username.isBlank()) {
            response.put("error", "Authenticated username is required");
            return response;
        }
        if (currentPassword == null || currentPassword.isBlank() || newPassword == null || newPassword.isBlank()) {
            response.put("error", "Current password and new password are required");
            return response;
        }
        if (newPassword.length() < 8) {
            response.put("error", "New password must be at least 8 characters");
            return response;
        }
        if (currentPassword.equals(newPassword)) {
            response.put("error", "New password must be different from the temporary/current password");
            return response;
        }

        User user = getSingleUser(username);
        if (user == null) {
            response.put("error", "User not found");
            return response;
        }
        if (!encoder.matches(currentPassword, user.getPassword())) {
            response.put("error", "Current password is incorrect");
            return response;
        }

        user.setPassword(encoder.encode(newPassword));
        user.setMustChangePassword(false);
        user.setPasswordSetupToken(null);
        user.setPasswordSetupExpiryTime(null);
        repo.save(user);

        recordAccountAudit("PASSWORD_CHANGED", username, username, "User changed password");

        response.put("message", "Password changed successfully");
        response.put("mustChangePassword", "false");
        return response;
    }

    public java.util.List<UserResponseDTO> getAllUsers() {
        return repo.findAll().stream()
                .filter(user -> !isProtectedAdminUser(user))
                .map(this::toUserResponse)
                .toList();
    }

    public PageResponseDTO<UserResponseDTO> getUserPage(int page, int size, String search) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.max(size, 1);
        Page<User> users = repo.searchManageableUsers(
                search == null ? "" : search.trim().toLowerCase(),
                PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.ASC, "id")));

        return new PageResponseDTO<>(
                users.getContent().stream()
                        .map(this::toUserResponse)
                        .toList(),
                users.getNumber(),
                users.getSize(),
                users.getTotalElements(),
                users.getTotalPages());
    }

    public Optional<Employee> getEmployeeById(String employeeId) {
        return employeeRepo.findByEmployeeId(employeeId);
    }

    public List<Map<String, Object>> getRoleHistory(String username) {
        return userRoleHistoryRepository.findByUsernameOrderByChangedAtDesc(username).stream()
                .map(this::toRoleHistoryResponse)
                .toList();
    }

    public List<Map<String, Object>> getAccountAuditLogs() {
        return accountAuditLogRepository.findAllByOrderByPerformedAtDesc().stream()
                .map(this::toAccountAuditResponse)
                .toList();
    }

    public List<Map<String, Object>> getAccountAuditLogsForUser(String username) {
        return accountAuditLogRepository.findByTargetUsernameOrderByPerformedAtDesc(username).stream()
                .map(this::toAccountAuditResponse)
                .toList();
    }

    public User updateUserRole(Integer id, String role) {
        return updateUserRole(id, role, "system", "System role update");
    }

    public User updateUserRole(Integer id, String role, String performedBy, String reason) {
        String normalizedRoleInput = trim(role);
        String normalizedReason = trim(reason);
        if (normalizedRoleInput == null) {
            throw new IllegalArgumentException("Role is required");
        }
        if (normalizedReason == null) {
            throw new IllegalArgumentException("Role change reason is required");
        }

        User user = repo.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
        if (isProtectedAdminUser(user)) {
            throw new IllegalArgumentException("Admin is a protected system account and its role cannot be changed.");
        }
        if (isProtectedAdminRole(normalizedRoleInput)) {
            throw new IllegalArgumentException("Admin is a protected system role and cannot be assigned from user management.");
        }
        String previousRole = user.getRole();
        user.setRole(normalizedRoleInput);
        User saved = repo.save(user);
        recordRoleHistory(saved, previousRole, normalizedRoleInput, performedBy, normalizedReason);
        recordAccountAudit("USER_ROLE_UPDATED", saved.getUsername(), performedBy,
                "Role changed from " + previousRole + " to " + normalizedRoleInput + ". Reason: " + normalizedReason);
        return saved;
    }

    public User toggleUserActiveStatus(Integer id) {
        return toggleUserActiveStatus(id, "system");
    }

    public User toggleUserActiveStatus(Integer id, String performedBy) {
        User user = repo.findById(id).orElseThrow(() -> new RuntimeException("User not found"));
        if (isProtectedAdminUser(user)) {
            throw new IllegalArgumentException("Admin is a protected system account and cannot be activated or deactivated here.");
        }
        user.setActive(user.getActive() == null ? false : !user.getActive());
        User saved = repo.save(user);
        recordAccountAudit(Boolean.TRUE.equals(saved.getActive()) ? "USER_ACTIVATED" : "USER_DEACTIVATED",
                saved.getUsername(), performedBy, "Active status changed to " + saved.getActive());
        return saved;
    }

    private boolean isProtectedAdminRole(String role) {
        return PROTECTED_ADMIN_ROLE.equals(rbacService.normalizeRole(role));
    }

    private boolean isProtectedAdminUser(User user) {
        return user != null && isProtectedAdminRole(user.getRole());
    }

    private void applyEmployeeDefaults(Employee employee) {
        employee.setProfileFlag(employee.isProfileFlag());
        employee.setCurrJobFlag(employee.isCurrJobFlag());
        employee.setRraJobCount(employee.getRraJobCount());
        employee.setExtJobCount(employee.getExtJobCount());
        employee.setPunished(employee.isPunished());
        employee.setConfirmStatus(employee.isConfirmStatus());
        employee.setLetterConfirm(employee.getLetterConfirm());
        employee.setJobDescriptionsConfirm(employee.getJobDescriptionsConfirm());
        employee.setPmappConfirm(employee.getPmappConfirm());
        employee.setAppealLetterConfirm(employee.getAppealLetterConfirm());
    }

    private void recordRoleHistory(User user, String previousRole, String newRole, String performedBy, String reason) {
        UserRoleHistory history = new UserRoleHistory();
        history.setUser(user);
        history.setUsername(user.getUsername());
        history.setPreviousRole(previousRole);
        history.setNewRole(newRole);
        history.setChangedBy(performedBy);
        history.setReason(reason);
        userRoleHistoryRepository.save(history);
    }

    private void recordAccountAudit(String action, String targetUsername, String performedBy, String details) {
        AccountAuditLog auditLog = new AccountAuditLog();
        auditLog.setAction(action);
        auditLog.setTargetUsername(targetUsername);
        auditLog.setPerformedBy(performedBy);
        auditLog.setDetails(details);
        accountAuditLogRepository.save(auditLog);
    }

    private Map<String, Object> toRoleHistoryResponse(UserRoleHistory history) {
        Map<String, Object> response = new HashMap<>();
        response.put("id", history.getId());
        response.put("username", history.getUsername());
        response.put("previousRole", history.getPreviousRole());
        response.put("newRole", history.getNewRole());
        response.put("changedBy", history.getChangedBy());
        response.put("changedAt", history.getChangedAt());
        response.put("reason", history.getReason());
        return response;
    }

    private Map<String, Object> toAccountAuditResponse(AccountAuditLog auditLog) {
        Map<String, Object> response = new HashMap<>();
        response.put("id", auditLog.getId());
        response.put("action", auditLog.getAction());
        response.put("targetUsername", auditLog.getTargetUsername());
        response.put("performedBy", auditLog.getPerformedBy());
        response.put("performedAt", auditLog.getPerformedAt());
        response.put("details", auditLog.getDetails());
        return response;
    }

    public UserResponseDTO toUserResponse(User user) {
        return new UserResponseDTO(
                user.getId(),
                user.getUsername(),
                user.getRole(),
                user.getActive(),
                user.getAuthProvider(),
                user.getMustChangePassword());
    }

    private String trim(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }
}
