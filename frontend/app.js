import { request, signIn } from './api.js';
import { feedbackView, inboxView, loginView, ticketView } from './views.js';

export function mount(root) {
  let selected = 0;
  let revision = 0;

  function showLogin(message = '') {
    revision++;
    root.innerHTML = loginView(message);
    const form = root.querySelector('form');
    const password = form.elements.password;
    const toggle = root.querySelector('.password-toggle');
    toggle.onclick = () => {
      const showing = password.type === 'password';
      password.type = showing ? 'text' : 'password';
      toggle.setAttribute('aria-label', showing ? 'Hide password' : 'Show password');
      toggle.setAttribute('aria-pressed', String(showing));
    };
    form.onsubmit = async event => {
      event.preventDefault();
      const button = form.querySelector('.primary');
      button.disabled = true;
      button.textContent = 'Signing in…';
      form.querySelector('.error').textContent = '';
      try {
        const user = await signIn(form.elements.email.value, password.value);
        await showInbox(user);
      } catch (error) {
        form.querySelector('.error').textContent = error.message;
        button.disabled = false;
        button.textContent = 'Sign in';
      }
    };
  }

  function fail(error) {
    if (error.status === 401) return showLogin('Your session has expired. Please sign in again.');
    root.innerHTML = feedbackView(error.message);
    root.querySelector('.retry').onclick = start;
  }

  async function openTicket(id) {
    selected = id;
    const current = ++revision;
    const detail = root.querySelector('.detail-inner');
    const workspace = root.querySelector('.workspace');
    workspace.classList.add('has-detail');
    for (const row of root.querySelectorAll('.ticket-row')) row.setAttribute('aria-current', String(Number(row.dataset.ticket) === id));
    detail.innerHTML = '<p class="empty" role="status">Loading ticket…</p>';
    try {
      const ticket = await request(`/tickets/${id}`);
      if (current !== revision) return;
      detail.innerHTML = ticketView(ticket);
      detail.querySelector('.back').onclick = () => {
        revision++;
        workspace.classList.remove('has-detail');
        root.querySelector(`[data-ticket="${selected}"]`).focus();
      };
      detail.querySelector('h2').focus({ preventScroll: true });
    } catch (error) {
      if (current === revision) fail(error);
    }
  }

  async function showInbox(user) {
    try {
      const tickets = await request('/tickets');
      root.innerHTML = inboxView(user, tickets);
      root.querySelector('.signout').onclick = async () => {
        revision++;
        try {
          await request('/logout', { method: 'POST' });
          showLogin();
        } catch (error) {
          fail(error);
        }
      };
      for (const row of root.querySelectorAll('.ticket-row')) row.onclick = () => openTicket(Number(row.dataset.ticket));
      if (tickets.length && !matchMedia('(max-width: 700px)').matches) await openTicket(tickets[0].id);
    } catch (error) {
      fail(error);
    }
  }

  async function start() {
    revision++;
    root.innerHTML = '<p class="boot" role="status">Opening Desk…</p>';
    try {
      const user = await request('/me');
      await showInbox(user);
    } catch (error) {
      if (error.status === 401) showLogin();
      else fail(error);
    }
  }

  return start();
}
