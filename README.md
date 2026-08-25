# 🐓 Brandeshof Coop

A custom Progressive Web App (PWA) built to manage the daily operations, flock census, and sales ledger for a historic farm. 

## Features

* **Live Flock Census:** Tracks the active count of standard layers and Perlhuhn (guinea fowl), saving a historical timeline of flock additions, mortalities, and health notes.
* **Daily Production Log:** A responsive interface to track daily egg yields across various breeds and colors (olive, nato, chocolate, perlhuhn, etc.).
* **Sales Tracker & Ledger:** Manages customer transactions, tracks box inventory, and logs both paid sales and gifted items.
* **Offline-Ready PWA:** Fully installable on mobile devices (iOS/Android) with a configured service worker and web manifest for fast, app-like performance.
* **Secure Cloud Database:** Powered by a Supabase backend with Row Level Security (RLS) policies to ensure data is safely backed up and only accessible to authenticated users.
* **Demo Sandbox Mode:** A local-storage fallback mode that allows visitors to test the app's functionality without altering the live production database.

## Tech Stack

* **Frontend:** React, TypeScript, Vite
* **Styling:** Tailwind CSS
* **Backend & Auth:** Supabase (PostgreSQL)
* **PWA Integration:** `vite-plugin-pwa`

## Getting Started

To run this project locally, you will need Node.js installed.

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/YOUR-USERNAME/brandeshof-coop.git](https://github.com/YOUR-USERNAME/brandeshof-coop.git)
   cd brandeshof-coop
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Create a `.env` file in the root directory and add your Supabase keys:
   ```env
   VITE_SUPABASE_URL=your_supabase_project_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

## 📱 PWA Setup
This app is configured as a Progressive Web App. When deployed via HTTPS, it can be installed directly to a device's home screen. Icons and manifest configurations are located in the `public/` directory and `vite.config.ts`.