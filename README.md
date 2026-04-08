# 🏛️ BidVault — Real-Time Auction Platform

A robust, real-time auction and bidding platform engineered with Node.js, Express, MySQL, Socket.io, and AngularJS. Features live concurrent bidding, autonomous scheduled closures, JWT stateless authentication, and secure multipart file uploads.

## ✨ Features
- **Real-Time Engine:** Live socket broadcasts for instant bid UI updates across all clients.
- **Auto-Closure System:** Automated chron jobs terminating expired auctions and resolving winners.
- **Secure Auth:** JWT session state handling securely hashed by bcrypt.
- **Advanced MySQL DB:** Enforces 3NF constraints, cascading deletes, and complex stored procedure bidding to prevent race conditions.

## 🛠️ Tech Stack
- **Backend:** Node.js, Express, Socket.io
- **Frontend:** AngularJS (1.8.3), Vanilla CSS Custom Grid
- **Database:** MySQL 8

## 🚀 Quick Setup & Installation

Follow these steps to initialize the application on any standard machine.

### 1. Prerequisites
- Node.js (v18+)
- MySQL Server Engine (Running locally or via cloud)

### 2. Environment Configuration
Duplicate the provided example environment file and define your database keys.
```powershell
cp .env.example .env
```
Fill in the `.env` parameters using your local MySQL credentials.

### 3. Initialize Database & Install Dependencies
First, install all necessary node module dependencies:
```powershell
npm install
```

Next, run the automated setup script to instantly build the database schema and populate dummy data!
```powershell
npm run setup
```

### 4. Start the Application
Boot up the real-time servers using nodemon:
```powershell
npm run dev
```

The application is now actively running at `http://localhost:3000`.
