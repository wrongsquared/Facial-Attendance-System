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
  user_display_id: string;
  name: string;
  role: string;
  status: string;
}