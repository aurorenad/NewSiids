package org.example.siidsbackend.Service;

import org.example.siidsbackend.Model.Permission;
import org.example.siidsbackend.Model.RbacRole;
import org.example.siidsbackend.Model.RolePermission;
import org.example.siidsbackend.Model.User;
import org.example.siidsbackend.Repository.PermissionRepository;
import org.example.siidsbackend.Repository.RbacRoleRepository;
import org.example.siidsbackend.Repository.RolePermissionRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@Transactional
public class RbacService {
    @Autowired
    private PermissionRepository permissionRepository;

    @Autowired
    private RbacRoleRepository rbacRoleRepository;

    @Autowired
    private RolePermissionRepository rolePermissionRepository;

    public Set<String> getPermissionsForRole(String role) {
        String normalizedRole = normalizeRole(role);
        if (normalizedRole == null) {
            return Set.of();
        }

        if ("ADMIN".equals(normalizedRole)) {
            return permissionRepository.findAll().stream()
                    .map(Permission::getName)
                    .collect(Collectors.toSet());
        }

        return rolePermissionRepository.findByRoleName(normalizedRole).stream()
                .map(rolePermission -> rolePermission.getPermission().getName())
                .collect(Collectors.toSet());
    }

    public RbacRole ensureRole(String roleName, String displayName) {
        String normalizedRole = normalizeRole(roleName);
        return rbacRoleRepository.findByName(normalizedRole).orElseGet(() -> {
            RbacRole role = new RbacRole();
            role.setName(normalizedRole);
            role.setDisplayName(displayName);
            return rbacRoleRepository.save(role);
        });
    }

    public Permission ensurePermission(String name, String description) {
        return permissionRepository.findByName(name).orElseGet(() -> {
            Permission permission = new Permission();
            permission.setName(name);
            permission.setDescription(description);
            return permissionRepository.save(permission);
        });
    }

    public void grantPermission(RbacRole role, Permission permission) {
        rolePermissionRepository.findByRoleAndPermission(role, permission).orElseGet(() -> {
            RolePermission rolePermission = new RolePermission();
            rolePermission.setRole(role);
            rolePermission.setPermission(permission);
            return rolePermissionRepository.save(rolePermission);
        });
    }

    public String normalizeRole(String role) {
        if (role == null || role.isBlank()) {
            return null;
        }
        return role.toUpperCase(Locale.ROOT)
                .replace("ROLE_", "")
                .replace(" ", "")
                .replace("_", "");
    }

    public boolean hasRole(User user, String role) {
        String userRole = user == null ? null : normalizeRole(user.getRole());
        String requiredRole = normalizeRole(role);
        return userRole != null && userRole.equals(requiredRole);
    }

    public boolean hasAnyRole(User user, String... roles) {
        if (user == null || roles == null) {
            return false;
        }
        for (String role : roles) {
            if (hasRole(user, role)) {
                return true;
            }
        }
        return false;
    }

    public boolean isAdmin(User user) {
        return hasRole(user, "Admin");
    }

    public List<String> getAllPermissionNames() {
        return permissionRepository.findAll().stream()
                .map(Permission::getName)
                .toList();
    }
}
