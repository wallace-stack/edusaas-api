export enum SchoolPlan {
  FREE = 'free',
  PRO = 'pro',
  PREMIUM = 'premium',
}

export const PLAN_LIMITS = {
  [SchoolPlan.FREE]: {
    maxStudents: 150,
    maxImagesPerPost: 1,
    price: 0,
    trialDays: 14,
    label: 'Free',
  },
  [SchoolPlan.PRO]: {
    maxStudents: 350,
    maxImagesPerPost: 2,
    price: 79.90,
    trialDays: 0,
    label: 'Pro',
  },
  [SchoolPlan.PREMIUM]: {
    maxStudents: Infinity,
    maxImagesPerPost: 5,
    price: 149.90,
    trialDays: 0,
    label: 'Premium',
  },
};
