package org.example.siidsbackend.Controller;

import org.example.siidsbackend.Service.OtpService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/otp")
public class OtpController {

    @Autowired
    private OtpService otpService;

    @PostMapping("/send")
    public ResponseEntity<?> sendOtp(@RequestBody Map<String, String> request) {
        String phoneNumber = request.get("phoneNumber");
        String context = request.get("context");
        String referenceId = request.get("referenceId");

        if (phoneNumber == null || context == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "phoneNumber and context are required"));
        }

        String simulationMessage = otpService.sendOtp(phoneNumber, context, referenceId);
        return ResponseEntity.ok(Map.of("message", simulationMessage));
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verifyOtp(@RequestBody Map<String, String> request) {
        String phoneNumber = request.get("phoneNumber");
        String context = request.get("context");
        String otp = request.get("otp");

        if (phoneNumber == null || context == null || otp == null) {
            return ResponseEntity.badRequest().body(Map.of("message", "phoneNumber, context, and otp are required"));
        }

        boolean isValid = otpService.verifyOtp(phoneNumber, context, otp);
        if (isValid) {
            return ResponseEntity.ok(Map.of("message", "OTP verified successfully"));
        } else {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid or expired OTP"));
        }
    }
}
