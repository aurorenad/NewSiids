# SIIDS Enterprise Execution Architecture & Delivery Governance Plan

Rwanda Revenue Authority (RRA) · Intelligence & Enforcement Division
**Document Reference**: RRA-SIIDS-ARCH-V2.0  
**Classification**: CONFIDENTIAL  

---

## Document Overview
This document establishes the binding implementation governance and execution architecture for the SIIDS system modernization. It translates the modern strategic blueprint into concrete architectural patterns, API contracts, database schemas, frontend/backend engineering protocols, and a sprint-by-sprint execution sequence.

All development squads are governed by the specifications herein. No deviations are permitted without formal architectural review board approval.

---

## Phase 1 — Domain-Driven Execution Architecture

The SIIDS application is partitioned into nine bounded contexts. Each domain owns its logical data model, exposes interface services via explicit API contracts, and communicates with other domains via asynchronous application events or synchronous interfaces.

```
┌────────────────────────────────────────────────────────────────────────┐
│                              SSE GATEWAY                               │
└──────────────────────────────────▲─────────────────────────────────────┘
                                   │ (Real-time stream)
┌──────────────┐   ┌─────────────┐ │ ┌──────────────┐   ┌────────────────┐
│     AUTH     │   │    CASE     ├─┼─► INTELLIGENCE │   │ INVESTIGATION  │
│  (Users/     │   │ (Registry/  │ │ │  (Reports/   │   │  (Case Plans/  │
│  Delegations)│   │  Routing)   │ │ │  Signatures) │   │  Final Rep.)   │
└──────┬───────┘   └──────┬──────┘ │ └──────┬───────┘   └──────┬─────────┘
       │                  │        │        │                  │
       ▼                  ▼        │        ▼                  ▼
┌──────────────────────────────────┴────────┴────────────────────────────┐
│                       EVENT-DRIVEN WORKFLOW ENGINE                     │
└──────────────────────────────────┬────────┬────────────────────────────┘
                                   ▼        ▼
┌──────────────┐   ┌─────────────┐   ┌──────────────┐   ┌────────────────┐
│    STOCK     │   │  REPORTING  │   │    AUDIT     │   │  NOTIFICATION  │
│ (Inventory/  │   │  (Thymeleaf │   │ (Append-Only │   │ (SSE Dispatch/ │
│    OTPs)     │   │  PDF Comp.) │   │  Log Schema) │   │  SMS Gateway)  │
└──────────────┘   └─────────────┘   └──────────────┘   └────────────────┘
```

### 1. Domain Specifications

#### 1.1. Auth Domain
*   **Responsibilities**: Identity management, authentication, role assignment, JWT creation, and delegation contract records.
*   **Owned Entities**: `User`, `Role`, `Delegation`
*   **Allowed Operations**: `AuthenticateUser`, `RegisterUser`, `CreateDelegation`, `RevokeDelegation`, `ValidateToken`.
*   **Forbidden Cross-Domain Operations**: Direct access to stock levels, investigation plan updates, or modifying case statuses.
*   **Public Service Contract**:
    ```java
    public interface AuthContract {
        boolean hasPermission(Long userId, String permissionCode);
        Optional<DelegationDto> getActiveDelegation(Long grantorId, String permission);
        UserPrincipalDto loadUserById(Long userId);
    }
    ```
*   **Events Emitted**: `DelegationGrantedEvent`, `DelegationRevokedEvent`, `UserSessionStartedEvent`.
*   **Events Consumed**: None.
*   **Database Boundaries**: Schema ownership of `users`, `user_roles`, and `delegations` tables.
*   **API Boundaries**: `/api/v1/auth/**`, `/api/v1/delegations/**`.

#### 1.2. Case Domain
*   **Responsibilities**: Intake registration of cases, Taxpayer Identification Number (TIN) validation, and dispatch routing.
*   **Owned Entities**: `Case`
*   **Allowed Operations**: `RegisterCase`, `RouteCase`, `UpdateCaseMetadata`.
*   **Forbidden Cross-Domain Operations**: Modifying Intelligence Report drafts, editing Seizure Notes, or granting release authorizations.
*   **Public Service Contract**:
    ```java
    public interface CaseContract {
        CaseDto getCaseDetails(String caseNumber);
        void updateCaseStatus(String caseNumber, String status);
    }
    ```
*   **Events Emitted**: `CaseRegisteredEvent`, `CaseRoutedEvent`.
*   **Events Consumed**: None.
*   **Database Boundaries**: Schema ownership of `cases` table.
*   **API Boundaries**: `/api/v1/cases/**`.

#### 1.3. Intelligence Domain
*   **Responsibilities**: Creation, draft revision tracking, dual-signature logging, and completion locks of Intelligence Reports.
*   **Owned Entities**: `IntelligenceReport`, `Signature`, `ReportRevision`
*   **Allowed Operations**: `CreateReport`, `UpdateDraft`, `RecordSignature`, `FreezeReport`.
*   **Forbidden Cross-Domain Operations**: Releasing stock inventory or creating investigation case files.
*   **Public Service Contract**:
    ```java
    public interface IntelligenceContract {
        boolean isReportFinalized(Long reportId);
        IntelligenceReportDto getReportForPdf(Long reportId);
    }
    ```
*   **Events Emitted**: `ReportSignedEvent`, `ReportFinalizedEvent`, `ReportRevisedEvent`.
*   **Events Consumed**: `CaseRoutedEvent`.
*   **Database Boundaries**: Schema ownership of `reports`, `signatures`, and `report_revisions` tables.
*   **API Boundaries**: `/api/v1/reports/**`.

