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
  studentID: string;
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
  notificationID: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
  // Add the flexible metadata
  meta_data?: {
    module_code?: string;
    module_name?: string;
    current_pct?: number;
    threshold?: number;
    missed_count?: number;
    total_past?: number;
    date?: string;
  };
}