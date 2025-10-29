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

export interface MythVariant {
  id: string;
  name: string;
  source: string;
  plotPoints: PlotPoint[];
}

export interface Myth {
  id: string;
  name: string;
  description: string;
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
