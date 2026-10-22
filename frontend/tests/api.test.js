import { afterEach, expect, it, vi } from 'vitest';
import { ApiError, request, signIn } from '../api.js';

afterEach(() => vi.unstubAllGlobals());
it('sends session credentials and JSON login data', async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ name: 'Sara' }) });
  vi.stubGlobal('fetch', fetch);
  await expect(signIn('sara@example.test', 'secret')).resolves.toEqual({ name: 'Sara' });
  expect(fetch).toHaveBeenCalledWith('/api/login', expect.objectContaining({ method: 'POST', credentials: 'same-origin', body: JSON.stringify({ email: 'sara@example.test', password: 'secret' }) }));
  await request('/me');
  expect(fetch).toHaveBeenLastCalledWith('/api/me', { credentials: 'same-origin' });
});
it('preserves server error status and message', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: 'Sign in again.' }) }));
  await expect(request('/me')).rejects.toMatchObject({ status: 401, message: 'Sign in again.' });
});
it('uses a fallback when a server error has no message', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }));
  await expect(request('/me')).rejects.toThrow('Something went wrong. Please try again.');
});
it('explains network and unreadable-response failures', async () => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
  await expect(request('/me')).rejects.toMatchObject({ status: 0, message: expect.stringContaining('Check your connection') });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 502, json: async () => { throw new Error('html'); } }));
  await expect(request('/me')).rejects.toBeInstanceOf(ApiError);
  await expect(request('/me')).rejects.toThrow('unreadable response');
});