#### 1.4. Investigation Domain
*   **Responsibilities**: Action plans for case investigations, findings tracking, and compiling draft final reports automatically.
*   **Owned Entities**: `InvestigationPlan`, `InvestigationFinding`, `FinalReport`
*   **Allowed Operations**: `CreatePlan`, `UploadFinding`, `CompileFinalReportDraft`, `SubmitFinalReport`.
*   **Forbidden Cross-Domain Operations**: Modifying intelligence signatures, managing stock items, or editing delegation rules.
*   **Public Service Contract**:
    ```java
    public interface InvestigationContract {
        InvestigationPlanDto getPlanByCase(String caseNumber);
    }
    ```
*   **Events Emitted**: `InvestigationCompletedEvent`, `FinalReportSubmittedEvent`.
*   **Events Consumed**: `CaseRoutedEvent`.
*   **Database Boundaries**: Schema ownership of `investigation_plans`, `investigation_findings`, and `final_reports` tables.
*   **API Boundaries**: `/api/v1/investigations/**`.

#### 1.5. Stock Domain
*   **Responsibilities**: Managing seized goods, temporary stock escalation limits, PV documentation, releases, and OTP verifications.
*   **Owned Entities**: `SeizureNote`, `PVDocument`, `ReleaseNote`, `GoodsItem`, `OtpVerification`
*   **Allowed Operations**: `IntakeGoods`, `SendOTP`, `VerifyOTP`, `GeneratePV`, `RequestRelease`, `ApproveRelease`, `RecordHandover`.
*   **Forbidden Cross-Domain Operations**: Creating intelligence reports, changing user configurations, or routing case investigations.
*   **Public Service Contract**:
    ```java
    public interface StockContract {
        SeizureNoteDto getSeizureNote(Long id);
        boolean verifyOtpCode(String phone, String code, String context);
    }
    ```
*   **Events Emitted**: `SeizureNoteCreatedEvent`, `GoodsEscalatedEvent`, `ReleaseRequestedEvent`, `ReleaseApprovedEvent`, `GoodsHandedOverEvent`, `GoodsReturnedEvent`.
*   **Events Consumed**: `DelegationGrantedEvent`, `DelegationRevokedEvent`.
*   **Database Boundaries**: Schema ownership of `seizure_notes`, `goods_items`, `pv_documents`, `release_notes`, and `otp_verifications` tables.
*   **API Boundaries**: `/api/v1/stock/**`, `/api/v1/otp/**`.

#### 1.6. Notification Domain
*   **Responsibilities**: Broadcasting Server-Sent Events (SSE) to connected clients and executing outgoing SMS transactions.
*   **Owned Entities**: `NotificationMessage`
*   **Allowed Operations**: `DispatchSSE`, `SendSMSGatewayPayload`.
*   **Forbidden Cross-Domain Operations**: Altering inventory states, writing to case schemas, or editing audit fields.
*   **Public Service Contract**:
    ```java
    public interface NotificationContract {
        void queueNotification(Long userId, String message, String actionUrl);
        void sendSms(String phoneNumber, String messageText);
    }
    ```
*   **Events Emitted**: None.
*   **Events Consumed**: All application event types (trigger notification mapping).
*   **Database Boundaries**: Schema ownership of `notifications` buffer table.
*   **API Boundaries**: `/api/v1/notifications/stream/**`.

#### 1.7. Reporting Domain
*   **Responsibilities**: Server-side document compilation (PDF/Excel) using layouts (letterhead, signature blocks, snapshots).
*   **Owned Entities**: `DocumentSnapshot`
*   **Allowed Operations**: `CompilePdfDocument`, `RetrieveDocumentSnapshot`.
*   **Forbidden Cross-Domain Operations**: Editing database records or modifying user authentication.
*   **Public Service Contract**:
    ```java
    public interface ReportingContract {
        byte[] exportDocumentPdf(String docType, Long entityId);
    }
    ```
*   **Events Emitted**: `DocumentCompiledEvent`.
*   **Events Consumed**: `ReportFinalizedEvent`, `GoodsEscalatedEvent`, `ReleaseApprovedEvent`.
*   **Database Boundaries**: Schema ownership of `document_snapshots` table.
*   **API Boundaries**: `/api/v1/documents/**`.

#### 1.8. Audit Domain
*   **Responsibilities**: Recording write-once, append-only logs of state-changing transactions.
*   **Owned Entities**: `AuditLog`
*   **Allowed Operations**: `AppendAuditRecord`, `QueryAuditLog`.
*   **Forbidden Cross-Domain Operations**: Allowing update or delete actions on audit database records.
*   **Public Service Contract**:
    ```java
    public interface AuditContract {
        void log(String actor, String action, String entity, String entityId, Map<String, Object> meta);
    }
    ```
*   **Events Emitted**: None.
*   **Events Consumed**: All transaction-driven application events.
*   **Database Boundaries**: Schema ownership of the `audit_logs` table.
*   **API Boundaries**: `/api/v1/audit/**`.

#### 1.9. Workflow Domain
*   **Responsibilities**: Validating state transitions, updating state variables, and execution sequencing.
*   **Owned Entities**: `WorkflowState`, `WorkflowTransitionLog`
*   **Allowed Operations**: `RequestTransition`, `EvaluateTransitionPermissions`.
*   **Forbidden Cross-Domain Operations**: Bypassing transition validation engines.
*   **Public Service Contract**:
    ```java
    public interface WorkflowContract {
        void executeTransition(Long entityId, String entityType, String action, String actorId);
        String getCurrentState(Long entityId, String entityType);
    }
    ```
*   **Events Emitted**: `WorkflowTransitionCompletedEvent`.
*   **Events Consumed**: None.
*   **Database Boundaries**: Schema ownership of `workflow_states` and `workflow_transition_logs` tables.
*   **API Boundaries**: Internal service layer (no public REST controllers).

