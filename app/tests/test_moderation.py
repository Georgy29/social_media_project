import uuid

from app import models


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


def test_admin_can_delete_any_post(client, db_session):
    suffix = uuid.uuid4().hex[:8]
    admin_username = f"admin_{suffix}"
    user_username = f"user_{suffix}"

    assert (
        register_user(
            client,
            admin_username,
            f"{admin_username}@example.com",
            "admin-pass",
        ).status_code
        == 200
    )
    assert (
        register_user(
            client,
            user_username,
            f"{user_username}@example.com",
            "user-pass",
        ).status_code
        == 200
    )

    admin = (
        db_session.query(models.User)
        .filter(models.User.username == admin_username)
        .first()
    )
    assert admin is not None
    admin.is_admin = True
    db_session.flush()

    admin_token = login_user(client, admin_username, "admin-pass").json()[
        "access_token"
    ]
    user_token = login_user(client, user_username, "user-pass").json()["access_token"]

    created = client.post(
        "/posts/",
        json={"content": "post to be deleted"},
        headers=auth_headers(user_token),
    )
    assert created.status_code == 200
    post_id = created.json()["id"]

    deleted = client.delete(
        f"/admin/posts/{post_id}",
        headers=auth_headers(admin_token),
    )
    assert deleted.status_code == 204

    feed = client.get(
        "/posts/with_counts/?view=public&skip=0&limit=10",
        headers=auth_headers(user_token),
    )
    assert feed.status_code == 200
    assert all(p["id"] != post_id for p in feed.json())


def test_non_admin_cannot_delete_any_post(client):
    suffix = uuid.uuid4().hex[:8]
    user_username = f"user_{suffix}"
    assert (
        register_user(
            client,
            user_username,
            f"{user_username}@example.com",
            "user-pass",
        ).status_code
        == 200
    )
    token = login_user(client, user_username, "user-pass").json()["access_token"]

    resp = client.delete("/admin/posts/1", headers=auth_headers(token))
    assert resp.status_code == 403
