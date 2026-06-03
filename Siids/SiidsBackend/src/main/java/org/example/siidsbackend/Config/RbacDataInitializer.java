package org.example.siidsbackend.Config;

import org.example.siidsbackend.Model.Permission;
import org.example.siidsbackend.Model.RbacRole;
import org.example.siidsbackend.Service.RbacService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;

@Component
@Order(2)
@Profile("!test")
public class RbacDataInitializer implements CommandLineRunner {
    @Autowired
    private RbacService rbacService;

    private static final String ROLE_ADMIN = "Admin";
    private static final String ROLE_USER = "User";
    private static final String ROLE_INTELLIGENCE_OFFICER = "IntelligenceOfficer";
    private static final String ROLE_DIRECTOR_INTELLIGENCE = "DirectorIntelligence";
    private static final String ROLE_INVESTIGATION_OFFICER = "InvestigationOfficer";
    private static final String ROLE_DIRECTOR_INVESTIGATION = "DirectorInvestigation";
    private static final String ROLE_ASSISTANT_COMMISSIONER = "AssistantCommissioner";
    private static final String ROLE_SURVEILLANCE = "Surveillance";
    private static final String ROLE_STOCK_MANAGER = "StockManager";
    private static final String ROLE_PRSO = "PRSO";
    private static final String ROLE_LEGAL_ADVISOR = "LegalAdvisor";
    private static final String ROLE_AUDITOR = "ROLE_AUDITOR";

    private static final String USER_CREATE = "USER_CREATE";
    private static final String USER_VIEW = "USER_VIEW";
    private static final String USER_ROLE_UPDATE = "USER_ROLE_UPDATE";
    private static final String USER_STATUS_UPDATE = "USER_STATUS_UPDATE";
    private static final String AUDIT_VIEW = "AUDIT_VIEW";
    private static final String REPORT_CREATE = "REPORT_CREATE";
    private static final String REPORT_VIEW = "REPORT_VIEW";
    private static final String REPORT_APPROVE_INTELLIGENCE = "REPORT_APPROVE_INTELLIGENCE";
    private static final String REPORT_APPROVE_INVESTIGATION = "REPORT_APPROVE_INVESTIGATION";
    private static final String REPORT_APPROVE_ASSISTANT_COMMISSIONER = "REPORT_APPROVE_ASSISTANT_COMMISSIONER";
    private static final String REPORT_ASSIGN_INVESTIGATION = "REPORT_ASSIGN_INVESTIGATION";
    private static final String CASE_CREATE = "CASE_CREATE";
    private static final String CASE_VIEW = "CASE_VIEW";
    private static final String CASE_UPDATE = "CASE_UPDATE";
    private static final String CASE_DELETE = "CASE_DELETE";
    private static final String INFORMER_VIEW = "INFORMER_VIEW";
    private static final String INFORMER_MANAGE = "INFORMER_MANAGE";
    private static final String TAXPAYER_VIEW = "TAXPAYER_VIEW";
    private static final String TAXPAYER_MANAGE = "TAXPAYER_MANAGE";
    private static final String EMPLOYEE_VIEW = "EMPLOYEE_VIEW";
    private static final String DEPARTMENT_VIEW = "DEPARTMENT_VIEW";
    private static final String NOTIFICATION_VIEW = "NOTIFICATION_VIEW";
    private static final String SURVEILLANCE_CREATE = "SURVEILLANCE_CREATE";
    private static final String SURVEILLANCE_VIEW = "SURVEILLANCE_VIEW";
    private static final String STOCK_VIEW = "STOCK_VIEW";
    private static final String STOCK_MANAGE = "STOCK_MANAGE";
    private static final String TEMP_STOCK_MANAGE = "TEMP_STOCK_MANAGE";
    private static final String STOCK_APPROVE_RELEASE = "STOCK_APPROVE_RELEASE";
    private static final String REWARD_CREATE = "REWARD_CREATE";
    private static final String REWARD_VIEW = "REWARD_VIEW";
    private static final String REWARD_APPROVE = "REWARD_APPROVE";
    private static final String REWARD_PROCESS_FINANCE = "REWARD_PROCESS_FINANCE";
    private static final String LEGAL_REVIEW = "LEGAL_REVIEW";

