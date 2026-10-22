export function escape(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

export function priority(value) {
  return ({ high: 'High', medium: 'Medium', low: 'Low' })[value];
}

const eye = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.5"/></svg>';
const arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m10 5-7 7 7 7M3 12h18"/></svg>';

export function loginView(message = '') {
  return `<main class="login-page"><form class="login" aria-label="Sign in">
    <span class="brand">Desk</span><h1>Sign in</h1><p class="subtitle">Your support inbox, in one place.</p>
    <label for="email">Email</label><input id="email" name="email" type="email" autocomplete="username" required maxlength="254">
    <label for="password">Password</label><div class="password-field"><input id="password" name="password" type="password" autocomplete="current-password" required maxlength="1024"><button type="button" class="password-toggle" aria-label="Show password" aria-pressed="false">${eye}</button></div>
    <p class="error" role="alert">${escape(message)}</p><button class="primary" type="submit">Sign in</button>
  </form></main>`;
}

export function inboxView(user, tickets) {
  return `<header class="header"><span class="brand">Desk</span><div class="account"><span>${escape(user.name)} <span class="account-role">· ${user.role === 'agent' ? 'Support agent' : 'Customer'}</span></span><button class="text-button signout" type="button">Sign out</button></div></header>
    <main class="workspace"><section class="inbox" aria-labelledby="inbox-title"><div class="inbox-heading"><h1 id="inbox-title">Ticket inbox</h1><p class="count">${tickets.length} tickets</p></div><ul class="ticket-list">${tickets.map(ticket => `<li><button class="ticket-row" type="button" data-ticket="${ticket.id}"><span class="ticket-id">#${ticket.id}</span><span><span class="ticket-subject">${escape(ticket.subject)}</span><span class="ticket-meta">${escape(ticket.customer)} · ${priority(ticket.priority)}</span></span></button></li>`).join('')}</ul>${tickets.length ? '' : '<p class="empty">No tickets yet. New requests will appear here.</p>'}</section><section class="detail" aria-label="Ticket details"><div class="detail-inner">${tickets.length ? '<p class="empty">Select a ticket to read its details.</p>' : '<p class="empty">There are no tickets to open.</p>'}</div></section></main>`;
}

export function ticketView(ticket) {
  const created = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(ticket.created_at));
  return `<button class="text-button back" type="button">${arrow}Back to inbox</button>
    <p class="detail-id">#${ticket.id}</p><h2 tabindex="-1">${escape(ticket.subject)}</h2><p class="customer">${escape(ticket.customer)} · Customer</p>
    <p class="description">${escape(ticket.description)}</p><dl class="metadata"><dt>Priority</dt><dd>${priority(ticket.priority)}</dd><dt>Created</dt><dd>${created}</dd></dl>`;
}

export function feedbackView(message) {
  return `<main class="feedback"><p role="alert">${escape(message)}</p><button class="primary retry" type="button">Try again</button></main>`;
}
