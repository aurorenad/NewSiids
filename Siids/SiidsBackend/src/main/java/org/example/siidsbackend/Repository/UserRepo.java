package org.example.siidsbackend.Repository;

import org.example.siidsbackend.Model.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Repository
public interface UserRepo extends JpaRepository<User, Integer> {
    Optional<User> findByUsername(String username);
    java.util.List<User> findByRole(String role);
    java.util.List<User> findByRoleIn(java.util.List<String> roles);

    @Modifying
    @Transactional
    @Query("UPDATE User u SET u.otp = :otp, u.otpExpiryTime = :expiry WHERE u.id = :id")
    void updateOtpFields(@Param("id") int id,
                         @Param("otp") String otp,
                         @Param("expiry") LocalDateTime expiry);
}
