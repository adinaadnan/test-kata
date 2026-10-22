"""Desk's read-only ticket API and session endpoints."""
import os
from urllib.parse import urlsplit

import psycopg
from flask import Flask, g, jsonify, request
from werkzeug.middleware.proxy_fix import ProxyFix
from werkzeug.security import check_password_hash, generate_password_hash

from auth import COOKIE, create_session, digest, require_user
from store import connect

# Match password verification work for unknown emails as well.
DUMMY_PASSWORD = generate_password_hash('not-a-demo-password')
TICKET_FIELDS = 't.id,t.customer_id,t.subject,t.description,t.priority,t.created_at,u.name AS customer,t.assignee_id,a.name AS assignee'


def create_app():
    app = Flask(__name__, static_folder='static', static_url_path='/')
    if os.environ.get('RENDER') == 'true':
        # Render terminates HTTPS at its proxy; retain the original request host.
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=0, x_proto=1, x_host=0, x_port=0, x_prefix=0)
    app.config['MAX_CONTENT_LENGTH'] = 4096

    @app.before_request
    def same_origin():
        if request.method == 'POST':
            origin = request.headers.get('Origin')
            if request.headers.get('Sec-Fetch-Site') == 'cross-site' or (origin and urlsplit(origin).netloc != request.host):
                return jsonify(error='Cross-site request rejected.'), 403

    @app.after_request
    def response_headers(response):
        response.headers['Cache-Control'] = 'no-store'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        return response

    @app.errorhandler(400)
    def bad_request(_error):
        return jsonify(error='Provide a valid JSON request.'), 400

    @app.errorhandler(404)
    def not_found(_error):
        return jsonify(error='Not found.'), 404

    @app.errorhandler(405)
    def wrong_method(_error):
        return jsonify(error='Method not allowed.'), 405

    @app.errorhandler(413)
    def too_large(_error):
        return jsonify(error='Request is too large.'), 413

    @app.errorhandler(psycopg.OperationalError)
    def unavailable(_error):
        app.logger.warning('Database connection unavailable')
        return jsonify(error='The service is temporarily unavailable. Please try again.'), 503

    @app.get('/')
    def index():
        return app.send_static_file('index.html')

    @app.get('/api/health')
    def health():
        with connect() as db:
            db.execute('SELECT 1')
        return jsonify(ok=True)

    @app.post('/api/login')
    def login():
        if not request.is_json:
            return jsonify(error='Provide a valid JSON request.'), 400
        body = request.get_json()
        if not isinstance(body, dict):
            return jsonify(error='Provide an email and password.'), 400
        email, password = body.get('email'), body.get('password')
        if not isinstance(email, str) or not isinstance(password, str) or not email.strip() or not password:
            return jsonify(error='Provide an email and password.'), 400
        with connect() as db:
            user = db.execute('SELECT * FROM users WHERE email=%s', (email.strip().lower(),)).fetchone()
            valid = check_password_hash(user['password_hash'] if user else DUMMY_PASSWORD, password)
            if not user or not valid:
                return jsonify(error='Email or password is incorrect.'), 401
            db.execute('DELETE FROM sessions WHERE expires_at<=now()')
            token = create_session(db, user['id'])
        response = jsonify({k: user[k] for k in ('id', 'name', 'email', 'role')})
        response.set_cookie(COOKIE, token, max_age=28800, httponly=True, samesite='Lax', secure=request.is_secure)
        return response

    @app.post('/api/logout')
    def logout():
        token = request.cookies.get(COOKIE)
        if token:
            with connect() as db:
                db.execute('DELETE FROM sessions WHERE token_hash=%s', (digest(token),))
        response = jsonify(ok=True)
        response.delete_cookie(COOKIE, httponly=True, samesite='Lax')
        return response

    @app.get('/api/me')
    @require_user
    def me():
        return jsonify(g.user)

    @app.get('/api/tickets')
    @require_user
    def tickets():
        with connect() as db:
            rows = db.execute(f'SELECT {TICKET_FIELDS} FROM tickets t JOIN users u ON u.id=t.customer_id LEFT JOIN users a ON a.id=t.assignee_id ORDER BY t.id').fetchall()
        return jsonify(rows)

    @app.get('/api/tickets/<int:ticket_id>')
    @require_user
    def ticket(ticket_id):
        if ticket_id > 2147483647:
            return jsonify(error='Ticket not found.'), 404
        with connect() as db:
            row = db.execute(f'SELECT {TICKET_FIELDS} FROM tickets t JOIN users u ON u.id=t.customer_id LEFT JOIN users a ON a.id=t.assignee_id WHERE t.id=%s', (ticket_id,)).fetchone()
        if not row:
            return jsonify(error='Ticket not found.'), 404
        return jsonify(row)

    @app.post('/api/tickets/<int:ticket_id>/assign')
    @require_user
    def assign_ticket(ticket_id):
        if g.user['role'] != 'agent':
            return jsonify(error='Only support agents can claim tickets.'), 403
        if ticket_id > 2147483647:
            return jsonify(error='Ticket not found.'), 404
        with connect() as db:
            claimed = db.execute(
                'UPDATE tickets SET assignee_id=%s WHERE id=%s AND assignee_id IS NULL RETURNING id',
                (g.user['id'], ticket_id),
            ).fetchone()
            if not claimed:
                exists = db.execute('SELECT 1 FROM tickets WHERE id=%s', (ticket_id,)).fetchone()
                if not exists:
                    return jsonify(error='Ticket not found.'), 404
                return jsonify(error='This ticket has already been claimed. Refresh to see the assignee.'), 409
            row = db.execute(
                f'SELECT {TICKET_FIELDS} FROM tickets t JOIN users u ON u.id=t.customer_id LEFT JOIN users a ON a.id=t.assignee_id WHERE t.id=%s',
                (ticket_id,),
            ).fetchone()
        return jsonify(row)

    return app
