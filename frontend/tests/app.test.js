import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { mount } from '../app.js';
import { ApiError, request, signIn } from '../api.js';

vi.mock('../api.js', async importOriginal => ({ ...await importOriginal(), request: vi.fn(), signIn: vi.fn() }));
const user = { name: 'Sara', role: 'agent' };
const ticket = { id: 1, subject: 'Invoice export', customer: 'Amina', description: 'Report missing.', priority: 'high', created_at: '2026-10-22T09:00:00Z' };
let root;
const settle = async () => { await vi.waitFor(() => expect(root.textContent).not.toContain('Loading ticket…')); };
const reject = (status = 503) => new ApiError('Please try again.', status);
function signedIn({ mobile = false, tickets = [ticket] } = {}) {
  vi.stubGlobal('matchMedia', () => ({ matches: mobile }));
  request.mockImplementation(async path => ({ '/me': user, '/tickets': tickets, '/tickets/1': ticket, '/logout': { ok: true } })[path]);
}
beforeEach(() => {
  vi.clearAllMocks();
  document.body.innerHTML = '<div id="app"></div>';
  root = document.getElementById('app');
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
});
afterEach(() => vi.unstubAllGlobals());
it('signs in, toggles password visibility, opens a ticket and signs out', async () => {
  request.mockRejectedValueOnce(reject(401));
  await mount(root);
  root.querySelector('.password-toggle').click();
  expect(root.querySelector('#password').type).toBe('text');
  root.querySelector('.password-toggle').click();
  expect(root.querySelector('#password').type).toBe('password');
  root.querySelector('#email').value = 'sara@example.test';
  root.querySelector('#password').value = 'workshop123';
  signIn.mockResolvedValue(user);
  signedIn();
  root.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  await vi.waitFor(() => expect(root.querySelector('h2')?.textContent).toBe(ticket.subject));
  expect(signIn).toHaveBeenCalledWith('sara@example.test', 'workshop123');
  root.querySelector('.signout').click();
  await vi.waitFor(() => expect(root.querySelector('form')).not.toBeNull());
});
it('preserves typed credentials and permits retry after login failure', async () => {
  request.mockRejectedValue(reject(401));
  await mount(root);
  root.querySelector('#email').value = 'sara@example.test';
  signIn.mockRejectedValue(reject(401));
  root.querySelector('form').dispatchEvent(new Event('submit', { cancelable: true }));
  await vi.waitFor(() => expect(root.querySelector('.error').textContent).toBe('Please try again.'));
  expect(root.querySelector('.primary').disabled).toBe(false);
  expect(root.querySelector('#email').value).toBe('sara@example.test');
});
it('opens a ticket on mobile and returns focus to the queue', async () => {
  signedIn({ mobile: true });
  await mount(root);
  expect(root.querySelector('.workspace').classList.contains('has-detail')).toBe(false);
  root.querySelector('.ticket-row').click();
  await settle();
  root.querySelector('.back').click();
  expect(root.querySelector('.workspace').classList.contains('has-detail')).toBe(false);
  expect(document.activeElement).toBe(root.querySelector('.ticket-row'));
});
it('renders an empty inbox without requesting a ticket', async () => {
  signedIn({ tickets: [] });
  await mount(root);
  expect(root.textContent).toContain('No tickets yet');
  expect(request).toHaveBeenCalledTimes(2);
});
it('recovers from startup failure through Try again', async () => {
  request.mockRejectedValueOnce(reject());
  await mount(root);
  expect(root.querySelector('[role=alert]').textContent).toBe('Please try again.');
  signedIn();
  root.querySelector('.retry').click();
  await vi.waitFor(() => expect(root.querySelector('h2')).not.toBeNull());
});
it('handles a failed ticket list and an expired session', async () => {
  request.mockResolvedValueOnce(user).mockRejectedValueOnce(reject(401));
  await mount(root);
  expect(root.querySelector('.error').textContent).toContain('session has expired');
});
it('shows recoverable ticket and logout failures', async () => {
  request.mockResolvedValueOnce(user).mockResolvedValueOnce([ticket]).mockRejectedValueOnce(reject());
  await mount(root);
  expect(root.textContent).toContain('Please try again.');
  signedIn();
  await mount(root);
  request.mockRejectedValueOnce(reject());
  root.querySelector('.signout').click();
  await vi.waitFor(() => expect(root.querySelector('.retry')).not.toBeNull());
});
it('does not let a stale ticket response replace the current selection', async () => {
  signedIn({ mobile: true, tickets: [ticket, { ...ticket, id: 2, subject: 'Second' }] });
  await mount(root);
  let resolveFirst;
  request.mockImplementationOnce(() => new Promise(resolve => { resolveFirst = resolve; })).mockResolvedValueOnce({ ...ticket, id: 2, subject: 'Second' });
  root.querySelector('[data-ticket="1"]').click();
  root.querySelector('[data-ticket="2"]').click();
  await settle();
  resolveFirst(ticket);
  await Promise.resolve();
  expect(root.querySelector('h2').textContent).toBe('Second');
});
it('ignores errors from a ticket request superseded by a newer one', async () => {
  signedIn({ mobile: true });
  await mount(root);
  let rejectFirst;
  request.mockImplementationOnce(() => new Promise((_, rejectPromise) => { rejectFirst = rejectPromise; })).mockResolvedValueOnce(ticket);
  root.querySelector('.ticket-row').click();
  root.querySelector('.ticket-row').click();
  await settle();
  rejectFirst(reject());
  await Promise.resolve();
  expect(root.querySelector('h2').textContent).toBe(ticket.subject);
});
it('boots the browser entry point', async () => {
  signedIn();
  await import('../main.js');
  expect(root.querySelector('h2').textContent).toBe(ticket.subject);
});
