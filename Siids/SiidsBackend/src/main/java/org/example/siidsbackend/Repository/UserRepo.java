package org.example.siidsbackend.Repository;

import org.example.siidsbackend.Model.User;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface UserRepo extends JpaRepository<User, Integer> {
    Optional<User> findByUsername(String username);
    Optional<User> findByPasswordSetupToken(String passwordSetupToken);
    java.util.List<User> findByRole(String role);
    java.util.List<User> findByRoleIn(java.util.List<String> roles);

    @Query("SELECT u FROM User u WHERE LOWER(REPLACE(REPLACE(REPLACE(u.role, 'ROLE_', ''), ' ', ''), '_', '')) = :normalizedRole")
    List<User> findByNormalizedRole(@Param("normalizedRole") String normalizedRole);

    @Query("SELECT u FROM User u WHERE LOWER(REPLACE(REPLACE(REPLACE(u.role, 'ROLE_', ''), ' ', ''), '_', '')) IN :normalizedRoles")
    List<User> findByNormalizedRoleIn(@Param("normalizedRoles") List<String> normalizedRoles);

    @Query("""
            SELECT u FROM User u
            WHERE :search IS NULL OR :search = ''
               OR LOWER(u.username) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(u.role) LIKE LOWER(CONCAT('%', :search, '%'))
               OR (:search = 'active' AND u.active = true)
               OR (:search = 'deactivated' AND (u.active = false OR u.active IS NULL))
            """)
    Page<User> searchUsers(@Param("search") String search, Pageable pageable);

    @Query("""
            SELECT u FROM User u
            WHERE LOWER(REPLACE(REPLACE(REPLACE(u.role, 'ROLE_', ''), ' ', ''), '_', '')) <> 'admin'
              AND (:search IS NULL OR :search = ''
               OR LOWER(u.username) LIKE LOWER(CONCAT('%', :search, '%'))
               OR LOWER(u.role) LIKE LOWER(CONCAT('%', :search, '%'))
               OR (:search = 'active' AND u.active = true)
               OR (:search = 'deactivated' AND (u.active = false OR u.active IS NULL)))
            """)
    Page<User> searchManageableUsers(@Param("search") String search, Pageable pageable);

    @Modifying
    @Transactional
    @Query("UPDATE User u SET u.otp = :otp, u.otpExpiryTime = :expiry WHERE u.id = :id")
    void updateOtpFields(@Param("id") int id,
                         @Param("otp") String otp,
                         @Param("expiry") LocalDateTime expiry);
}