---

### 2. Bounded Context & Communication Architecture

#### 2.1. Domain Interaction Matrix
```
┌───────────────┬───────┬──────┬──────┬──────┬──────┬──────┬──────┬──────┐
│ Caller \ Owns │ Auth  │ Case │ Intel│ Inv  │Stock │ Notif│ Rep  │Audit │
├───────────────┼───────┼──────┼──────┼──────┼──────┼──────┼──────┼──────┤
│ Auth          │   -   │  No  │  No  │  No  │  No  │  Yes │  No  │  Yes │
│ Case          │  Yes  │  -   │  No  │  No  │  No  │  Yes │  No  │  Yes │
│ Intelligence  │  Yes  │  Yes │  -   │  No  │  No  │  Yes │  Yes │  Yes │
│ Investigation │  Yes  │  Yes │  Yes │  -   │  No  │  Yes │  Yes │  Yes │
│ Stock         │  Yes  │  No  │  No  │  No  │  -   │  Yes │  Yes │  Yes │
│ Notification  │  No   │  No  │  No  │  No  │  No  │  -   │  No  │  No  │
│ Reporting     │  No   │  No  │  No  │  No  │  No  │  No  │  -   │  No  │
│ Audit         │  No   │  No  │  No  │  No  │  No  │  No  │  No  │  -   │
└───────────────┴───────┴──────┴──────┴──────┴──────┴──────┴──────┴──────┘
```

#### 2.2. Domain Communication Strategy
1.  **Read Operations (Queries)**: Facilitated via synchronous DTO calls through local interfaces of other domains (Ports & Adapters boundary separation, keeping the domains co-located in a modular monolith).
2.  **Write Operations (Command Side-Effects)**: Communicated asynchronously. When stock is released, the `Stock` domain saves the state change and emits a `ReleaseApprovedEvent` via the Spring `ApplicationEventPublisher`. The `Notification` domain and `Reporting` domain consume this event inside transactional event listeners (`@TransactionalEventListener`) to deliver SSE updates, send SMS alerts, and write immutable PDF documents.

---

## Phase 2 — Workflow Engine Architecture

The workflow engine relies on a database-backed Custom Event-Driven State Pattern, utilizing JPA models and Spring Application Events to decouple operational domains.

```
                  ┌───────────────────────────────┐
                  │      WorkflowOrchestrator     │
                  └───────────────┬───────────────┘
                                  │
         ┌────────────────────────┴────────────────────────┐
         ▼                                                 ▼
┌─────────────────┐                               ┌─────────────────┐
│StateTransition  │                               │  StateValidator │
│   Registry      │                               │   (Interface)   │
└─────────────────┘                               └────────┬────────┘
                                                           │
                                            ┌──────────────┴──────────────┐
                                            ▼                             ▼
                                   ┌────────────────┐            ┌────────────────┐
                                   │SeizureValidator│            │ReleaseValidator│
                                   └────────────────┘            └────────────────┘
```

### 1. Workflow Engines by Lifecycle

#### 1.1. Seizure Lifecycle
*   **Workflow States**: `DRAFT`, `OTP_VERIFICATION_PENDING`, `SEIZED`, `RELEASED_TO_OWNER`, `ESCALATED`.
*   **Allowed Transitions**:
    *   `DRAFT` → `OTP_VERIFICATION_PENDING` (on Save Note)
    *   `OTP_VERIFICATION_PENDING` → `SEIZED` (on OTP confirmation or Skip confirmation)
    *   `SEIZED` → `RELEASED_TO_OWNER` (on Return to Owner process)
    *   `SEIZED` → `ESCALATED` (on Escalation to Main Stock)
*   **Transition Validators**: `OwnerVerificationValidator` (validates OTP is marked verified in the database).
*   **Role Permissions**: `SURVEILLANCE_OFFICER` on DRAFT/OTP; `STOCK_MANAGER` / `DEPUTY_PRSO` on ESCALATION.
*   **Audit Requirements**: Timestamp, acting officer, owner phone, OTP confirmation state, and goods hash saved in `audit_logs`.
*   **Notification Triggers**: SMS OTP dispatch on transition to `OTP_VERIFICATION_PENDING`.
*   **Rollback Rules**: If verification fails or expires (10 minutes), the transition cancels and reverts back to `DRAFT`.
*   **Failure Handling**: Clear error notification shown; OTP retry logic capped at 3 attempts, after which a new OTP request must be initiated.
*   **Escalation Rules**: If goods remain in status `SEIZED` in temporary stock for 5+ days, trigger SSE alert warnings. On Day 7, transition flag is raised for automatic escalation.
*   **Immutable Checkpoints**: On transition to `SEIZED`, a complete JSON snapshot of the goods is generated and written to the database.

#### 1.2. Investigation Lifecycle
*   **Workflow States**: `ASSIGNED`, `PLANNING`, `UNDER_INVESTIGATION`, `FINAL_REPORT_DRAFT`, `COMPLETED`.
*   **Allowed Transitions**:
    *   `ASSIGNED` → `PLANNING` (on Case Plan creation)
    *   `PLANNING` → `UNDER_INVESTIGATION` (on Plan Approval)
    *   `UNDER_INVESTIGATION` → `FINAL_REPORT_DRAFT` (on Findings Upload & Compile trigger)
    *   `FINAL_REPORT_DRAFT` → `COMPLETED` (on final submit)
*   **Transition Validators**: `EvidenceAttachmentValidator` (verifies that at least one file tagged as `EVIDENCE` is present).
*   **Role Permissions**: `INVESTIGATION_OFFICER`.
*   **Audit Requirements**: Record investigator actions, uploaded evidence hashes, and timestamps.
*   **Notification Triggers**: SSE push to the Chief Investigator on transition to `COMPLETED`.
*   **Rollback Rules**: Transitions can be rolled back to `UNDER_INVESTIGATION` from draft status if evidence is rejected during review.

