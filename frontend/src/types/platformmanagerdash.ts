
export interface PlatformManagerDash {
  stats: {
    total_institutions: number
  },
  recent_subscriptions: {
    universityID: number;
    universityName: string;
    campusID: number;
    campusName: string;
    campusAddress?: string;
    subscriptionDate: string;
    isActive: boolean;
  }[]
}