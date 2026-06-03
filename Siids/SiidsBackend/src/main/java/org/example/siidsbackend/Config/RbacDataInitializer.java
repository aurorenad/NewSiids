package org.example.siidsbackend.Config;

import org.example.siidsbackend.Model.Permission;
import org.example.siidsbackend.Model.RbacRole;
import org.example.siidsbackend.Service.RbacService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
@Order(2)
public class RbacDataInitializer implements CommandLineRunner {
    @Autowired
    private RbacService rbacService;

    private static final Map<String, String> PERMISSIONS = Map.ofEntries(
            Map.entry("USER_CREATE", "Create employee-backed user accounts"),
            Map.entry("USER_VIEW", "View users"),
            Map.entry("USER_ROLE_UPDATE", "Update user roles"),
            Map.entry("USER_STATUS_UPDATE", "Activate or deactivate users"),
            Map.entry("AUDIT_VIEW", "View audit logs"),
            Map.entry("REPORT_CREATE", "Create intelligence reports"),
            Map.entry("REPORT_VIEW", "View reports"),
            Map.entry("REPORT_APPROVE_INTELLIGENCE", "Approve intelligence reports"),
            Map.entry("REPORT_APPROVE_INVESTIGATION", "Approve investigation reports"),
            Map.entry("REPORT_APPROVE_ASSISTANT_COMMISSIONER", "Assistant Commissioner approvals"),
            Map.entry("REPORT_ASSIGN_INVESTIGATION", "Assign investigation work"),
            Map.entry("CASE_CREATE", "Create cases"),
            Map.entry("CASE_VIEW", "View cases"),
            Map.entry("CASE_UPDATE", "Update cases"),
            Map.entry("CASE_DELETE", "Delete cases"),
            Map.entry("INFORMER_VIEW", "View informer records"),
            Map.entry("INFORMER_MANAGE", "Create or update informer records"),
            Map.entry("TAXPAYER_VIEW", "View taxpayer records"),
            Map.entry("TAXPAYER_MANAGE", "Create or update taxpayer records"),
            Map.entry("EMPLOYEE_VIEW", "View employee records"),
            Map.entry("DEPARTMENT_VIEW", "View department records"),
            Map.entry("NOTIFICATION_VIEW", "View own notifications"),
            Map.entry("SURVEILLANCE_CREATE", "Create surveillance cases"),
            Map.entry("SURVEILLANCE_VIEW", "View surveillance cases"),
            Map.entry("STOCK_VIEW", "View stock records"),
            Map.entry("STOCK_MANAGE", "Manage stock records"),
            Map.entry("TEMP_STOCK_MANAGE", "Release or escalate temporary stock records"),
            Map.entry("STOCK_APPROVE_RELEASE", "Approve stock release actions"),
            Map.entry("REWARD_CREATE", "Create reward memos"),
            Map.entry("REWARD_VIEW", "View reward memos"),
            Map.entry("REWARD_APPROVE", "Approve or reject reward memos"),
            Map.entry("REWARD_PROCESS_FINANCE", "Process reward memo finance payment"),
            Map.entry("LEGAL_REVIEW", "Review legal referrals")
    );

    private static final Map<String, List<String>> ROLE_PERMISSIONS = Map.ofEntries(
            Map.entry("Admin", List.copyOf(PERMISSIONS.keySet())),
            Map.entry("User", List.of("REPORT_CREATE", "REPORT_VIEW", "CASE_CREATE", "CASE_VIEW", "CASE_UPDATE",
                    "INFORMER_VIEW", "INFORMER_MANAGE", "TAXPAYER_VIEW", "TAXPAYER_MANAGE", "EMPLOYEE_VIEW",
                    "DEPARTMENT_VIEW", "NOTIFICATION_VIEW")),
            Map.entry("IntelligenceOfficer", List.of("REPORT_CREATE", "REPORT_VIEW", "CASE_CREATE", "CASE_VIEW", "CASE_UPDATE",
                    "INFORMER_VIEW", "INFORMER_MANAGE", "TAXPAYER_VIEW", "TAXPAYER_MANAGE", "EMPLOYEE_VIEW",
                    "DEPARTMENT_VIEW", "NOTIFICATION_VIEW")),
            Map.entry("DirectorIntelligence", List.of("REPORT_VIEW", "REPORT_APPROVE_INTELLIGENCE", "REPORT_ASSIGN_INVESTIGATION",
                    "CASE_VIEW", "EMPLOYEE_VIEW", "DEPARTMENT_VIEW", "NOTIFICATION_VIEW")),
            Map.entry("InvestigationOfficer", List.of("REPORT_VIEW", "REPORT_CREATE", "CASE_VIEW", "CASE_UPDATE",
                    "INFORMER_VIEW", "TAXPAYER_VIEW", "EMPLOYEE_VIEW", "DEPARTMENT_VIEW", "NOTIFICATION_VIEW")),
            Map.entry("DirectorInvestigation", List.of("REPORT_VIEW", "REPORT_APPROVE_INVESTIGATION", "REPORT_ASSIGN_INVESTIGATION",
                    "CASE_VIEW", "EMPLOYEE_VIEW", "DEPARTMENT_VIEW", "NOTIFICATION_VIEW")),
            Map.entry("AssistantCommissioner", List.of("REPORT_VIEW", "REPORT_APPROVE_ASSISTANT_COMMISSIONER",
                    "CASE_VIEW", "EMPLOYEE_VIEW", "DEPARTMENT_VIEW", "NOTIFICATION_VIEW", "REWARD_APPROVE", "REWARD_VIEW")),
            Map.entry("Surveillance", List.of("SURVEILLANCE_CREATE", "SURVEILLANCE_VIEW", "STOCK_VIEW", "TEMP_STOCK_MANAGE",
                    "EMPLOYEE_VIEW", "DEPARTMENT_VIEW", "NOTIFICATION_VIEW")),
            Map.entry("StockManager", List.of("STOCK_VIEW", "STOCK_MANAGE", "EMPLOYEE_VIEW", "DEPARTMENT_VIEW", "NOTIFICATION_VIEW")),
            Map.entry("PRSO", List.of("STOCK_VIEW", "STOCK_APPROVE_RELEASE", "SURVEILLANCE_VIEW",
                    "EMPLOYEE_VIEW", "DEPARTMENT_VIEW", "NOTIFICATION_VIEW")),
            Map.entry("legalAdvisor", List.of("REPORT_VIEW", "LEGAL_REVIEW", "CASE_VIEW", "EMPLOYEE_VIEW",
                    "DEPARTMENT_VIEW", "NOTIFICATION_VIEW")),
            Map.entry("ROLE_AUDITOR", List.of("AUDIT_VIEW"))
    );

    @Override
    public void run(String... args) {
        PERMISSIONS.forEach(rbacService::ensurePermission);

        ROLE_PERMISSIONS.forEach((roleName, permissions) -> {
            RbacRole role = rbacService.ensureRole(roleName, roleName);
            permissions.forEach(permissionName -> {
                Permission permission = rbacService.ensurePermission(permissionName, PERMISSIONS.get(permissionName));
                rbacService.grantPermission(role, permission);
            });
        });
    }
}
