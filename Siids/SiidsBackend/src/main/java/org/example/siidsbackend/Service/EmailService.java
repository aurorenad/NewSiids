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

    @Value("${app.frontend-url:http://localhost:5173}")
    private String frontendUrl;

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
                    + "Please proceed to the login page and use the 'Forgot Password' feature to set your permanent password.\n\n"
                    + "If you did not request this, please contact your system administrator.");

            mailSender.send(message);
        } catch (MailException e) {
            log.error("Failed to send account creation email", e);
            throw new RuntimeException("Failed to send account creation email", e);
        }
    }

    public void sendAccountCreatedWelcomeEmail(String toEmail, String employeeId) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("SIIDS - Your Account Has Been Created");
            message.setText("Welcome!\n\n"
                    + "An account has been successfully created for you on the SIIDS platform.\n\n"
                    + "Your Employee ID (Username): " + employeeId + "\n"
                    + "Please proceed to the login page and use the 'Forgot Password' feature to set your permanent password.\n\n"
                    + "If you did not request this, please contact your system administrator.");

            mailSender.send(message);
        } catch (MailException e) {
            log.error("Failed to send welcome email", e);
            throw new RuntimeException("Failed to send welcome email", e);
        }
    }

    public void sendPasswordSetupEmail(String toEmail, String employeeId, String setupToken) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(fromEmail);
            message.setTo(toEmail);
            message.setSubject("SIIDS - Set Your Account Password");
            String setupLink = frontendUrl + "/setup-password?token=" + setupToken;
            message.setText("Welcome to SIIDS.\n\n"
                    + "Your account has been created.\n\n"
                    + "Employee ID (Username): " + employeeId + "\n"
                    + "Password setup link: " + setupLink + "\n\n"
                    + "This token expires in 60 minutes and can be used only once.\n\n"
                    + "If you did not expect this account, contact your system administrator.");

            mailSender.send(message);
        } catch (MailException e) {
            log.error("Failed to send password setup email", e);
            throw new RuntimeException("Failed to send password setup email", e);
        }
    }
}
