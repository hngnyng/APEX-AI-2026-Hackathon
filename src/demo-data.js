// Demo profiles for the Student Life Coach Web App
export const demoProfiles = {
  sarah: {
    profile: {
      name: "Sarah Jenkins",
      level: "High School Senior",
      studentType: "perfectionist", // Matches UI dropdown options
      primaryGoal: "Maximize GPA & academic performance (Top 1%)",
      sleepHours: 5.5,
      weeklyStudyGoal: 38,
      workloadPreference: "high"
    },
    subjects: [
      { name: "AP Calculus BC", grade: "B", target: "A", hoursPerWeek: 10 },
      { name: "AP Physics C", grade: "C+", target: "A-", hoursPerWeek: 12 },
      { name: "AP English Literature", grade: "A-", target: "A", hoursPerWeek: 4 },
      { name: "AP US History", grade: "A", target: "A", hoursPerWeek: 5 },
      { name: "AP Chemistry", grade: "B+", target: "A", hoursPerWeek: 7 }
    ],
    exams: [
      { subject: "AP Physics C", name: "Electricity & Magnetism Midterm", date: "2026-06-18", weight: 35, prepLevel: 2 },
      { subject: "AP Calculus BC", name: "Integration Final Exam", date: "2026-06-20", weight: 40, prepLevel: 3 },
      { subject: "AP Chemistry", name: "Thermodynamics Quiz", date: "2026-06-22", weight: 15, prepLevel: 4 }
    ],
    timetable: [
      { day: "Monday", subject: "AP Calculus BC", start: "08:30", end: "10:00", type: "class" },
      { day: "Monday", subject: "AP Physics C", start: "10:30", end: "12:00", type: "class" },
      { day: "Monday", subject: "AP Chemistry", start: "13:00", end: "14:30", type: "class" },
      
      { day: "Tuesday", subject: "AP English Literature", start: "08:30", end: "10:00", type: "class" },
      { day: "Tuesday", subject: "AP US History", start: "10:30", end: "12:00", type: "class" },
      
      { day: "Wednesday", subject: "AP Calculus BC", start: "08:30", end: "10:00", type: "class" },
      { day: "Wednesday", subject: "AP Physics C", start: "10:30", end: "12:00", type: "class" },
      { day: "Wednesday", subject: "AP Chemistry", start: "13:00", end: "14:30", type: "class" },
      
      { day: "Thursday", subject: "AP English Literature", start: "08:30", end: "10:00", type: "class" },
      { day: "Thursday", subject: "AP US History", start: "10:30", end: "12:00", type: "class" },
      
      { day: "Friday", subject: "AP Calculus BC", start: "08:30", end: "10:00", type: "class" },
      { day: "Friday", subject: "AP Physics C", start: "10:30", end: "12:00", type: "class" }
    ],
    personalGoals: [
      { id: "g1", text: "Complete Physics practice papers twice a week", completed: false },
      { id: "g2", text: "Improve night sleep from 5.5 to 7 hours", completed: false },
      { id: "g3", text: "Submit all AP English essays 24h before deadline", completed: true },
      { id: "g4", text: "Meditate for 10 minutes during school breaks", completed: false }
    ]
  },
  
  alex: {
    profile: {
      name: "Alex Chen",
      level: "University Freshman",
      studentType: "procrastinator",
      primaryGoal: "Cope with heavy exam schedules & improve time management",
      sleepHours: 8.5,
      weeklyStudyGoal: 10,
      workloadPreference: "low"
    },
    subjects: [
      { name: "Intro to Python Programming", grade: "B+", target: "A", hoursPerWeek: 3 },
      { name: "Linear Algebra", grade: "C-", target: "B", hoursPerWeek: 2 },
      { name: "Discrete Structures", grade: "D", target: "C+", hoursPerWeek: 2 },
      { name: "Freshman Exposition", grade: "B", target: "B+", hoursPerWeek: 3 }
    ],
    exams: [
      { subject: "Discrete Structures", name: "Logic & Proofs Final", date: "2026-06-17", weight: 50, prepLevel: 1 },
      { subject: "Linear Algebra", name: "Vector Spaces Exam", date: "2026-06-19", weight: 35, prepLevel: 2 },
      { subject: "Intro to Python Programming", name: "Final Lab Practical", date: "2026-06-25", weight: 25, prepLevel: 4 }
    ],
    timetable: [
      { day: "Monday", subject: "Intro to Python Programming", start: "10:00", end: "11:30", type: "class" },
      { day: "Monday", subject: "Linear Algebra", start: "13:00", end: "14:30", type: "class" },
      
      { day: "Tuesday", subject: "Discrete Structures", start: "11:00", end: "12:30", type: "class" },
      { day: "Tuesday", subject: "Freshman Exposition", start: "14:00", end: "15:30", type: "class" },
      
      { day: "Wednesday", subject: "Intro to Python Programming", start: "10:00", end: "11:30", type: "class" },
      { day: "Wednesday", subject: "Linear Algebra", start: "13:00", end: "14:30", type: "class" },
      
      { day: "Thursday", subject: "Discrete Structures", start: "11:00", end: "12:30", type: "class" },
      { day: "Thursday", subject: "Freshman Exposition", start: "14:00", end: "15:30", type: "class" }
    ],
    personalGoals: [
      { id: "g1", text: "Study Linear Algebra at least 4 hours per week", completed: false },
      { id: "g2", text: "Attend all morning lectures without skipping", completed: false },
      { id: "g3", text: "Create study group with classmates", completed: false },
      { id: "g4", text: "Limit gaming to 2 hours per day", completed: true }
    ]
  },
  
  marcus: {
    profile: {
      name: "Marcus Brody",
      level: "High School Junior",
      studentType: "balanced",
      primaryGoal: "Optimize study-life balance and reduce burnout",
      sleepHours: 7.5,
      weeklyStudyGoal: 20,
      workloadPreference: "medium"
    },
    subjects: [
      { name: "Pre-Calculus", grade: "B+", target: "A-", hoursPerWeek: 5 },
      { name: "English 11", grade: "A-", target: "A", hoursPerWeek: 4 },
      { name: "Biology", grade: "A-", target: "A-", hoursPerWeek: 6 },
      { name: "World History", grade: "B", target: "B+", hoursPerWeek: 3 },
      { name: "Physical Education", grade: "A+", target: "A+", hoursPerWeek: 2 }
    ],
    exams: [
      { subject: "Biology", name: "Genetics Unit Exam", date: "2026-06-22", weight: 20, prepLevel: 4 },
      { subject: "Pre-Calculus", name: "Trigonometric Identities Quiz", date: "2026-06-24", weight: 15, prepLevel: 4 }
    ],
    timetable: [
      { day: "Monday", subject: "Pre-Calculus", start: "09:00", end: "10:30", type: "class" },
      { day: "Monday", subject: "Biology", start: "11:00", end: "12:30", type: "class" },
      { day: "Monday", subject: "Physical Education", start: "13:30", end: "15:00", type: "class" },
      
      { day: "Tuesday", subject: "English 11", start: "09:00", end: "10:30", type: "class" },
      { day: "Tuesday", subject: "World History", start: "11:00", end: "12:30", type: "class" },
      
      { day: "Wednesday", subject: "Pre-Calculus", start: "09:00", end: "10:30", type: "class" },
      { day: "Wednesday", subject: "Biology", start: "11:00", end: "12:30", type: "class" },
      
      { day: "Thursday", subject: "English 11", start: "09:00", end: "10:30", type: "class" },
      { day: "Thursday", subject: "World History", start: "11:00", end: "12:30", type: "class" },
      
      { day: "Friday", subject: "Pre-Calculus", start: "09:00", end: "10:30", type: "class" },
      { day: "Friday", subject: "Biology", start: "11:00", end: "12:30", type: "class" },
      { day: "Friday", subject: "Physical Education", start: "13:30", end: "15:00", type: "class" }
    ],
    personalGoals: [
      { id: "g1", text: "Maintain Biology review cards after every class", completed: true },
      { id: "g2", text: "Run 5km track practice 3 times a week", completed: true },
      { id: "g3", text: "Read 1 English Literature chapter per day", completed: false }
    ]
  }
};
