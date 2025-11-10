export interface Mytheme {
  id: string;
  name: string;
  type: 'character' | 'event' | 'place' | 'object';
}

export interface PlotPoint {
  id: string;
  text: string;
  order: number;
  mythemeRefs: string[]; // IDs of mythemes referenced in the text
  category: string;
  canonicalCategoryId?: string | null;
  collaboratorCategories?: CollaboratorCategoryAssignment[];
}

export type VariantContributorType = 'owner' | 'collaborator' | 'invitee' | 'unknown';

export interface VariantContributor {
  type: VariantContributorType;
  email?: string | null;
  name?: string | null;
  userId?: string | null;
  avatarUrl?: string | null;
  contributionRequestId?: string | null;
}

export interface MythVariant {
  id: string;
  name: string;
  source: string;
  plotPoints: PlotPoint[];
  contributor?: VariantContributor | null;
}

export interface Myth {
  id: string;
  name: string;
  description: string;
  contributorInstructions: string;
  variants: MythVariant[];
  categories: string[];
  ownerId: string;
  collaborators: MythCollaborator[];
  canonicalCategories: MythCategory[];
  collaboratorCategories: CollaboratorCategory[];
}

export const DEFAULT_CATEGORIES = [
  'Introduction',
  'Conflict',
  'Journey',
  'Transformation',
  'Resolution',
  'Aftermath',
];

export type CollaboratorRole = 'viewer' | 'editor' | 'owner';

export interface MythCollaborator {
  id: string;
  mythId: string;
  email: string;
  role: CollaboratorRole;
  displayName?: string | null;
  avatarUrl?: string | null;
}

export interface MythCategory {
  id: string;
  mythId: string;
  name: string;
  sortOrder: number;
}

export interface CollaboratorCategory {
  id: string;
  mythId: string;
  collaboratorEmail: string;
  name: string;
}

export interface CollaboratorCategoryAssignment {
  plotPointId: string;
  collaboratorCategoryId: string;
  collaboratorEmail: string;
  categoryName: string;
}

export interface ContributionPlotPointDraft {
  id: string;
  text: string;
  order: number;
}

export interface ContributionDraftPayload {
  name: string;
  source: string;
  plotPoints: ContributionPlotPointDraft[];
}

export type ContributionRequestStatus = 'invited' | 'draft' | 'submitted' | 'expired';

export interface ContributionRequest {
  id: string;
  mythId: string;
  email: string;
  token: string;
  status: ContributionRequestStatus;
  submittedVariantId?: string | null;
  updatedAt: string;
  draft: ContributionDraftPayload;
}