#### 1.3. Report Approval Lifecycle
*   **Workflow States**: `DRAFT`, `PENDING_AC_SIGNATURE`, `PENDING_DIRECTOR_SIGNATURE`, `FINALISED`.
*   **Allowed Transitions**:
    *   `DRAFT` → `PENDING_AC_SIGNATURE` (on Report submission)
    *   `PENDING_AC_SIGNATURE` → `PENDING_DIRECTOR_SIGNATURE` (on AC Signature)
    *   `PENDING_DIRECTOR_SIGNATURE` → `FINALISED` (on Director Signature)
*   **Transition Validators**: `DualSignatureValidator` (validates the role of the signer matching the expected transition state).
*   **Role Permissions**: `INTELLIGENCE_OFFICER` (Draft), `ASSISTANT_COMMISSIONER` (AC Sign), `DIRECTOR_OF_INTELLIGENCE` (Director Sign).
*   **Audit Requirements**: Track date, public key reference, and signature hash of the signer.
*   **Notification Triggers**: SSE push to Director on AC sign completion.
*   **Rollback/Rejection Rules**: Director can reject reports back to `DRAFT`. This creates a revision audit row and removes any previous AC signature, requiring a re-signature flow.
*   **Immutable Checkpoints**: Once state becomes `FINALISED`, the database locks editing. Any update query on the report content triggers a SQL exception.

#### 1.4. Release Lifecycle
*   **Workflow States**: `MAIN_STOCK`, `RELEASE_REQUEST_PENDING`, `RELEASE_APPROVED`, `HANDOVER_PENDING`, `HANDED_OVER`.
*   **Allowed Transitions**:
    *   `MAIN_STOCK` → `RELEASE_REQUEST_PENDING` (on Stock Manager Request)
    *   `RELEASE_REQUEST_PENDING` → `RELEASE_APPROVED` (on PRSO or active Delegated Deputy PRSO approval)
    *   `RELEASE_APPROVED` → `HANDOVER_PENDING` (on Auction Winner entry)
    *   `HANDOVER_PENDING` → `HANDED_OVER` (on OTP handover verification)
*   **Transition Validators**: `ActiveDelegationValidator` (evaluates if Deputy PRSO holds a valid delegation contract if signing on behalf of PRSO).
*   **Role Permissions**: `STOCK_MANAGER` (Request & Handover), `PRSO` / `DEPUTY_PRSO` (Approve).
*   **Audit Requirements**: Log auction amount in RWF, winner identity, matching OTP verification, and acting supervisor ID.
*   **Rollback Rules**: If PRSO rejects the request, transition returns the state back to `MAIN_STOCK` with correction notes.
*   **Immutable Checkpoints**: A Release Note PDF snapshot is generated upon transitioning to `RELEASE_APPROVED` and stored in the database.

#### 1.5. Escalation Lifecycle
*   **Workflow States**: `TEMP_STOCK_ACTIVE`, `ESCALATION_WARN`, `ESCALATION_OVERDUE`, `PV_COMPILED`, `ESCALATED_TO_MAIN`.
*   **Allowed Transitions**:
    *   `TEMP_STOCK_ACTIVE` → `ESCALATION_WARN` (on Day 5)
    *   `ESCALATION_WARN` → `ESCALATION_OVERDUE` (on Day 7+)
    *   `ESCALATION_OVERDUE` / `TEMP_STOCK_ACTIVE` → `PV_COMPILED` (on PV creation)
    *   `PV_COMPILED` → `ESCALATED_TO_MAIN` (on Stock Manager Acceptance)
*   **Transition Validators**: `VehicleExemptionValidator` (excludes goods of type `VEHICLE` from escalating state warnings).
*   **Role Permissions**: `SURVEILLANCE_OFFICER` (Compile PV), `STOCK_MANAGER` (Acceptance).
*   **Audit Requirements**: Store system elapsed day count, date of calculation, PV number, and items table.

#### 1.6. Delegation Lifecycle
*   **Workflow States**: `INACTIVE`, `ACTIVE`, `EXPIRED`, `REVOKED`.
*   **Allowed Transitions**:
    *   `INACTIVE` → `ACTIVE` (on PRSO toggle active)
    *   `ACTIVE` → `EXPIRED` (on date/time expiry passing)
    *   `ACTIVE` → `REVOKED` (on manual PRSO revoke action)
*   **Transition Validators**: `DelegatorIdentityValidator` (guarantees grantor holds the active role of `PRSO`).
*   **Role Permissions**: `PRSO`.
*   **Notification Triggers**: SSE notification pushes status alert to the Deputy PRSO dashboard.

---

### 2. Transition Rules Matrix

| Lifecycle | Trigger Action | Current State | Allowed Next State | Permitted Roles | Required Validations |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Seizure | Save Draft | None | `DRAFT` | Surveillance Officer | Metadata fields present |
| Seizure | Send Verification | `DRAFT` | `OTP_VERIFICATION_PENDING` | Surveillance Officer | Valid phone number structure |
| Seizure | Confirm OTP / Skip | `OTP_VERIFICATION_PENDING`| `SEIZED` | Surveillance Officer | OTP validation token match |
| Intelligence| Submit Report | `DRAFT` | `PENDING_AC_SIGNATURE` | Intelligence Officer | Valid document model structure |
| Intelligence| AC Sign | `PENDING_AC_SIGNATURE` | `PENDING_DIRECTOR_SIGNATURE` | Assistant Commissioner | User role equals AC |
| Intelligence| Director Sign | `PENDING_DIRECTOR` | `FINALISED` | Director Intelligence | User role equals DOI |
| Stock | Request Release | `MAIN_STOCK` | `RELEASE_REQUEST_PENDING` | Stock Manager | Complete Release Note form fields |
| Stock | Approve Release | `RELEASE_REQUEST_PENDING` | `RELEASE_APPROVED` | PRSO, Deputy PRSO | Validation of active delegation |
| Stock | Confirm Handover | `HANDOVER_PENDING` | `HANDED_OVER` | Stock Manager | Handover OTP verification token |

