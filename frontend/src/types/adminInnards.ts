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
  studentNum?: string; // Optional
  specialistIn?: string; // Optional
  jobTitle?: string; // Optional
}