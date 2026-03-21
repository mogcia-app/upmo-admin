export const ADMIN_FEATURE_KEYS = [
  'restricted_doc_access',
  'activity_audit',
  'learning_insights',
  'org_dashboard',
] as const;

export type AdminFeatureKey = (typeof ADMIN_FEATURE_KEYS)[number];

export interface FeatureSetting {
  featureKey: AdminFeatureKey;
  enabled: boolean;
}
