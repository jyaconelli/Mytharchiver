import { PostgrestErrorLike } from './types';

export const createSupabaseError = (context: string, error: PostgrestErrorLike) => {
  const segments = [
    error.message,
    error.details,
    error.hint,
    error.code ? `code: ${error.code}` : null,
  ].filter(Boolean);
  const description = segments.length > 0 ? segments.join(' | ') : 'Unknown error';
  const enriched = new Error(`${context} failed: ${description}`);
  (enriched as any).cause = error;
  return enriched;
};

export const guardSupabaseError = (
  context: string,
  error: PostgrestErrorLike | null,
  allowedCodes: string[] = [],
) => {
  if (error && !allowedCodes.includes(error.code ?? '')) {
    throw createSupabaseError(context, error);
  }
};
