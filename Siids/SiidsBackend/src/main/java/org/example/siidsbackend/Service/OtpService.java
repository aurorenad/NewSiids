package org.example.siidsbackend.Service;

import org.example.siidsbackend.Model.OtpVerification;
import org.example.siidsbackend.Repository.OtpVerificationRepo;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.Optional;
import java.util.Random;

@Service
public class OtpService {

    @Autowired
    private OtpVerificationRepo otpRepo;

    public String sendOtp(String phoneNumber, String context, String referenceId) {
        // Generate 6-digit OTP
        String otp = String.format("%06d", new Random().nextInt(999999));
        
        // Hash the OTP
        String hashedOtp = hashString(otp);

        OtpVerification verification = new OtpVerification();
        verification.setPhoneNumber(phoneNumber);
        verification.setOtpHash(hashedOtp);
        verification.setContext(context);
        verification.setReferenceId(referenceId);
        verification.setExpiresAt(LocalDateTime.now().plusMinutes(10));
        otpRepo.save(verification);

        // Simulated SMS Send - Return this message so the frontend can auto-fill it per user's request
        return otp + " otp send to " + phoneNumber;
    }

    public boolean verifyOtp(String phoneNumber, String context, String enteredOtp) {
        Optional<OtpVerification> optVerification = otpRepo.findTopByPhoneNumberAndContextOrderByCreatedAtDesc(phoneNumber, context);
        if (optVerification.isPresent()) {
            OtpVerification verification = optVerification.get();
            
            // Check if already verified
            if (verification.getVerifiedAt() != null) {
                return false;
            }
            
            // Check expiry
            if (verification.getExpiresAt().isBefore(LocalDateTime.now())) {
                return false;
            }

            // Check hash
            String hashedEntered = hashString(enteredOtp);
            if (hashedEntered.equals(verification.getOtpHash())) {
                verification.setVerifiedAt(LocalDateTime.now());
                otpRepo.save(verification);
                return true;
            }
        }
        return false;
    }

    private String hashString(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(input.getBytes());
            return Base64.getEncoder().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("SHA-256 algorithm not found", e);
        }
    }
}
