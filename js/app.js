// Aegis Student Life Coach Main Application Orchestrator
import { demoProfiles } from './demo-data.js';
import { DataStore } from './data-store.js';
import { AnalyticsEngine } from './analytics.js';
import { WebhookManager } from './webhook.js';

// Global Chart references to allow updates
let radarChartRef = null;
let barChartRef = null;

// Application State
let appState = {
  profile: {
    name: "Jane Doe",
    level: "University Freshman",
    studentType: "balanced",
    primaryGoal: "Optimize study-life balance and reduce burnout",
    sleepHours: 7.0,
    weeklyStudyGoal: 15,
    workloadPreference: "medium"
  },
  subjects: [
    { name: "Mathematics 101", grade: "B", target: "A", hoursPerWeek: 5 },
    { name: "Intro to Chemistry", grade: "B+", target: "A-", hoursPerWeek: 4 },
    { name: "History of Science", grade: "A-", target: "A", hoursPerWeek: 3 }
  ],
  exams: [
    { subject: "Intro to Chemistry", name: "Midterm Exam", date: "2026-06-20", weight: 30, prepLevel: 3 }
  ],
  timetable: [
    { day: "Monday", subject: "Mathematics 101", start: "09:00", end: "10:30", type: "class" },
    { day: "Wednesday", subject: "Mathematics 101", start: "09:00", end: "10:30", type: "class" },
    { day: "Tuesday", subject: "Intro to Chemistry", start: "10:00", end: "11:30", type: "class" },
    { day: "Thursday", subject: "Intro to Chemistry", start: "10:00", end: "11:30", type: "class" }
  ],
  personalGoals: [
    { id: "g-init-1", text: "Study chemistry daily for 30 minutes", completed: false },
    { id: "g-init-2", text: "Maintain sleep schedule above 7 hours", completed: true }
  ]
};

