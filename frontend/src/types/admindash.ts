import { Key, ReactNode } from "react";

export interface AdminStats {
  overall_attendance_rate: number;
  monthly_absences: number;
  total_active_users: number;
  total_records: number;
  trend_attendance: string;
  trend_absences: string;
  trend_users: string;
  trend_records: string;
}

export interface CourseAttention {
  module_code: string;
  module_name: string;
  lecturer_name: string;
  student_count: number;
  attendance_rate: number;
  lesson_type?: string;
  tutorial_group?: string;
}

export interface UserManagementItem {
  joined: ReactNode;
  id: Key | null | undefined;
  user_id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "pending" | "inactive";
  joined_date: string;
}