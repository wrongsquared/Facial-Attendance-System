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
export interface UserAccDetails {
  uuid: string;
  name: string;
  email: string;
  role: string;
  active: boolean;         
  phone?: string;           
  fulladdress?: string;    
  // Role-specific optional fields
  studentNum?: string;
  courseID?: number;
  specialistIn?: string;
  attendanceMinimum?: number; 
  jobTitle?: string;
  creationDate?: string;
  associatedModules?: string; 
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
export interface UpdateProfilePayload {
  name: string;
  phone: string;
  fulladdress: string;
  status: string;
  attendanceMinimum?: number;
}

export interface UserListItem {
  userID: string;      // The UUID
  name: string;
  role: string;
  active: boolean;     // Status from DB
  studentNum?: string; // Optional for the User ID column
  attendanceMinimum?: number| null;
}
