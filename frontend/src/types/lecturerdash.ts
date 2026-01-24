export interface ClassesToday {
  module_code: string;
  module_name: string;
  time_range: string;
  location: string;
  status: 'Completed' | 'Pending' | 'Live';
  present_count: number;
  total_enrolled: number;
  attendance_display: string;
}

export interface CourseOverview {
  module_code: string;
  module_name: string;
  overall_attendance_rate: number;
  students_enrolled: number;
}
export interface timetableEntry {
  module_code: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  location: string;
}

export interface ClassesToday {
  module_code: string;
  module_name: string;
  time_range: string;
  location: string;
  status: 'Completed' | 'Pending' | 'Live';
  present_count: number;
  total_enrolled: number;
  attendance_display: string;
}

export interface CourseOverview {
  module_code: string;
  module_name: string;
  overall_attendance_rate: number;
  students_enrolled: number;
}

export interface recentSessionsLog {
  lessonID: number;
  subject: string;
  date: string;
  time: string;
  attended: number;
  total: number;
  percentage: number;
}

export interface totalModuleTaught {
  total_modules: number;
}

export interface avgatt {
  Average_attendance: number; //Float is still number in typescript
}

export interface recentSessionsrecord {
  Recent_sessions_record: number
}