---

### 3. State Engine Database Schema & Event Contracts

The engine persists transition logs and handles validation asynchronously.

#### 3.1. Workflow Schema
```sql
CREATE TABLE workflow_states (
    entity_id BIGINT NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    current_state VARCHAR(50) NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    PRIMARY KEY (entity_id, entity_type)
);

CREATE TABLE workflow_transition_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    entity_id BIGINT NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    from_state VARCHAR(50) NOT NULL,
    to_state VARCHAR(50) NOT NULL,
    actor_id BIGINT NOT NULL,
    action_taken VARCHAR(100) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
```

#### 3.2. Spring Application Event Contract Example
```java
public class WorkflowTransitionEvent extends ApplicationEvent {
    private final String entityType;
    private final Long entityId;
    private final String fromState;
    private final String toState;
    private final Long actorId;
    private final Map<String, Object> metadata;

    public WorkflowTransitionEvent(Object source, String entityType, Long entityId, 
                                   String fromState, String toState, Long actorId, 
                                   Map<String, Object> metadata) {
        super(source);
        this.entityType = entityType;
        this.entityId = entityId;
        this.fromState = fromState;
        this.toState = toState;
        this.actorId = actorId;
        this.metadata = metadata;
    }
    // Getters...
}
```

---

## Phase 3 — Future API Contract Governance

The API layer is governed by a strict, structured interface strategy to ensure consistency, security, and developer clarity.

### 1. API Standards

1.  **Base URL Mapping**: All REST API endpoints must utilize the `/api/v1` prefix paths.
2.  **Naming Conventions**: Plural nouns for resource endpoints (e.g., `/api/v1/cases`, `/api/v1/reports`).
3.  **Versioning**: Version identifiers must remain path-based. Releasing breaking interface layouts requires incrementing to `/api/v2`.
4.  **Pagination Query Standards**:
    *   `page`: The page index, 0-indexed (default: `0`).
    *   `size`: Items per page (default: `10`, capped at `100`).
    *   `sortBy`: Name of the entity field target (e.g., `seizedAt`, `pvNumber`).
    *   `sortOrder`: Sort direction (`ASC` or `DESC`, default: `DESC`).
5.  **Filtering Conventions**: Query parameters are directly mapped to specific filters without free-text SQL injection vulnerabilities. (e.g., `?goodsType=VEHICLE&status=SEIZED`).
6.  **Real-time Notifications**: Real-time notifications will utilize Server-Sent Events (SSE) instead of WebSockets to simplify scalability. Clients establish an event connection to: `/api/v1/notifications/stream`.

### 2. Standard Response Wrappers

#### 2.1. Success Envelope DTO
```json
{
  "success": true,
  "timestamp": "2026-05-28T22:00:00Z",
  "data": {
    "id": 105,
    "caseNumber": "RRA-INTEL-2026-0041"
  },
  "error": null
}
```

#### 2.2. Standard Failure Envelope DTO
```json
{
  "success": false,
  "timestamp": "2026-05-28T22:01:05Z",
  "data": null,
  "error": {
    "code": "INSUFFICIENT_SIGNATURES",
    "message": "The intelligence report must be signed by the Assistant Commissioner and Director before finalisation.",
    "details": [
      "AC Signature: APPROVED (2026-05-28T18:00:00Z)",
      "Director Signature: PENDING"
    ]
  }
}
```

#### 2.3. Field-Level Validation Failure Envelope DTO
```json
{
  "success": false,
  "timestamp": "2026-05-28T22:02:10Z",
  "data": null,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Input validation constraints breached.",
    "details": [
      {
        "field": "phoneNumber",
        "message": "Phone number must follow RRA international format (+2507XXXXXXXX)."
      },
      {
        "field": "fineAmount",
        "message": "Fine amount cannot be negative."
      }
    ]
  }
}
```

---

### 3. Server-Sent Events (SSE) Message Payload Schema

Clients connect via `EventSource` on `/api/v1/notifications/stream`. The events stream contains JSON payloads structured as follows:

```json
{
  "eventId": "sse-uuid-9941-8841",
  "timestamp": "2026-05-28T22:03:00Z",
  "type": "RELEASE_REQUEST_RECEIVED",
  "message": "New Release Request submitted by Stock Manager for goods PV-9948.",
  "actionUrl": "/deputy-prso/release-approvals/9948",
  "severity": "HIGH"
}
```

---

### 4. Sample Enterprise Endpoint Catalog

#### 4.1. Case Domain API
*   `POST /api/v1/cases`
    *   *Body*: `CreateCaseDto`
    *   *Auth*: `@PreAuthorize("hasAuthority('INTELLIGENCE_OFFICER')")`
*   `PATCH /api/v1/cases/{caseId}/route`
    *   *Body*: `RouteCaseDto` (includes `routedTo` ENUM, `departmentName`)
    *   *Auth*: `@PreAuthorize("hasAuthority('ASSISTANT_COMMISSIONER')")`

#### 4.2. Intelligence Domain API
*   `POST /api/v1/reports/{id}/sign`
    *   *Body*: `SignaturePayload`
    *   *Auth*: `@PreAuthorize("hasAnyAuthority('ASSISTANT_COMMISSIONER', 'DIRECTOR_OF_INTELLIGENCE')")`
