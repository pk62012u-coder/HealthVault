
# HealthVault – System Architecture

HealthVault is a full-stack healthcare management application built with React, Node.js, Express, and MongoDB.

## Architecture Diagram

```mermaid
flowchart TD
    U["Users<br/>Patient / Clinician"]

    subgraph FRONTEND["Frontend – React + Vite"]
        UI["User Interface"]
        AUTHUI["Login and Registration"]
        DASH["Patient / Clinician Dashboard"]
    end

    subgraph BACKEND["Backend – Node.js + Express"]
        API["REST API"]
        AUTH["Authentication<br/>JWT + HttpOnly Cookies"]
        RBAC["Role-Based Access Control"]
        RECORDS["Medical Records API"]
        APPT["Appointments API"]
        MED["Medication Reminders API"]
        UPLOAD["Multer File Upload"]
    end

    subgraph DATA["Data and Storage"]
        DB[("MongoDB<br/>Mongoose")]
        FILES[("Private File Storage<br/>Uploaded Documents")]
    end

    U --> UI
    UI --> AUTHUI
    UI --> DASH
    AUTHUI --> API
    DASH --> API
    API --> AUTH
    AUTH --> RBAC
    RBAC --> RECORDS
    RBAC --> APPT
    RBAC --> MED
    RECORDS --> DB
    APPT --> DB
    MED --> DB
    RECORDS --> UPLOAD
    UPLOAD --> FILES
```

## Technology Stack

- Frontend: React, Vite, CSS
- Backend: Node.js, Express.js
- Database: MongoDB, Mongoose
- Authentication: JWT and HttpOnly cookies
- Password Security: bcryptjs
- File Upload: Multer
- Version Control: Git and GitHub

## Main Modules

1. Patient and clinician authentication
2. Medical record management
3. Appointment management
4. Medication reminders
5. Patient-controlled record sharing and consent
