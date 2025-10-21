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
}

export const CATEGORIES = [
  'Introduction',
  'Conflict',
  'Journey',
  'Transformation',
  'Resolution',
  'Aftermath'
] as const;

export type Category = typeof CATEGORIES[number];
