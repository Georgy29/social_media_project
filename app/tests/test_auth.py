import uuid


def register_user(client, username: str, email: str, password: str):
    return client.post(
        "/users/",
        json={"username": username, "email": email, "password": password},
    )


def login_user(client, username: str, password: str):
    return client.post(
        "/token",
        data={"username": username, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )


def auth_headers(token: str):
    return {"Authorization": f"Bearer {token}"}


def test_register_login_me(client):
    suffix = uuid.uuid4().hex[:8]
    username = f"user_{suffix}"
    email = f"{username}@example.com"
    password = "test-password"

    reg = register_user(client, username, email, password)
    assert reg.status_code == 200
    reg_data = reg.json()
    assert reg_data["username"] == username
    assert reg_data["email"] == email
    assert "id" in reg_data

    login = login_user(client, username, password)
    assert login.status_code == 200
    token = login.json()["access_token"]

    me = client.get("/users/me", headers=auth_headers(token))
    assert me.status_code == 200
    me_data = me.json()
    assert me_data["username"] == username
    assert me_data["email"] == email


def test_login_wrong_password_fails(client):
    suffix = uuid.uuid4().hex[:8]
    username = f"user_{suffix}"
    email = f"{username}@example.com"
    password = "test-password"

    reg = register_user(client, username, email, password)
    assert reg.status_code == 200

    bad_login = login_user(client, username, "wrong-password")
    assert bad_login.status_code == 401