// Load local environment variables (.env) if running on a local server
async function loadEnvironmentVariables() {
  try {
    const response = await fetch('.env');
    if (response.ok) {
      const text = await response.text();
      const match = text.match(/GEMINI_API_KEY\s*=\s*([^\s#\r\n]+)/);
      if (match && match[1]) {
        window.GEMINI_API_KEY = match[1].trim();
        console.log("Environment: Gemini API Key loaded from .env successfully.");
      }
    }
  } catch (err) {
    console.log("Environment: No .env configuration loaded (or blocked by CORS).");
  }
}

// Initialization
document.addEventListener("DOMContentLoaded", async () => {
  await loadEnvironmentVariables();
  initApp();
});

function initApp() {
  // Try loading existing state from localStorage
  const saved = DataStore.loadState();
  if (saved) {
    appState = saved;
    showToast("info", "Welcome back! Loaded saved profile.");
    transitionToDashboard();
  } else {
    // Populate onboarding inputs initially
    syncFormInputsFromState();
  }

  // Setup UI Navigation Tab listeners
  setupNavigation();

  // Onboarding Form submit
  const onboardingForm = document.getElementById("onboarding-form");
  if (onboardingForm) {
    onboardingForm.addEventListener("submit", (e) => {
      e.preventDefault();
      saveFormInputsToState();
      transitionToDashboard();
      showToast("success", "Analysis Dashboard Compiled!");
    });
  }

  // Set up Add Subject Modals
  setupModals();

  // Set up file upload drag-and-drop
  setupDragAndDrop();

  // Set up Demo data injector buttons
  setupDemoInjectors();

  // Add timetable study block manually
  const timetableForm = document.getElementById("add-schedule-form");
  if (timetableForm) {
    timetableForm.addEventListener("submit", handleAddScheduleBlock);
  }

  // Add goal manually
  const goalForm = document.getElementById("add-goal-form");
  if (goalForm) {
    goalForm.addEventListener("submit", handleAddGoal);
  }

  // Webhook integration buttons
  setupWebhookButtons();

  // Re-onboard/Reset profile button
  const reOnboardBtn = document.getElementById("btn-re-onboard");
  if (reOnboardBtn) {
    reOnboardBtn.addEventListener("click", () => {
      if (confirm("Reset current profile? All customizations will be cleared.")) {
        DataStore.clearState();
        // Reset state to template default
        appState = {
          profile: { name: "Jane Doe", level: "University Freshman", studentType: "balanced", primaryGoal: "Optimize study-life balance and reduce burnout", sleepHours: 7.0, weeklyStudyGoal: 15, workloadPreference: "medium" },
          subjects: [{ name: "Mathematics 101", grade: "B", target: "A", hoursPerWeek: 5 }],
          exams: [{ subject: "Mathematics 101", name: "Midterm Exam", date: "2026-06-20", weight: 30, prepLevel: 3 }],
          timetable: [{ day: "Monday", subject: "Mathematics 101", start: "09:00", end: "10:30", type: "class" }],
          personalGoals: [{ id: "g-init-1", text: "Study daily", completed: false }]
        };
        syncFormInputsFromState();
        
        // Toggle view
        document.getElementById("dashboard-workspace").style.display = "none";
        const onboardingView = document.getElementById("onboarding-view");
        onboardingView.classList.add("active");
        onboardingView.style.display = "grid";
        showToast("info", "Profile reset. Enter onboarding details.");
      }
    });
  }
}

// Map HTML form elements with local application state
function syncFormInputsFromState() {
  document.getElementById("student-name").value = appState.profile.name;
  document.getElementById("student-level").value = appState.profile.level;
  document.getElementById("student-type").value = appState.profile.studentType;
  
  // Handle select dropdown custom elements dynamically
  const goalSelect = document.getElementById("primary-goal");
  const valueToSelect = appState.profile.primaryGoal;
  let exists = false;
  for (let i = 0; i < goalSelect.options.length; i++) {
    if (goalSelect.options[i].value === valueToSelect) {
      exists = true;
      break;
    }
  }
  if (!exists && valueToSelect) {
    const newOpt = document.createElement("option");
    newOpt.value = valueToSelect;
    newOpt.innerText = valueToSelect;
    goalSelect.appendChild(newOpt);
  }
  goalSelect.value = valueToSelect;

  document.getElementById("sleep-hours").value = appState.profile.sleepHours;
  document.getElementById("weekly-study-goal").value = appState.profile.weeklyStudyGoal;

  renderOnboardingSubjects();
  renderOnboardingExams();
}

function saveFormInputsToState() {
  appState.profile = {
    name: document.getElementById("student-name").value,
    level: document.getElementById("student-level").value,
    studentType: document.getElementById("student-type").value,
    primaryGoal: document.getElementById("primary-goal").value,
    sleepHours: parseFloat(document.getElementById("sleep-hours").value) || 7.0,
    weeklyStudyGoal: parseFloat(document.getElementById("weekly-study-goal").value) || 15,
    workloadPreference: appState.profile.workloadPreference || "medium"
  };
  DataStore.saveState(appState);
}

// Renders inside onboarding form view
function renderOnboardingSubjects() {
  const container = document.getElementById("subjects-container");
  if (!container) return;
  container.innerHTML = "";

  appState.subjects.forEach((sub, idx) => {
    const item = document.createElement("div");
    item.className = "subject-edit-item";
    item.innerHTML = `
      <div style="font-weight:600;">${sub.name}</div>
      <div style="text-align:center;"><span class="badge badge-info">${sub.grade}</span></div>
      <div style="text-align:center;"><span class="badge badge-success">${sub.target}</span></div>
      <div style="color:var(--text-muted);font-size:0.8rem;text-align:center;">${sub.hoursPerWeek}h/wk</div>
      <button type="button" class="btn btn-danger btn-sm" style="padding:4px 8px;" data-idx="${idx}"><i class="fa-solid fa-trash"></i></button>
    `;
    item.querySelector("button").addEventListener("click", () => {
      appState.subjects.splice(idx, 1);
      renderOnboardingSubjects();
    });
    container.appendChild(item);
  });
}

function renderOnboardingExams() {
  const container = document.getElementById("exams-container");
  if (!container) return;
  container.innerHTML = "";

  appState.exams.forEach((ex, idx) => {
    const item = document.createElement("div");
    item.className = "exam-edit-item";
    item.innerHTML = `
      <div style="font-weight:600; font-size:0.85rem;">${ex.subject}</div>
      <div style="font-size:0.8rem; color:var(--text-muted);">${ex.name}</div>
      <div style="font-size:0.8rem;">${ex.date}</div>
      <div style="text-align:center;">${ex.weight}%</div>
      <div style="text-align:center;"><span class="badge badge-warning">Prep: ${ex.prepLevel}</span></div>
      <button type="button" class="btn btn-danger btn-sm" style="padding:4px 8px;" data-idx="${idx}"><i class="fa-solid fa-trash"></i></button>
    `;
    item.querySelector("button").addEventListener("click", () => {
      appState.exams.splice(idx, 1);
      renderOnboardingExams();
    });
    container.appendChild(item);
  });
}

// Navigation Tab Controllers
function setupNavigation() {
  const navItems = document.querySelectorAll(".nav-item");
  const sections = document.querySelectorAll(".view-section");

  navItems.forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      
      const targetView = item.getAttribute("data-target");
      if (!targetView) return;

      navItems.forEach(i => i.classList.remove("active"));
      item.classList.add("active");

      sections.forEach(sec => {
        sec.classList.remove("active");
        if (sec.id === targetView) {
          sec.classList.add("active");
        }
      });

      // Special re-render on active tab switches
      if (targetView === "timetable-view") {
        renderTimetableCalendar();
      } else if (targetView === "webhook-view") {
        renderWebhookPayload();
      }
    });
  });
}

