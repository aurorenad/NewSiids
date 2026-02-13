# Siids Project

This repository contains the source code for the Siids application, a system for managing stock and employee data.

## Project Structure

The entire project is contained within the `Siids/` directory.

- **`Siids/SiidsBackend/`**: Spring Boot backend application.
- **`Siids/siidsfrontend/`**: React frontend application.
- **`Siids/scripts/`**: Utility scripts (if any).

## Getting Started

### Prerequisites

- Java 17+
- Node.js 16+
- PostgreSQL (or configured database)

### Running the Backend

1.  Navigate to `Siids/SiidsBackend`.
2.  Update `application.properties` with your database credentials.
3.  Run the application:
    ```bash
    ./mvnw spring-boot:run
    ```

### Running the Frontend

1.  Navigate to `Siids/siidsfrontend`.
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```

## Features

- User Authentication (JWT)
- Stock Management (Add, Update, List)
- Employee Management
- Department Management
