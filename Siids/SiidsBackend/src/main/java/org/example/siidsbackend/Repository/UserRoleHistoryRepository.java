package org.example.siidsbackend.Repository;

import org.example.siidsbackend.Model.UserRoleHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserRoleHistoryRepository extends JpaRepository<UserRoleHistory, Long> {
    List<UserRoleHistory> findByUsernameOrderByChangedAtDesc(String username);
}
