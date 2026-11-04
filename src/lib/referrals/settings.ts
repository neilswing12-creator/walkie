export const REFERRAL_DEFAULTS = {
  enabled: true,
  referrerRewardDays: 1,
  refereeTrialDays: 7,
  stacking: true,
  maxStackedDays: 365,
  requireEmailVerified: true,
  requireOnboarding: true,
  requireFirstActivity: false,
  minAccountAgeHours: 0,
  referrerRewardDelayHours: 0,
  maxRewardsPerReferrerPer30Days: 30,
  reviewThreshold: 40,
  suspiciousThreshold: 70,
  sensitivity: 1, // multiplier on risk weights (0.5 lenient … 2 strict)
  ipRetentionDays: 30,
};
export type ReferralSettings = typeof REFERRAL_DEFAULTS;
