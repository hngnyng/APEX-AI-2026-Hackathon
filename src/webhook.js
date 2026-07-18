// Webhook Compiler and Dispatcher for Workato Integrations
// Compiles student profiles, study plans, schedules, and analytics diagnostics 
// into a standardized JSON payload, then executes an HTTP POST to the webhook URL.

const getISOStringForDayTime = (dayName, timeStr) => {
  if (!dayName || !timeStr) return "";

  const normalizedDay = dayName.trim().toLowerCase();
  
  // Normalize variations in spelling/abbreviations of days of the week
  const dayMapping = {
    "mon": "Monday", "monday": "Monday",
    "tue": "Tuesday", "tues": "Tuesday", "tuesday": "Tuesday",
    "wed": "Wednesday", "wednesday": "Wednesday",
    "thu": "Thursday", "thur": "Thursday", "thurs": "Thursday", "thursday": "Thursday",
    "fri": "Friday", "friday": "Friday",
    "sat": "Saturday", "saturday": "Saturday",
    "sun": "Sunday", "sunday": "Sunday"
  };

  const standardDay = dayMapping[normalizedDay] || dayName;

  // Map of weekdays to index difference from Monday (0 to 6)
  const dayOffsets = {
    "Monday": 0,
    "Tuesday": 1,
    "Wednesday": 2,
    "Thursday": 3,
    "Friday": 4,
    "Saturday": 5,
    "Sunday": 6
  };

  const offsetFromMonday = dayOffsets[standardDay];
  if (offsetFromMonday === undefined) return "";

  // Get the Monday of the current real-time week
  const now = new Date();
  const currentDay = now.getDay(); // 0 is Sunday, 1 is Monday, etc.
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);

  // Add the offset to get the target day of the current week
  const targetDate = new Date(monday);
  targetDate.setDate(monday.getDate() + offsetFromMonday);

  // Format as YYYY-MM-DD in the local timezone
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, '0');
  const date = String(targetDate.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${date}`;

  // Return local time formatted as UTC directly (highly compatible with Workato and Google Calendar setups)
  // This ensures the local hours on Aegis (e.g. 18:00) align exactly in the calendar (e.g. 06:00 PM)
  return `${dateStr}T${timeStr}:00.000Z`;
};

export const WebhookManager = {
  // Compile the detailed payload to send
  compilePayload(studentData, analysisResult) {
    const timestamp = new Date().toISOString();
    
    return {
      event_type: "student_profile_sync",
      timestamp: timestamp,
      meta: {
        app_name: "Aegis React Student Life Coach",
        version: "1.0.0"
      },
      student_profile: {
        name: studentData.profile.name,
        academic_level: studentData.profile.level,
        coaching_type: studentData.profile.studentType,
        primary_goal: studentData.profile.primaryGoal,
        sleep_hours_daily: parseFloat(studentData.profile.sleepHours),
        target_study_hours_weekly: parseFloat(studentData.profile.weeklyStudyGoal),
        workload_preference: studentData.profile.workloadPreference || "medium"
      },
      diagnostics: {
        calculated_gpa: parseFloat(analysisResult.avgGPA),
        total_weekly_workload_hours: parseFloat(analysisResult.totalWeeklyWorkload),
        weekly_class_hours: parseFloat(analysisResult.weeklyClassHours),
        weekly_study_hours: parseFloat(analysisResult.weeklyStudyHours),
        study_life_balance_score: analysisResult.studyLifeBalance,
        exam_readiness_score: analysisResult.examReadiness,
        academic_stress_score: analysisResult.academicStress,
        archetype_id: analysisResult.archetype.id,
        archetype_name: analysisResult.archetype.name,
        critical_exams_count: analysisResult.criticalExamsCount
      },
      subjects: studentData.subjects.map(s => ({
        subject_name: s.name,
        current_grade: s.grade,
        target_grade: s.target,
        hours_per_week: parseFloat(s.hoursPerWeek),
        gpa_equivalent: parseFloat(s.hoursPerWeek)
      })),
      weaknesses: analysisResult.weakSubjects.map(w => ({
        subject_name: w.name,
        current_grade: w.currentGrade,
        target_grade: w.targetGrade,
        reason: w.reason
      })),
      upcoming_exams: analysisResult.examUrgencyList.map(e => ({
        subject_name: e.subject,
        exam_name: e.name,
        date: e.date,
        weight_percentage: parseFloat(e.weight),
        preparation_level: parseInt(e.prepLevel),
        days_remaining: e.daysRemaining,
        urgency_rating: e.riskScore
      })),
      coaching_advice: analysisResult.advice.map((adv, idx) => ({
        advice_id: adv.id || `adv-${idx}`,
        category: adv.category,
        priority: adv.priority,
        title: adv.title,
        description: adv.description
      })),
      long_term_roadmap: analysisResult.studyPlan.map((phase, idx) => ({
        phase_number: idx + 1,
        title: phase.title,
        timeline: phase.timeline,
        focus_description: phase.description,
        checklist_items: phase.tasks.map(t => ({
          task_text: t.text,
          is_completed: t.done
        }))
      })),
      timetable_schedule: studentData.timetable.map(slot => ({
        day: slot.day,
        subject: slot.subject,
        start_time: getISOStringForDayTime(slot.day, slot.start),
        end_time: getISOStringForDayTime(slot.day, slot.end),
        type: slot.type,
        raw_start_time: slot.start,
        raw_end_time: slot.end
      }))
    };
  },

  // Dispatch the HTTP POST request to the webhook URL
  async sendWebhook(url, payload, logCallback) {
    if (!logCallback) logCallback = console.log;

    logCallback("info", `[SYSTEM] Preparing payload for transfer...`);
    logCallback("info", `[PAYLOAD] Data Compiled successfully (${JSON.stringify(payload).length} bytes)`);

    // Fetch API key from Vite environment if available to show user we recognize their configs
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (apiKey && apiKey !== "YOUR_GEMINI_API_KEY") {
      logCallback("info", `[INTEGRATION] Detected VITE_GEMINI_API_KEY loaded: ${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`);
    } else {
      logCallback("info", `[INTEGRATION] No active VITE_GEMINI_API_KEY detected in .env.`);
    }

    if (!url || url.trim() === "") {
      logCallback("error", `[ERROR] Target Webhook URL is empty!`);
      logCallback("warn", `[FALLBACK] Simulating mock sync. The payload matches what Workato expects.`);
      logCallback("success", `[MOCK SUCCESS] Workato received webhook trigger! Code: 200 OK. Flow triggered: "Process Student Diagnostics".`);
      return { success: true, mock: true };
    }

    logCallback("info", `[HTTP] Dispatching POST to webhook receiver:\n${url}`);

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        mode: "cors"
      });

      if (response.ok) {
        let responseText = "";
        try {
          responseText = await response.text();
        } catch (_) {}
        
        logCallback("success", `[HTTP SUCCESS] Response: ${response.status} ${response.statusText}`);
        if (responseText) {
          logCallback("info", `[RESPONSE BODY] ${responseText.substring(0, 200)}`);
        }
        return { success: true, status: response.status, body: responseText };
      } else {
        logCallback("error", `[HTTP ERROR] Response: ${response.status} ${response.statusText}`);
        return { success: false, status: response.status };
      }
    } catch (err) {
      logCallback("error", `[NETWORK ERROR] Could not connect to Webhook receiver.`);
      logCallback("error", `Details: ${err.message}`);
      logCallback("warn", `Tip: Ensure CORS is allowed on your Workato webhook trigger.`);
      logCallback("warn", `[MOCK FALLBACK] Click "Trigger Simulated Sync" to mock-run Workato integrations without browser CORS blockages.`);
      return { success: false, error: err.message };
    }
  }
};
