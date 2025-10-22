export interface Mytheme {
  id: string;
  name: string;
  type: 'character' | 'event' | 'place' | 'object';
}

export interface PlotPoint {
  id: string;
  text: string;
  category: string;
  order: number;
  mythemeRefs: string[]; // IDs of mythemes referenced in the text
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
  ownerId: string;
  collaborators: MythCollaborator[];
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
