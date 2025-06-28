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

    /**
     * Handle WebSocket connection messages
     */
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
    public ResponseEntity<List<NotificationDTO>> getNotificationsForEmployee(
            @PathVariable String employeeId,
            @RequestParam(defaultValue = "false") boolean unreadOnly) {
        try {
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
    public ResponseEntity<Void> markAsRead(
            @PathVariable Integer notificationId,
            @RequestHeader("employee_id") String employeeId) {
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
    public ResponseEntity<Void> markAllAsRead(
            @PathVariable String employeeId,
            @RequestHeader("employee_id") String requestingEmployeeId) {
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
    public ResponseEntity<Long> getUnreadCount(@PathVariable String employeeId) {
        try {
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
    public ResponseEntity<Void> deleteNotification(
            @PathVariable Integer notificationId,
            @RequestHeader("employee_id") String employeeId) {
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
        dto.setReportId(notification.getReport().getId());
        dto.setRecipientId(notification.getRecipient().getEmployeeId());
        dto.setRecipientName(notification.getRecipient().getGivenName() + " " +
                notification.getRecipient().getFamilyName());
        dto.setCreatedAt(notification.getCreatedAt());
        dto.setRead(notification.isRead());
        dto.setReportStatus(notification.getReport().getStatus());
        dto.setReportDescription(notification.getReport().getDescription());
        dto.setSenderName(notification.getReport().getCreatedBy().getGivenName() + " " +
                notification.getReport().getCreatedBy().getFamilyName());
        return dto;
    }
}