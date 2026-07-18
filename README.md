# Aegis AI - Student Life Coach

Aegis AI is an AI-powered feature that acts as a virtual student life coach, responsible for guiding students to navigate their school life.

## Description

Aegis AI is a React-based academic optimization dashboard designed to help students maximize their academic performance while avoiding burnout. The application processes user-inputted student profiles, current subject grades, exam schedules, and weekly class timetables to generate a comprehensive diagnostic breakdown.

Utilizing a custom **Cognitive & Diagnostic Analysis Engine**, the application calculates key performance metrics such as average GPA, academic stress level, study-life balance score, and exam readiness index. It also classifies students into behavioral archetypes (e.g., *Perfectionist*, *Procrastinator*, or *Balanced*) to deliver tailored academic advice and a personalized, phase-based long-term roadmap.

### Key Features
* **Academic Profile Diagnostic**: Evaluates GPA, class load, sleep patterns, and exam schedules to calculate stress levels and time-allocation scores.
* **Interactive Timetable & Scheduler**: A drag-and-drop friendly scheduling calendar displaying classes, personal goals, custom study sessions, and recovery blocks.
* **Smart Study Roadmap**: Dynamically generates milestone phases with interactive check-lists to guide students through exam prep.
* **Integrated AI Coach Chatbot**: Connects directly to Google Gemini (or OpenAI/OpenRouter) to provide real-time, interactive coaching, answering student queries and analyzing schedules.
* **Real-time Webhook Synchronization**: Leverages a Workato integration engine to compile profile, diagnostics, and weekly timetables into a standardized JSON payload, automatically syncing events to Google Calendar.

---

## Getting Started

### Prerequisites

To run this application locally, you will need:
* **Node.js** (v16.0.0 or higher recommended)
* **npm** (comes bundled with Node.js)
* **API Key** (optional: a Gemini API Key to enable the AI Chatbot features)

### Executing program

1. **Navigate to the project folder:**
   ```bash
   cd student-life-coach-1
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory and add your Gemini API Key:
   ```env
   VITE_GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open in browser:**
   Open [http://localhost:3000](http://localhost:3000) (or the alternative port printed in the terminal) to view the dashboard.

### Additional Scripts

* **Build for production:**
  ```bash
  npm run build
  ```
* **Preview production build locally:**
  ```bash
  npm run preview
  ```

---

## Integrations & Workato Setup

Aegis AI comes equipped with a built-in webhook dispatcher configured to sync your timetable to Google Calendar:
1. Copy the webhook URL from your **Workato custom webhook trigger**.
2. Paste the URL into the **Webhook Settings** panel inside the Aegis dashboard.
3. Click **Sync Profile & Schedule**. The app compiles your weekly slots, calculating their start and end dates relative to the current calendar week, and dispatches them in JSON format.
4. Set up a **Repeat Action** loop in Workato to process each item in the `timetable_schedule` list and map them to **Google Calendar: Create Event** actions.

---

## Development & Credits

This project was built and optimized with the assistance of **Antigravity**, an agentic AI coding assistant designed by the **Google DeepMind** team.
