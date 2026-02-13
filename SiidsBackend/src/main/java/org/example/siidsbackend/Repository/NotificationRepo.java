// NotificationRepo.java
package org.example.siidsbackend.Repository;

import org.example.siidsbackend.Model.Employee;
import org.example.siidsbackend.Model.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepo extends JpaRepository<Notification, Integer> {
    @Modifying
    @Query("UPDATE Notification n SET n.read = true WHERE n.recipient.employeeId = :employeeId")
    void markAllNotificationsAsRead(@Param("Id") List<Integer> id);

    List<Notification> findByRecipientAndReadFalseOrderByCreatedAtDesc(Employee employee);

    List<Notification> findByRecipientOrderByCreatedAtDesc(Employee employee);

    List<Notification> findByRecipientAndReadFalse(Employee employee);

    long countByRecipientAndReadFalse(Employee employee);
}