package org.example.siidsbackend.Repository;

import org.example.siidsbackend.Model.Permission;
import org.example.siidsbackend.Model.RbacRole;
import org.example.siidsbackend.Model.RolePermission;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RolePermissionRepository extends JpaRepository<RolePermission, Long> {
    List<RolePermission> findByRoleName(String roleName);
    Optional<RolePermission> findByRoleAndPermission(RbacRole role, Permission permission);
}
