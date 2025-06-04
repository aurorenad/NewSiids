package org.example.siidsbackend.Service;

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

import java.util.Optional;

@Service
public class UserService {

    @Autowired
    private JWTService jwtService;

    @Autowired
    AuthenticationManager authManager;

    @Autowired
    private UserRepo repo;

    @Autowired
    private EmployeeRepo employeeRepo;

    private BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(12);

    public User register(User user) {
        user.setPassword(encoder.encode(user.getPassword()));
        repo.save(user);
        return user;
    }

    public String verify(User user) {
        System.out.println("=== Login Attempt ===");
        System.out.println("Username: " + user.getUsername());
        System.out.println("Password provided: " + (user.getPassword() != null ? "Yes" : "No"));

        // Check if employee exists
        Optional<Employee> employee = employeeRepo.findByEmployeeId(user.getUsername());
        if (employee.isEmpty()) {
            System.out.println("Employee not found: " + user.getUsername());
            return "Employee not found";
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
//                (token != null ? "Yes" : "No")+

                return token;
            } else {
                System.out.println("Authentication failed - not authenticated");
                return "Authentication failed";
            }
        } catch (BadCredentialsException e) {
            System.out.println("Bad credentials: " + e.getMessage());
            return "Authentication failed";
        } catch (AuthenticationException e) {
            System.out.println("Authentication exception: " + e.getMessage());
            return "Authentication failed";
        } catch (Exception e) {
            System.out.println("Unexpected error during authentication: " + e.getMessage());
            e.printStackTrace();
            return "Authentication failed";
        }
    }
}