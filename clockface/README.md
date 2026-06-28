# RMS Electron Desktop Client

Electron-based desktop client for the Rental Management System (RMS). This is a replica of the PyQt6 desktop app, built with Electron, HTML, CSS, and JavaScript.

## Structure

- `main.js` - Electron main process (window management)
- `login.html` / `login.js` - Login window
- `main.html` / `renderer.js` - Main dashboard window with sidebar navigation
- `api-client.js` - API client for backend communication
- `styles.css` - Global styling matching the PyQt6 design

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm

### Installation

1. Navigate to the `rms_electron` directory:
   ```bash
   cd rms_electron
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Copy `.env.example` to `.env` and update the backend URL if needed:
   ```bash
   copy .env.example .env
   ```
   
   Edit `.env` to set your backend URL:
   ```
   RMS_BACKEND_URL=http://127.0.0.1:8000
   ```

### Running the App

1. Ensure the Django backend server is running (from the `backend` directory):
   ```bash
   python manage.py runserver
   ```

2. Start the Electron app:
   ```bash
   npm start
   ```

### Features

- **Login Window**: JWT authentication with the Django backend
- **Dashboard**: Overview statistics (properties, units, tenants, leases)
- **Navigation**: Sidebar with 9 sections (Dashboard, Properties, Units, Landlords, Tenants, Leases, Financials, Maintenance, Reports)
- **API Integration**: Full API client for all backend endpoints

### Pages

- **Dashboard**: Shows aggregated statistics
- **Properties**: Lists all properties
- **Units**: Lists all rental units
- **Landlords**: Lists all landlords
- **Tenants**: Lists all tenants
- **Leases**: Lists all leases
- **Financials**: Placeholder for financial management
- **Maintenance**: Placeholder for maintenance requests
- **Reports**: Placeholder for reports

### Styling

The app uses CSS styling that closely matches the original PyQt6 design:
- Font: Segoe UI, Arial, sans-serif
- Background: #f4f6fb
- Primary color: #2f80ed (blue)
- Border radius: 6-8px for modern look
- Hover states for interactive elements

### Notes

- The app stores the JWT token in memory (not persisted)
- The backend must be running for the app to function
- The Financials, Maintenance, and Reports pages are placeholders and can be extended with full functionality
