import { CollaboratorRole, MythVariant } from "../../types/myth";

export type MythRow = {
  id: string;
  name: string | null;
  description: string | null;
  contributor_instructions: string | null;
  variants: MythVariant[] | null;
  user_id: string;
  categories: string[] | null;
};

export type CollaboratorRow = {
  id: string;
  myth_id: string;
  email: string | null;
  role: CollaboratorRole;
};

export type UserProfileRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

export type ProfileSettingsRow = {
  categories: string[] | null;
};

export type MythCategoryRow = {
  id: string;
  myth_id: string;
  name: string;
  sort_order: number | null;
};

export type PlotPointCategoryRow = {
  plot_point_id: string;
  category_id: string;
};

export type CollaboratorCategoryRow = {
  id: string;
  myth_id: string;
  collaborator_email: string;
  name: string;
};

export type CollaboratorPlotPointCategoryRow = {
  plot_point_id: string;
  collaborator_category_id: string;
};

export type MythVariantRow = {
  id: string;
  myth_id: string;
  name: string;
  source: string;
  sort_order: number | null;
  created_at: string;
  created_by_user_id: string | null;
  contributor_email: string | null;
  contributor_name: string | null;
  contributor_type: string | null;
  contribution_request_id: string | null;
};

export type PlotPointRow = {
  id: string;
  variant_id: string;
  position: number | null;
  text: string | null;
  category: string | null;
  canonical_category_id: string | null;
  mytheme_refs: string[] | null;
};

export type PlotPointUpsertRow = {
  id: string;
  variant_id: string;
  position: number;
  text: string;
  category: string;
  mytheme_refs: string[];
  canonical_category_id: string | null;
};

export type PostgrestErrorLike = {
  message?: string;
  details?: string | null;
  hint?: string | null;
  code?: string;
};