package org.example.siidsbackend.Config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    @Autowired
    private JwtFilter jwtFilter;

    @Autowired
    private UserDetailsService userDetailsService;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

        return http.csrf(customizer -> customizer.disable())
                .cors(customizer -> customizer.configurationSource(request -> {
                    CorsConfiguration config = new CorsConfiguration();
                    config.setAllowedOrigins(List.of(
                        "http://localhost:3000", "http://localhost:5173", "http://localhost:5174",
                        "http://127.0.0.1:3000", "http://127.0.0.1:5173", "http://127.0.0.1:5174"
                    ));
                    config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
                    config.setAllowedHeaders(List.of("*"));
                    config.setExposedHeaders(List.of("Authorization", "X-Auth-User", "X-Auth-Status", "X-Auth-Roles", "X-Auth-Error"));
                    config.setAllowCredentials(true);
                    return config;
                }))

                .authorizeHttpRequests(request -> request
                        .requestMatchers("/login", "/register", "/ws-notifications/**", "/api/auth/**",
                                "/reset-password", "/verify-otp", "/forgot-password")
                        .permitAll()
                        .requestMatchers("/api/cases/**")
                        .hasAnyAuthority("User", "IntelligenceOfficer", "Surveillance", "DirectorIntelligence",
                                "DirectorIntelligenceCaseReports", "DirectorInvestigation", "InvestigationOfficer", "AssistantCommissioner", "Assistant Commissioner",
                                "legalAdvisor", "Admin", "admin")
                        .requestMatchers("/api/reports/**")
                        .hasAnyAuthority("User", "IntelligenceOfficer", "Surveillance", "legalAdvisor",
                                "AssistantCommissioner", "Assistant Commissioner",
                                "DirectorIntelligence", "DirectorInvestigation", "InvestigationOfficer", "Admin",
                                "admin")
                        .requestMatchers("/api/taxpayers/**")
                        .hasAnyAuthority("User", "IntelligenceOfficer", "Surveillance", "DirectorIntelligence",
                                "DirectorInvestigation", "InvestigationOfficer", "AssistantCommissioner", "Assistant Commissioner",
                                "legalAdvisor", "Admin", "admin")
                        .requestMatchers("/api/informers/**")
                        .hasAnyAuthority("User", "IntelligenceOfficer", "Surveillance", "DirectorIntelligence",
                                "DirectorInvestigation", "InvestigationOfficer", "AssistantCommissioner", "Assistant Commissioner",
                                "legalAdvisor", "Admin", "admin")
                        .requestMatchers("/api/departments")
                        .hasAnyAuthority("User", "IntelligenceOfficer", "Surveillance", "DirectorIntelligence",
                                "DirectorInvestigation", "InvestigationOfficer", "AssistantCommissioner",
                                "legalAdvisor", "Admin", "admin")
                        .requestMatchers("/api/employees/**")
                        .hasAnyAuthority("User", "IntelligenceOfficer", "Surveillance", "DirectorIntelligence",
                                "DirectorInvestigation", "InvestigationOfficer", "AssistantCommissioner",
                                "legalAdvisor", "Admin", "admin")
                        .requestMatchers("/api/audit/**").hasAuthority("ROLE_AUDITOR")
                        .requestMatchers("/api/stock/**")
                        .hasAnyAuthority("Admin", "admin", "StockManager", "stockmanager", "STOCK_MANAGER", "STOCKMANAGER", "ROLE_STOCKMANAGER", "PRSO", "prso", "Surveillance", "surveillance", "SURVEILLANCE", "SURVEILLANCE_OFFICER", "ROLE_SURVEILLANCE", "ROLE_SURVEILLANCE_OFFICER")
                        .requestMatchers("/api/reward-memos/**")
                        .hasAnyAuthority("User", "IntelligenceOfficer", "DirectorIntelligence", "AssistantCommissioner",
                                "Admin", "admin", "Finance")
                        .requestMatchers("/api/surveillance/**")
                        .hasAnyAuthority("User", "IntelligenceOfficer", "Surveillance", "surveillance", "SURVEILLANCE", "SURVEILLANCE_OFFICER", "ROLE_SURVEILLANCE", "ROLE_SURVEILLANCE_OFFICER", "DirectorIntelligence",
                                "AssistantCommissioner", "Admin", "admin")
                        .anyRequest().authenticated())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    @Bean
    public BCryptPasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder(12);
    }

    @SuppressWarnings("deprecation")
    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider();
        provider.setPasswordEncoder(passwordEncoder());
        provider.setUserDetailsService(userDetailsService);
        return provider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}