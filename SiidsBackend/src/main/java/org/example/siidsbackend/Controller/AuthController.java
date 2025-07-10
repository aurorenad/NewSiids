package org.example.siidsbackend.Controller;

import org.example.siidsbackend.Service.JWTService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);
    private final JWTService jwtService;

    public AuthController(JWTService jwtService) {
        this.jwtService = jwtService;
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refreshToken(@RequestBody Map<String, String> request) {
        logger.debug("Received refresh token request: {}", request);

        String refreshToken = request.get("refreshToken");
        logger.debug("Extracted refresh token: {}", refreshToken != null ? "***" + refreshToken.substring(Math.max(0, refreshToken.length() - 10)) : "null");

        if (refreshToken == null || refreshToken.isEmpty()) {
            logger.warn("Refresh token is null or empty");
            return ResponseEntity.badRequest().body("Refresh token is required");
        }

        try {
            Map<String, String> newTokens = jwtService.refreshAccessToken(refreshToken);
            logger.debug("Successfully refreshed tokens");
            return ResponseEntity.ok(newTokens);
        } catch (Exception e) {
            logger.error("Failed to refresh token: {}", e.getMessage());
            return ResponseEntity.status(401).body("Invalid refresh token");
        }
    }
}