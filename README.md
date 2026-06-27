# Rental Management System (RMS)

This repository contains a desktop-based Rental Management System for Kenyan property management companies.

## Structure

- `backend/` — Django REST Framework backend API
- `desktop/` — PyQt6 desktop client

## Getting started

### Backend

1. Create a Python environment.
2. Install dependencies:
   ```bash
   python -m pip install -r backend/requirements.txt
   ```
3. Copy `backend/.env.example` to `.env` and update values if needed.
4. Run migrations:
   ```bash
   cd backend
   python manage.py migrate
   ```
5. Create a superuser:
   ```bash
   python manage.py createsuperuser
   ```
6. Start the backend server:
   ```bash
   python manage.py runserver
   ```

### Desktop

1. Create a Python environment.
2. Install dependencies:
   ```bash
   python -m pip install -r rms_desktop/requirements.txt
   ```
3. Copy `rms_desktop/.env.example` to `.env` and update `RMS_BACKEND_URL` if needed. The desktop app uses `python-dotenv` to load this file.
4. Run the desktop app from the `rms_desktop` folder:
   ```bash
   cd rms_desktop
   python main.py
   ```

### Notes

- The desktop app uses the `requests` library to call backend endpoints and stores the JWT access token in memory.
- The backend is configured with JWT authentication and basic model scaffolding for users, properties, units, landlords, tenants, and leases.
- Extend the backend by adding more models and API endpoints for invoices, payments, expenses, maintenance, messaging, and reports.