*   `PUT /api/v1/reports/{id}`
    *   *Body*: `UpdateReportDto`
    *   *Auth*: `@PreAuthorize("hasAuthority('DIRECTOR_OF_INTELLIGENCE')")` (Revisions are automatically added to `report_revisions` table; returns `403` if report is finalized).

#### 4.3. Stock Domain API
*   `POST /api/v1/otp/send`
    *   *Body*: `SendOtpDto` (phone, context)
    *   *Auth*: `@PreAuthorize("hasAnyAuthority('SURVEILLANCE_OFFICER', 'STOCK_MANAGER')")`
*   `POST /api/v1/otp/verify`
    *   *Body*: `VerifyOtpDto` (phone, context, code)
    *   *Auth*: `@PreAuthorize("hasAnyAuthority('SURVEILLANCE_OFFICER', 'STOCK_MANAGER')")`
*   `POST /api/v1/stock/release-to-owner`
    *   *Body*: `ReleaseToOwnerDto`
    *   *Auth*: `@PreAuthorize("hasAuthority('SURVEILLANCE_OFFICER')")`

#### 4.4. Auth Domain API
*   `POST /api/v1/delegations`
    *   *Body*: `CreateDelegationDto` (granteeId, permission)
    *   *Auth*: `@PreAuthorize("hasAuthority('PRSO')")`

---

## Phase 4 — FrontendV2 Platform Architecture

The `frontendV2` application is constructed as a React Single Page Application utilizing Vite, React Router v7, and Vanilla CSS with custom utility variables for structural layout.

### 1. Directory & Code Organization
```
siidsfrontend/
├── src/
│   ├── api/
│   │   ├── msw/              # MSW Mock Handlers and Browser Setup
│   │   └── client.js         # Axios Instance (with Interceptors and Headers)
│   ├── assets/               # Brand logos and static images
│   ├── components/           # Global Shared Components (Stateless Elements)
│   │   ├── ui/
│   │   │   ├── Button/
│   │   │   ├── Table/
│   │   │   └── Modal/
│   │   └── feedback/         # Toast and Notification items
│   ├── context/              # Context Providers (Auth, SSE Client Streams)
│   ├── features/             # Feature-based Modular Directories
│   │   ├── intelligence/     # DOI & IO Views and Report Modifiers
│   │   ├── investigation/    # Case Plans and Evidence Renderers
│   │   ├── stock/            # OTP Verification, PV, and Release queues
│   │   └── dashboard/        # Dashboard layout systems and metric cards
│   ├── hooks/                # Global Reusable Hooks (useAuth, useNotifications)
│   ├── theme/                # Global design system configurations
│   │   └── variables.css     # CSS Custom Properties (Theme tokens)
│   ├── App.jsx               # Routes and Global Configs
│   └── main.jsx              # DOM Mount
```

---

### 2. State & Caching Architecture (TanStack Query)

To optimize interface responsiveness and avoid unnecessary state synchronization scripts, TanStack Query is standardized for server-state caching.

```javascript
// Query Client Default Configuration
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes stale duration
      cacheTime: 10 * 60 * 1000, // 10 minutes cache duration
    },
  },
});
```

*   **Mutation and Invalidation Pattern**: Any state change (e.g., signing a report or verifying an OTP) requires calling `queryClient.invalidateQueries` to force refreshing matching tabular lists automatically.

---

### 3. Reusable UI Components & Visual Frameworks

#### 3.1. Workflow Stepper Component Specification
Displays horizontal step sequences mapping current states visually:
```javascript
// Reusable UI Stepper definition
import React from 'react';
import './Stepper.css'; // Styled via Vanilla CSS

export const WorkflowStepper = ({ steps, activeStep }) => {
  return (
    <div className="siids-stepper">
      {steps.map((step, index) => (
        <div key={index} className={`stepper-step ${index <= activeStep ? 'active' : ''}`}>
          <div className="step-badge">{index + 1}</div>
          <div className="step-label">{step}</div>
          {index < steps.length - 1 && <div className="step-connector" />}
        </div>
      ))}
    </div>
  );
};
```

#### 3.2. Real-time Notification Banner Component
Connected to the SSE EventSource stream, rendering toast notification components for critical alerts.

#### 3.3. Recharts Dashboard Widgets
Metrics visualization panels rendering goods volumes by category, monthly collections in RWF, and pending queues.

---

### 4. Client-side Mocking with Mock Service Worker (MSW)

During Phase 2 development, MSW intercepts Axios REST calls to simulate backend behaviors.

#### 4.1. MSW OTP Verification Handler Example
```javascript
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.post('/api/v1/otp/send', async ({ request }) => {
    const { phoneNumber, context } = await request.json();
    return HttpResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      data: { message: `OTP sent to ${phoneNumber} under context ${context}` },
      error: null
    });
  }),

  http.post('/api/v1/otp/verify', async ({ request }) => {
    const { phoneNumber, context, code } = await request.json();
    if (code === "123456") {
      return HttpResponse.json({
        success: true,
        timestamp: new Date().toISOString(),
        data: { verifiedToken: "verify_token_uuid_abc123" },
        error: null
      });
    } else {
      return HttpResponse.json({
        success: false,
        timestamp: new Date().toISOString(),
        data: null,
        error: {
          code: "INVALID_OTP",
          message: "The entered OTP code is incorrect or expired.",
          details: []
        }
      }, { status: 400 });
    }
  })
];
```

---

## Phase 5 — Backend Platform Governance

The Spring Boot backend enforces structural separation of concerns via strict packaging rules, security controls, and transaction boundaries.

