package org.example.siidsbackend.Controller;

import lombok.RequiredArgsConstructor;
import org.example.siidsbackend.DTO.NotificationDTO;
import org.example.siidsbackend.Model.Notification;
import org.example.siidsbackend.Repository.NotificationRepo;
import org.example.siidsbackend.Repository.EmployeeRepo;
import org.example.siidsbackend.Model.Employee;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@Controller
@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationRepo notificationRepo;
    private final EmployeeRepo employeeRepo;

    private String getCurrentUser() {
        return org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
    }

    @MessageMapping("/connect")
    public void handleConnection(@Payload String employeeId, SimpMessageHeaderAccessor headerAccessor) {
        // Store employee ID in session attributes for user-specific messaging
        headerAccessor.getSessionAttributes().put("employeeId", employeeId);
        System.out.println("User connected: " + employeeId);
    }

    /**
     * Handle WebSocket disconnection
     */
    @MessageMapping("/disconnect")
    public void handleDisconnection(@Payload String employeeId) {
        System.out.println("User disconnected: " + employeeId);
    }

    /**
     * Get all notifications for a specific employee
     */
    @GetMapping("/employee/{employeeId}")
    @PreAuthorize("hasAuthority('NOTIFICATION_VIEW')")
    public ResponseEntity<List<NotificationDTO>> getNotificationsForEmployee(
            @PathVariable String employeeId,
            @RequestParam(defaultValue = "false") boolean unreadOnly) {
        String requestingEmployeeId = getCurrentUser();
        try {
            if (!employeeId.equals(requestingEmployeeId)) {
                return ResponseEntity.status(403).build();
            }

            Employee employee = employeeRepo.findByEmployeeId(employeeId)
                    .orElseThrow(() -> new RuntimeException("Employee not found"));

            List<Notification> notifications;
            if (unreadOnly) {
                notifications = notificationRepo.findByRecipientAndReadFalseOrderByCreatedAtDesc(employee);
            } else {
                notifications = notificationRepo.findByRecipientOrderByCreatedAtDesc(employee);
            }

            List<NotificationDTO> notificationDTOs = notifications.stream()
                    .map(this::convertToDTO)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(notificationDTOs);
        } catch (Exception e) {
            System.err.println("Error getting notifications: " + e.getMessage());
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * Mark notification as read
     */
    @PutMapping("/{notificationId}/read")
    @PreAuthorize("hasAuthority('NOTIFICATION_VIEW')")
    public ResponseEntity<Void> markAsRead(
            @PathVariable Integer notificationId) {
        String employeeId = getCurrentUser();
        try {
            Notification notification = notificationRepo.findById(notificationId)
                    .orElseThrow(() -> new RuntimeException("Notification not found"));

            // Check if the notification belongs to the requesting employee
            if (!notification.getRecipient().getEmployeeId().equals(employeeId)) {
                return ResponseEntity.status(403).build();
            }

            notification.setRead(true);
            notificationRepo.save(notification);

            return ResponseEntity.ok().build();
        } catch (Exception e) {
            System.err.println("Error marking notification as read: " + e.getMessage());
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * Mark all notifications as read for an employee
     */
    @PutMapping("/employee/{employeeId}/read-all")
    @PreAuthorize("hasAuthority('NOTIFICATION_VIEW')")
    public ResponseEntity<Void> markAllAsRead(
            @PathVariable String employeeId) {
        String requestingEmployeeId = getCurrentUser();
        try {
            // Check if the requesting employee is marking their own notifications
            if (!employeeId.equals(requestingEmployeeId)) {
                return ResponseEntity.status(403).build();
            }

            Employee employee = employeeRepo.findByEmployeeId(employeeId)
                    .orElseThrow(() -> new RuntimeException("Employee not found"));

            List<Notification> unreadNotifications =
                    notificationRepo.findByRecipientAndReadFalse(employee);

            unreadNotifications.forEach(notification -> notification.setRead(true));
            notificationRepo.saveAll(unreadNotifications);

            return ResponseEntity.ok().build();
        } catch (Exception e) {
            System.err.println("Error marking all notifications as read: " + e.getMessage());
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * Get unread notification count for an employee
     */
    @GetMapping("/employee/{employeeId}/unread-count")
    @PreAuthorize("hasAuthority('NOTIFICATION_VIEW')")
    public ResponseEntity<Long> getUnreadCount(@PathVariable String employeeId) {
        String requestingEmployeeId = getCurrentUser();
        try {
            if (!employeeId.equals(requestingEmployeeId)) {
                return ResponseEntity.status(403).build();
            }

            Employee employee = employeeRepo.findByEmployeeId(employeeId)
                    .orElseThrow(() -> new RuntimeException("Employee not found"));

            long count = notificationRepo.countByRecipientAndReadFalse(employee);
            return ResponseEntity.ok(count);
        } catch (Exception e) {
            System.err.println("Error getting unread count: " + e.getMessage());
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * Delete a notification
     */
    @DeleteMapping("/{notificationId}")
    @PreAuthorize("hasAuthority('NOTIFICATION_VIEW')")
    public ResponseEntity<Void> deleteNotification(
            @PathVariable Integer notificationId) {
        String employeeId = getCurrentUser();
        try {
            Notification notification = notificationRepo.findById(notificationId)
                    .orElseThrow(() -> new RuntimeException("Notification not found"));

            // Check if the notification belongs to the requesting employee
            if (!notification.getRecipient().getEmployeeId().equals(employeeId)) {
                return ResponseEntity.status(403).build();
            }

            notificationRepo.delete(notification);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            System.err.println("Error deleting notification: " + e.getMessage());
            return ResponseEntity.status(500).build();
        }
    }

    /**
     * Convert Notification entity to DTO
     */
    private NotificationDTO convertToDTO(Notification notification) {
        NotificationDTO dto = new NotificationDTO();
        dto.setId(notification.getId());
        dto.setMessage(notification.getMessage());
        
        if (notification.getReport() != null) {
            dto.setReportId(notification.getReport().getId());
            dto.setReportStatus(notification.getReport().getStatus());
            dto.setReportDescription(notification.getReport().getDescription());
            dto.setNotificationType(getNotificationType(notification.getReport().getStatus()));
            if (notification.getReport().getCreatedBy() != null) {
                dto.setSenderName(notification.getReport().getCreatedBy().getGivenName() + " " +
                        notification.getReport().getCreatedBy().getFamilyName());
            }
        }
        
        if (notification.getSenderName() != null) {
            dto.setSenderName(notification.getSenderName());
        }

        dto.setRecipientId(notification.getRecipient().getEmployeeId());
        dto.setRecipientName(notification.getRecipient().getGivenName() + " " +
                notification.getRecipient().getFamilyName());
        dto.setCreatedAt(notification.getCreatedAt());
        dto.setRead(notification.isRead());
        dto.setRelatedReference(notification.getRelatedReference());
        return dto;
    }

    private String getNotificationType(org.example.siidsbackend.Model.WorkflowStatus status) {
        if (status == null) {
            return "GENERAL_NOTIFICATION";
        }

        return switch (status) {
            case REPORT_SUBMITTED_TO_DIRECTOR_INTELLIGENCE -> "NEW_REPORT_DIRECTOR_INTELLIGENCE";
            case REPORT_SUBMITTED_TO_DIRECTOR_INVESTIGATION -> "NEW_REPORT_DIRECTOR_INVESTIGATION";
            case REPORT_SUBMITTED_TO_ASSISTANT_COMMISSIONER -> "NEW_REPORT_ASSISTANT_COMMISSIONER";
            case REPORT_ASSIGNED_TO_INVESTIGATION_OFFICER -> "REPORT_ASSIGNED_TO_INVESTIGATION_OFFICER";
            case REPORT_SENT_TO_LEGAL_TEAM -> "NEW_REPORT_LEGAL_ADVISOR";
            case REPORT_APPROVED_BY_DIRECTOR_INTELLIGENCE,
                 REPORT_APPROVED_BY_DIRECTOR_INVESTIGATION,
                 REPORT_APPROVED_BY_ASSISTANT_COMMISSIONER -> "REPORT_APPROVED";
            case REPORT_REJECTED_BY_DIRECTOR_INTELLIGENCE,
                 REPORT_REJECTED_BY_DIRECTOR_INVESTIGATION,
                 REPORT_REJECTED_BY_ASSISTANT_COMMISSIONER -> "REPORT_REJECTED";
            case REPORT_RETURNED_TO_INTELLIGENCE_OFFICER,
                 REPORT_RETURNED_TO_DIRECTOR_INVESTIGATION,
                 REPORT_RETURNED_TO_DIRECTOR_INTELLIGENCE,
                 REPORT_RETURNED_ASSISTANT_COMMISSIONER,
                 REPORT_RETURNED_TO_INVESTIGATION_OFFICER -> "REPORT_RETURNED";
            case INVESTIGATION_REPORT_SENT_TO_DIRECTOR_INVESTIGATION -> "INVESTIGATION_REPORT_SENT_TO_DIRECTOR_INVESTIGATION";
            case INVESTIGATION_REPORT_APPROVED_BY_DIRECTOR_INVESTIGATION,
                 INVESTIGATION_REPORT_APPROVED_BY_ASSISTANT_COMMISSIONER -> "INVESTIGATION_REPORT_APPROVED";
            case INVESTIGATION_REPORT_REJECTED_BY_DIRECTOR_INVESTIGATION,
                 INVESTIGATION_REPORT_REJECTED_BY_ASSISTANT_COMMISSIONER -> "INVESTIGATION_REPORT_RETURNED";
            default -> "GENERAL_NOTIFICATION";
        };
    }
}
