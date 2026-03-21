export const ORGANIZATION_ROLES = ['owner', 'admin', 'member'] as const;

export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];
