/**
 * A readable message from anything caught in a `catch`. Supabase errors are plain objects with a
 * `message` (not always `Error` instances), so check for that too.
 */
export const errorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string') {
    return err.message;
  }
  return String(err);
};
