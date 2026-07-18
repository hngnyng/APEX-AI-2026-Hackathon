import React, { useState, useEffect, useRef, useMemo } from 'react';
import { demoProfiles } from './demo-data.js';
import { AnalyticsEngine } from './analytics.js';
import { WebhookManager } from './webhook.js';
import Chart from 'chart.js/auto';

// Initial default state
const DEFAULT_STATE = {
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

export default function App() {
  // --- STATE ---
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [activeSection, setActiveSection] = useState('overview'); // overview, plan, timetable, webhook
  const [toasts, setToasts] = useState([]);
  
  // Student Data State
  const [profile, setProfile] = useState(DEFAULT_STATE.profile);
  const [subjects, setSubjects] = useState(DEFAULT_STATE.subjects);
  const [exams, setExams] = useState(DEFAULT_STATE.exams);
  const [timetable, setTimetable] = useState(DEFAULT_STATE.timetable);
  
  // Custom Goals and Roadmap Checklists
  const [roadmap, setRoadmap] = useState([]);
  
  // Webhook State
  const [webhookUrl, setWebhookUrl] = useState('https://webhooks.trial.workato.com/webhooks/rest/2a030343-5197-4a35-85f8-f22ba684778b/fetch-events');
  const [webhookLogs, setWebhookLogs] = useState([
    { type: 'info', text: '[READY] Webhook Sync Engine initialized. Awaiting user dispatch...' }
  ]);

  // Modal Controllers
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  
  // Form input values (for manual add subjects/exams modals)
  const [modalSubject, setModalSubject] = useState({ name: '', grade: 'A', target: 'A', hours: 5 });
  const [modalExam, setModalExam] = useState({ subject: '', name: '', date: '2026-06-20', weight: 25, prep: 3 });
  
  // Timetable Add Block Form State
  const [schedBlock, setSchedBlock] = useState({ day: 'Monday', title: '', start: '09:00', end: '10:00', type: 'study-manual' });
  const [newGoalText, setNewGoalText] = useState('');

  // Drag and drop dragover state
  const [isDragOver, setIsDragOver] = useState(false);

  // Chatbot State
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // AI Configuration State
  const [aiProvider, setAiProvider] = useState(() => {
    return localStorage.getItem('aegis_ai_provider') || 'gemini';
  });
  const [userApiKey, setUserApiKey] = useState(() => {
    return localStorage.getItem('aegis_user_api_key') || '';
  });
  const [selectedModel, setSelectedModel] = useState(() => {
    const saved = localStorage.getItem('aegis_selected_model');
    if (saved) return saved;
    const provider = localStorage.getItem('aegis_ai_provider') || 'gemini';
    if (provider === 'gemini') return 'gemini-2.5-flash';
    if (provider === 'openai') return 'gpt-4o-mini';
    if (provider === 'openrouter') return 'meta-llama/llama-3-8b-instruct:free';
    return 'local-coach';
  });
  const [showSettings, setShowSettings] = useState(false);

  // Persist settings changes
  useEffect(() => {
    localStorage.setItem('aegis_ai_provider', aiProvider);
  }, [aiProvider]);

  useEffect(() => {
    localStorage.setItem('aegis_user_api_key', userApiKey);
  }, [userApiKey]);

  useEffect(() => {
    localStorage.setItem('aegis_selected_model', selectedModel);
  }, [selectedModel]);



  // Chart canvas refs
  const radarCanvasRef = useRef(null);
  const barCanvasRef = useRef(null);
  const radarChartRef = useRef(null);
  const barChartRef = useRef(null);

  // --- LOCALSTORAGE STORAGE PERSISTENCE ---
  useEffect(() => {
    try {
      const saved = localStorage.getItem('student_coach_react_data');
      if (saved) {
        const data = JSON.parse(saved);
        setProfile(data.profile || DEFAULT_STATE.profile);
        setSubjects(data.subjects || DEFAULT_STATE.subjects);
        setExams(data.exams || DEFAULT_STATE.exams);
        setTimetable(data.timetable || DEFAULT_STATE.timetable);
        setRoadmap(data.roadmap || []);
        setIsOnboarded(true);
        addToast("info", "Welcome back! Saved profile loaded.");
      }
    } catch (e) {
      console.error("Failed to load state from LocalStorage", e);
    }
  }, []);

  const saveCurrentState = (updatedProfile, updatedSubjects, updatedExams, updatedTimetable, updatedRoadmap) => {
    try {
      const stateObj = {
        profile: updatedProfile || profile,
        subjects: updatedSubjects || subjects,
        exams: updatedExams || exams,
        timetable: updatedTimetable || timetable,
        roadmap: updatedRoadmap || roadmap
      };
      localStorage.setItem('student_coach_react_data', JSON.stringify(stateObj));
    } catch (e) {
      console.error("Failed to save state to LocalStorage", e);
    }
  };

  // --- COACH DIAGNOSTICS COMPUTATION ---
  const analysis = useMemo(() => {
    return AnalyticsEngine.analyzeProfile({
      profile,
      subjects,
      exams,
      timetable
    });
  }, [profile, subjects, exams, timetable]);

  // Synchronize dynamic study roadmap whenever the analysis generates a new template
  useEffect(() => {
    if (analysis && roadmap.length === 0) {
      setRoadmap(analysis.studyPlan);
    }
  }, [analysis, roadmap]);

  // Initialize AI Coach Greeting
  useEffect(() => {
    if (isOnboarded && analysis) {
      setChatMessages([
        {
          sender: 'aegis',
          text: `Hi ${profile.name}! I'm **Aegis**, your AI Life Coach. I've analyzed your portfolio and classified you as **${analysis.archetype.name}**.\n\n* Concerns: ${analysis.weakSubjects.map(w => w.name).join(', ') || 'None flagged'}\n* GPA equivalent: **${analysis.avgGPA}**\n\nWhat would you like to focus on today? I can help you structure your revision, optimize your bedtime, or cope with exam anxiety.`
        }
      ]);
    }
  }, [isOnboarded, profile.name, analysis.archetype.id]);

  const formatChatMarkdown = (text) => {
    let html = text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^\s*-\s+(.*?)$/gm, '• $1')
      .replace(/\n/g, '<br/>');
    return html;
  };  const callLocalCoachAPI = (userPrompt) => {
    const prompt = userPrompt.toLowerCase();
    const name = profile.name;
    const arch = analysis.archetype.name;
    const gpa = analysis.avgGPA;
    const sleep = profile.sleepHours;
    const stress = analysis.academicStress;
    const weakList = analysis.weakSubjects.map(w => w.name);
    const examList = analysis.examUrgencyList.map(e => e.subject);

    let reply = "";

    if (prompt.includes("anxiety") || prompt.includes("stress") || prompt.includes("scared") || prompt.includes("worry") || prompt.includes("burnout") || prompt.includes("nervous") || prompt.includes("depressed")) {
      reply = `Hey **${name}**, stress and anxiety are completely natural, especially when you are balancing multiple subjects. 

* **Current Stress Index**: \`${stress}%\` (${stress > 70 ? 'CRITICAL bounds' : 'Moderate strain'})
* **Active Recovery Suggestion**: Try adding a **Relaxation block** in your schedule today. Keep your curfew bound to your target of **${sleep} hours/night**.
* **Mental Reset**: Take a 5-minute deep breathing break between subjects. You don't have to perfect everything in one sitting. Focus on small, consistent revision blocks.`;
    } 
    else if (prompt.includes("sleep") || prompt.includes("tired") || prompt.includes("night") || prompt.includes("bed") || prompt.includes("sleepy") || prompt.includes("rest") || prompt.includes("wake")) {
      reply = `Hi **${name}**! Sleep is the ultimate multiplier for grade performance. 

* **Current Sleep Target**: \`${sleep} hours/night\`
* **Current Stress Load**: \`${stress}%\`
* **Habit Suggestion**: Set a screen curfew 30 minutes before sleep. If you're a *Perfectionist*, staying up late has a negative return on grades. Avoid study blocks after 21:00. Let's make sure you hit your sleep goals so you can retain the information you studied!`;
    }
    else if (prompt.includes("gpa") || prompt.includes("grade") || prompt.includes("subject") || prompt.includes("math") || prompt.includes("chemistry") || prompt.includes("study") || prompt.includes("revision") || prompt.includes("learn") || prompt.includes("class")) {
      const targetWeak = weakList.length > 0 ? weakList[0] : (examList.length > 0 ? examList[0] : "your main subject");
      reply = `Let's talk academics, **${name}**. Your current GPA stands at **${gpa}**.

* **Weaknesses Flagged**: ${weakList.join(', ') || 'No major weaknesses!'}
* **Study Strategy**: We should focus on **${targetWeak}**. Try adding a 1.5-hour study slot specifically for this on Tuesday or Thursday.
* **Smart Study Recommendation**: Use active recall and spaced repetition instead of passive highlighting. Break study into 25-minute Pomodoro sessions to keep retention high.`;
    }
    else if (prompt.includes("hello") || prompt.includes("hi") || prompt.includes("hey") || prompt.includes("who are you") || prompt.includes("coach") || prompt.includes("aegis")) {
      reply = `Hello **${name}**! I'm **Aegis**, your offline student life coach.

As a **${arch}**, I'm configured to analyze your workload and help you find a sustainable study-life balance. 
* Ask me about **stress management**, **sleep hygiene**, or **study planning**!
* I can also run with online AI models. Open settings (⚙️) above to connect a live Gemini, OpenRouter, or OpenAI key.`;
    }
    else {
      if (analysis.archetype.id === 'perfectionist') {
        reply = `Hey **${name}**, as a **Perfectionist** (GPA: **${gpa}**), you are doing amazing, but you're at high risk of burnout.

* Make sure you are scheduled for active recovery. 
* Don't let grades override your sleep curfew of **${sleep} hours**.
* What specific topic or habit can we ease off of today to give you breathing room?`;
      } else if (analysis.archetype.id === 'procrastinator') {
        reply = `Hey **${name}**, as a classified **Procrastinator**, we need to build friction-free momentum. 

* Try starting with just **15 minutes** of focused work on your weakest subject today.
* Use the **Timetable** view to block out study slots before you get distracted.
* What is one small task you can check off right now?`;
      } else {
        reply = `Hey **${name}**, I'm analyzing your current metrics (GPA: **${gpa}**, Stress: **${stress}%**, Sleep: **${sleep}h**).

* **Subject Focus**: Make sure to check off tasks in your **Study Plan** timeline.
* **Timetabling**: Use the scheduled blocks on your calendar to ensure steady progress.
* What specific challenge or exam prep topic can I help you organize today?`;
      }
    }

    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(reply);
      }, 600);
    });
  };

  const callAICoachAPI = async (userPrompt) => {
    const systemPrompt = `You are Aegis, a supportive, strategic, and concise AI academic life coach for students.
The student's name is ${profile.name}.
Academic Level: ${profile.level}
Archetype Classification: ${analysis.archetype.name}
Core Goal: ${profile.primaryGoal}
Current GPA: ${analysis.avgGPA}
Weaknesses: ${analysis.weakSubjects.map(w => w.name).join(', ') || 'None flagged'}
Upcoming Exams: ${analysis.examUrgencyList.map(e => `${e.subject} (${e.name} on ${e.date}, prep: ${e.prepLevel}/5)`).join(', ') || 'None scheduled'}

Reply in direct, encouraging, highly actionable coaching responses. Keep your answers brief (under 120 words) and use markdown spacing/bullets.`;

    if (aiProvider === 'local') {
      return callLocalCoachAPI(userPrompt);
    }

    let keyToUse = userApiKey.trim();
    if (!keyToUse) {
      if (aiProvider === 'gemini') {
        keyToUse = import.meta.env.VITE_GEMINI_API_KEY || '';
      } else if (aiProvider === 'openai') {
        keyToUse = import.meta.env.VITE_OPENAI_API_KEY || '';
      } else if (aiProvider === 'openrouter') {
        keyToUse = import.meta.env.VITE_OPENROUTER_API_KEY || '';
      }
    }

    if (!keyToUse || keyToUse === "YOUR_GEMINI_API_KEY" || keyToUse.startsWith("YOUR_")) {
      throw new Error(`API Key for ${aiProvider.toUpperCase()} is not set. Please click the settings gear (⚙️) above and enter your API key.`);
    }

    const modelToUse = selectedModel || (aiProvider === 'gemini' ? 'gemini-2.5-flash' : aiProvider === 'openai' ? 'gpt-4o-mini' : 'meta-llama/llama-3-8b-instruct:free');

    if (aiProvider === 'gemini') {
      const proxyUrl = import.meta.env.VITE_GEMINI_API_PROXY_URL;
      const baseUrl = proxyUrl && proxyUrl.trim() !== "" ? proxyUrl.trim() : "https://generativelanguage.googleapis.com";
      const url = `${baseUrl}/v1beta/models/${modelToUse}:generateContent?key=${keyToUse}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: `${systemPrompt}\n\nStudent Message: ${userPrompt}` }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API HTTP ${response.status}: ${errText}`);
      }

      const json = await response.json();
      const replyText = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!replyText) {
        throw new Error("Invalid response schema from Gemini API.");
      }
      return replyText;
    }

    if (aiProvider === 'openai') {
      const url = "https://api.openai.com/v1/chat/completions";
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${keyToUse}`
        },
        body: JSON.stringify({
          model: modelToUse,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ]
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenAI API HTTP ${response.status}: ${errText}`);
      }

      const json = await response.json();
      const replyText = json.choices?.[0]?.message?.content;
      if (!replyText) {
        throw new Error("Invalid response schema from OpenAI API.");
      }
      return replyText;
    }

    if (aiProvider === 'openrouter') {
      const url = "https://openrouter.ai/api/v1/chat/completions";
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${keyToUse}`,
          'HTTP-Referer': 'https://aegis.coach',
          'X-Title': 'Aegis Coach'
        },
        body: JSON.stringify({
          model: modelToUse,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt }
          ]
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenRouter API HTTP ${response.status}: ${errText}`);
      }

      const json = await response.json();
      const replyText = json.choices?.[0]?.message?.content;
      if (!replyText) {
        throw new Error("Invalid response schema from OpenRouter API.");
      }
      return replyText;
    }

    throw new Error(`Unsupported provider: ${aiProvider}`);
  };

  const handleChatSend = async (e) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;

    setChatMessages(prev => [...prev, { sender: 'user', text }]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const reply = await callAICoachAPI(text);
      setChatMessages(prev => [...prev, { sender: 'aegis', text: reply }]);
    } catch (err) {
      console.error(err);
      addToast("error", "AI Response failed.");
      const activeKey = userApiKey.trim() !== "" ? userApiKey.trim() : (() => {
        if (aiProvider === 'gemini') return import.meta.env.VITE_GEMINI_API_KEY;
        if (aiProvider === 'openai') return import.meta.env.VITE_OPENAI_API_KEY;
        if (aiProvider === 'openrouter') return import.meta.env.VITE_OPENROUTER_API_KEY;
        return "";
      })() || "undefined";
      const keySnippet = activeKey.length > 8 ? `${activeKey.substring(0, 5)}...${activeKey.substring(activeKey.length - 4)}` : activeKey;
      setChatMessages(prev => [...prev, { 
        sender: 'aegis', 
        text: `❌ **Failed to connect:** ${err.message}.\n\n*Provider:* \`${aiProvider.toUpperCase()}\` | *Active Key Snippet:* \`${keySnippet}\`\n\n*Troubleshooting:* Verify your API key is correct and valid. If using Gemini and experiencing regional blocks, try switching the provider to **OpenRouter API** (which supports free models like Llama 3) or **Local Coach** (which runs completely offline without any API keys).` 
      }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // --- CHART RENDERING ENGINE ---
  useEffect(() => {
    if (!isOnboarded || activeSection !== 'overview') return;

    const radarCtx = radarCanvasRef.current?.getContext('2d');
    const barCtx = barCanvasRef.current?.getContext('2d');

    if (radarChartRef.current) radarChartRef.current.destroy();
    if (barChartRef.current) barChartRef.current.destroy();

    const labels = subjects.map(s => s.name);
    const currentGPAs = subjects.map(s => AnalyticsEngine.gradeToGPA(s.grade));
    const targetGPAs = subjects.map(s => AnalyticsEngine.gradeToGPA(s.target));

    if (radarCtx && labels.length > 0) {
      radarChartRef.current = new Chart(radarCtx, {
        type: 'radar',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Current GPA Level',
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
          plugins: { legend: { display: false } }
        }
      });
    }

    if (barCtx && labels.length > 0) {
      barChartRef.current = new Chart(barCtx, {
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
          plugins: { legend: { display: false } }
        }
      });
    }

    return () => {
      if (radarChartRef.current) radarChartRef.current.destroy();
      if (barChartRef.current) barChartRef.current.destroy();
    };
  }, [isOnboarded, activeSection, subjects]);

  // --- TIMETABLE SCHEDULER ALGORITHM ---
  const mergedTimetable = useMemo(() => {
    const list = [...timetable];
    const weakSubjectNames = analysis.weakSubjects.map(w => w.name);

    if (weakSubjectNames.length > 0) {
      let weakIdx = 0;
      const candidateSlots = [
        { day: "Tuesday", start: "14:00", end: "15:30" },
        { day: "Thursday", start: "14:00", end: "15:30" },
        { day: "Saturday", start: "10:00", end: "12:00" },
        { day: "Sunday", start: "14:00", end: "16:00" }
      ];

      candidateSlots.forEach(slot => {
        const clash = timetable.some(t => {
          return t.day === slot.day && (
            (slot.start >= t.start && slot.start < t.end) ||
            (slot.end > t.start && slot.end <= t.end)
          );
        });

        if (!clash && weakIdx < weakSubjectNames.length * 2) {
          const subjectName = weakSubjectNames[weakIdx % weakSubjectNames.length];
          list.push({
            day: slot.day,
            subject: `Smart Study: ${subjectName}`,
            start: slot.start,
            end: slot.end,
            type: "study-auto"
          });
          weakIdx++;
        }
      });
    }

    return list;
  }, [timetable, analysis]);

  // --- ACTIONS & HANDLERS ---
  const addToast = (type, text) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, type, text }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const handleDemoInject = (key) => {
    const demo = demoProfiles[key];
    if (demo) {
      setProfile(demo.profile);
      setSubjects(demo.subjects);
      setExams(demo.exams);
      setTimetable(demo.timetable);
      
      const newAnalysis = AnalyticsEngine.analyzeProfile(demo);
      setRoadmap(newAnalysis.studyPlan);
      
      setIsOnboarded(true);
      setActiveSection('overview');
      saveCurrentState(demo.profile, demo.subjects, demo.exams, demo.timetable, newAnalysis.studyPlan);
      addToast("success", `Injected student profile: ${demo.profile.name}`);
    }
  };

  const handleOnboardingSubmit = (e) => {
    e.preventDefault();
    setIsOnboarded(true);
    setActiveSection('overview');
    
    // Trigger baseline roadmap generation
    const newRoadmap = analysis.studyPlan;
    setRoadmap(newRoadmap);
    saveCurrentState(profile, subjects, exams, timetable, newRoadmap);
    addToast("success", "Life Coach analysis created successfully!");
  };

  const handleReset = () => {
    if (confirm("Reset current profile? All data will be deleted.")) {
      localStorage.removeItem('student_coach_react_data');
      setProfile(DEFAULT_STATE.profile);
      setSubjects(DEFAULT_STATE.subjects);
      setExams(DEFAULT_STATE.exams);
      setTimetable(DEFAULT_STATE.timetable);
      setRoadmap([]);
      setIsOnboarded(false);
      addToast("info", "Profile reset complete.");
    }
  };

  // Add dynamic subjects
  const handleAddSubjectSubmit = (e) => {
    e.preventDefault();
    const updated = [...subjects, {
      name: modalSubject.name,
      grade: modalSubject.grade,
      target: modalSubject.target,
      hoursPerWeek: modalSubject.hours
    }];
    setSubjects(updated);
    setIsSubModalOpen(false);
    setModalSubject({ name: '', grade: 'A', target: 'A', hours: 5 });
    saveCurrentState(profile, updated, exams, timetable, roadmap);
    addToast("success", `Added subject ${modalSubject.name}`);
  };

  const handleRemoveSubject = (idx) => {
    const updated = subjects.filter((_, i) => i !== idx);
    setSubjects(updated);
    saveCurrentState(profile, updated, exams, timetable, roadmap);
  };

  // Add dynamic exams
  const handleAddExamSubmit = (e) => {
    e.preventDefault();
    const updated = [...exams, {
      subject: modalExam.subject || subjects[0]?.name || 'Unknown',
      name: modalExam.name,
      date: modalExam.date,
      weight: modalExam.weight,
      prepLevel: modalExam.prep
    }];
    setExams(updated);
    setIsExamModalOpen(false);
    setModalExam({ subject: '', name: '', date: '2026-06-20', weight: 25, prep: 3 });
    saveCurrentState(profile, subjects, updated, timetable, roadmap);
    addToast("success", `Scheduled exam ${modalExam.name}`);
  };

  const handleRemoveExam = (idx) => {
    const updated = exams.filter((_, i) => i !== idx);
    setExams(updated);
    saveCurrentState(profile, subjects, updated, timetable, roadmap);
  };

  // Drag and Drop File Parsers
  const parseCSV = (text) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const results = [];

    for (let i = 1; i < lines.length; i++) {
      const currentline = lines[i].split(',').map(cell => cell.trim().replace(/^["']|["']$/g, ''));
      if (currentline.length === headers.length) {
        const obj = {};
        for (let j = 0; j < headers.length; j++) {
          obj[headers[j]] = currentline[j];
        }
        results.push(obj);
      }
    }
    return results;
  };

  const handleFileUpload = (file) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target.result;
      const fName = file.name.toLowerCase();

      try {
        if (fName.endsWith('.json')) {
          const parsed = JSON.parse(content);
          if (!parsed.profile || !parsed.subjects) {
            throw new Error("Missing 'profile' or 'subjects' nodes in JSON.");
          }
          setProfile(parsed.profile);
          setSubjects(parsed.subjects || []);
          setExams(parsed.exams || []);
          setTimetable(parsed.timetable || []);
          addToast("success", "Loaded portfolio file successfully.");
        } else if (fName.endsWith('.csv')) {
          const rows = parseCSV(content);
          if (fName.includes("grade") || fName.includes("subject")) {
            const mapped = rows.map(r => ({
              name: r.subject || r.Subject || 'Subject',
              grade: (r.grade || r.Grade || 'B').toUpperCase(),
              target: (r.target || r.Target || 'A').toUpperCase(),
              hoursPerWeek: parseFloat(r.hoursPerWeek || r.study_hours || 4)
            }));
            setSubjects(mapped);
            addToast("success", "Loaded grades CSV successfully.");
          } else if (fName.includes("timetable") || fName.includes("schedule")) {
            const mapped = rows.map(r => ({
              day: r.day || 'Monday',
              subject: r.subject || 'Class',
              start: r.start || '09:00',
              end: r.end || '10:00',
              type: (r.type || 'class').toLowerCase()
            }));
            setTimetable(mapped);
            addToast("success", "Loaded timetable CSV successfully.");
          } else {
            throw new Error("CSV filename must contain 'grades' or 'timetable' for parsing context.");
          }
        } else {
          throw new Error("File must be .json or .csv.");
        }
      } catch (err) {
        addToast("error", `Parse Error: ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  // Add study timetable block
  const handleAddScheduleBlock = (e) => {
    e.preventDefault();
    if (schedBlock.start >= schedBlock.end) {
      addToast("error", "End time must exceed start time!");
      return;
    }

    const clash = timetable.some(t => {
      return t.day === schedBlock.day && (
        (schedBlock.start >= t.start && schedBlock.start < t.end) ||
        (schedBlock.end > t.start && schedBlock.end <= t.end)
      );
    });

    if (clash) {
      addToast("error", "Schedule slot clashing! Choose a different time.");
      return;
    }

    const updated = [...timetable, {
      day: schedBlock.day,
      subject: schedBlock.title,
      start: schedBlock.start,
      end: schedBlock.end,
      type: schedBlock.type
    }];
    setTimetable(updated);
    setSchedBlock(prev => ({ ...prev, title: '' }));
    saveCurrentState(profile, subjects, exams, updated, roadmap);
    addToast("success", `Scheduled "${schedBlock.title}"`);
  };

  const handleRemoveTimetableBlock = (idx) => {
    const updated = timetable.filter((_, i) => i !== idx);
    setTimetable(updated);
    saveCurrentState(profile, subjects, exams, updated, roadmap);
    addToast("info", "Schedule block removed.");
  };

  // Add Roadmap checklist goals
  const handleAddRoadmapGoal = (e) => {
    e.preventDefault();
    if (!newGoalText.trim()) return;

    const updated = roadmap.map((phase, idx) => {
      if (idx === 1) { // Append to Phase 2 (Heavy Training)
        return {
          ...phase,
          tasks: [...phase.tasks, { text: newGoalText, done: false }]
        };
      }
      return phase;
    });

    setRoadmap(updated);
    setNewGoalText('');
    saveCurrentState(profile, subjects, exams, timetable, updated);
    addToast("success", "Goal appended to roadmap!");
  };

  const handleToggleRoadmapTask = (phaseIdx, taskIdx) => {
    const updated = roadmap.map((phase, pI) => {
      if (pI === phaseIdx) {
        const updatedTasks = phase.tasks.map((task, tI) => {
          if (tI === taskIdx) {
            return { ...task, done: !task.done };
          }
          return task;
        });
        return { ...phase, tasks: updatedTasks };
      }
      return phase;
    });

    setRoadmap(updated);
    saveCurrentState(profile, subjects, exams, timetable, updated);
  };

  // Webhook Sync executions
  const addConsoleLog = (type, text) => {
    setWebhookLogs(prev => [...prev, { type, text }]);
  };

  const triggerWebhookSend = async (isMock = false) => {
    addConsoleLog("info", `[SYSTEM] Preparing payload transfer...`);
    const payload = WebhookManager.compilePayload({ profile, subjects, exams, timetable: mergedTimetable }, analysis);
    
    const targetUrl = isMock ? '' : webhookUrl;
    const res = await WebhookManager.sendWebhook(targetUrl, payload, addConsoleLog);
    
    if (res.success) {
      addToast("success", isMock ? "Simulated sync successful!" : "Workato webhook sync success!");
    } else {
      addToast("error", "Sync failed. Check logs.");
    }
  };

  // Sync copy payload helper
  const copyWebhookPayload = () => {
    const payload = WebhookManager.compilePayload({ profile, subjects, exams, timetable: mergedTimetable }, analysis);
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
      .then(() => addToast("success", "Payload JSON copied!"))
      .catch(() => addToast("error", "Copy failed."));
  };

  // Dynamic colors for webhook logs rendering
  const getLogColorClass = (type) => {
    if (type === 'success') return 'webhook-log-success';
    if (type === 'warn') return 'webhook-log-warn';
    if (type === 'error') return 'webhook-log-error';
    return 'webhook-log-info';
  };

  // Render weekly events placement math helpers
  const getEventPositionStyles = (slot) => {
    const [startH, startM] = slot.start.split(':').map(Number);
    const [endH, endM] = slot.end.split(':').map(Number);
    
    const startHourOffset = startH - 8; // Calendar starts at 08:00
    const durationHours = (endH + endM / 60) - (startH + startM / 60);

    const topPx = (startHourOffset * 60) + startM;
    const heightPx = durationHours * 60;

    return {
      top: `${topPx}px`,
      height: `${heightPx}px`
    };
  };

  return (
    <div style={{ minHeight: '100vh', position: 'relative' }}>
      
      {/* Toast Alert Notifications */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            <i className={`fa-solid ${toast.type === 'success' ? 'fa-circle-check text-success' : toast.type === 'error' ? 'fa-circle-xmark text-danger' : 'fa-circle-info text-primary'}`}></i>
            <span>{toast.text}</span>
          </div>
        ))}
      </div>

      {/* --- ONBOARDING FORM VIEW --- */}
      {!isOnboarded ? (
        <main id="onboarding-view">
          <header className="onboarding-header">
            <h1>Aegis Student Life Coach</h1>
            <p>Optimize study schedules, track grade trends, and connect student metrics to Workato webhooks.</p>
          </header>

          <div className="onboarding-grid">
            <section className="glass-panel glass-panel-glow">
              <h2 className="margin-bottom-sm"><i className="fa-solid fa-graduation-cap" style={{color:'var(--primary)'}}></i> Onboard Student Profile</h2>
              <p className="text-muted margin-bottom-md" style={{fontSize: '0.9rem'}}>Fill in the academic parameters below, or drag and drop a student portfolio to pre-fill.</p>

              {/* Drag and Drop */}
              <div 
                className={`upload-zone ${isDragOver ? 'dragover' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragOver(false); if (e.dataTransfer.files.length > 0) handleFileUpload(e.dataTransfer.files[0]); }}
                onClick={() => document.getElementById("file-loader-input").click()}
              >
                <i className="fa-solid fa-file-import"></i>
                <span>Drag & drop student portfolio file here</span>
                <p>Supports grades & timetable in .json or .csv format</p>
                <input 
                  type="file" 
                  id="file-loader-input" 
                  style={{display: 'none'}} 
                  accept=".json,.csv"
                  onChange={(e) => { if (e.target.files.length > 0) handleFileUpload(e.target.files[0]); }}
                />
              </div>

              <form onSubmit={handleOnboardingSubmit}>
                <div className="form-group">
                  <label>Student Name</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    value={profile.name} 
                    onChange={(e) => setProfile(prev => ({...prev, name: e.target.value}))}
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>Academic Level</label>
                  <select 
                    className="form-control" 
                    value={profile.level}
                    onChange={(e) => setProfile(prev => ({...prev, level: e.target.value}))}
                  >
                    <option value="High School Junior">High School Junior</option>
                    <option value="High School Senior">High School Senior</option>
                    <option value="University Freshman">University Freshman</option>
                    <option value="University Sophomore">University Sophomore</option>
                    <option value="University Junior/Senior">University Junior/Senior</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Primary Archetype Focus</label>
                  <select 
                    className="form-control" 
                    value={profile.studentType}
                    onChange={(e) => setProfile(prev => ({...prev, studentType: e.target.value}))}
                  >
                    <option value="balanced">Balanced All-Rounder (Steady grades, high sleep)</option>
                    <option value="procrastinator">Procrastinator (Clever, low study hours, low exam prep)</option>
                    <option value="perfectionist">Perfectionist (Top grades, high stress, low sleep)</option>
                    <option value="creative">Creative / Athlete (Project focused, low calendar structure)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Primary Life Coach Goal</label>
                  <select 
                    className="form-control"
                    value={profile.primaryGoal}
                    onChange={(e) => setProfile(prev => ({...prev, primaryGoal: e.target.value}))}
                  >
                    <option value="Optimize study-life balance and reduce burnout">Optimize study-life balance and reduce burnout</option>
                    <option value="Maximize GPA & academic performance (Top 1%)">Maximize GPA & academic performance (Top 1%)</option>
                    <option value="Cope with heavy exam schedules & improve time management">Cope with heavy exam schedules & improve time management</option>
                    <option value="Improve grades in weak subjects & track benchmarks">Improve grades in weak subjects & track benchmarks</option>
                    <option value="Build healthy study habits and sleep schedules">Build healthy study habits and sleep schedules</option>
                  </select>
                </div>

                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
                  <div class="form-group">
                    <label>Sleep Curfew (Hrs/Night)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      min="3" 
                      max="12" 
                      step="0.5" 
                      value={profile.sleepHours} 
                      onChange={(e) => setProfile(prev => ({...prev, sleepHours: parseFloat(e.target.value) || 7.0}))}
                    />
                  </div>
                  <div class="form-group">
                    <label>Study Goal (Hrs/Week)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      min="2" 
                      max="60" 
                      value={profile.weeklyStudyGoal} 
                      onChange={(e) => setProfile(prev => ({...prev, weeklyStudyGoal: parseFloat(e.target.value) || 15}))}
                    />
                  </div>
                </div>

                {/* Subject List Editor */}
                <div className="flex-row-between margin-bottom-sm">
                  <h3 style={{fontSize: '1.1rem'}}><i className="fa-solid fa-book-open"></i> Subjects & Current Grades</h3>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsSubModalOpen(true)}>
                    <i className="fa-solid fa-plus"></i> Add Subject
                  </button>
                </div>
                <div className="subjects-edit-list">
                  {subjects.map((sub, idx) => (
                    <div key={idx} className="subject-edit-item">
                      <div style={{fontWeight: 600}}>{sub.name}</div>
                      <div style={{textAlign: 'center'}}><span className="badge badge-info">{sub.grade}</span></div>
                      <div style={{textAlign: 'center'}}><span className="badge badge-success">{sub.target}</span></div>
                      <div style={{color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center'}}>{sub.hoursPerWeek}h/wk</div>
                      <button type="button" className="btn btn-danger btn-sm" style={{padding: '4px 8px'}} onClick={() => handleRemoveSubject(idx)}>
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  ))}
                </div>

                {/* Exams List Editor */}
                <div className="flex-row-between margin-bottom-sm" style={{marginTop: '20px'}}>
                  <h3 style={{fontSize: '1.1rem'}}><i className="fa-solid fa-calendar-check"></i> Upcoming Exams</h3>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setIsExamModalOpen(true)}>
                    <i className="fa-solid fa-plus"></i> Add Exam
                  </button>
                </div>
                <div className="exams-edit-list">
                  {exams.map((ex, idx) => (
                    <div key={idx} className="exam-edit-item">
                      <div style={{fontWeight: 600, fontSize: '0.85rem'}}>{ex.subject}</div>
                      <div style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>{ex.name}</div>
                      <div style={{fontSize: '0.8rem'}}>{ex.date}</div>
                      <div style={{textAlign: 'center'}}>{ex.weight}%</div>
                      <div style={{textAlign: 'center'}}><span className="badge badge-warning">Prep: {ex.prepLevel}</span></div>
                      <button type="button" className="btn btn-danger btn-sm" style={{padding: '4px 8px'}} onClick={() => handleRemoveExam(idx)}>
                        <i className="fa-solid fa-trash"></i>
                      </button>
                    </div>
                  ))}
                </div>

                <button type="submit" className="btn btn-primary" style={{width: '100%', marginTop: '24px'}}>
                  <i className="fa-solid fa-bolt"></i> Generate Coach Analysis & Dashboard
                </button>
              </form>
            </section>

            {/* Sandbox Side panel */}
            <aside style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
              <div className="glass-panel">
                <h2 className="margin-bottom-sm"><i className="fa-solid fa-wand-magic-sparkles text-secondary"></i> Quick Demo Sandbox</h2>
                <p className="text-muted margin-bottom-md" style={{fontSize: '0.9rem'}}>Instantly test the coach engine by injecting pre-configured student portfolios representing diverse academic situations.</p>
                
                <div className="demo-injectors">
                  <button className="demo-btn" onClick={() => handleDemoInject('sarah')}>
                    <div>
                      <div className="demo-title">Sarah Jenkins</div>
                      <div className="demo-desc">High School Senior • The Stressed Perfectionist</div>
                    </div>
                    <i className="fa-solid fa-chevron-right text-muted"></i>
                  </button>
                  <button className="demo-btn" onClick={() => handleDemoInject('alex')}>
                    <div>
                      <div className="demo-title">Alex Chen</div>
                      <div className="demo-desc">College Freshman • Under-Prepared Procrastinator</div>
                    </div>
                    <i className="fa-solid fa-chevron-right text-muted"></i>
                  </button>
                  <button className="demo-btn" onClick={() => handleDemoInject('marcus')}>
                    <div>
                      <div className="demo-title">Marcus Brody</div>
                      <div className="demo-desc">High School Junior • Balanced Achiever</div>
                    </div>
                    <i className="fa-solid fa-chevron-right text-muted"></i>
                  </button>
                </div>
              </div>

              <div className="glass-panel">
                <h3><i class="fa-solid fa-circle-question text-accent-cyan"></i> Coach Mechanics</h3>
                <ul className="text-muted" style={{fontSize: '0.85rem', paddingLeft: '16px', marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px'}}>
                  <li><strong>Cognitive Engine:</strong> Calculates GPA, workload bounds, and classifies archetypes instantly.</li>
                  <li><strong>Smart Timetabling:</strong> Places custom class schedules, then inserts smart study slots covering weak subjects.</li>
                  <li><strong>Workato Webhooks:</strong> Broadcasts analysis state, calendar objects, and checklists directly into enterprise automation channels.</li>
                </ul>
              </div>
            </aside>
          </div>
        </main>
      ) : (
        /* --- DASHBOARD VIEW SHELL --- */
        <div id="dashboard-workspace">
          {/* Sidebar Navigation */}
          <nav className="app-sidebar">
            <div className="logo-area">
              <div className="logo-icon"><i className="fa-solid fa-compass-drafting text-white"></i></div>
              <span className="logo-text">AEGIS COACH</span>
            </div>

            <ul className="nav-menu">
              <li className={`nav-item ${activeSection === 'overview' ? 'active' : ''}`} onClick={() => setActiveSection('overview')}>
                <a href="#overview"><i className="fa-solid fa-chart-pie"></i> <span>Overview</span></a>
              </li>
              <li className={`nav-item ${activeSection === 'plan' ? 'active' : ''}`} onClick={() => setActiveSection('plan')}>
                <a href="#study-plan"><i className="fa-solid fa-list-check"></i> <span>Study Plan</span></a>
              </li>
              <li className={`nav-item ${activeSection === 'timetable' ? 'active' : ''}`} onClick={() => setActiveSection('timetable')}>
                <a href="#timetable"><i className="fa-solid fa-calendar-days"></i> <span>Timetable</span></a>
              </li>
              <li className={`nav-item ${activeSection === 'webhook' ? 'active' : ''}`} onClick={() => setActiveSection('webhook')}>
                <a href="#webhook"><i className="fa-solid fa-network-wired"></i> <span>Workato Sync</span></a>
              </li>
            </ul>

            <div className="sidebar-footer">
              <div className="student-card-small margin-bottom-sm">
                <div className="student-avatar">
                  {profile.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2)}
                </div>
                <div className="student-small-info">
                  <div className="name">{profile.name}</div>
                  <div className="archetype-label">{analysis.archetype.name}</div>
                </div>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={handleReset} style={{width: '100%'}}>
                <i className="fa-solid fa-arrow-left"></i> <span>Reset Profile</span>
              </button>
            </div>
          </nav>

          {/* Main workspace panels */}
          <main className="app-content">
            
            {/* Top Diagnostic archetype banner */}
            <section className="archetype-banner" style={{'--archetype-color': analysis.archetype.accentColor}}>
              <div className="archetype-avatar" style={{border: `2px solid ${analysis.archetype.accentColor}`, color: analysis.archetype.accentColor}}>
                <i className={`fa-solid ${analysis.archetype.id === 'perfectionist' ? 'fa-skull-crossbones' : analysis.archetype.id === 'procrastinator' ? 'fa-hourglass-half' : analysis.archetype.id === 'struggler' ? 'fa-person-running' : 'fa-circle-check'}`}></i>
              </div>
              <div className="archetype-details">
                <span className={`badge ${analysis.archetype.badgeClass} margin-bottom-sm`}>{analysis.archetype.name}</span>
                <h2>Coach Diagnostic: {analysis.archetype.name}</h2>
                <p className="margin-bottom-sm">{analysis.archetype.description}</p>
                <div className="weakness-badge-wrap">
                  <span className="text-muted" style={{fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '6px'}}>Identified Areas of Concern:</span>
                  <div className="weakness-badge-container">
                    {analysis.weakSubjects.length === 0 ? (
                      <span className="badge badge-success">No Major Grade Risks Flagged</span>
                    ) : (
                      analysis.weakSubjects.map((w, idx) => (
                        <span key={idx} className="badge badge-danger">
                          <i className="fa-solid fa-circle-exclamation"></i> {w.name} ({w.currentGrade} ➔ Target {w.targetGrade})
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* TAB SECTION: OVERVIEW */}
            {activeSection === 'overview' && (
              <div className="view-section active">
                <div className="metrics-grid">
                  <div className="glass-panel metric-card">
                    <div className="metric-header">
                      <span>Cumulative GPA</span>
                      <i className="fa-solid fa-graduation-cap"></i>
                    </div>
                    <div className="metric-value">{analysis.avgGPA}</div>
                    <div className="metric-footer">
                      <span>{analysis.avgGPA >= 3.5 ? "Excellent Academic Standing" : analysis.avgGPA >= 3.0 ? "Moderate Standing" : "Risk Intervention Recommended"}</span>
                    </div>
                  </div>

                  <div className="glass-panel metric-card">
                    <div className="metric-header">
                      <span>Study-Life Balance</span>
                      <i className="fa-solid fa-scale-balanced"></i>
                    </div>
                    <div className="metric-value">{analysis.studyLifeBalance}%</div>
                    <div className="metric-footer">
                      <span>{analysis.studyLifeBalance >= 80 ? "Healthy Balance Index" : analysis.studyLifeBalance >= 60 ? "Moderate Fatigue Bounds" : "Critical Burnout Risk"}</span>
                    </div>
                  </div>

                  <div className="glass-panel metric-card">
                    <div className="metric-header">
                      <span>Exam Readiness</span>
                      <i className="fa-solid fa-circle-check"></i>
                    </div>
                    <div className="metric-value">{analysis.examReadiness}%</div>
                    <div className="metric-footer">
                      <span>{analysis.examReadiness >= 75 ? "Exam Confident" : analysis.examReadiness >= 50 ? "Approaching Baseline" : "Under-Prepared Deadlines"}</span>
                    </div>
                  </div>

                  <div className="glass-panel metric-card">
                    <div className="metric-header">
                      <span>Academic Stress</span>
                      <i className="fa-solid fa-brain"></i>
                    </div>
                    <div className="metric-value">{analysis.academicStress}%</div>
                    <div className="metric-footer">
                      <span>{analysis.academicStress < 40 ? "Low Stress Load" : analysis.academicStress < 70 ? "Moderate Fatigue" : "High Cognitive Strain"}</span>
                    </div>
                  </div>
                </div>

                <div className="dashboard-grid">
                  {/* Radar/Bar Charts widgets */}
                  <div className="glass-panel" style={{display: 'flex', flexDirection: 'column', gap: '24px'}}>
                    <div>
                      <h3><i className="fa-solid fa-chart-line text-primary"></i> Subject Portfolio Analysis</h3>
                      <p className="text-muted" style={{fontSize: '0.85rem'}}>Radar grid maps current GPA grade strengths. Targets outline your desired benchmarks.</p>
                    </div>

                    <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px'}}>
                      <div>
                        <h4 className="text-muted" style={{fontSize: '0.8rem', textTransform: 'uppercase'}}>Subject Breakdown</h4>
                        <div className="chart-container">
                          <canvas ref={radarCanvasRef}></canvas>
                        </div>
                      </div>
                      <div>
                        <h4 class="text-muted" style={{fontSize: '0.8rem', textTransform: 'uppercase'}}>Current vs Target Grades</h4>
                        <div className="chart-container">
                          <canvas ref={barCanvasRef}></canvas>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Coach summary list */}
                  <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div>
                      <h3 className="margin-bottom-md"><i className="fa-solid fa-comment-medical text-secondary"></i> Actionable Coach Summary</h3>
                      <div className="advice-section">
                        {analysis.advice.map((adv, idx) => (
                          <div key={idx} className="advice-card">
                            <div className="advice-badge-wrap">
                              <i className={`fa-solid ${adv.priority === 'CRITICAL' ? 'fa-circle-exclamation text-danger' : adv.priority === 'HIGH' ? 'fa-triangle-exclamation text-warning' : 'fa-circle-info text-primary'}`} style={{fontSize: '1.4rem'}}></i>
                              <span className={`badge ${adv.priority === 'CRITICAL' ? 'badge-danger' : adv.priority === 'HIGH' ? 'badge-warning' : 'badge-info'}`} style={{fontSize: '0.6rem', padding: '2px 6px'}}>{adv.priority}</span>
                            </div>
                            <div className="advice-content">
                              <span className="badge badge-secondary margin-bottom-sm" style={{fontSize: '0.65rem', padding: '2px 6px'}}>{adv.category}</span>
                              <h4>{adv.title}</h4>
                              <p>{adv.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* AI Chat Window */}
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div className="flex-row-between">
                        <h3><i className="fa-solid fa-robot text-primary"></i> Ask Aegis AI Coach</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span className="badge badge-success" style={{ fontSize: '0.65rem', textTransform: 'capitalize' }}>
                            <span style={{ width: '6px', height: '6px', backgroundColor: '#10b981', borderRadius: '50%', display: 'inline-block', marginRight: '6px' }}></span>
                            {aiProvider === 'gemini' ? 'Gemini' : aiProvider === 'openai' ? 'OpenAI' : aiProvider === 'openrouter' ? 'OpenRouter' : 'Local Coach'}
                          </span>
                          <button 
                            className="btn btn-secondary btn-sm" 
                            style={{ padding: '2px 6px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', height: '24px', cursor: 'pointer' }}
                            onClick={() => setShowSettings(!showSettings)}
                            title="Configure AI Engine"
                            type="button"
                          >
                            <i className="fa-solid fa-gear"></i>
                          </button>
                        </div>
                      </div>

                      {showSettings && (
                        <div className="glass-panel" style={{ padding: '12px', background: 'rgba(0,0,0,0.35)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          <div className="flex-row-between" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '4px' }}>
                            <strong style={{ color: 'var(--primary)' }}>AI Coach Configuration</strong>
                            <i className="fa-solid fa-xmark" style={{ cursor: 'pointer', opacity: 0.7 }} onClick={() => setShowSettings(false)}></i>
                          </div>
                          
                          <div className="form-group" style={{ margin: 0 }}>
                            <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>AI Provider / Engine</label>
                            <select 
                              className="form-control" 
                              style={{ padding: '4px 8px', fontSize: '0.8rem', height: 'auto', background: 'rgba(0,0,0,0.6)', color: '#fff', border: '1px solid var(--border-color)' }}
                              value={aiProvider}
                              onChange={(e) => {
                                const prov = e.target.value;
                                setAiProvider(prov);
                                if (prov === 'gemini') setSelectedModel('gemini-2.5-flash');
                                else if (prov === 'openai') setSelectedModel('gpt-4o-mini');
                                else if (prov === 'openrouter') setSelectedModel('meta-llama/llama-3-8b-instruct:free');
                                else setSelectedModel('local-coach');
                              }}
                            >
                              <option value="gemini">Google Gemini API (Studio)</option>
                              <option value="openrouter">OpenRouter API (Bypass blocks)</option>
                              <option value="openai">OpenAI API (GPT models)</option>
                              <option value="local">Local Coach (Free / Offline / Keyless)</option>
                            </select>
                          </div>

                          {aiProvider !== 'local' && (
                            <>
                              <div className="form-group" style={{ margin: 0 }}>
                                <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
                                  API Key {userApiKey ? ' (Custom API Key Set)' : ' (Falls back to .env key)'}
                                </label>
                                <input 
                                  type="password" 
                                  className="form-control" 
                                  style={{ padding: '4px 8px', fontSize: '0.8rem', height: 'auto', background: 'rgba(0,0,0,0.6)', color: '#fff', border: '1px solid var(--border-color)' }}
                                  placeholder={aiProvider === 'gemini' ? 'AIzaSy...' : aiProvider === 'openrouter' ? 'sk-or-v1-...' : 'sk-proj-...'}
                                  value={userApiKey}
                                  onChange={(e) => setUserApiKey(e.target.value)}
                                />
                                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'block', marginTop: '2px' }}>
                                  Stored locally in your browser. Leave blank to use `.env` file variables.
                                </span>
                              </div>

                              <div className="form-group" style={{ margin: 0 }}>
                                <label style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>AI Model</label>
                                <select 
                                  className="form-control" 
                                  style={{ padding: '4px 8px', fontSize: '0.8rem', height: 'auto', background: 'rgba(0,0,0,0.6)', color: '#fff', border: '1px solid var(--border-color)' }}
                                  value={selectedModel}
                                  onChange={(e) => setSelectedModel(e.target.value)}
                                >
                                  {aiProvider === 'gemini' && (
                                    <>
                                      <option value="gemini-2.5-flash">gemini-2.5-flash (Fast & Recommended)</option>
                                      <option value="gemini-2.5-pro">gemini-2.5-pro (Creative & Analytical)</option>
                                      <option value="gemini-1.5-flash">gemini-1.5-flash (Legacy)</option>
                                      <option value="gemini-3.5-flash">gemini-3.5-flash (Newest)</option>
                                    </>
                                  )}
                                  {aiProvider === 'openai' && (
                                    <>
                                      <option value="gpt-4o-mini">gpt-4o-mini (Cost-effective & Fast)</option>
                                      <option value="gpt-4o">gpt-4o (Premium reasoning)</option>
                                      <option value="gpt-3.5-turbo">gpt-3.5-turbo (Legacy)</option>
                                    </>
                                  )}
                                  {aiProvider === 'openrouter' && (
                                    <>
                                      <option value="meta-llama/llama-3-8b-instruct:free">Llama 3 8B Instruct (Free)</option>
                                      <option value="google/gemma-2-9b-it:free">Gemma 2 9B IT (Free)</option>
                                      <option value="qwen/qwen-2-7b-instruct:free">Qwen 2 7B Instruct (Free)</option>
                                      <option value="mistralai/mistral-7b-instruct:free">Mistral 7B Instruct (Free)</option>
                                      <option value="openchat/openchat-7b:free">OpenChat 7B (Free)</option>
                                    </>
                                  )}
                                </select>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                      
                      {/* Chat log box */}
                      <div style={{ height: '280px', overflowY: 'auto', padding: '12px', background: 'rgba(0,0,0,0.25)', border: '1px solid var(--border-color)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
                        {chatMessages.map((msg, mIdx) => (
                          <div key={mIdx} style={{ alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', background: msg.sender === 'user' ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.03)', border: msg.sender === 'user' ? '1px solid var(--primary-glow)' : '1px solid var(--border-color)', borderRadius: '8px', padding: '10px', maxWidth: '85%' }}>
                            <strong style={{ display: 'block', marginBottom: '4px', color: msg.sender === 'user' ? '#a5b4fc' : '#5eead4', fontSize: '0.75rem' }}>{msg.sender === 'user' ? 'You' : 'Aegis Coach'}</strong>
                            <div style={{ whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: formatChatMarkdown(msg.text) }}></div>
                          </div>
                        ))}
                        {isChatLoading && (
                          <div style={{ alignSelf: 'flex-start', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px', color: 'var(--text-muted)' }}>
                            <i className="fa-solid fa-spinner fa-spin"></i> Aegis is writing...
                          </div>
                        )}
                      </div>

                      {/* Chat Input form */}
                      <form onSubmit={handleChatSend} style={{ display: 'flex', gap: '8px' }}>
                        <input 
                          type="text" 
                          className="form-control" 
                          placeholder="Ask coach, e.g., How do I manage chemistry anxiety?" 
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          disabled={isChatLoading}
                          style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                        />
                        <button className="btn btn-primary btn-sm" type="submit" disabled={isChatLoading} style={{ padding: '8px 16px' }}>
                          <i className="fa-solid fa-paper-plane"></i>
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB SECTION: STUDY PLAN */}
            {activeSection === 'plan' && (
              <div className="view-section active">
                <div className="section-title-wrap">
                  <h2>Personalized Long-Term Study Plan</h2>
                  <p>Divided into actionable milestone blocks targeted directly at optimizing grade gaps and preserving sleep schedules.</p>
                </div>

                <div className="dashboard-grid">
                  <div className="glass-panel">
                    <h3><i className="fa-solid fa-route text-primary"></i> Roadmap Milestones</h3>
                    <div className="milestones-timeline">
                      {roadmap.map((phase, pIdx) => {
                        const allDone = phase.tasks.every(t => t.done);
                        return (
                          <div key={pIdx} className={`milestone-item ${allDone ? 'completed' : ''}`}>
                            <div className="milestone-header">
                              <h3>{phase.title}</h3>
                              <span className="milestone-time">{phase.timeline}</span>
                            </div>
                            <p className="milestone-desc">{phase.description}</p>
                            <ul className="milestone-tasks">
                              {phase.tasks.map((task, tIdx) => (
                                <li key={tIdx} className={`milestone-task ${task.done ? 'done' : ''}`} onClick={() => handleToggleRoadmapTask(pIdx, tIdx)}>
                                  <input type="checkbox" checked={task.done} readOnly />
                                  <span>{task.text}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="glass-panel scheduler-side-form">
                    <h3><i className="fa-solid fa-crosshair text-secondary"></i> Study Goals Panel</h3>
                    <p className="text-muted" style={{fontSize: '0.85rem'}}>Create a personalized target checklist below. Keep goals actionable and bound to specific deadlines.</p>

                    <form onSubmit={handleAddRoadmapGoal}>
                      <div className="form-group">
                        <label>Goal Description</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          placeholder="E.g., Review Calculus notes every Friday" 
                          value={newGoalText}
                          onChange={(e) => setNewGoalText(e.target.value)}
                          required 
                        />
                      </div>
                      <button type="submit" className="btn btn-primary btn-sm" style={{width: '100%'}}>
                        <i className="fa-solid fa-plus"></i> Add Goal to Plan
                      </button>
                    </form>

                    <div style={{marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px'}}>
                      <h4 className="margin-bottom-sm">Coach Tip</h4>
                      <p className="text-muted" style={{fontSize: '0.8rem'}}>
                        Research shows students who write down their goals with specific actionable tasks achieve them 2.3x more often. Set checkboxes for specific habits on the left!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB SECTION: TIMETABLE */}
            {activeSection === 'timetable' && (
              <div className="view-section active">
                <div className="section-title-wrap">
                  <h2>Personalized Study Timetable</h2>
                  <p>Classes from your portfolio. Aegis Coach automatically schedules custom study blocks optimized around your weak areas.</p>
                </div>

                <div style={{display: 'grid', gridTemplateColumns: '8fr 4fr', gap: '32px'}}>
                  <div className="glass-panel" style={{padding: '16px', overflowX: 'auto'}}>
                    <div className="calendar-header">
                      <h3><i className="fa-solid fa-calendar text-primary"></i> Weekly Schedule</h3>
                      <div className="calendar-legend">
                        <div className="legend-item"><span className="legend-color event-class"></span> Classes</div>
                        <div className="legend-item"><span className="legend-color event-study-auto"></span> Weakness Block (Auto)</div>
                        <div className="legend-item"><span className="legend-color event-study-manual"></span> Custom Study</div>
                        <div className="legend-item"><span className="legend-color event-relaxation"></span> Active Recovery</div>
                      </div>
                    </div>

                    <div className="calendar-grid">
                      <div className="calendar-head-cell">Time</div>
                      <div className="calendar-head-cell">Mon</div>
                      <div className="calendar-head-cell">Tue</div>
                      <div className="calendar-head-cell">Wed</div>
                      <div className="calendar-head-cell">Thu</div>
                      <div className="calendar-head-cell">Fri</div>
                      <div className="calendar-head-cell">Sat</div>
                      <div className="calendar-head-cell">Sun</div>

                      <div className="calendar-time-col">
                        {["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"].map((t, idx) => (
                          <div key={idx} className="calendar-time-cell">{t}</div>
                        ))}
                      </div>

                      <div className="calendar-days-cols">
                        {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => (
                          <div key={day} className="calendar-day-col" data-day={day}>
                            {mergedTimetable.filter(item => item.day === day).map((slot, sIdx) => {
                              const pos = getEventPositionStyles(slot);
                              return (
                                <div 
                                  key={sIdx} 
                                  className={`calendar-event event-${slot.type}`}
                                  style={{top: pos.top, height: pos.height}}
                                >
                                  <span className="event-title">{slot.subject}</span>
                                  <span className="event-time">{slot.start} - {slot.end}</span>
                                  {slot.type !== 'study-auto' && (
                                    <i 
                                      className="fa-solid fa-xmark" 
                                      style={{position: 'absolute', right: '6px', top: '6px', cursor: 'pointer'}}
                                      onClick={() => {
                                        const originalIdx = timetable.findIndex(t => t.day === slot.day && t.subject === slot.subject && t.start === slot.start);
                                        if (originalIdx > -1) handleRemoveTimetableBlock(originalIdx);
                                      }}
                                    ></i>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Add Block Form */}
                  <div className="glass-panel scheduler-side-form">
                    <h3><i className="fa-solid fa-plus text-secondary"></i> Schedule Block</h3>
                    <p className="text-muted" style={{fontSize: '0.85rem'}}>Manually add private classes, track practices, or custom study groups onto the calendar grid.</p>

                    <form onSubmit={handleAddScheduleBlock}>
                      <div className="form-group">
                        <label>Select Day</label>
                        <select 
                          className="form-control"
                          value={schedBlock.day}
                          onChange={(e) => setSchedBlock(prev => ({...prev, day: e.target.value}))}
                        >
                          <option value="Monday">Monday</option>
                          <option value="Tuesday">Tuesday</option>
                          <option value="Wednesday">Wednesday</option>
                          <option value="Thursday">Thursday</option>
                          <option value="Friday">Friday</option>
                          <option value="Saturday">Saturday</option>
                          <option value="Sunday">Sunday</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Block Title</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          placeholder="E.g., Chemistry Prep Study"
                          value={schedBlock.title}
                          onChange={(e) => setSchedBlock(prev => ({...prev, title: e.target.value}))}
                          required 
                        />
                      </div>

                      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                        <div className="form-group">
                          <label>Start Time</label>
                          <select 
                            className="form-control"
                            value={schedBlock.start}
                            onChange={(e) => setSchedBlock(prev => ({...prev, start: e.target.value}))}
                          >
                            {["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00"].map(t => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group">
                          <label>End Time</label>
                          <select 
                            className="form-control"
                            value={schedBlock.end}
                            onChange={(e) => setSchedBlock(prev => ({...prev, end: e.target.value}))}
                          >
                            {["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00"].map(t => (
                              <option key={t} value={t}>{t}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="form-group">
                        <label>Block Category</label>
                        <select 
                          className="form-control"
                          value={schedBlock.type}
                          onChange={(e) => setSchedBlock(prev => ({...prev, type: e.target.value}))}
                        >
                          <option value="study-manual">Custom Study (Purple)</option>
                          <option value="class">Class Session (Blue)</option>
                          <option value="relaxation">Active Recovery (Teal)</option>
                        </select>
                      </div>

                      <button type="submit" className="btn btn-primary btn-sm" style={{width: '100%'}}>
                        <i className="fa-solid fa-calendar-plus"></i> Add Block to Schedule
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* TAB SECTION: WEBHOOK */}
            {activeSection === 'webhook' && (
              <div className="view-section active">
                <div className="section-title-wrap">
                  <h2>Workato Webhook Integration</h2>
                  <p>Sync compiled diagnostics metrics, schedules, weaknesses, and study plans to activate Workato workflows.</p>
                </div>

                <div className="dashboard-grid">
                  <div className="glass-panel" style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
                    <h3><i className="fa-solid fa-gear text-primary"></i> Endpoint Connection</h3>
                    <p className="text-muted" style={{fontSize: '0.85rem'}}>Input your Workato Webhook receiver URL. If empty, the system runs in simulation mode, illustrating payload schemas and expected server status flows.</p>
                    
                    <div className="form-group">
                      <label>Workato Webhook URL</label>
                      <input 
                        type="url" 
                        className="form-control" 
                        placeholder="https://webhooks.workato.com/webhooks/your-receiver-id" 
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                      />
                    </div>

                    <div style={{display: 'flex', gap: '12px'}}>
                      <button className="btn btn-primary" onClick={() => triggerWebhookSend(false)} style={{flexGrow: 1}}>
                        <i className="fa-solid fa-cloud-arrow-up"></i> Push Live Webhook Sync
                      </button>
                      <button className="btn btn-secondary" onClick={() => triggerWebhookSend(true)}>
                        <i className="fa-solid fa-vial"></i> Trigger Simulated Sync
                      </button>
                    </div>

                    <h4 className="margin-bottom-sm" style={{marginTop: '10px'}}>Execution Console Output</h4>
                    <div className="webhook-log-console">
                      {webhookLogs.map((log, idx) => (
                        <div key={idx} className={`webhook-log-line ${getLogColorClass(log.type)}`}>
                          {log.text}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="glass-panel" style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
                    <div className="flex-row-between">
                      <h3><i className="fa-solid fa-code text-secondary"></i> Outgoing JSON Payload</h3>
                      <button className="btn btn-secondary btn-sm" onClick={copyWebhookPayload}><i className="fa-solid fa-copy"></i> Copy JSON</button>
                    </div>
                    <p class="text-muted" style={{fontSize: '0.85rem'}}>This structured payload compiles grades, timetables, and analytics and is generated in real-time by the dashboard core.</p>

                    <div className="json-viewer" style={{whiteSpace: 'pre-wrap'}}>
                      {JSON.stringify(WebhookManager.compilePayload({ profile, subjects, exams, timetable: mergedTimetable }, analysis), null, 2)}
                    </div>
                  </div>
                </div>
              </div>
            )}

          </main>
        </div>
      )}

      {/* --- ADD SUBJECT MODAL --- */}
      {isSubModalOpen && (
        <div className="modal-overlay active">
          <div className="glass-panel modal-card">
            <div className="modal-header">
              <h2>Add Academic Subject</h2>
              <button className="modal-close" onClick={() => setIsSubModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleAddSubjectSubmit}>
              <div className="form-group">
                <label>Subject Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="E.g., AP Calculus BC" 
                  value={modalSubject.name}
                  onChange={(e) => setModalSubject(prev => ({...prev, name: e.target.value}))}
                  required 
                />
              </div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                <div className="form-group">
                  <label>Current Grade</label>
                  <select 
                    className="form-control"
                    value={modalSubject.grade}
                    onChange={(e) => setModalSubject(prev => ({...prev, grade: e.target.value}))}
                  >
                    {['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'].map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Target Grade</label>
                  <select 
                    className="form-control"
                    value={modalSubject.target}
                    onChange={(e) => setModalSubject(prev => ({...prev, target: e.target.value}))}
                  >
                    {['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C'].map(g => (
                      <option key={g} value={g}>{g}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Study Allocation (Hrs/Week)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  min="1" 
                  max="40" 
                  value={modalSubject.hours} 
                  onChange={(e) => setModalSubject(prev => ({...prev, hours: parseFloat(e.target.value) || 5}))}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{width: '100%'}}>Confirm & Insert Subject</button>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD EXAM MODAL --- */}
      {isExamModalOpen && (
        <div className="modal-overlay active">
          <div className="glass-panel modal-card">
            <div className="modal-header">
              <h2>Schedule Midterm/Exam</h2>
              <button className="modal-close" onClick={() => setIsExamModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleAddExamSubmit}>
              <div className="form-group">
                <label>Related Subject</label>
                <select 
                  className="form-control"
                  value={modalExam.subject}
                  onChange={(e) => setModalExam(prev => ({...prev, subject: e.target.value}))}
                >
                  <option value="">-- Select Subject --</option>
                  {subjects.map((sub, sIdx) => (
                    <option key={sIdx} value={sub.name}>{sub.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Exam Title / Chapter</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="E.g., Integration Techniques Final" 
                  value={modalExam.name}
                  onChange={(e) => setModalExam(prev => ({...prev, name: e.target.value}))}
                  required 
                />
              </div>
              <div className="form-group">
                <label>Exam Date</label>
                <input 
                  type="date" 
                  className="form-control" 
                  value={modalExam.date}
                  onChange={(e) => setModalExam(prev => ({...prev, date: e.target.value}))}
                  required 
                />
              </div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                <div className="form-group">
                  <label>Weightage (%)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    min="5" 
                    max="100" 
                    value={modalExam.weight} 
                    onChange={(e) => setModalExam(prev => ({...prev, weight: parseFloat(e.target.value) || 25}))}
                  />
                </div>
                <div className="form-group">
                  <label>Current Prep Rating (1-5)</label>
                  <select 
                    className="form-control"
                    value={modalExam.prep}
                    onChange={(e) => setModalExam(prev => ({...prev, prep: parseInt(e.target.value) || 3}))}
                  >
                    <option value="1">1 - Clueless</option>
                    <option value="2">2 - Moderate Gap</option>
                    <option value="3">3 - Basic Concepts</option>
                    <option value="4">4 - Ready for Exam</option>
                    <option value="5">5 - Confident A</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="btn btn-primary" style={{width: '100%'}}>Confirm & Insert Exam</button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
