package org.example.siidsbackend.Config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Autowired
    private JwtFilter jwtFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

        return http.csrf(customizer -> customizer.disable())
                .cors(customizer -> customizer.configurationSource(request -> {
                    CorsConfiguration config = new CorsConfiguration();
                    config.setAllowedOrigins(List.of("http://localhost:3000", "http://localhost:5173"));
                    config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
                    config.setAllowedHeaders(List.of("*"));
                    config.setAllowCredentials(true);
                    return config;
                }))

                .authorizeHttpRequests(request -> request
                        .requestMatchers("/login", "/register", "/ws-notifications/**", "/api/auth/**",
                                "/reset-password", "/verify-otp", "/forgot-password")
                        .permitAll()
                        .requestMatchers("/api/cases/**").hasAnyAuthority("User", "Surveillance")
                        .requestMatchers("/api/reports/**")
                        .hasAnyAuthority("User", "Surveillance", "legalAdvisor", "AssistantCommissioner",
                                "DirectorIntelligence", "DirectorInvestigation")
                        .requestMatchers("/api/taxpayers/**").hasAnyAuthority("User", "Surveillance")
                        .requestMatchers("/api/informers/**").hasAnyAuthority("User", "Surveillance")
                        .requestMatchers("/api/departments").hasAnyAuthority("User", "Surveillance")
                        .requestMatchers("/api/employees/**").hasAnyAuthority("User", "Surveillance")
                        .requestMatchers("/api/audit/**").hasAnyAuthority("ROLE_AUDITOR")
                        .requestMatchers("/api/stock/**").authenticated()
                        .anyRequest().authenticated())
                .httpBasic(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}