    private static final Map<String, String> PERMISSIONS = Map.ofEntries(
            Map.entry(USER_CREATE, "Create employee-backed user accounts"),
            Map.entry(USER_VIEW, "View users"),
            Map.entry(USER_ROLE_UPDATE, "Update user roles"),
            Map.entry(USER_STATUS_UPDATE, "Activate or deactivate users"),
            Map.entry(AUDIT_VIEW, "View audit logs"),
            Map.entry(REPORT_CREATE, "Create intelligence reports"),
            Map.entry(REPORT_VIEW, "View reports"),
            Map.entry(REPORT_APPROVE_INTELLIGENCE, "Approve intelligence reports"),
            Map.entry(REPORT_APPROVE_INVESTIGATION, "Approve investigation reports"),
            Map.entry(REPORT_APPROVE_ASSISTANT_COMMISSIONER, "Assistant Commissioner approvals"),
            Map.entry(REPORT_ASSIGN_INVESTIGATION, "Assign investigation work"),
            Map.entry(CASE_CREATE, "Create cases"),
            Map.entry(CASE_VIEW, "View cases"),
            Map.entry(CASE_UPDATE, "Update cases"),
            Map.entry(CASE_DELETE, "Delete cases"),
            Map.entry(INFORMER_VIEW, "View informer records"),
            Map.entry(INFORMER_MANAGE, "Create or update informer records"),
            Map.entry(TAXPAYER_VIEW, "View taxpayer records"),
            Map.entry(TAXPAYER_MANAGE, "Create or update taxpayer records"),
            Map.entry(EMPLOYEE_VIEW, "View employee records"),
            Map.entry(DEPARTMENT_VIEW, "View department records"),
            Map.entry(NOTIFICATION_VIEW, "View own notifications"),
            Map.entry(SURVEILLANCE_CREATE, "Create surveillance cases"),
            Map.entry(SURVEILLANCE_VIEW, "View surveillance cases"),
            Map.entry(STOCK_VIEW, "View stock records"),
            Map.entry(STOCK_MANAGE, "Manage stock records"),
            Map.entry(TEMP_STOCK_MANAGE, "Release or escalate temporary stock records"),
            Map.entry(STOCK_APPROVE_RELEASE, "Approve stock release actions"),
            Map.entry(REWARD_CREATE, "Create reward memos"),
            Map.entry(REWARD_VIEW, "View reward memos"),
            Map.entry(REWARD_APPROVE, "Approve or reject reward memos"),
            Map.entry(REWARD_PROCESS_FINANCE, "Process reward memo finance payment"),
            Map.entry(LEGAL_REVIEW, "Review legal referrals")
    );

    private static final Map<String, List<String>> ROLE_PERMISSIONS = Map.ofEntries(
            Map.entry(ROLE_ADMIN, List.copyOf(PERMISSIONS.keySet())),
            Map.entry(ROLE_USER, List.of(REPORT_CREATE, REPORT_VIEW, CASE_CREATE, CASE_VIEW, CASE_UPDATE,
                    INFORMER_VIEW, INFORMER_MANAGE, TAXPAYER_VIEW, TAXPAYER_MANAGE, EMPLOYEE_VIEW,
                    DEPARTMENT_VIEW, NOTIFICATION_VIEW)),
            Map.entry(ROLE_INTELLIGENCE_OFFICER, List.of(REPORT_CREATE, REPORT_VIEW, CASE_CREATE, CASE_VIEW, CASE_UPDATE,
                    INFORMER_VIEW, INFORMER_MANAGE, TAXPAYER_VIEW, TAXPAYER_MANAGE, EMPLOYEE_VIEW,
                    DEPARTMENT_VIEW, NOTIFICATION_VIEW)),
            Map.entry(ROLE_DIRECTOR_INTELLIGENCE, List.of(REPORT_VIEW, REPORT_APPROVE_INTELLIGENCE, REPORT_ASSIGN_INVESTIGATION,
                    CASE_VIEW, EMPLOYEE_VIEW, DEPARTMENT_VIEW, NOTIFICATION_VIEW)),
            Map.entry(ROLE_INVESTIGATION_OFFICER, List.of(REPORT_VIEW, REPORT_CREATE, CASE_VIEW, CASE_UPDATE,
                    INFORMER_VIEW, TAXPAYER_VIEW, EMPLOYEE_VIEW, DEPARTMENT_VIEW, NOTIFICATION_VIEW)),
            Map.entry(ROLE_DIRECTOR_INVESTIGATION, List.of(REPORT_VIEW, REPORT_APPROVE_INVESTIGATION, REPORT_ASSIGN_INVESTIGATION,
                    CASE_VIEW, EMPLOYEE_VIEW, DEPARTMENT_VIEW, NOTIFICATION_VIEW)),
            Map.entry(ROLE_ASSISTANT_COMMISSIONER, List.of(REPORT_VIEW, REPORT_APPROVE_ASSISTANT_COMMISSIONER,
                    CASE_VIEW, EMPLOYEE_VIEW, DEPARTMENT_VIEW, NOTIFICATION_VIEW, REWARD_APPROVE, REWARD_VIEW)),
            Map.entry(ROLE_SURVEILLANCE, List.of(SURVEILLANCE_CREATE, SURVEILLANCE_VIEW, CASE_CREATE, CASE_VIEW, CASE_UPDATE,
                    INFORMER_VIEW, INFORMER_MANAGE, TAXPAYER_VIEW, TAXPAYER_MANAGE, STOCK_VIEW, TEMP_STOCK_MANAGE,
                    EMPLOYEE_VIEW, DEPARTMENT_VIEW, NOTIFICATION_VIEW)),
            Map.entry(ROLE_STOCK_MANAGER, List.of(STOCK_VIEW, STOCK_MANAGE, EMPLOYEE_VIEW, DEPARTMENT_VIEW, NOTIFICATION_VIEW)),
            Map.entry(ROLE_PRSO, List.of(STOCK_VIEW, STOCK_APPROVE_RELEASE, SURVEILLANCE_VIEW,
                    EMPLOYEE_VIEW, DEPARTMENT_VIEW, NOTIFICATION_VIEW)),
            Map.entry(ROLE_LEGAL_ADVISOR, List.of(REPORT_VIEW, LEGAL_REVIEW, CASE_VIEW, EMPLOYEE_VIEW,
                    DEPARTMENT_VIEW, NOTIFICATION_VIEW)),
            Map.entry(ROLE_AUDITOR, List.of(AUDIT_VIEW))
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
