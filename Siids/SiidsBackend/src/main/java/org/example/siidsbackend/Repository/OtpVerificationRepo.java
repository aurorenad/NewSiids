package org.example.siidsbackend.Repository;

import org.example.siidsbackend.Model.OtpVerification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OtpVerificationRepo extends JpaRepository<OtpVerification, Integer> {
    Optional<OtpVerification> findTopByPhoneNumberAndContextOrderByCreatedAtDesc(String phoneNumber, String context);
    Optional<OtpVerification> findTopByReferenceIdAndContextOrderByCreatedAtDesc(String referenceId, String context);
}
