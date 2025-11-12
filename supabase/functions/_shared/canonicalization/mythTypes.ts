export interface CollaboratorCategoryAssignment {
  plotPointId: string;
  collaboratorCategoryId: string;
  collaboratorEmail: string;
  categoryName: string;
  weight?: number;
}

export interface CollaboratorCategory {
  id: string;
  mythId: string;
  collaboratorEmail: string;
  name: string;
}

export interface PlotPoint {
  id: string;
  text: string;
  order: number;
  mythemeRefs: string[];
  category: string;
  canonicalCategoryId?: string | null;
  collaboratorCategories?: CollaboratorCategoryAssignment[];
}
