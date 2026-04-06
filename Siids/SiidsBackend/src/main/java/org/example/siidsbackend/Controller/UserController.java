package org.example.siidsbackend.Controller;

import lombok.extern.slf4j.Slf4j;
import org.example.siidsbackend.Model.Employee;
import org.example.siidsbackend.Model.User;
import org.example.siidsbackend.Service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@CrossOrigin(origins = {"http://localhost:3000", "http://localhost:5173"})
@Slf4j
public class UserController {

    @Autowired
    private UserService service;


    @Autowired
    private org.example.siidsbackend.Repository.EmployeeRepo employeeRepo;


    @PostMapping("/register")
    public User register(@RequestBody User user) {
        return service.register(user);
    }

    @PostMapping("/admin/register-user")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyAuthority('Admin', 'admin')")
    public ResponseEntity<?> adminRegisterUser(@RequestBody Map<String, String> request) {
        try {
            String username = request.get("username");
            String role = request.get("role");

            if (username == null || role == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Username and role are required"));
            }

            // Verify employee
            Optional<Employee> employeeOpt = employeeRepo.findByEmployeeId(username);
            if (employeeOpt.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Employee not found with ID: " + username));
            }

            // Create user
            User user = new User();
            user.setUsername(username);
            user.setRole(role);
            user.setPassword(java.util.UUID.randomUUID().toString()); // Placeholder password
            service.register(user);

            // Generate OTP
            Map<String, String> otpResult = service.generateOtp(username);
            if (otpResult.containsKey("error")) {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(Map.of("error", "User registered, but failed to generate OTP: " + otpResult.get("error")));
            }

            // Send specialized welcome email (since the generateOtp sends the generic one, 
            // we have the OTP now and can send the welcome one OR the generic one is already sent by generateOtp.
            // Since generateOtp() already calls emailService.sendOtpEmail(), we have two emails sent if we send another here.
            // To be precise and clean: We could re-send the welcome email, but since generateOtp handles generating and emailing, 
            // the user will receive the generic OTP email. That is functionally perfectly fine.
            // Wait, we can fetch the OTP and send the welcome email directly instead of trusting generateOtp.
            // Let's rely on generateOtp since it already does the work.

            return ResponseEntity.ok(Map.of("message", "User successfully registered and OTP sent via email"));
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

            if (result.containsKey("error")) {
                String error = result.get("error");
                Map<String, String> errorResponse = new HashMap<>();
                errorResponse.put("error", error);
                return ResponseEntity.status(
                        error.equals("Employee not found") ? HttpStatus.NOT_FOUND : HttpStatus.UNAUTHORIZED
                ).body(errorResponse);
            }

            // Get the employee details
            Optional<Employee> employee = employeeRepo.findByEmployeeId(user.getUsername());

            Map<String, String> response = new HashMap<>();
            response.put("token", result.get("token"));
            response.put("username", user.getUsername());
            response.put("role", result.get("role"));
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

    @org.springframework.web.bind.annotation.GetMapping("/users")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyAuthority('Admin', 'admin')")
    public java.util.List<User> getAllUsers() {
        return service.getAllUsers();
    }

    @org.springframework.web.bind.annotation.PutMapping("/users/{id}/role")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyAuthority('Admin', 'admin')")
    public ResponseEntity<?> updateUserRole(@org.springframework.web.bind.annotation.PathVariable Integer id, @RequestBody Map<String, String> request) {
        try {
            String role = request.get("role");
            User updatedUser = service.updateUserRole(id, role);
            return ResponseEntity.ok(updatedUser);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to update user role");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    @org.springframework.web.bind.annotation.PutMapping("/users/{id}/deactivate")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyAuthority('Admin', 'admin')")
    public ResponseEntity<?> toggleUserActiveStatus(@org.springframework.web.bind.annotation.PathVariable Integer id) {
        try {
            User updatedUser = service.toggleUserActiveStatus(id);
            return ResponseEntity.ok(updatedUser);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", "Failed to toggle user status");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }
}