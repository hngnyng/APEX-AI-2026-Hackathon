// Data management store for the Student Life Coach Web App
// Handles localStorage persistence and file upload parsers (JSON, CSV)

const STORAGE_KEY = 'student_coach_data';

export const DataStore = {
  // Save entire application state
  saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      return true;
    } catch (e) {
      console.error('Error saving state to localStorage:', e);
      return false;
    }
  },

  // Load state from local storage or return null
  loadState() {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Error loading state from localStorage:', e);
      return null;
    }
  },

  // Clear storage
  clearState() {
    try {
      localStorage.removeItem(STORAGE_KEY);
      return true;
    } catch (e) {
      console.error('Error clearing localStorage:', e);
      return false;
    }
  },

  // Simple CSV Parser
  // Returns array of objects keyed by header names
  parseCSV(text) {
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
  },

  // Parse portfolio upload (could be JSON or CSV)
  async parsePortfolioFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        const content = event.target.result;
        const fileName = file.name.toLowerCase();

        try {
          if (fileName.endsWith('.json')) {
            const parsed = JSON.parse(content);
            resolve({ type: 'json', data: parsed });
          } else if (fileName.endsWith('.csv')) {
            const parsedCSV = this.parseCSV(content);
            resolve({ type: 'csv', data: parsedCSV });
          } else {
            reject(new Error('Unsupported file format. Please upload .json or .csv files.'));
          }
        } catch (err) {
          reject(new Error(`Failed to parse file: ${err.message}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('File read error'));
      };

      reader.readAsText(file);
    });
  },

  // Mapping CSV structures to our application schema
  mapCSVToGrades(csvData) {
    // Expected headers: subject, grade, target, hoursPerWeek
    return csvData.map(row => {
      const subject = row.subject || row.Subject || row.name || row.Name || 'Unknown Subject';
      const grade = row.grade || row.Grade || row.current_grade || 'B';
      const target = row.target || row.Target || row.target_grade || 'A';
      const hoursPerWeek = parseFloat(row.hoursPerWeek || row.HoursPerWeek || row.study_hours || 4);

      return {
        name: subject,
        grade: grade.toUpperCase(),
        target: target.toUpperCase(),
        hoursPerWeek: isNaN(hoursPerWeek) ? 4 : hoursPerWeek
      };
    });
  },

  mapCSVToTimetable(csvData) {
    // Expected headers: day, subject, start, end, type
    return csvData.map(row => {
      const day = row.day || row.Day || 'Monday';
      const subject = row.subject || row.Subject || 'Study';
      const start = row.start || row.Start || row.start_time || '09:00';
      const end = row.end || row.End || row.end_time || '10:00';
      const type = row.type || row.Type || 'class'; // class, study, activity

      return {
        day: this.normalizeDay(day),
        subject,
        start,
        end,
        type: type.toLowerCase()
      };
    });
  },

  normalizeDay(day) {
    const d = day.trim().toLowerCase();
    if (d.startsWith('mon')) return 'Monday';
    if (d.startsWith('tue')) return 'Tuesday';
    if (d.startsWith('wed')) return 'Wednesday';
    if (d.startsWith('thu')) return 'Thursday';
    if (d.startsWith('fri')) return 'Friday';
    if (d.startsWith('sat')) return 'Saturday';
    if (d.startsWith('sun')) return 'Sunday';
    return 'Monday';
  }
};
