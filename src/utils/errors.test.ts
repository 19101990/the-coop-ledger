import { describe, expect, it } from 'vitest';
import { errorMessage } from './errors';

describe('errorMessage', () => {
  it('reads Error instances', () => {
    expect(errorMessage(new Error('boom'))).toBe('boom');
  });

  it('reads plain objects with a message (Supabase errors)', () => {
    expect(errorMessage({ message: 'permission denied', code: '42501' })).toBe('permission denied');
  });

  it('falls back to a string for anything else', () => {
    expect(errorMessage('offline')).toBe('offline');
    expect(errorMessage(null)).toBe('null');
    expect(errorMessage({ code: 1 })).toBe('[object Object]');
  });
});
