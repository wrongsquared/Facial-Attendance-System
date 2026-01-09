export interface LecturerProfileData {
  name: string;
  email: string;
  specialistIn: string;
  phone?: string;
  fulladdress?: string;
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactNumber?: string;
}

export interface DailyTimetable{
    module_code: string;
    module_name: string;
    lesson_type: string;
    start_time: string;
    end_time: string;  
    location: string;
   }

export interface WeeklyTimetable{
    day_of_week: string;
    date_of_day: string;  
    module_code: string;
    module_name: string;
    lesson_type: string;
    start_time: string;
    end_time: string;
    location: string;
  }

export interface MonthlyTimetable{
    date_of_month: string;
    module_code: string;}


export interface AttendanceLogEntry{
    user_id: string;               
    student_name: string;          
    module_code: string;           
    status: 'Present' | 'Absent' | 'Late';
    date: string;                 
    lesson_id: number;

  liveCheck?: string;
  cameraLocation?: string;
  verificationType?: string;
  virtualTripwire?: string;
  timestamp?: string;
  attendanceMethod?: string;
}
export interface AttendanceLogFilters {
  searchTerm?: string;
  moduleCode?: string;
  status?: "Present" | "Absent" | "Late" | "All";
  date?: string; // "YYYY-MM-DD"
  page?: number;
}