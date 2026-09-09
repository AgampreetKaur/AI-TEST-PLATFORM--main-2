# AI Test Paper Generator & Homework Validation System

## Overview
A production-ready EdTech SaaS platform designed to help teachers generate test papers from chapter PDFs and automatically evaluate student notebook answers using OCR and AI.

## Target Users
- Teachers
- Students
- Parents
- Schools

## Architecture
- **Frontend**: React 18, TailwindCSS
- **Structure**: Multi-page application (MPA)
- **Theme**: Clean Academic Theme (Blue, White, Indigo)

## Core Modules
1. **Dashboard**: High-level overview, statistics, and charts.
2. **Chapter Management**: Upload PDFs, extract text via OCR, and generate AI summaries.
3. **Test Paper Generator**: Generate custom papers based on selected sets (1-4) using chapter content.
4. **Homework Validation**: Process notebook images via OCR, validate answers using AI against chapter concepts, and assign marks.
5. **Reports & Analytics**: Insights for students, parents, and teachers.

## Local Setup Instructions

This project is built using vanilla HTML/JS with CDN-based React, Babel, and TailwindCSS. No complex build tools (like Webpack or Node.js) are required to run it.

### Step 1: Download the Code
You can download the entire project source code by clicking the **Download** (or Export) button in the top right corner of the Canvas/Code panel. 

### Step 2: Extract the Files
Extract the downloaded `.zip` file into a dedicated folder on your computer.

### Step 3: Serve Locally (Recommended)
While you can sometimes double-click `index.html` to open it in a browser, modern browsers often block local script execution (like Babel standalone) due to CORS security policies on `file://` protocols. It is highly recommended to serve the folder using a simple local web server.

**Using Python (if installed):**
1. Open your terminal or command prompt.
2. Navigate to the extracted folder.
3. Run the following command:
   ```bash
   python -m http.server 8000
   ```
4. Open your browser and go to `http://localhost:8000`

**Using Node.js/npm (if installed):**
1. Open your terminal.
2. Navigate to the extracted folder.
3. Run the following command:
   ```bash
   npx http-server
   ```
4. Open the URL provided in the terminal (usually `http://localhost:8080`).

### Step 4: Navigate the App
Start at `index.html` (Dashboard). The navigation sidebar will allow you to move between all the functional mock pages (`chapters.html`, `generator.html`, `validation.html`, `reports.html`, `settings.html`).
