
export interface PlatformManagerDash {
  stats: {
    total_institutions: number
  },
  recent_subscriptions: {
    universityID: number,
    universityName: string,
    subscriptionDate: string
  }[]
}