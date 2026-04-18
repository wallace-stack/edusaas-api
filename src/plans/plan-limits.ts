export enum SchoolPlan {
  STARTER = 'starter',
  PRO     = 'pro',
  ESCOLA  = 'escola',
  REDE    = 'rede',
}

export const PLAN_LIMITS = {
  [SchoolPlan.STARTER]: {
    maxStudents:      150,
    maxImagesPerPost: 1,
    priceMonthly:     97,
    priceAnnual:      78,
    trialDays:        14,
    label:            'Starter',
  },
  [SchoolPlan.PRO]: {
    maxStudents:      500,
    maxImagesPerPost: 2,
    priceMonthly:     197,
    priceAnnual:      158,
    trialDays:        14,
    label:            'Pro',
  },
  [SchoolPlan.ESCOLA]: {
    maxStudents:      1000,
    maxImagesPerPost: 5,
    priceMonthly:     397,
    priceAnnual:      318,
    trialDays:        14,
    label:            'Escola',
  },
  [SchoolPlan.REDE]: {
    maxStudents:      Infinity,
    maxImagesPerPost: 10,
    priceMonthly:     797,
    priceAnnual:      638,
    trialDays:        14,
    label:            'Rede',
  },
};
