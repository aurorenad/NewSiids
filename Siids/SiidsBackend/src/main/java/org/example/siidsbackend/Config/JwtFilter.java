package org.example.siidsbackend.Config;

import lombok.extern.slf4j.Slf4j;
import org.example.siidsbackend.Repository.UserRepo;
import org.example.siidsbackend.Service.JWTService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@Slf4j
public class JwtFilter extends OncePerRequestFilter {

    private final JWTService jwtService;
    private final UserDetailsService userDetailsService;
    private final UserRepo userRepo;

    public JwtFilter(JWTService jwtService, @org.springframework.context.annotation.Lazy UserDetailsService userDetailsService, UserRepo userRepo) {
        this.jwtService = jwtService;
        this.userDetailsService = userDetailsService;
        this.userRepo = userRepo;
    }



    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        // Skip filter for auth endpoints
        String path = request.getServletPath();
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())
                || path.contains("/api/auth")
                || path.contains("/ws-notifications")
                || path.contains("/login")
                || path.contains("/forgot-password")
                || path.contains("/verify-otp")
                || path.contains("/reset-password")
                || path.contains("/setup-password")) {
            filterChain.doFilter(request, response);
            return;
        }

        final String authHeader = request.getHeader("Authorization");
        final String jwt;
        final String username;

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            log.warn("JwtFilter: Missing or invalid Authorization header for path: {}", path);
            filterChain.doFilter(request, response);
            return;
        }

        jwt = authHeader.substring(7);
        try {
            username = jwtService.extractUsername(jwt);
            log.info("JwtFilter: Processing request for user [{}] on path [{}]", username, path);

            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                UserDetails userDetails = this.userDetailsService.loadUserByUsername(username);
                if (jwtService.validateToken(jwt)) {
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities());
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                    log.info("JwtFilter: User {} authenticated successfully with roles {} for path {}", username, userDetails.getAuthorities(), path);
                    
                    // DIAGNOSTIC HEADERS
                    response.addHeader("X-Auth-User", username);
                    response.addHeader("X-Auth-Status", "Authenticated");
                    response.addHeader("X-Auth-Roles", userDetails.getAuthorities().toString());

                    if (!path.contains("/change-password")
                            && userRepo.findByUsername(username)
                                    .map(user -> Boolean.TRUE.equals(user.getMustChangePassword()))
                                    .orElse(false)) {
                        response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                        response.setContentType("application/json");
                        response.getWriter().write("{\"error\":\"Password change required\",\"mustChangePassword\":true}");
                        return;
                    }
                } else {
                    log.warn("JwtFilter: Token validation failed for user {} on path {}", username, path);
                    response.addHeader("X-Auth-Status", "Token-Invalid");
                }
            } else if (SecurityContextHolder.getContext().getAuthentication() != null) {
                response.addHeader("X-Auth-Status", "Already-Authenticated");
            } else {
                response.addHeader("X-Auth-Status", "Anonymous");
            }
        } catch (Exception e) {
            log.error("JwtFilter: Critical error processing JWT for path {}: {}", path, e.getMessage());
            response.addHeader("X-Auth-Error", e.getMessage());
            e.printStackTrace();
        }
        filterChain.doFilter(request, response);
    }
}
