# ParkWise

ParkWise is a smart parking management system built for three user roles:

- Drivers can browse nearby parking locations and get AI-assisted ranking suggestions.
- Parking admins can manage the availability and pricing of the single facility assigned to them.
- System admins can manage facilities and assign parking admins to those facilities.

The current version uses:

- `React + Vite + TypeScript` for the frontend
- `Express + TypeScript` for the API
- `PostgreSQL` for authentication and application data
- `Gemini` for facility ranking recommendations on the driver dashboard

## Features

- Email/password registration and login
- Role-based dashboards for drivers, parking admins, and system admins
- Seeded parking facilities on first backend start
- Parking-admin assignment workflow
- AI-assisted parking ranking for drivers
- PostgreSQL-backed local development setup

## Tech Stack

- Frontend: React, Vite, TypeScript, Tailwind CSS, React Router
- Backend: Express, TypeScript
- Database: PostgreSQL
- Maps: Leaflet, OpenStreetMap
- AI: Google Gemini

## Prerequisites

Install these first:

- Node.js 20+
- npm
- PostgreSQL 14+ running locally
- pgAdmin or `psql`

## Clone The Repository

```bash
git clone https://github.com/letsgokala/ParkWise.git
cd ParkWise
```

## Install Dependencies

```bash
npm install
```

## Database Setup

You can use pgAdmin or `psql`.

### Option 1: Using pgAdmin

1. Open pgAdmin and connect to your local PostgreSQL server.
2. Right-click `Databases`.
3. Choose `Create > Database...`
4. Set the database name to `parkwise`.
5. Save it.
6. Make sure you know the password for the PostgreSQL user you will use, usually `postgres`.

### Option 2: Using psql

```sql
CREATE DATABASE parkwise;
```

## Environment Variables

This project uses two local env files:

- `.env` for the backend
- `.env.local` for the frontend

### Backend `.env`

Create a `.env` file in the project root:

```env
CLIENT_URL=http://localhost:3000
PORT=4000

PGHOST=localhost
PGPORT=5432
PGDATABASE=parkwise
PGUSER=postgres
PGPASSWORD=your_local_postgres_password

JWT_SECRET=replace-this-with-a-long-random-string

SYS_ADMIN_EMAIL=sysadmin@parkwise.local
SYS_ADMIN_PASSWORD=ParkWiseAdmin123!
SYS_ADMIN_NAME=System Admin
```

### Frontend `.env.local`

Create a `.env.local` file in the project root:

```env
GEMINI_API_KEY=your_gemini_api_key
```

## First Start Behavior

When you start the backend for the first time, it will automatically:

- create the required PostgreSQL tables
- seed the built-in parking facilities
- create a default system admin account if it does not already exist

Default system admin credentials come from `.env`:

- Email: `SYS_ADMIN_EMAIL`
- Password: `SYS_ADMIN_PASSWORD`

## Run The App

Start the backend:

```bash
npm run server
```

In a second terminal, start the frontend:

```bash
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Available Scripts

- `npm run dev` starts the Vite frontend on port `3000`
- `npm run server` starts the Express API on port `4000`
- `npm run build` builds the frontend for production
- `npm run lint` runs TypeScript type-checking

## User Flows

### Driver

- Register as a driver
- Sign in
- Browse parking facilities
- Use AI-powered ranking recommendations

### Parking Admin

- Register as a parking admin
- Sign in
- Wait until a system admin assigns a facility
- Manage only the assigned facility's price and available spaces

### System Admin

- Sign in with the configured system-admin credentials
- View users and facilities
- Create or delete facilities
- Assign a parking admin to one facility

## Notes

- OAuth buttons are still present in the UI, but the current PostgreSQL version uses email/password auth only.
- The driver dashboard can still be viewed in guest mode.
- The backend polls for some dashboard updates to keep the UI in sync without changing the existing interface design.

## Project Structure

```text
.
├── server/          # Express API and PostgreSQL bootstrap
├── src/             # React frontend
├── src/lib/api.ts   # Frontend API client
├── .env.example     # Example backend and frontend environment values
└── README.md
```

## Troubleshooting

### `password authentication failed for user "postgres"`

Your PostgreSQL credentials in `.env` do not match your local PostgreSQL server.

Check:

- `PGPORT` is correct, usually `5432`
- `PGUSER` is correct
- `PGPASSWORD` matches the password you use in pgAdmin

### `database "parkwise" does not exist`

Create the database first in pgAdmin or with:

```sql
CREATE DATABASE parkwise;
```

### Gemini ranking is not working

Make sure `.env.local` contains a valid `GEMINI_API_KEY`.

## Future Improvements

- Re-enable OAuth on top of the PostgreSQL backend
- Add Docker and `docker-compose` for app + database setup
- Add tests for API routes and auth flows

