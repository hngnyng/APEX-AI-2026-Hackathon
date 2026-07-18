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
