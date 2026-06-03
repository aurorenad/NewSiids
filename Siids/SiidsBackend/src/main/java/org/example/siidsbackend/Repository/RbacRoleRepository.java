package org.example.siidsbackend.Repository;

import org.example.siidsbackend.Model.RbacRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RbacRoleRepository extends JpaRepository<RbacRole, Long> {
    Optional<RbacRole> findByName(String name);
}
