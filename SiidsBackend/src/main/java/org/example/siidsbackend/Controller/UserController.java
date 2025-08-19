package org.example.siidsbackend.Controller;

import lombok.extern.slf4j.Slf4j;
import org.example.siidsbackend.Model.Employee;
import org.example.siidsbackend.Model.User;
import org.example.siidsbackend.Service.JWTService;
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
    private JWTService jwtService;

    @Autowired
    private org.example.siidsbackend.Repository.EmployeeRepo employeeRepo;


    @PostMapping("/register")
    public User register(@RequestBody User user) {
        return service.register(user);

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
}