// NotificationRepo.java
package org.example.siidsbackend.Repository;

import org.example.siidsbackend.Model.Employee;
import org.example.siidsbackend.Model.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepo extends JpaRepository<Notification, Integer> {
    List<Notification> findByRecipientEmployeeIdOrderByCreatedAtDesc(String employeeId);
    List<Notification> findByRecipientEmployeeIdAndIsReadFalseOrderByCreatedAtDesc(String employeeId);

    Page<Notification> findByRecipientEmployeeIdOrderByCreatedAtDesc(String employeeId, Pageable pageable);
    Page<Notification> findByRecipientEmployeeIdAndIsReadFalseOrderByCreatedAtDesc(String employeeId, Pageable pageable);

    @Modifying
    @Query("UPDATE Notification n SET n.isRead = true WHERE n.id IN :ids")
    void markAsRead(@Param("ids") List<Integer> ids);

    long countByRecipientEmployeeIdAndIsReadFalse(String employeeId);

    List<Notification> findByRecipientAndReadFalseOrderByCreatedAtDesc(Employee employee);

    List<Notification> findByRecipientOrderByCreatedAtDesc(Employee employee);

    List<Notification> findByRecipientAndReadFalse(Employee employee);

    long countByRecipientAndReadFalse(Employee employee);
}