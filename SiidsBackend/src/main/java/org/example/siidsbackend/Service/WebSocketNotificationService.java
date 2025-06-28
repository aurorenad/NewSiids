package org.example.siidsbackend.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.siidsbackend.DTO.NotificationDTO;
import org.example.siidsbackend.Model.Employee;
import org.example.siidsbackend.Model.Notification;
import org.example.siidsbackend.Model.Report;
import org.example.siidsbackend.Repository.NotificationRepo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class WebSocketNotificationService {

    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationRepo notificationRepo;


    public void sendNotificationToUser(String employeeId, NotificationDTO notification) {
        try {
            String destination = "/user/" + employeeId + "/notifications";
            messagingTemplate.convertAndSend(destination, notification);
            log.info("Notification sent to user {} at destination {}", employeeId, destination);
        } catch (Exception e) {
            log.error("Failed to send notification to user {}: {}", employeeId, e.getMessage());
        }
    }

    /**
     * Send notification to all directors of intelligence
     */
    public void sendNotificationToDirectorsIntelligence(NotificationDTO notification) {
        try {
            String destination = "/topic/directors/intelligence";
            messagingTemplate.convertAndSend(destination, notification);
            log.info("Notification sent to all Directors of Intelligence");
        } catch (Exception e) {
            log.error("Failed to send notification to Directors of Intelligence: {}", e.getMessage());
        }
    }

    /**
     * Send notification to all directors of investigation
     */
    public void sendNotificationToDirectorsInvestigation(NotificationDTO notification) {
        try {
            String destination = "/topic/directors/investigation";
            messagingTemplate.convertAndSend(destination, notification);
            log.info("Notification sent to all Directors of Investigation");
        } catch (Exception e) {
            log.error("Failed to send notification to Directors of Investigation: {}", e.getMessage());
        }
    }

    /**
     * Send notification to all assistant commissioners
     */
    public void sendNotificationToAssistantCommissioners(NotificationDTO notification) {
        try {
            String destination = "/topic/assistant-commissioners";
            messagingTemplate.convertAndSend(destination, notification);
            log.info("Notification sent to all Assistant Commissioners");
        } catch (Exception e) {
            log.error("Failed to send notification to Assistant Commissioners: {}", e.getMessage());
        }
    }

    /**
     * Create and save notification in database, then send real-time notification
     */
    public void createAndSendNotification(Report report, String message, Employee recipient) {
        try {
            // Save notification in database
            Notification notification = new Notification();
            notification.setMessage(message);
            notification.setRecipient(recipient);
            notification.setReport(report);
            notification.setCreatedAt(LocalDateTime.now());
            notification.setRead(false);

            Notification savedNotification = notificationRepo.save(notification);

            // Create DTO for real-time notification
            NotificationDTO notificationDTO = createNotificationDTO(savedNotification);

            // Send real-time notification
            sendNotificationToUser(recipient.getEmployeeId(), notificationDTO);

        } catch (Exception e) {
            log.error("Failed to create and send notification: {}", e.getMessage());
        }
    }

    /**
     * Create notification DTO from notification entity
     */
    private NotificationDTO createNotificationDTO(Notification notification) {
        NotificationDTO dto = new NotificationDTO();
        dto.setId(notification.getId());
        dto.setMessage(notification.getMessage());
        dto.setReportId(notification.getReport().getId());
        dto.setRecipientId(notification.getRecipient().getEmployeeId());
        dto.setRecipientName(notification.getRecipient().getGivenName() + " " +
                notification.getRecipient().getFamilyName());
        dto.setCreatedAt(notification.getCreatedAt());
        dto.setRead(notification.isRead());
        dto.setReportStatus(notification.getReport().getStatus());
        dto.setReportDescription(notification.getReport().getDescription());
        return dto;
    }

    public NotificationDTO createNotificationDTO(Report report, String message, Employee recipient) {
        NotificationDTO dto = new NotificationDTO();
        dto.setMessage(message);
        dto.setReportId(report.getId());
        dto.setRecipientId(recipient.getEmployeeId());
        dto.setRecipientName(recipient.getGivenName() + " " + recipient.getFamilyName());
        dto.setCreatedAt(LocalDateTime.now());
        dto.setRead(false);
        dto.setReportStatus(report.getStatus());
        dto.setReportDescription(report.getDescription());
        dto.setSenderName(report.getCreatedBy().getGivenName() + " " +
                report.getCreatedBy().getFamilyName());
        return dto;
    }
}