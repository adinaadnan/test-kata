"""Opaque session tokens: only their hashes are stored in PostgreSQL."""
import hashlib
import secrets
from functools import wraps

from flask import g, jsonify, request

from store import connect

COOKIE = 'desk_session'


def digest(token):
    return hashlib.sha256(token.encode()).hexdigest()


def create_session(db, user_id):
    token = secrets.token_urlsafe(32)
    db.execute('INSERT INTO sessions(token_hash,user_id) VALUES (%s,%s)', (digest(token), user_id))
    return token


def require_user(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        token = request.cookies.get(COOKIE)
        if not token:
            return jsonify(error='Sign in to continue.'), 401
        with connect() as db:
            actor = db.execute('SELECT u.id,u.name,u.email,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=%s AND s.expires_at>now()', (digest(token),)).fetchone()
        if not actor:
            return jsonify(error='Your session has expired. Please sign in again.'), 401
        g.user = actor
        return view(*args, **kwargs)
    return wrapped
