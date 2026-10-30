
# HealthVault – Personal Medical Records Management System

HealthVault is a full-stack healthcare management web application designed to help patients manage medical records, share documents with clinicians, book appointments, and maintain medication reminders.

## Features

- Patient and clinician registration and login
- JWT authentication with HttpOnly cookies
- Medical document upload and download
- Patient-controlled record sharing and consent revocation
- Appointment management
- Medication reminder management
- Role-based access control
- MongoDB database integration

## Technology Stack

### Frontend
- React
- Vite
- CSS

### Backend
- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT
- bcryptjs
- Multer

## Project Structure

```text
healthvault/
├── client/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── server/
│   ├── src/
│   ├── private_uploads/
│   ├── .env.example
│   └── package.json
├── .gitignore
└── README.md
```

## Local Installation

### Prerequisites

- Node.js and npm
- MongoDB Community Server
- Visual Studio Code (recommended)

### 1. Clone the repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd healthvault
```

### 2. Install backend dependencies

```bash
cd server
npm install
```

### 3. Configure environment variables

Copy `.env.example` to `.env`.

Configure the following variables:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/healthvault
JWT_SECRET=YOUR_LONG_RANDOM_SECRET
CLIENT_ORIGIN=http://localhost:5173
NODE_ENV=development
```

Replace `YOUR_LONG_RANDOM_SECRET` with a secure random secret of at least 32 characters.

### 4. Start the backend

```bash
npm run dev
```

Backend URL: http://localhost:5000

### 5. Start the frontend

Open another terminal:

```bash
cd client
npm install
npm run dev
```

Frontend URL: http://localhost:5173

## Security and Privacy

- Passwords are hashed using bcryptjs.
- Authentication uses JWT with HttpOnly cookies.
- Patient consent controls medical record sharing.
- Private uploaded documents are excluded from Git tracking.
- Role-based access control separates patient and clinician functionality.

## Project Status

HealthVault has been developed and locally tested for its main application workflows. Additional automated testing, security auditing, and deployment hardening are required before production use.

## Future Improvements

- Email and SMS notifications
- Advanced appointment scheduling
- Two-factor authentication
- Automated testing
- Cloud deployment
- Enhanced analytics dashboard

## Disclaimer

HealthVault is an educational software project and is not a certified medical records platform. It is not intended for storing real patient information or replacing professional healthcare systems.

## Author

**Prashant Kumar**

GitHub: Add your GitHub profile URL here.
