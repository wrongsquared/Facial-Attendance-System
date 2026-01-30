export interface AdminProfileData {
  name: string;
  email: string;
  role: string;
  contactNumber?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactNumber?: string;
}

export interface AdminUserAccount {
  uuid: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: string;
  courseID?: number;
  studentNum?: string; // Optional
  specialistIn?: string; // Optional
  jobTitle?: string; // Optional
}

export interface Course {
  courseID: number;
  courseCode: string;
  courseName?: string;
}

export interface UserDetails {
  uuid: string;
  name: string;
  email: string;
  role: string;
  // Role-specific optional fields
  studentNum?: string;
  courseID?: number;
  specialistIn?: string;
  jobTitle?: string;
}

export interface UpdateUserPayload {
  name: string;
  email: string;
  password?: string; // Optional: only sent if admin fills the box
  studentNum?: string;
  courseID?: number;
  specialistIn?: string;
  jobTitle?: string;
}