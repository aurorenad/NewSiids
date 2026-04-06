package org.example.siidsbackend.Service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    public void sendOtpEmail(String toEmail, String otp) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("Password Reset OTP");
            message.setText("Your OTP is: " + otp + "\nValid for 10 minutes.");

            mailSender.send(message);
        } catch (MailException e) {
            log.error("Failed to send OTP email", e);
            throw new RuntimeException("Failed to send OTP email", e);
        }
    }

    public void sendAccountCreatedEmail(String toEmail, String employeeId, String otp) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("SIIDS - Your Account Has Been Created");
            message.setText("Welcome!\n\n"
                    + "An account has been successfully created for you on the SIIDS platform.\n\n"
                    + "Your Employee ID (Username): " + employeeId + "\n"
                    + "Please use the following OTP (One-Time Password) to complete your setup and set your permanent password via the Forgot Password page.\n\n"
                    + "OTP: " + otp + "\n\n"
                    + "This OTP is valid for 10 minutes.\n"
                    + "If you did not request this, please contact your system administrator.");

            mailSender.send(message);
        } catch (MailException e) {
            log.error("Failed to send account creation email", e);
            throw new RuntimeException("Failed to send account creation email", e);
        }
    }
}