### 1. Package Structure Guidelines
Developers must structure domains modularly. High-level package layouts are separated by feature contexts:
```
org.example.siidsbackend.domains
├── auth/
│   ├── controller/
│   ├── model/
│   ├── repository/
│   └── service/
├── case/
├── intelligence/
├── stock/
│   ├── controller/      # StockController.java, OtpController.java
│   ├── model/           # SeizureNote.java, GoodsItem.java
│   ├── repository/      # SeizureNoteRepository.java
│   └── service/         # StockServiceImpl.java
└── notification/
```

*   **Controller Rules**: Only map endpoints, capture request headers, process validations, and return DTO classes. No business logic is permitted in controller layers.
*   **Service Rules**: Handle business validation, orchestrate transactional events, query repositories, and execute state transitions.
*   **Repository Rules**: Use JPA and native SQL queries. All query definitions must be dynamic. Hardcoding IDs in SQL queries is forbidden.

---

### 2. Transaction Handling & Event Dispatch
All state modifications must be declared transactional using `@Transactional(propagation = Propagation.REQUIRED)`. 

*   **Side-effect Processing**: Asynchronous tasks (e.g. sending SMS notifications via external API gateways) must execute outside the main database transaction block to prevent holding open database connections. Use `@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)` to dispatch async events.

---

### 3. File Upload Governance
Uploads (e.g. physical seizure scan document files) must be managed using the following rules:
1.  **Original Name Preservation**: The original file name must be stored inside a dedicated field in the database (`original_filename`) and sanitized for path safety:
    ```java
    String cleanFilename = StringUtils.cleanPath(file.getOriginalFilename())
                                      .replaceAll("[^a-zA-Z0-9._-]", "_");
    ```
2.  **MIME-type Validation**: The server must validate files by inspecting actual byte patterns (magic bytes) rather than reading extensions alone, restricting imports to `application/pdf`, `image/png`, and `image/jpeg`.
3.  **Storage Isolation**: Scanned documents must be saved in standard subfolders inside a configurable storage path outside the web application's root context.

---

### 4. Correlation Tracking (MDC)
A correlation ID (`X-Correlation-ID`) must be passed through every request. Security filters extract the ID or generate a new UUID, putting it in Logback's Mapped Diagnostic Context (MDC):
```java
MDC.put("correlationId", correlationId);
```
Log patterns will print the correlation ID on every statement, ensuring easy tracking in multi-user settings.

---

## Phase 6 — Database Governance

All database changes are managed sequentially, ensuring data protection and audit integrity.

### 1. Naming Conventions
*   **Tables**: Plural nouns in snake_case (e.g. `seizure_notes`, `release_notes`).
*   **Columns**: snake_case identifiers (e.g. `seized_at`, `released_by_id`).
*   **Constraints**: Predefined prefixes:
    *   Primary Keys: `pk_{table_name}`
    *   Foreign Keys: `fk_{table_name}_{referenced_table_name}`
    *   Indexes: `idx_{table_name}_{column_name}`

---

### 2. Migration Sequencing Strategy (Liquibase)
The database structure is managed by Liquibase. Direct SQL updates against database instances are prohibited. All updates occur through formatted XML changesets in `db/changelog/db.changelog-master.yaml`.

#### 2.1. Migration Directory
```
src/main/resources/db/changelog/
├── db.changelog-master.yaml
├── releases/
│   ├── v1.0/
│   │   ├── 01-create-users-roles.sql
│   │   └── 02-create-cases.sql
│   └── v2.0/
│       ├── 01-create-signatures-table.sql
│       ├── 02-create-delegations-table.sql
│       ├── 03-create-otp-verifications.sql
│       └── 04-alter-stock-schema.sql
```

#### 2.2. Sample Liquibase Changeset definition
```xml
<databaseChangeLog
    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
        http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.3.xsd">

    <changeSet id="20260528-001" author="architect">
        <createTable tableName="otp_verifications">
            <column name="id" type="BIGINT" autoIncrement="true">
                <constraints primaryKey="true" primaryKeyName="pk_otp_verifications"/>
            </column>
            <column name="phone_number" type="VARCHAR(20)">
                <constraints nullable="false"/>
            </column>
            <column name="otp_hash" type="VARCHAR(64)">
                <constraints nullable="false"/>
            </column>
            <column name="expires_at" type="TIMESTAMP">
                <constraints nullable="false"/>
            </column>
            <column name="verified_at" type="TIMESTAMP"/>
            <column name="context" type="VARCHAR(30)">
                <constraints nullable="false"/>
            </column>
        </createTable>
        <createIndex indexName="idx_otp_phone_context" tableName="otp_verifications">
            <column name="phone_number"/>
            <column name="context"/>
        </createIndex>
    </changeSet>
</databaseChangeLog>
```

---

### 3. Append-Only Audit Trail Policy
The `audit_logs` table has a strict security policy. Under production operations, the application database user is granted `SELECT` and `INSERT` permissions. `UPDATE` and `DELETE` queries are blocked by DBMS database privileges. This ensures audit trails remain immutable.

---

### 4. Soft Delete Policy & Archival Strategy
*   **Soft Delete**: Instead of deleting rows, tables use a `deleted_at` nullable timestamp column. Hibernate entity definitions use `@SQLRestriction("deleted_at IS NULL")` to filter active rows automatically.
*   **Archival Policy**: Items that remain in the database for 3+ years are moved to a read-only historic database schema during scheduled maintenance, reducing the active table size and optimizing active storage.

---

## Phase 7 — Engineering Delivery Governance

Development teams must adhere to standard engineering workflows to maintain software quality.

