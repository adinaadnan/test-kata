import { expect, it } from 'vitest';
import { escape, feedbackView, inboxView, loginView, priority, ticketView } from '../views.js';

const ticket = { id: 1, subject: 'Export <script>', customer: 'Amina', description: 'Need the full report.', priority: 'high', created_at: '2026-10-22T09:00:00Z' };
it('escapes untrusted ticket fields, including quotes', () => {
  expect(escape('&<>"\'')).toBe('&amp;&lt;&gt;&quot;&#39;');
  expect(ticketView(ticket)).toContain('Export &lt;script&gt;');
  expect(ticketView(ticket)).toContain('22 Oct 2026');
});
it('renders each known priority', () => {
  expect(['high', 'medium', 'low'].map(priority)).toEqual(['High', 'Medium', 'Low']);
});
it('renders login with safe optional feedback', () => {
  expect(loginView()).toContain('Your support inbox');
  expect(loginView('<oops>')).toContain('&lt;oops&gt;');
});
it('renders role labels and useful empty states', () => {
  expect(inboxView({ name: 'Sara', role: 'agent' }, [ticket])).toContain('Support agent');
  const empty = inboxView({ name: 'Amina', role: 'customer' }, []);
  expect(empty).toContain('Customer');
  expect(empty).toContain('No tickets yet');
  expect(empty).toContain('There are no tickets to open');
  expect(feedbackView('<bad>')).toContain('&lt;bad&gt;');
});
