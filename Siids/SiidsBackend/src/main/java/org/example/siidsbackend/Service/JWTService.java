package org.example.siidsbackend.Service;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import javax.crypto.SecretKey;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Service
@Slf4j
public class JWTService {

    private SecretKey accessTokenKey;
    private SecretKey refreshTokenKey;

    @Value("${jwt.access-token.expiration:900000}") // 15 minutes default
    private long accessTokenExpiration;

    @Value("${jwt.refresh-token.expiration:604800000}") // 7 days default
    private long refreshTokenExpiration;

    @Value("${jwt.secret:404E635266556A586E3272357538782F413F4428472B4B6250645367566B5970}")
    private String secretKey;

    public JWTService() {
        // Keys will be initialized in init() or directly if we move logic
    }

    @PostConstruct
    public void init() {
        byte[] keyBytes = io.jsonwebtoken.io.Decoders.BASE64.decode(secretKey);
        this.accessTokenKey = Keys.hmacShaKeyFor(keyBytes);
        this.refreshTokenKey = Keys.hmacShaKeyFor(keyBytes); // Using same key for simplicity, or add another property
        log.info("JWT Service initialized with fixed secret key.");
    }

    public String generateToken(String username) {
        return Jwts.builder()
                .subject(username)
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + accessTokenExpiration))
                .signWith(accessTokenKey)
                .compact();
    }

    public String generateRefreshToken(String username) {
        return Jwts.builder()
                .subject(username)
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + refreshTokenExpiration))
                .signWith(refreshTokenKey)
                .compact();
    }

    public Map<String, String> refreshAccessToken(String refreshToken) {
        if (!validateRefreshToken(refreshToken)) {
            throw new RuntimeException("Invalid refresh token");
        }

        String username = extractUsernameFromRefreshToken(refreshToken);

        Map<String, String> tokens = new HashMap<>();
        tokens.put("token", generateToken(username));
        tokens.put("refreshToken", generateRefreshToken(username));

        return tokens;
    }

    public boolean validateToken(String token) {
        try {
            Jwts.parser()
                    .verifyWith(accessTokenKey)
                    .build()
                    .parseSignedClaims(token);
            return true;
        } catch (Exception e) {
            log.error("Token validation failed: {}", e.getMessage());
            return false;
        }
    }

    // public boolean validateRefreshToken(String refreshToken) {
    // try {
    // Jwts.parser()
    // .verifyWith(refreshTokenKey)
    // .build()
    // .parseSignedClaims(refreshToken);
    // return true;
    // } catch (Exception e) {
    // return false;
    // }
    // }

    public boolean validateRefreshToken(String refreshToken) {
        try {
            Jwts.parser()
                    .verifyWith(refreshTokenKey)
                    .build()
                    .parseSignedClaims(refreshToken);
            return true;
        } catch (Exception e) {
            log.error("Invalid refresh token: {}", e.getMessage());
            return false;
        }
    }

    public String extractUsername(String token) {
        return Jwts.parser()
                .verifyWith(accessTokenKey)
                .build()
                .parseSignedClaims(token)
                .getPayload()
                .getSubject();
    }

    public String extractUsernameFromRefreshToken(String refreshToken) {
        return Jwts.parser()
                .verifyWith(refreshTokenKey)
                .build()
                .parseSignedClaims(refreshToken)
                .getPayload()
                .getSubject();
    }
}