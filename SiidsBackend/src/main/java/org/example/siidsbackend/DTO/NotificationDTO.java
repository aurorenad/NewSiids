package org.example.siidsbackend.DTO;

import lombok.Data;
import org.example.siidsbackend.Model.WorkflowStatus;

import java.time.LocalDateTime;

@Data
public class NotificationDTO {
    private Integer id;
    private String message;
    private Integer reportId;
    private String recipientId;
    private String recipientName;
    private String senderName;
    private LocalDateTime createdAt;
    private boolean read;
    private WorkflowStatus reportStatus;
    private String reportDescription;
    private String notificationType;
}