package org.example.siidsbackend.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.example.siidsbackend.DTO.NotificationDTO;
import org.example.siidsbackend.Model.PhysicalStockStatus;
import org.example.siidsbackend.Model.SeizureNote;
import org.example.siidsbackend.Repository.SeizureNoteRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class StockNotificationScheduler {

    private final SeizureNoteRepository seizureNoteRepository;
    private final WebSocketNotificationService notificationService;

    /**
     * Runs every day at 8:00 AM to check for items approaching the 30-day deadline.
     */
    @Scheduled(cron = "0 0 8 * * ?")
    public void checkStockDeadlines() {
        log.info("Starting scheduled check for seizure note deadlines...");
        
        List<SeizureNote> pendingNotes = seizureNoteRepository.findByStatus(PhysicalStockStatus.IN_TEMPORARY_STOCK);
        pendingNotes.addAll(seizureNoteRepository.findByStatus(PhysicalStockStatus.RETURNED_FOR_CORRECTION));

        LocalDateTime now = LocalDateTime.now();

        for (SeizureNote note : pendingNotes) {
            if (note.getDateTimeSeized() == null) continue;

            long daysSinceSeizure = ChronoUnit.DAYS.between(note.getDateTimeSeized(), now);

            // Notify if between 25 and 30 days (Approaching deadline)
            if (daysSinceSeizure >= 25 && daysSinceSeizure < 30) {
                sendDeadlineNotification(note, "Approaching 30-day deadline (" + (30 - daysSinceSeizure) + " days remaining)");
            } 
            // Notify if 30 days or more (Deadline reached)
            else if (daysSinceSeizure >= 30) {
                sendDeadlineNotification(note, "URGENT: 30-day justification deadline reached!");
            }
        }
    }

    private void sendDeadlineNotification(SeizureNote note, String message) {
        if (note.getPvInCharge() == null) return;

        NotificationDTO dto = new NotificationDTO();
        dto.setMessage("Item " + note.getSeizureNumber() + ": " + message);
        dto.setSenderName("SYSTEM");
        dto.setCreatedAt(LocalDateTime.now());
        dto.setNotificationType("DEADLINE_WARNING");
        dto.setReportId(note.getId()); // Using ID for navigation if needed

        notificationService.sendNotificationToUser(note.getPvInCharge().getEmployeeId(), dto);
        log.info("Deadline notification sent for Seizure Note: {}", note.getSeizureNumber());
    }
}
