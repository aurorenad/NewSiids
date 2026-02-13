package org.example.siidsbackend.Service;

import lombok.extern.slf4j.Slf4j;
import org.example.siidsbackend.Model.Employee;
import org.example.siidsbackend.Model.User;
import org.example.siidsbackend.Repository.EmployeeRepo;
import org.example.siidsbackend.Repository.UserRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Random;

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

    private BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(12);

    public User register(User user) {
        user.setPassword(encoder.encode(user.getPassword()));
        repo.save(user);
        return user;
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

        try {
            Authentication authentication = authManager.authenticate(
                    new UsernamePasswordAuthenticationToken(user.getUsername(), user.getPassword()));

            if (authentication.isAuthenticated()) {
                System.out.println("Authentication successful");
                String token = jwtService.generateToken(user.getUsername());
                System.out.println("Login request received for user: " + user.getUsername());
                System.out.println("Token generated: " + token);

                User dbUser = repo.findByUsername(user.getUsername());
                if (dbUser != null) {
                    response.put("token", token);
                    response.put("role", dbUser.getRole());
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
            response.put("error", "Authentication failed");
            return response;
        } catch (AuthenticationException e) {
            System.err.println("Authentication exception for user " + user.getUsername() + ": " + e.getMessage());
            response.put("error", "Authentication failed");
            return response;
        } catch (Exception e) {
            System.err.println(
                    "Unexpected error during authentication for user " + user.getUsername() + ": " + e.getMessage());
            e.printStackTrace();
            response.put("error", "Authentication failed");
            return response;
        }
    }

    public Map<String, String> generateOtp(String username) {
        Map<String, String> response = new HashMap<>();

        try {
            User user = repo.findByUsername(username);
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

            emailService.sendOtpEmail(email, otp);

            response.put("message", "OTP sent to registered email");
            return response;
        } catch (Exception e) {
            log.error("Error generating OTP", e);
            response.put("error", "Failed to generate OTP: " + e.getMessage());
            return response;
        }
    }

    public Map<String, String> verifyOtp(String username, String otp) {
        Map<String, String> response = new HashMap<>();

        User user = repo.findByUsername(username);
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
        User user = repo.findByUsername(username);
        user.setPassword(encoder.encode(newPassword));
        user.setOtp(null); // Clear OTP after use
        user.setOtpExpiryTime(null);
        repo.save(user);

        response.put("message", "Password reset successfully");
        return response;
    }
}