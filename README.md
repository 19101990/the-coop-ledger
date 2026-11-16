# Farm ledger

A custom Progressive Web App (PWA) built to manage the daily operations, flock census, and sales ledger for a historic farm. 

## Features

* **Live Flock Census:** Tracks the active count of standard layers, saving a historical timeline of flock additions, mortalities, and health notes.
* **Daily Production Log:** A responsive interface to track daily egg yields across various breeds and colors.
* **Sales Tracker & Ledger:** Manages customer transactions, tracks box inventory, and logs both paid sales and gifted items.
* **Offline-Ready PWA:** Fully installable on mobile devices (iOS/Android) with a configured service worker and web manifest for fast, app-like performance.
* **Secure Cloud Database:** Powered by a Supabase backend with Row Level Security (RLS) policies to ensure data is safely backed up and only accessible to authenticated users.
* **Demo Sandbox Mode:** A local-storage fallback mode that allows visitors to test the app's functionality without altering the live production database.

## Tech Stack

* **Frontend:** React, TypeScript, Vite
* **Styling:** Tailwind CSS
* **Backend & Auth:** Supabase (PostgreSQL)
* **PWA Integration:** `vite-plugin-pwa`
