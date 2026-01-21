export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user_id: string;
  role_id: number;
  role_name: string;
  name: string;
  // campus_id: number;
  // campus_name: string;
  // uni_name:string;
  studentNum?: string | null;
  specialistIn?: string | null;
  job?: string | null;
}

export interface ProfileUpdateData {
  name: string;
  email: string;
  contactNumber: string;
  address: string;
  emergencyContactName: string;
  emergencyContactRelationship: string;
  emergencyContactNumber: string;
}