// Switch from Onboarding panel to Dashboard
function transitionToDashboard() {
  document.getElementById("onboarding-view").classList.remove("active");
  document.getElementById("onboarding-view").style.display = "none";
  
  const workspace = document.getElementById("dashboard-workspace");
  workspace.style.display = "flex";
  workspace.classList.add("fadeIn");

  // Perform Cognitive Analysis
  const analysis = AnalyticsEngine.analyzeProfile(appState);
  
  // Render Dashboard widgets
  renderOverview(analysis);
  renderStudyPlanRoadmap(analysis);
  renderTimetableCalendar(); // Computes smart schedule blocks

  // Save to persistence storage
  DataStore.saveState(appState);
}

// 1. Render Dashboard Overview & Charts
function renderOverview(analysis) {
  // Top Banner Archetype details
  const banner = document.getElementById("archetype-banner");
  const badge = document.getElementById("archetype-badge");
  const name = document.getElementById("archetype-name");
  const desc = document.getElementById("archetype-desc");
  const icon = document.getElementById("archetype-icon");
  const tagsContainer = document.getElementById("weakness-tags");

  // Style colors mapping
  banner.style.setProperty('--archetype-color', analysis.archetype.accentColor);
  badge.className = `badge ${analysis.archetype.badgeClass} margin-bottom-sm`;
  badge.innerText = analysis.archetype.name;
  name.innerText = `Coach Diagnostic: ${analysis.archetype.name}`;
  desc.innerText = analysis.archetype.description;

  // Icon conversion
  let iconHtml = '<i class="fa-solid fa-circle-check"></i>';
  if (analysis.archetype.id === 'perfectionist') iconHtml = '<i class="fa-solid fa-skull-crossbones"></i>';
  if (analysis.archetype.id === 'procrastinator') iconHtml = '<i class="fa-solid fa-hourglass-half"></i>';
  if (analysis.archetype.id === 'struggler') iconHtml = '<i class="fa-solid fa-person-running"></i>';
  icon.innerHTML = iconHtml;

  // Weakness Tags
  tagsContainer.innerHTML = "";
  if (analysis.weakSubjects.length === 0) {
    tagsContainer.innerHTML = '<span class="badge badge-success">No Major Grade Risks Flagged</span>';
  } else {
    analysis.weakSubjects.forEach(weak => {
      const tag = document.createElement("span");
      tag.className = "badge badge-danger";
      tag.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${weak.name} (${weak.currentGrade} ➔ Target ${weak.targetGrade})`;
      tagsContainer.appendChild(tag);
    });
  }

  // Sidebar info block
  document.getElementById("sidebar-student-name").innerText = appState.profile.name;
  document.getElementById("sidebar-student-archetype").innerText = analysis.archetype.name;
  
  const initials = appState.profile.name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
  document.getElementById("student-avatar").innerText = initials || "JD";

  // Scorecards
  document.getElementById("val-gpa").innerText = analysis.avgGPA;
  document.getElementById("val-balance").innerText = `${analysis.studyLifeBalance}%`;
  document.getElementById("val-readiness").innerText = `${analysis.examReadiness}%`;
  document.getElementById("val-stress").innerText = `${analysis.academicStress}%`;

  // Status Labels
  document.getElementById("label-gpa-state").innerText = analysis.avgGPA >= 3.5 ? "Excellent Academic Standing" : analysis.avgGPA >= 3.0 ? "Moderate Standing" : "Risk Intervention Recommended";
  document.getElementById("label-balance-state").innerText = analysis.studyLifeBalance >= 80 ? "Healthy Balance Index" : analysis.studyLifeBalance >= 60 ? "Moderate Fatigue Bounds" : "Critical Burnout Risk";
  document.getElementById("label-readiness-state").innerText = analysis.examReadiness >= 75 ? "Exam Confident" : analysis.examReadiness >= 50 ? "Approaching Baseline" : "Under-Prepared Deadlines";
  document.getElementById("label-stress-state").innerText = analysis.academicStress < 40 ? "Low Stress Load" : analysis.academicStress < 70 ? "Moderate Fatigue" : "High Cognitive Strain";

  // Render Actionable Advice cards
  const adviceList = document.getElementById("advice-list");
  adviceList.innerHTML = "";
  analysis.advice.forEach(adv => {
    const card = document.createElement("div");
    card.className = "advice-card";
    
    let iconClass = "fa-circle-info text-primary";
    if (adv.priority === "CRITICAL") iconClass = "fa-circle-exclamation text-danger";
    else if (adv.priority === "HIGH") iconClass = "fa-triangle-exclamation text-warning";

    card.innerHTML = `
      <div class="advice-badge-wrap">
        <i class="fa-solid ${iconClass}" style="font-size:1.4rem;"></i>
        <span class="badge ${adv.priority === 'CRITICAL' ? 'badge-danger' : adv.priority === 'HIGH' ? 'badge-warning' : 'badge-info'}" style="font-size:0.6rem; padding: 2px 6px;">${adv.priority}</span>
      </div>
      <div class="advice-content">
        <span class="badge badge-secondary margin-bottom-sm" style="font-size:0.65rem; padding: 2px 6px;">${adv.category}</span>
        <h4>${adv.title}</h4>
        <p>${adv.description}</p>
      </div>
    `;
    adviceList.appendChild(card);
  });

  // Render Analytics Charts (Chart.js)
  renderCharts(analysis);
}

// Draw radar & bar charts comparing current & target GPA mappings
function renderCharts(analysis) {
  const radarCtx = document.getElementById('radarChart').getContext('2d');
  const barCtx = document.getElementById('barChart').getContext('2d');

  // Destroy previous instances to avoid memory leaks or overlay visual bugs
  if (radarChartRef) radarChartRef.destroy();
  if (barChartRef) barChartRef.destroy();

  const labels = appState.subjects.map(s => s.name);
  const currentGPAs = appState.subjects.map(s => AnalyticsEngine.gradeToGPA(s.grade));
  const targetGPAs = appState.subjects.map(s => AnalyticsEngine.gradeToGPA(s.target));

  // Radar Chart Layout
  radarChartRef = new Chart(radarCtx, {
    type: 'radar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Current Grade Level',
          data: currentGPAs,
          backgroundColor: 'rgba(99, 102, 241, 0.2)',
          borderColor: '#6366f1',
          pointBackgroundColor: '#6366f1',
          borderWidth: 2
        },
        {
          label: 'Target Goals',
          data: targetGPAs,
          backgroundColor: 'rgba(20, 184, 166, 0.1)',
          borderColor: '#20b2aa',
          pointBackgroundColor: '#20b2aa',
          borderWidth: 2,
          borderDash: [4, 4]
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        r: {
          grid: { color: 'rgba(255,255,255,0.06)' },
          angleLines: { color: 'rgba(255,255,255,0.06)' },
          pointLabels: { color: '#94a3b8', font: { family: 'Plus Jakarta Sans', size: 9 } },
          ticks: { display: false, maxTicksLimit: 5 },
          min: 0,
          max: 4.3
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });

  // Bar Chart Layout
  barChartRef = new Chart(barCtx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Current Grade GPA',
          data: currentGPAs,
          backgroundColor: 'rgba(99, 102, 241, 0.75)',
          borderRadius: 4
        },
        {
          label: 'Target Grade GPA',
          data: targetGPAs,
          backgroundColor: 'rgba(168, 85, 247, 0.75)',
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 9 } } },
        y: { 
          grid: { color: 'rgba(255,255,255,0.05)' }, 
          ticks: { color: '#94a3b8', font: { size: 9 } },
          min: 0,
          max: 4.3
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

// 2. Render Study Plan Milestones
function renderStudyPlanRoadmap(analysis) {
  const container = document.getElementById("milestones-container");
  if (!container) return;
  container.innerHTML = "";

  // Combine initial personal goals as a task list or milestones tasks
  analysis.studyPlan.forEach((phase, phaseIdx) => {
    const item = document.createElement("div");
    item.className = "milestone-item";
    
    // Check if all tasks in this phase are done
    const allDone = phase.tasks.every(t => t.done);
    if (allDone) item.classList.add("completed");

    let tasksHTML = "";
    phase.tasks.forEach((task, taskIdx) => {
      tasksHTML += `
        <li class="milestone-task ${task.done ? 'done' : ''}" data-phase="${phaseIdx}" data-task="${taskIdx}">
          <input type="checkbox" ${task.done ? 'checked' : ''}>
          <span>${task.text}</span>
        </li>
      `;
    });

    item.innerHTML = `
      <div class="milestone-header">
        <h3>${phase.title}</h3>
        <span class="milestone-time">${phase.timeline}</span>
      </div>
      <p class="milestone-desc">${phase.description}</p>
      <ul class="milestone-tasks">
        ${tasksHTML}
      </ul>
    `;

    // Handle checkoff tasks
    item.querySelectorAll(".milestone-task").forEach(taskLi => {
      taskLi.addEventListener("click", (e) => {
        // Toggle checkbox state
        const pIdx = parseInt(taskLi.getAttribute("data-phase"));
        const tIdx = parseInt(taskLi.getAttribute("data-task"));
        
        analysis.studyPlan[pIdx].tasks[tIdx].done = !analysis.studyPlan[pIdx].tasks[tIdx].done;
        
        // Re-render and save
        renderStudyPlanRoadmap(analysis);
        DataStore.saveState(appState);
      });
    });

    container.appendChild(item);
  });
}

// 3. Render Study Timetable Schedule with smart weaknesses scheduler
function renderTimetableCalendar() {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  
  // Clear all day columns first
  days.forEach(day => {
    const col = document.querySelector(`.calendar-day-col[data-day="${day}"]`);
    if (col) col.innerHTML = "";
  });

  // Calculate Weakness Subjects
  const analysis = AnalyticsEngine.analyzeProfile(appState);
  const weakSubjectNames = analysis.weakSubjects.map(w => w.name);

  // Generate Smart Study blocks dynamically for weak areas
  // We need to inject "Smart Study" blocks for weak subjects in slots that do not clash
  const mergedTimetable = [...appState.timetable];
  
  // Find empty hourly slots for the weak subjects
  if (weakSubjectNames.length > 0) {
    let weakSubIdx = 0;
    
    // We want to add up to 3 smart study blocks during the week for weak subjects
    // Let's search for slots on Tue/Thu/Sat/Sun where there are no classes scheduled
    const candidateSlots = [
      { day: "Tuesday", start: "14:00", end: "15:30" },
      { day: "Thursday", start: "14:00", end: "15:30" },
      { day: "Saturday", start: "10:00", end: "12:00" },
      { day: "Sunday", start: "14:00", end: "16:00" }
    ];

    candidateSlots.forEach(slot => {
      // Check if slot clashes with classes in appState.timetable
      const hasClash = appState.timetable.some(t => {
        return t.day === slot.day && (
          (slot.start >= t.start && slot.start < t.end) ||
          (slot.end > t.start && slot.end <= t.end)
        );
      });

      if (!hasClash && weakSubIdx < weakSubjectNames.length * 2) {
        // Distribute subjects
        const subjectName = weakSubjectNames[weakSubIdx % weakSubjectNames.length];
        mergedTimetable.push({
          day: slot.day,
          subject: `Smart Study: ${subjectName}`,
          start: slot.start,
          end: slot.end,
          type: "study-auto" // Purple hashed blocks
        });
        weakSubIdx++;
      }
    });
  }

  // Draw blocks absolutely positioned inside their day columns
  mergedTimetable.forEach((slot, index) => {
    const col = document.querySelector(`.calendar-day-col[data-day="${slot.day}"]`);
    if (!col) return;

    // Calculate absolute position based on start time
    // Scale: 60px height per hour. Standard calendar starts at 08:00
    const [startH, startM] = slot.start.split(':').map(Number);
    const [endH, endM] = slot.end.split(':').map(Number);
    
    const startHourOffset = startH - 8; // 8 AM is 0
    const durationHours = (endH + endM / 60) - (startH + startM / 60);

    if (startHourOffset < 0 || startHourOffset > 14) return; // Outside calendar boundaries

    const topPx = (startHourOffset * 60) + (startM);
    const heightPx = durationHours * 60;

    const block = document.createElement("div");
    block.className = `calendar-event event-${slot.type}`;
    block.style.top = `${topPx}px`;
    block.style.height = `${heightPx}px`;
    block.innerHTML = `
      <span class="event-title">${slot.subject}</span>
      <span class="event-time">${slot.start} - ${slot.end}</span>
      ${slot.type !== 'study-auto' ? `<i class="fa-solid fa-xmark" style="position:absolute; right: 6px; top: 6px; cursor:pointer;" data-idx="${index}"></i>` : ''}
    `;

    // Handle delete manually created schedule items
    const deleteBtn = block.querySelector("i");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (confirm(`Remove this block: "${slot.subject}"?`)) {
          // Identify original slot idx
          const originalIdx = appState.timetable.findIndex(t => 
            t.day === slot.day && t.subject === slot.subject && t.start === slot.start
          );
          if (originalIdx > -1) {
            appState.timetable.splice(originalIdx, 1);
            renderTimetableCalendar();
            DataStore.saveState(appState);
            showToast("info", "Schedule block removed.");
          }
        }
      });
    }

    col.appendChild(block);
  });
}

// 4. Render Webhook Payload View
function renderWebhookPayload() {
  const analysis = AnalyticsEngine.analyzeProfile(appState);
  const payload = WebhookManager.compilePayload(appState, analysis);
  
  const viewer = document.getElementById("payload-json-viewer");
  if (viewer) {
    viewer.innerHTML = syntaxHighlightJSON(payload);
  }
}

// Formats JSON to add colorful syntax highlighting inside container
function syntaxHighlightJSON(jsonObj) {
  let json = JSON.stringify(jsonObj, undefined, 2);
  json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g, function (match) {
    let cls = 'number';
    if (/^"/.test(match)) {
      if (/:$/.test(match)) {
        cls = 'key';
      } else {
        cls = 'string';
      }
    } else if (/true|false/.test(match)) {
      cls = 'boolean';
    } else if (/null/.test(match)) {
      cls = 'null';
    }
    return '<span class="json-viewer ' + cls + '">' + match + '</span>';
  });
}

// Hook setup dialog actions
function setupWebhookButtons() {
  const syncBtn = document.getElementById("btn-sync-webhook");
  const mockBtn = document.getElementById("btn-mock-webhook");
  const copyBtn = document.getElementById("btn-copy-payload");
  const urlInput = document.getElementById("webhook-url-input");
  const consoleLog = document.getElementById("webhook-console");

  const addLog = (type, message) => {
    const line = document.createElement("div");
    line.className = `webhook-log-line webhook-log-${type}`;
    line.innerText = message;
    consoleLog.appendChild(line);
    consoleLog.scrollTop = consoleLog.scrollHeight;
  };

  syncBtn.addEventListener("click", async () => {
    const url = urlInput.value;
    const analysis = AnalyticsEngine.analyzeProfile(appState);
    const payload = WebhookManager.compilePayload(appState, analysis);

    syncBtn.disabled = true;
    addLog("info", `[SYSTEM] Initiating dispatch at ${new Date().toLocaleTimeString()}...`);
    
    const result = await WebhookManager.sendWebhook(url, payload, addLog);
    
    if (result.success) {
      showToast("success", "Workato Webhook Sync Dispatched!");
    } else {
      showToast("error", "Webhook Dispatch Failed. Review logs.");
    }
    syncBtn.disabled = false;
  });

  mockBtn.addEventListener("click", async () => {
    const analysis = AnalyticsEngine.analyzeProfile(appState);
    const payload = WebhookManager.compilePayload(appState, analysis);

    addLog("info", `[SYSTEM] Starting simulation routine...`);
    // Pass empty URL to trigger mock behavior
    await WebhookManager.sendWebhook("", payload, addLog);
    showToast("success", "Simulated sync complete!");
  });

  copyBtn.addEventListener("click", () => {
    const analysis = AnalyticsEngine.analyzeProfile(appState);
    const payload = WebhookManager.compilePayload(appState, analysis);
    
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
      .then(() => showToast("success", "Payload copied to clipboard!"))
      .catch(() => showToast("error", "Failed to copy payload."));
  });
}

// Handle adding custom study timetable blocks
function handleAddScheduleBlock(e) {
  e.preventDefault();
  
  const day = document.getElementById("sched-day").value;
  const title = document.getElementById("sched-title").value;
  const start = document.getElementById("sched-start").value;
  const end = document.getElementById("sched-end").value;
  const type = document.getElementById("sched-type").value;

  if (start >= end) {
    showToast("error", "End time must be after start time!");
    return;
  }

  // Check clashes
  const hasClash = appState.timetable.some(t => {
    return t.day === day && (
      (start >= t.start && start < t.end) ||
      (end > t.start && end <= t.end)
    );
  });

  if (hasClash) {
    showToast("error", "Timetable slot clashing! Select a different time.");
    return;
  }

  appState.timetable.push({
    day,
    subject: title,
    start,
    end,
    type
  });

  renderTimetableCalendar();
  DataStore.saveState(appState);
  document.getElementById("sched-title").value = "";
  showToast("success", `Scheduled "${title}" successfully!`);
}

// Handle adding personalized milestone tasks
function handleAddGoal(e) {
  e.preventDefault();
  const goalInput = document.getElementById("new-goal-text");
  const text = goalInput.value.trim();
  if (!text) return;

  // Find Phase 2 milestone to append task
  const analysis = AnalyticsEngine.analyzeProfile(appState);
  if (analysis.studyPlan && analysis.studyPlan.length > 1) {
    analysis.studyPlan[1].tasks.push({
      text: text,
      done: false
    });
    renderStudyPlanRoadmap(analysis);
    DataStore.saveState(appState);
    goalInput.value = "";
    showToast("success", "Goal appended to active roadmap!");
  }
}

// Dialog Modals Logic
function setupModals() {
  const addSubjectBtn = document.getElementById("btn-add-subject");
  const addExamBtn = document.getElementById("btn-add-exam");
  const closeBtns = document.querySelectorAll(".modal-close");

  addSubjectBtn.addEventListener("click", () => {
    openModal("modal-subject");
  });

  addExamBtn.addEventListener("click", () => {
    // Populate subjects select dropdown dynamically
    const examSubSelect = document.getElementById("ex-subject");
    examSubSelect.innerHTML = "";
    appState.subjects.forEach(sub => {
      const opt = document.createElement("option");
      opt.value = sub.name;
      opt.innerText = sub.name;
      examSubSelect.appendChild(opt);
    });

    if (appState.subjects.length === 0) {
      showToast("error", "Add at least one subject first!");
      return;
    }
    openModal("modal-exam");
  });

  closeBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const modalId = btn.getAttribute("data-close");
      closeModal(modalId);
    });
  });

  // Modal form submissions
  document.getElementById("modal-subject-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const name = document.getElementById("sub-name").value;
    const grade = document.getElementById("sub-grade").value;
    const target = document.getElementById("sub-target").value;
    const hours = parseFloat(document.getElementById("sub-hours").value) || 5;

    appState.subjects.push({ name, grade, target, hoursPerWeek: hours });
    renderOnboardingSubjects();
    closeModal("modal-subject");
    document.getElementById("modal-subject-form").reset();
    showToast("success", `${name} added to portfolio.`);
  });

  document.getElementById("modal-exam-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const subject = document.getElementById("ex-subject").value;
    const name = document.getElementById("ex-name").value;
    const date = document.getElementById("ex-date").value;
    const weight = parseFloat(document.getElementById("ex-weight").value) || 20;
    const prep = parseInt(document.getElementById("ex-prep").value) || 3;

    appState.exams.push({ subject, name, date, weight, prepLevel: prep });
    renderOnboardingExams();
    closeModal("modal-exam");
    document.getElementById("modal-exam-form").reset();
    showToast("success", `${name} scheduled.`);
  });
}

function openModal(id) {
  document.getElementById(id).classList.add("active");
}

function closeModal(id) {
  document.getElementById(id).classList.remove("active");
}

// Toast alerts utility
function showToast(type, message) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  
  let iconHtml = '<i class="fa-solid fa-circle-info"></i>';
  if (type === 'success') iconHtml = '<i class="fa-solid fa-circle-check" style="color:var(--success)"></i>';
  else if (type === 'error') iconHtml = '<i class="fa-solid fa-circle-xmark" style="color:var(--danger)"></i>';

  toast.innerHTML = `
    ${iconHtml}
    <span>${message}</span>
  `;
  container.appendChild(toast);

  // Auto remove
  setTimeout(() => {
    toast.style.animation = "slideIn 0.3s reverse forwards";
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
}

// Drag & Drop Student portfolio importer
function setupDragAndDrop() {
  const zone = document.getElementById("upload-zone");
  const fileInput = document.getElementById("file-input");

  zone.addEventListener("click", () => {
    fileInput.click();
  });

  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      handlePortfolioImport(e.target.files[0]);
    }
  });

  zone.addEventListener("dragover", (e) => {
    e.preventDefault();
    zone.classList.add("dragover");
  });

  zone.addEventListener("dragleave", () => {
    zone.classList.remove("dragover");
  });

  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("dragover");
    if (e.dataTransfer.files.length > 0) {
      handlePortfolioImport(e.dataTransfer.files[0]);
    }
  });
}

async function handlePortfolioImport(file) {
  try {
    const result = await DataStore.parsePortfolioFile(file);
    
    if (result.type === 'json') {
      const data = result.data;
      if (!data.profile || !data.subjects) {
        throw new Error("Invalid schema structure. Portfolio requires 'profile' and 'subjects' nodes.");
      }
      appState = {
        profile: { ...appState.profile, ...data.profile },
        subjects: data.subjects || [],
        exams: data.exams || [],
        timetable: data.timetable || [],
        personalGoals: data.personalGoals || []
      };
    } else if (result.type === 'csv') {
      // If it's a CSV, check the name to map it appropriately
      const fname = file.name.toLowerCase();
      if (fname.includes("grade") || fname.includes("subject")) {
        appState.subjects = DataStore.mapCSVToGrades(result.data);
      } else if (fname.includes("timetable") || fname.includes("schedule") || fname.includes("calendar")) {
        appState.timetable = DataStore.mapCSVToTimetable(result.data);
      } else {
        throw new Error("Unable to identify CSV structure. File name must contain 'grades' or 'timetable'.");
      }
    }

    // Refresh Forms
    syncFormInputsFromState();
    showToast("success", `Imported ${file.name} successfully! Form values updated.`);
  } catch (err) {
    showToast("error", err.message);
  }
}

// Set up quick demo injection profiles
function setupDemoInjectors() {
  const loadDemo = (key) => {
    const demo = demoProfiles[key];
    if (demo) {
      // Cloned copy
      appState = JSON.parse(JSON.stringify(demo));
      
      // Sync form values
      syncFormInputsFromState();
      
      // Auto run engine and display
      transitionToDashboard();
      showToast("success", `Injected profile: ${appState.profile.name}`);
    }
  };

  document.getElementById("demo-sarah").addEventListener("click", () => loadDemo("sarah"));
  document.getElementById("demo-alex").addEventListener("click", () => loadDemo("alex"));
  document.getElementById("demo-marcus").addEventListener("click", () => loadDemo("marcus"));
}