### 1. Git Branching Strategy
We standardize on trunk-based development with short-lived feature branches:
```
                                        ┌───────────────┐
                                        │  Main Branch  │
                                        └───────┬───────┘
                                                │
                          ┌─────────────────────┴─────────────────────┐
                          ▼                                           ▼
                  ┌───────────────┐                           ┌───────────────┐
                  │  Feature A    │                           │  Feature B    │
                  │ (Short-Lived) │                           │ (Short-Lived) │
                  └───────┬───────┘                           └───────┬───────┘
                          │ (PR & Code Review)                        │ (PR & Code Review)
                          ▼                                           ▼
                        [Merged]                                    [Merged]
```

*   **Branch Naming**: `feature/siids-[issue-number]-[short-description]`
*   **Commit Message Conventions**: Angular conventions are mandatory. Format commits as:
    `<type>(<scope>): <subject>`
    *   *Example*: `feat(stock): add otp verification endpoint and database schema`
    *   *Example*: `fix(security): correct bypass on temporary stock endpoint authorization`

---

### 2. Pull Request & Code Review Checklist
Before code can be merged into the main development branch, it must receive approvals from two senior developers and pass the automated CI pipeline.

#### PR Checklist
- [ ] Liquibase scripts exist for all database changes.
- [ ] Endpoint roles are secured using `@PreAuthorize`.
- [ ] No database primary keys are hardcoded in SQL strings or repository annotations.
- [ ] MDC context and correlation IDs are implemented in all log outputs.
- [ ] Unit and Integration tests cover 80%+ of the modified logic.
- [ ] Original file names are sanitized and stored using dedicated properties.
- [ ] API modifications are updated in MSW and WireMock templates.

---

### 3. API Freeze & Mock Contract Validations
1.  **API Freeze**: Prior to starting frontend integration, the REST interface endpoints and payload shapes must be defined and signed off in the API Catalog.
2.  **Contract Testing**: We use WireMock to run API contract tests. If the backend changes a response field name, the contract tests fail, alerting developers of breaking changes before they reach integration phases.

---

## Phase 8 — Transformation Execution Roadmap

The transformation of SIIDS from the legacy codebase to the modernized version is organized across four distinct development cycles (Sprints).

### 1. Architectural Dependency Graph
```
┌─────────────────────────────────┐
│     Sprint 1: FOUNDATION        │
│  - Setup Liquibase Migrations   │
│  - Configure Security & JWT     │
│  - Register Auth & Delegations  │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│  Sprint 2: INTERFACE & MSW      │
│  - Rebuild FrontendV2 Views     │
│  - Implement MSW Mock Adapters  │
│  - Create WireMock Contracts    │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│   Sprint 3: DECOUPLING          │
│  - Separate Domain Services     │
│  - Deploy State Engine Workflows│
│  - Configure SSE Notification   │
└────────────────┬────────────────┘
                 │
                 ▼
┌─────────────────────────────────┐
│    Sprint 4: INTEGRATION        │
│  - Remove MSW Client Mocks      │
│  - Connect Live Backend REST    │
│  - E2E Verification Testing     │
└─────────────────────────────────┘
```

---

### 2. Sprint-by-Sprint Execution Plan

#### Sprint 1: Foundation and Core Security (Weeks 1-2)
*   **Deliverables**:
    *   Deploy Liquibase migrations to create `signatures`, `delegations`, `otp_verifications`, and update `reports`/`cases`.
    *   Re-enable Spring Security on all `/api/stock/**` routes.
    *   Implement role hierarchy permissions and correlation ID tracking middleware.
*   **Team Allocation**:
    *   *Backend Team*: Database setup, security configuration, and delegation authentication filters.
    *   *Frontend Team*: Create Vite workspace layout, establish Vanilla CSS variables, and configure routing routes.

#### Sprint 2: FrontendV2 views and Interface Mocking (Weeks 3-4)
*   **Deliverables**:
    *   Construct feature layouts for Intelligence, Investigation, and Stock.
    *   Implement MSW mock handlers inside `frontendV2` to simulate authorization, reports, and OTP actions.
    *   Create WireMock server templates mapping expected backend REST interfaces.
*   **Team Allocation**:
    *   *Backend Team*: Build WireMock contract templates and write mock validations.
    *   *Frontend Team*: Rebuild dashboards for roles (`DEPUTY_PRSO`, `PRSO`, `DOI`, `AC`) and implement components.

#### Sprint 3: Domain Service Separation & State Engine (Weeks 5-6)
*   **Deliverables**:
    *   Deconstruct monolithic backend services into distinct package modules.
    *   Deploy the custom Event-Driven State Pattern engine for lifecycles.
    *   Configure Server-Sent Events (SSE) notification streaming controller.
*   **Team Allocation**:
    *   *Backend Team*: Split entities, configure JPA workflow transitions, and write event listeners.
    *   *Frontend Team*: Hook up SSE client listeners, bind charts using Recharts, and write visual timeline views.

#### Sprint 4: System Integration & Live Verification (Weeks 7-8)
*   **Deliverables**:
    *   Switch `frontendV2` configurations to route requests to the live backend service.
    *   Verify SMS OTP verification gateway flows.
    *   Conduct end-to-end integration testing of double-signature locks and delegated approvals.
*   **Team Allocation**:
    *   *Backend & Frontend Teams*: Integration testing, resolving interface mismatches, and performing security validation.

---

### 3. Risk Mitigation & Transformation Safety Guidelines
1.  **Dual Operation Run**: During Phase 4 deployment, the system runs with duplicate logging enabled. The legacy and modernized state engines run concurrently for a 2-week validation period. Legacy endpoints remain active but write to a backup database instance to verify data matches before cutting over completely.
2.  **Rollback Runbook**: If critical runtime errors are encountered during integration:
    *   Re-route frontend configuration keys to target legacy routes.
    *   Examine database status tables using correlation ID trace logs.
    *   Restore database backups using Liquibase rollbacks.
