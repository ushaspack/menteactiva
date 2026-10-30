export interface FormState {
  error: string | null;
  ok?: string | null;
  values: Record<string, string>;
}
export const emptyState: FormState = { error: null, values: {} };
