// Cognitive and Diagnostic Analysis Engine for the Student Life Coach
// Processes grades, timetable, sleep, and exams to assess risks, calculate scores, 
// classify archetypes, and generate tailored advice/study roadmaps.

const GRADE_POINTS = {
  'A+': 4.3, 'A': 4.0, 'A-': 3.7,
  'B+': 3.3, 'B': 3.0, 'B-': 2.7,
  'C+': 2.3, 'C': 2.0, 'C-': 1.7,
  'D+': 1.3, 'D': 1.0, 'F': 0.0
};

export const AnalyticsEngine = {
  // Convert alphabetical grade to GPA points
  gradeToGPA(grade) {
    const cleanGrade = grade.trim().toUpperCase();
    return GRADE_POINTS[cleanGrade] !== undefined ? GRADE_POINTS[cleanGrade] : 2.0;
  },

  // Calculate stats and diagnostics
  analyzeProfile(studentData) {
    const { profile, subjects = [], exams = [], timetable = [] } = studentData;

    // 1. Calculate GPA stats
    let totalGPA = 0;
    let subjectGPAObjects = [];
    subjects.forEach(sub => {
      const gpa = this.gradeToGPA(sub.grade);
      totalGPA += gpa;
      subjectGPAObjects.push({ name: sub.name, gpa, grade: sub.grade, target: sub.target });
    });
    const avgGPA = subjects.length > 0 ? (totalGPA / subjects.length) : 0.0;

    // 2. Timetable Calculations (Class Hours)
    let weeklyClassHours = 0;
    timetable.forEach(slot => {
      const [sh, sm] = slot.start.split(':').map(Number);
      const [eh, em] = slot.end.split(':').map(Number);
      const diffHrs = (eh + em / 60) - (sh + sm / 60);
      if (diffHrs > 0) {
        weeklyClassHours += diffHrs;
      }
    });

    const weeklyStudyHours = parseFloat(profile.weeklyStudyGoal) || 0;
    const totalWeeklyWorkload = weeklyClassHours + weeklyStudyHours;
    const sleepHours = parseFloat(profile.sleepHours) || 7.0;

    // 3. Exam Bottlenecks and Prep Levels
    let totalPrepLevel = 0;
    let criticalExamsCount = 0;
    const examUrgencyList = [];
    
    const now = new Date('2026-06-13'); // Set context date as anchor

    exams.forEach(exam => {
      totalPrepLevel += parseInt(exam.prepLevel || 3);
      
      const examDate = new Date(exam.date);
      const diffTime = examDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const isUrgent = diffDays >= 0 && diffDays <= 7;
      const isLowPrep = parseInt(exam.prepLevel) <= 2;
      
      if (isUrgent && isLowPrep) {
        criticalExamsCount++;
      }
      
      examUrgencyList.push({
        ...exam,
        daysRemaining: diffDays,
        isUrgent,
        isLowPrep,
        riskScore: isUrgent && isLowPrep ? 'CRITICAL' : isUrgent ? 'HIGH' : isLowPrep ? 'MEDIUM' : 'LOW'
      });
    });

    const avgExamPrep = exams.length > 0 ? (totalPrepLevel / exams.length) : 3.0;

    // 4. Identify Weakness Areas
    // Weakness is defined as Grade <= C+, OR Grade is 2 ranks lower than Target
    const gradeRanks = ['F', 'D', 'D+', 'C-', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A', 'A+'];
    const weakSubjects = [];
    
    subjects.forEach(sub => {
      const gpa = this.gradeToGPA(sub.grade);
      const currentRankIdx = gradeRanks.indexOf(sub.grade.toUpperCase());
      const targetRankIdx = gradeRanks.indexOf(sub.target.toUpperCase());
      
      const rankGap = targetRankIdx - currentRankIdx;
      const isLowGrade = gpa <= 2.3; // C+ or lower
      
      if (isLowGrade || rankGap >= 2) {
        weakSubjects.push({
          name: sub.name,
          currentGrade: sub.grade,
          targetGrade: sub.target,
          reason: isLowGrade ? 'Low current grade' : `Significant grade gap (-${rankGap} sub-grades)`
        });
      }
    });

    // 5. Index Scores (0-100)
    // Study-Life Balance Index
    let studyLifeBalance = 100;
    if (totalWeeklyWorkload > 55) studyLifeBalance -= 20;
    if (totalWeeklyWorkload > 45 && totalWeeklyWorkload <= 55) studyLifeBalance -= 10;
    if (sleepHours < 6) studyLifeBalance -= (6 - sleepHours) * 20;
    if (sleepHours >= 7 && sleepHours <= 8.5) studyLifeBalance += 5;
    studyLifeBalance = Math.max(10, Math.min(100, Math.round(studyLifeBalance)));

    // Exam Readiness Index
    let examReadiness = 0;
    if (exams.length === 0) {
      examReadiness = 100;
    } else {
      examReadiness = Math.round((avgExamPrep / 5) * 100);
      examReadiness -= criticalExamsCount * 15;
      examReadiness = Math.max(10, Math.min(100, examReadiness));
    }

    // Stress & Risk Index
    let academicStress = 0;
    if (sleepHours < 6) academicStress += 25;
    if (totalWeeklyWorkload > 50) academicStress += 25;
    if (criticalExamsCount > 0) academicStress += 30;
    if (weakSubjects.length > 1) academicStress += 15;
    if (profile.studentType === 'perfectionist') academicStress += 10;
    academicStress = Math.max(10, Math.min(95, academicStress));

    // 6. Classify Student Archetype
    let archetype = {
      id: "balanced",
      name: "The Balanced Achiever",
      badgeClass: "badge-success",
      description: "You have a solid study schedule while maintaining healthy sleeping and relaxation habits. Excellent work!",
      icon: "check-circle",
      accentColor: "#10b981"
    };

    if (avgGPA >= 3.4 && sleepHours < 6.2 && totalWeeklyWorkload >= 45) {
      archetype = {
        id: "perfectionist",
        name: "The High-Burnout Overachiever",
        badgeClass: "badge-danger",
        description: "You maintain top grades but at a severe cost to your sleep, stress, and lifestyle. You are at high risk of burning out before exams.",
        icon: "alert-triangle",
        accentColor: "#ef4444"
      };
    } else if (avgExamPrep <= 2.5 && weeklyStudyHours < 12 && avgGPA < 3.2) {
      archetype = {
        id: "procrastinator",
        name: "The Under-Prepared Procrastinator",
        badgeClass: "badge-warning",
        description: "You have high potential but are falling behind on study hours. You have upcoming exams but low preparation levels.",
        icon: "clock",
        accentColor: "#f59e0b"
      };
    } else if (avgGPA < 2.6 && weeklyStudyHours >= 20) {
      archetype = {
        id: "struggler",
        name: "The Struggling Grinder",
        badgeClass: "badge-info",
        description: "You are putting in high study hours, but your performance doesn't reflect your efforts. You might need to change your studying methods (e.g. passive reading vs active recall).",
        icon: "trending-down",
        accentColor: "#3b82f6"
      };
    } else if (profile.studentType === 'creative') {
      archetype = {
        id: "creative",
        name: "The Passion-Driven Creative",
        badgeClass: "badge-secondary",
        description: "You thrive in project-based activities and personal goals, but find structured, traditional classes and exams dry and hard to budget time for.",
        icon: "activity",
        accentColor: "#8b5cf6"
      };
    }

    // 7. Generate Actionable Advice
    const advice = this.generateAdvice(archetype.id, weakSubjects, examUrgencyList, sleepHours, totalWeeklyWorkload);

    // 8. Generate Long-Term Study Roadmaps
    const studyPlan = this.generateStudyPlan(archetype.id, weakSubjects, avgGPA);

    return {
      avgGPA: avgGPA.toFixed(2),
      weeklyClassHours: weeklyClassHours.toFixed(1),
      weeklyStudyHours: weeklyStudyHours.toFixed(1),
      totalWeeklyWorkload: totalWeeklyWorkload.toFixed(1),
      sleepHours,
      criticalExamsCount,
      examUrgencyList,
      weakSubjects,
      studyLifeBalance,
      examReadiness,
      academicStress,
      archetype,
      advice,
      studyPlan
    };
  },

  // Generate actionable coaching recommendations
  generateAdvice(archetypeId, weakSubjects, exams, sleepHours, workload) {
    const list = [];

    if (sleepHours < 6.0) {
      list.push({
        id: "adv-sleep",
        category: "Lifestyle / Well-being",
        priority: "HIGH",
        title: "Implement a hard sleep curfew",
        description: `Your current sleep of ${sleepHours} hours is severely harming your cognitive recall and brain processing speeds. Set an alarm to wind down 45 minutes before sleep and commit to at least 7 hours.`
      });
    }

    if (archetypeId === "struggler") {
      list.push({
        id: "adv-struggle",
        category: "Study Technique",
        priority: "CRITICAL",
        title: "Pivot to Active Recall & Spaced Repetition",
        description: "You are studying hard but likely using passive methods (rereading notes, highlighting). Switch to flashcards, blurting, and solving past papers without notes."
      });
    }

    if (archetypeId === "procrastinator") {
      list.push({
        id: "adv-procrastinate",
        category: "Time Management",
        priority: "CRITICAL",
        title: "The 5-Minute Start Rule",
        description: "Your primary blocker is friction to start. Commit to studying for just 5 minutes with a timer. If you want to stop after 5 mins, you can. (90% of the time, you will keep going)."
      });
    }

    const criticalExams = exams.filter(e => e.isUrgent && e.isLowPrep);
    if (criticalExams.length > 0) {
      const examNames = criticalExams.map(e => `${e.subject} (${e.name})`).join(', ');
      list.push({
        id: "adv-exam-alert",
        category: "Exam Prep",
        priority: "CRITICAL",
        title: `Emergency revision for ${criticalExams[0].subject}`,
        description: `Your exam for ${examNames} is in less than a week, and your current preparation level is rated low. Allocate a 2-hour focused block daily specifically for practice questions on this subject.`
      });
    }

    if (weakSubjects.length > 0) {
      const weakest = weakSubjects[0];
      list.push({
        id: "adv-weak-sub",
        category: "Academic Focus",
        priority: "HIGH",
        title: `Targeted practice for ${weakest.name}`,
        description: `Currently graded at ${weakest.currentGrade} with an ambitious target of ${weakest.targetGrade}. Allocate your first study hour of the day—when your focus is highest—specifically to this subject.`
      });
    }

    if (list.length < 3) {
      list.push({
        id: "adv-standard-1",
        category: "Productivity",
        priority: "MEDIUM",
        title: "Digital Detox during study blocks",
        description: "Put your phone in a drawer or another room. Intermittent notifications increase cognitive load by 20% even if you don't pick up the phone."
      });
    }
    
    if (list.length < 4) {
      list.push({
        id: "adv-standard-2",
        category: "Scheduling",
        priority: "MEDIUM",
        title: "Protect your weekends for deep rest",
        description: "Finish your core study goals by Friday evening. Use weekends for active recovery, social connections, and outdoor exercise to boost mental health."
      });
    }

    return list.slice(0, 4);
  },

  // Generate Long-Term Study Roadmap Milestones
  generateStudyPlan(archetypeId, weakSubjects, avgGPA) {
    const defaultMilestones = [
      {
        title: "Phase 1: Foundation Reset",
        timeline: "Weeks 1 - 2",
        description: "Align notes, gather past papers, and identify syllabus gaps.",
        tasks: [
          { text: "Compile syllabus checklists for all subjects", done: false },
          { text: "Locate at least 5 sets of historical past exams", done: false },
          { text: "Establish a distraction-free study zone", done: true }
        ]
      },
      {
        title: "Phase 2: Heavy Active Training",
        timeline: "Weeks 3 - 6",
        description: "Solve exam problems under timed conditions, review weakest topics.",
        tasks: [
          { text: "Apply Pomodoro blocks to weak subjects", done: false },
          { text: "Complete 3 full mock exams without looking at notes", done: false },
          { text: "Do weekly progress checks against target grades", done: false }
        ]
      },
      {
        title: "Phase 3: Refinement & Curfew",
        timeline: "Weeks 7 - 8 (Pre-Exams)",
        description: "Optimize sleep cycle, perform light reviews, and practice speed tests.",
        tasks: [
          { text: "Execute strict 11 PM electronic device lockout", done: false },
          { text: "Review summary cheat-sheets on key formulas", done: false },
          { text: "Maintain light aerobic exercise twice a week", done: false }
        ]
      }
    ];

    if (archetypeId === 'perfectionist') {
      defaultMilestones[0].title = "Phase 1: Workload Calibrating";
      defaultMilestones[0].description = "Introduce relaxation curfews, consolidate study hours to make them more efficient.";
      defaultMilestones[0].tasks.push({ text: "Schedule 3 hours of mandatory offline relaxation time", done: false });
      
      defaultMilestones[2].title = "Phase 3: Stress Prevention & Calmness";
      defaultMilestones[2].tasks.push({ text: "Increase sleep to 7.5 hours per night", done: false });
    } else if (archetypeId === 'procrastinator') {
      defaultMilestones[0].title = "Phase 1: Action Momentum";
      defaultMilestones[0].description = "Build the daily habit of sitting down at the same time to start study sessions.";
      defaultMilestones[0].tasks.push({ text: "Log study times in a tracker daily", done: false });
      
      defaultMilestones[1].tasks.push({ text: "Study with a partner to maintain social accountability", done: false });
    }

    if (weakSubjects.length > 0) {
      defaultMilestones[0].tasks.push({ text: `Create a concept matrix for topics in ${weakSubjects[0].name}`, done: false });
      defaultMilestones[1].tasks.push({ text: `Score at least 75% on a self-administered mock test for ${weakSubjects[0].name}`, done: false });
    }

    return defaultMilestones;
  }
};
