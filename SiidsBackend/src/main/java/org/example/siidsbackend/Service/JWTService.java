package org.example.siidsbackend.Service;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

@Service
@Slf4j
public class JWTService {

    private final SecretKey accessTokenKey;
    private final SecretKey refreshTokenKey;

    @Value("${jwt.access-token.expiration:900000}") // 15 minutes default
    private long accessTokenExpiration;

    @Value("${jwt.refresh-token.expiration:604800000}") // 7 days default
    private long refreshTokenExpiration;

    public JWTService() {
        this.accessTokenKey = Keys.secretKeyFor(SignatureAlgorithm.HS384);
        this.refreshTokenKey = Keys.secretKeyFor(SignatureAlgorithm.HS512);
    }

    public String generateToken(String username) {
        return Jwts.builder()
                .subject(username)
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + accessTokenExpiration))
                .signWith(accessTokenKey, SignatureAlgorithm.HS384)
                .compact();
    }

    public String generateRefreshToken(String username) {
        return Jwts.builder()
                .subject(username)
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + refreshTokenExpiration))
                .signWith(refreshTokenKey, SignatureAlgorithm.HS512)
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
            return false;
        }
    }

//    public boolean validateRefreshToken(String refreshToken) {
//        try {
//            Jwts.parser()
//                    .verifyWith(refreshTokenKey)
//                    .build()
//                    .parseSignedClaims(refreshToken);
//            return true;
//        } catch (Exception e) {
//            return false;
//        }
//    }

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