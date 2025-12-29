export interface lessonInfo {
    lessonID: number;
    lessonType: string;
    start_time: string; 
    end_time: string;
    location: string;
}

export interface TodaysLessons{
    lessonID: number;
    ModuleCode: string;
    ModuleName: string;
    lessonType: string;
    start_time: Date;
    end_time: Date;
    location: string;
    }

export interface AttendanceRecord {
  lessonID: number;
  subject: string;
  date: string; // ISO String from backend
  status: "present" | "absent";
}

export interface WeeklyLesson {
  lessonID: number;
  module_code: string;
  module_name: string;
  lesson_type: string;
  start_time: string; // ISO String from backend
  end_time: string;   // ISO String from backend
  location: string; 
}
export interface OverallLessonsStat {
  total_lessons: number;
  attended_lessons: number;
  percentage: number;
}
export interface ModuleStat {
  subject: string;
  attended: number;
  total: number;
  percentage: number;
}