export interface ModuleProgress {
  module_code: string;
  module_name: string;
  attendance_percentage: number;
  goal_percentage: number;
  status: "On Track" | "At Risk";
}

export interface StudentProgressData {
  quarter_label: string;
  overall_percentage: number;
  modules: ModuleProgress[];
}

export interface AttendanceLog {
  lessonID: number;
  module_code: string;
  status: "Present" | "Absent" | "Late";
  start_time: string; 
}

export interface StudentProfileData {
  name: string;
  email: string;
  studentNum: string;
  contactNumber?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactNumber?: string;
}

export interface NotificationItem {
  id: string;
  type: "not_recorded" | "below_threshold";
  title: string;
  date: string;
  module_code: string;
  module_name: string;
  
  details: {
    // Shared Fields
    attendanceStatus: string; // e.g., "Not Recorded" or "At Risk"
    suggestedAction: string;

    // Specific to 'not_recorded'
    reason?: string;
    attendanceMethod?: string;
    cameraLocation?: string;
    timestamp?: string;

    // Specific to 'below_threshold'
    currentAttendance?: number; 
    threshold?: number;         
    recentSessionsMissed?: number;
    totalRecentSessions?: number; 
    impact?: string;
  };
}