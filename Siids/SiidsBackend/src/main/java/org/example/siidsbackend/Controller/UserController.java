package org.example.siidsbackend.Controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.siidsbackend.DTO.Response.PageResponseDTO;
import org.example.siidsbackend.Model.Employee;
import org.example.siidsbackend.Model.User;
import org.example.siidsbackend.Service.UserService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173", "http://localhost:5174"})
@Slf4j
@RequiredArgsConstructor
public class UserController {

    private final UserService service;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {
        return ResponseEntity.status(HttpStatus.GONE)
                .body(Map.of("error", "Public registration is disabled. Contact a system administrator."));
    }

    @PostMapping("/admin/register-user")
    @PreAuthorize("hasAuthority('USER_CREATE')")
    public ResponseEntity<?> adminRegisterUser(@RequestBody Map<String, String> request, Authentication authentication) {
        try {
            String performedBy = authentication != null ? authentication.getName() : "system";
            return ResponseEntity.ok(service.adminCreateUser(request, performedBy));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            log.error("Error in admin register", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                 .body(Map.of("error", "Failed to register user: " + e.getMessage()));
        }
    }


    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody User user) {
        try {
            System.out.println("Login request received for user: " + user.getUsername());

            Map<String, String> result = service.verify(user);
            System.out.println("Verification result for " + user.getUsername() + ": " + (result.containsKey("error") ? "Error: " + result.get("error") : "Success"));

            if (result.containsKey("error")) {
                String error = result.get("error");
                Map<String, String> errorResponse = new HashMap<>();
                errorResponse.put("error", error);
                System.out.println("Returning error response: " + error);
                return ResponseEntity.status(
                        error.equals("Employee not found") ? HttpStatus.NOT_FOUND : HttpStatus.UNAUTHORIZED
                ).body(errorResponse);
            }

            // Get the employee details
            Optional<Employee> employee = service.getEmployeeById(user.getUsername());

            Map<String, String> response = new HashMap<>();
            response.put("token", result.get("token"));
            response.put("username", user.getUsername());
            response.put("role", result.get("role"));
            response.put("permissions", result.getOrDefault("permissions", ""));
            response.put("message", "Login successful");

            // Add the employee name to the response
            if (employee.isPresent()) {
                response.put("name", employee.get().getGivenName() + " " + employee.get().getFamilyName());
                response.put("employeeId", employee.get().getEmployeeId());
            }

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            System.err.println("Login error: " + e.getMessage());
            e.printStackTrace();

            Map<String, String> error = new HashMap<>();
            error.put("error", "Login failed: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody Map<String, String> request) {
        try {
            String username = request.get("username");
            if (username == null || username.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Username is required"));
            }

            Map<String, String> result = service.generateOtp(username.trim());

            if (result.containsKey("error")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(result);
            }

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Forgot password error", e);
            return ResponseEntity.internalServerError()
                    .body(Map.of("error", "Failed to process forgot password request"));
        }
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> request) {
        String username = request.get("username");
        String otp = request.get("otp");

        try {
            Map<String, String> result = service.verifyOtp(username, otp);

            if (result.containsKey("error")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(result);
            }

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to verify OTP");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody Map<String, String> request) {
        String username = request.get("username");
        String otp = request.get("otp");
        String newPassword = request.get("newPassword");

        try {
            Map<String, String> result = service.resetPassword(username, otp, newPassword);

            if (result.containsKey("error")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(result);
            }

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to reset password");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @PostMapping("/setup-password")
    public ResponseEntity<?> setupPassword(@RequestBody Map<String, String> request) {
        try {
            Map<String, String> result = service.setupPassword(request.get("token"), request.get("newPassword"));

            if (result.containsKey("error")) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(result);
            }

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to setup password");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @GetMapping("/users")
    @PreAuthorize("hasAuthority('USER_VIEW')")
    public PageResponseDTO<User> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "") String search) {
        return service.getUserPage(page, size, search);
    }

    @GetMapping("/users/{username}/role-history")
    @PreAuthorize("hasAnyAuthority('USER_VIEW', 'AUDIT_VIEW')")
    public List<Map<String, Object>> getUserRoleHistory(@PathVariable String username) {
        return service.getRoleHistory(username);
    }

    @GetMapping("/account-audit-logs")
    @PreAuthorize("hasAuthority('AUDIT_VIEW')")
    public List<Map<String, Object>> getAccountAuditLogs() {
        return service.getAccountAuditLogs();
    }

    @GetMapping("/users/{username}/account-audit-logs")
    @PreAuthorize("hasAnyAuthority('USER_VIEW', 'AUDIT_VIEW')")
    public List<Map<String, Object>> getUserAccountAuditLogs(@PathVariable String username) {
        return service.getAccountAuditLogsForUser(username);
    }

    @PutMapping("/users/{id}/role")
    @PreAuthorize("hasAuthority('USER_ROLE_UPDATE')")
    public ResponseEntity<?> updateUserRole(@PathVariable Integer id, @RequestBody Map<String, String> request, Authentication authentication) {
        try {
            String role = request.get("role");
            String reason = request.get("reason");
            String performedBy = authentication != null ? authentication.getName() : "system";
            User updatedUser = service.updateUserRole(id, role, performedBy, reason);
            return ResponseEntity.ok(updatedUser);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to update user role");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @PutMapping("/users/{id}/deactivate")
    @PreAuthorize("hasAuthority('USER_STATUS_UPDATE')")
    public ResponseEntity<?> toggleUserActiveStatus(@PathVariable Integer id, Authentication authentication) {
        try {
            String performedBy = authentication != null ? authentication.getName() : "system";
            User updatedUser = service.toggleUserActiveStatus(id, performedBy);
            return ResponseEntity.ok(updatedUser);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to toggle user status");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }
}
