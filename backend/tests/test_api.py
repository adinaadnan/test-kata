import hashlib
from unittest.mock import patch

import psycopg
import pytest
from werkzeug.security import check_password_hash

from auth import digest
from seed import seed
from store import connect


def test_health_and_headers(client):
    response = client.get('/api/health')
    assert response.json == {'ok': True}
    assert response.headers['Cache-Control'] == 'no-store'
    assert response.headers['X-Content-Type-Options'] == 'nosniff'


def test_digest_is_stable_and_one_way():
    assert digest('test-token') == hashlib.sha256(b'test-token').hexdigest()
    assert digest('test-token') != 'test-token'


def test_login_session_cookie_and_identity(client, login):
    response = login(email=' SARA@example.test ')
    assert response.status_code == 200
    assert response.json == {'id': 3, 'name': 'Sara', 'email': 'sara@example.test', 'role': 'agent'}
    cookie = response.headers['Set-Cookie']
    assert 'HttpOnly' in cookie and 'SameSite=Lax' in cookie and 'Max-Age=28800' in cookie
    token = client.get_cookie('desk_session').value
    with connect() as db:
        row = db.execute('SELECT * FROM sessions').fetchone()
    assert row['token_hash'] == digest(token)
    assert row['token_hash'] != token
    assert client.get('/api/me').json == response.json


def test_https_cookie_is_secure(client, login):
    response = login(base_url='https://localhost')
    assert 'Secure;' in response.headers['Set-Cookie']


@pytest.mark.parametrize('email,password', [('sara@example.test', 'wrong'), ('unknown@example.test', 'workshop123')])
def test_invalid_credentials_do_not_create_session(client, login, email, password):
    assert login(email, password).status_code == 401
    with connect() as db:
        assert db.execute('SELECT count(*) AS count FROM sessions').fetchone()['count'] == 0


@pytest.mark.parametrize('body', [[], None, {}, {'email': 5, 'password': 'ok'}, {'email': 'x', 'password': 5}, {'email': ' ', 'password': 'x'}, {'email': 'x', 'password': ''}])
def test_invalid_login_shapes(client, body):
    response = client.post('/api/login', data=__import__('json').dumps(body), content_type='application/json')
    assert response.status_code == 400


def test_login_requires_json(client):
    assert client.post('/api/login', data='email=a').status_code == 400
    assert client.post('/api/login', data='{oops', content_type='application/json').status_code == 400
    assert client.post('/api/login', data='x' * 4097, content_type='application/json').status_code == 413


@pytest.mark.parametrize('headers', [{'Sec-Fetch-Site': 'cross-site'}, {'Origin': 'https://outsider.example'}])
def test_cross_site_posts_rejected(client, headers):
    assert client.post('/api/logout', headers=headers).status_code == 403


def test_same_origin_posts_allowed(client, login):
    assert login(headers={'Origin': 'http://localhost', 'Sec-Fetch-Site': 'same-origin'}).status_code == 200


@pytest.mark.parametrize('path', ['/api/me', '/api/tickets', '/api/tickets/1'])
def test_reads_require_login(client, path):
    assert client.get(path).status_code == 401


def test_invalid_and_expired_sessions(client, login):
    client.set_cookie('desk_session', 'made-up-token')
    assert client.get('/api/me').status_code == 401
    login()
    with connect() as db:
        db.execute("UPDATE sessions SET expires_at=now()-interval '1 second'")
    assert client.get('/api/me').status_code == 401
    # New login prunes expired records rather than accumulating them.
    assert login().status_code == 200
    with connect() as db:
        assert db.execute('SELECT count(*) AS count FROM sessions').fetchone()['count'] == 1


def test_agent_inbox_and_details(client, login):
    login()
    response = client.get('/api/tickets')
    assert response.status_code == 200 and len(response.json) == 4
    assert [ticket['id'] for ticket in response.json] == [1, 2, 3, 4]
    ticket = client.get('/api/tickets/1').json
    assert ticket['subject'] == 'Invoice export is missing rows'
    assert ticket['customer'] == 'Amina'
    assert 'Friday' in ticket['description']
    assert not {'password_hash', 'token_hash'} & ticket.keys()


def test_customer_can_read_own_ticket(client, login):
    login('amina@example.test')
    assert client.get('/api/me').json['role'] == 'customer'
    assert client.get('/api/tickets/1').json['customer'] == 'Amina'


@pytest.mark.parametrize('path', ['/api/tickets/9999', '/api/tickets/9999999999999999', '/api/tickets/nope', '/api/unknown'])
def test_missing_routes_and_tickets(client, login, path):
    login()
    assert client.get(path).status_code == 404


def test_wrong_methods(client):
    assert client.delete('/api/login').status_code == 405


def test_logout_revokes_session_and_clears_cookie(client, login):
    login()
    token = client.get_cookie('desk_session').value
    assert client.post('/api/logout').json == {'ok': True}
    assert client.get_cookie('desk_session') is None
    client.set_cookie('desk_session', token)
    assert client.get('/api/me').status_code == 401
    client.delete_cookie('desk_session')
    assert client.post('/api/logout').status_code == 200


def test_database_outage_returns_recoverable_error(client):
    with patch('app.connect', side_effect=psycopg.OperationalError('offline')):
        response = client.get('/api/health')
    assert response.status_code == 503
    assert 'try again' in response.json['error']


def test_demo_seed_is_repeatable_and_passwords_are_hashed():
    seed()
    with connect() as db:
        assert db.execute('SELECT count(*) AS count FROM users').fetchone()['count'] == 4
        assert db.execute('SELECT count(*) AS count FROM tickets').fetchone()['count'] == 4
        user = db.execute("SELECT * FROM users WHERE email='sara@example.test'").fetchone()
        assert user['password_hash'] != 'workshop123'
        assert check_password_hash(user['password_hash'], 'workshop123')


@pytest.mark.parametrize('statement,params', [
    ('INSERT INTO users(name,email,password_hash,role) VALUES (%s,%s,%s,%s)', ('Test', 'sara@example.test', 'hash', 'agent')),
    ('INSERT INTO users(name,email,password_hash,role) VALUES (%s,%s,%s,%s)', ('Test', 'x@example.test', 'hash', 'admin')),
    ('INSERT INTO tickets(customer_id,subject,description,priority) VALUES (%s,%s,%s,%s)', (9999, 'Test', 'Test', 'low')),
    ('INSERT INTO tickets(customer_id,subject,description,priority) VALUES (%s,%s,%s,%s)', (1, 'Test', 'Test', 'urgent')),
    ('INSERT INTO sessions(token_hash,user_id) VALUES (%s,%s)', ('bad', 9999)),
])
def test_database_constraints(statement, params):
    with pytest.raises(psycopg.IntegrityError):
        with connect() as db:
            db.execute(statement, params)
