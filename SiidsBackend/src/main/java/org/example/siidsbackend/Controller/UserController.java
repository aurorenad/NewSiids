package org.example.siidsbackend.Controller;

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

}