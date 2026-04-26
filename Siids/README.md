# SIIDS Project Workspace

Welcome to the SIIDS Project. This application is a comprehensive full-stack platform designed to manage intelligence operations, tax reporting, surveillance cases, and stock management. It features a robust role-based access control (RBAC) system tailored for various organizational hierarchies, including Intelligence Officers, Directors, Assistant Commissioners, and System Administrators.

## 🚀 Tech Stack

### Frontend
- **Framework:** React 18 (Bootstrapped with Vite)
- **UI Libraries:** Material UI (MUI) v7, Bootstrap, Styled Components
- **Routing:** React Router v7
- **Networking:** Axios, StompJS (for WebSockets)
- **Utilities:** date-fns, xlsx, jspdf, html2pdf.js

### Backend
- **Framework:** Spring Boot 3.5.x (Java 21)
- **Database:** PostgreSQL / MySQL (JPA & Hibernate)
- **Security:** Spring Security with JWT Authentication
- **Real-time:** Spring Boot WebSockets
- **Document Generation:** OpenHTMLtoPDF, Thymeleaf
- **Build Tool:** Maven

## ✨ Core Features

1. **Role-Based Access Control (RBAC):**
   - Secure routing and access tailored for specific roles: `SystemAdmin`, `DirectorIntelligence`, `IntelligenceOfficer`, `InvestigationOfficer`, `DirectorInvestigation`, `SurveillanceOfficer`, `AssistantCommissioner`, `LegalAdvisor`, `StockManager`, and `PRSO`.
   
2. **Case & Report Management:**
   - Create, edit, and view tax reports and surveillance cases.
   - Attach findings and generate automated PDF reports.
   - Form-based claim submissions and tracking.

3. **Stock & Release Management:**
   - Track inventory and manage stock.
   - Dedicated modules for `PRSO` role to handle item releases.
   
4. **Real-time Notifications:**
   - Built-in notification bell powered by WebSockets to alert users of case updates and approvals in real-time.

5. **Auditing & History:**
   - Dedicated history tracking for auditors to view historical data and system logs.

## ⚙️ How the System Works (Architecture & Workflows)

The SIIDS platform is designed as a secure, distributed system with a strict role-based workflow. The overall operation can be divided into several core processes:

### 1. Security and Authentication Flow
When a user accesses the frontend, they must log in using their credentials.
- **Authentication**: The backend verifies the credentials against the database using Spring Security.
- **JWT Issuance**: Upon success, a JWT (JSON Web Token) is generated and sent to the client.
- **Authorization**: The React frontend stores this token in the `AuthContext` and attaches it to the `Authorization` header of all subsequent Axios requests. React Router's `ProtectedRoute` wrapper ensures that users can only access UI components associated with their assigned roles (e.g., a `SurveillanceOfficer` cannot access `SystemAdmin` pages).

### 2. Case and Report Lifecycle
The core of SIIDS revolves around managing intelligence and investigation reports. The workflow typically follows this path:
- **Initiation**: An `IntelligenceOfficer` or `SurveillanceOfficer` creates a new case/report. This involves submitting details, taxpayer info, and initial findings.
- **Review and Processing**: Cases transition through various states. Directors (`DirectorIntelligence`, `DirectorInvestigation`) and `AssistantCommissioner` can review, approve, or request edits on these reports.
- **Document Generation**: Once a report is finalized, the backend can generate a formalized PDF document using OpenHTMLtoPDF and Thymeleaf templates, allowing users to download or print official records.

### 3. Stock and Release Management
SIIDS includes a dedicated inventory module for tracking physical assets or case-related items.
- **Stock Tracking**: The `StockManager` adds, updates, and categorizes items in the system.
- **Releases**: Users with the `PRSO` role manage the release of these items. The system ensures that only approved releases are visible and processed, maintaining a strict chain of custody.

### 4. Real-Time Notifications
To keep users informed of status changes without refreshing the page, SIIDS implements a real-time notification engine.
- **WebSockets via StompJS**: The Spring Boot backend pushes events (e.g., "Report Approved", "New Case Assigned") to specific users or roles over WebSockets.
- **React UI**: The frontend `NotificationContext` listens to these WebSocket channels and updates the UI (like a Notification Bell counter) instantly.

### 5. Data Initialization
When the Spring Boot application starts for the first time, it checks if the database is empty. If so, it triggers the `OrganizationalDataLoader`. This automatically populates the database with foundational data such as structural departments, organizational grades, job titles, and default administrative users.

## 📁 Project Structure

```text
SIIDS/
├── siidsfrontend/          # React/Vite Frontend Application
│   ├── src/
│   │   ├── Components/     # React Components & Pages (Login, Home, Role-specific dashboards)
│   │   ├── context/        # React Context (AuthContext)
│   │   ├── NotificationComponents/ # Real-time Notification UI
│   │   ├── Styles/         # CSS and Styled Components
│   │   └── App.jsx         # Main Application Router
│   ├── package.json
│   └── vite.config.js
│
├── SiidsBackend/           # Spring Boot Backend Application
│   ├── src/main/java/.../siidsbackend/
│   │   ├── Config/         # Security, WebSocket, and Data Loaders
│   │   ├── Controller/     # REST API Endpoints
│   │   ├── Model/          # JPA Entities
│   │   ├── Repository/     # Database Repositories
│   │   └── Service/        # Business Logic
│   ├── src/main/resources/ # application.properties, Data Initialization scripts
│   └── pom.xml
│
└── DATA_INITIALIZATION_README.md # Instructions for populating initial DB data
```

## 🛠️ Prerequisites

- **Java 21** or higher
- **Node.js 18+** and npm
- **Maven**
- **PostgreSQL** or **MySQL** (configured in `application.properties`)

## 🚦 Getting Started

### 1. Database Setup
Ensure your database server is running. Create a new database for SIIDS. Update the `application.properties` in the backend to match your database URL, username, and password.

### 2. Running the Backend (Spring Boot)
Open a terminal in the `SiidsBackend` directory:
```bash
cd SiidsBackend
mvn clean install
mvn spring-boot:run
```
*Note: On the first startup, the application will run the `DataInitializer` and `OrganizationalDataLoader` to populate default users, structures, grades, and job masters. Please refer to [DATA_INITIALIZATION_README.md](./DATA_INITIALIZATION_README.md) for more details.*

### 3. Running the Frontend (React / Vite)
Open a new terminal in the `siidsfrontend` directory:
```bash
cd siidsfrontend
npm install
npm run dev
```
The frontend will start on `http://localhost:5173` (or similar, depending on Vite's allocation).

## 🔒 Authentication Flow
- The application uses JWT (JSON Web Tokens) for authentication.
- Upon successful login at `/`, the backend returns a token and user details (Employee ID, Role).
- The frontend `AuthContext` stores this token and secures protected routes using the `ProtectedRoute` wrapper.

## 📝 Data Initialization
To load initial database values for Structures, Grades, and Job Masters, the system uses an `OrganizationalDataLoader`. For instructions on importing custom organizational CSVs or SQL dumps, consult the `DATA_INITIALIZATION_README.md` file in the root directory.