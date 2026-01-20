import uuid

import pytest

from app import models, settings
from app.storage import s3


@pytest.fixture(autouse=True)
def s3_config(monkeypatch):
    monkeypatch.setattr(settings, "S3_BUCKET", "test-bucket")
    monkeypatch.setattr(settings, "AWS_REGION", "us-east-1")
    monkeypatch.setattr(settings, "S3_PUBLIC_PREFIX", "public/")
    monkeypatch.setattr(
        s3,
        "create_presigned_put_url",
        lambda *args, **kwargs: "https://example.com/upload",
    )
    monkeypatch.setattr(
        s3,
        "head_object",
        lambda *args, **kwargs: {"ContentType": "image/jpeg", "ContentLength": 123},
    )
    yield


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


def presign_media(client, token: str, payload: dict):
    return client.post(
        "/media/presign",
        json=payload,
        headers=auth_headers(token),
    )


def test_presign_rejects_unsupported_content_type(client):
    suffix = uuid.uuid4().hex[:8]
    username = f"user_{suffix}"
    email = f"{username}@example.com"
    password = "test-password"

    assert register_user(client, username, email, password).status_code == 200
    token = login_user(client, username, password).json()["access_token"]

    response = presign_media(
        client,
        token,
        {"content_type": "image/gif", "size_bytes": 123, "kind": "post_image"},
    )

    assert response.status_code == 400


def test_complete_rejects_non_owner(client):
    suffix = uuid.uuid4().hex[:8]
    user_a = f"user_a_{suffix}"
    user_b = f"user_b_{suffix}"

    assert (
        register_user(client, user_a, f"{user_a}@example.com", "pass-a").status_code
        == 200
    )
    assert (
        register_user(client, user_b, f"{user_b}@example.com", "pass-b").status_code
        == 200
    )

    token_a = login_user(client, user_a, "pass-a").json()["access_token"]
    token_b = login_user(client, user_b, "pass-b").json()["access_token"]

    presign = presign_media(
        client,
        token_a,
        {"content_type": "image/jpeg", "size_bytes": 123, "kind": "post_image"},
    )
    media_id = presign.json()["media_id"]

    complete = client.post(
        f"/media/{media_id}/complete",
        headers=auth_headers(token_b),
    )

    assert complete.status_code == 403


def test_create_post_rejects_media_not_ready(client):
    suffix = uuid.uuid4().hex[:8]
    username = f"user_{suffix}"
    email = f"{username}@example.com"
    password = "test-password"

    assert register_user(client, username, email, password).status_code == 200
    token = login_user(client, username, password).json()["access_token"]

    presign = presign_media(
        client,
        token,
        {"content_type": "image/jpeg", "size_bytes": 123, "kind": "post_image"},
    )
    media_id = presign.json()["media_id"]

    created = client.post(
        "/posts",
        json={"content": "hello", "media_id": media_id},
        headers=auth_headers(token),
    )

    assert created.status_code == 409


def test_update_avatar_rejects_non_avatar_kind(client, db_session):
    suffix = uuid.uuid4().hex[:8]
    username = f"user_{suffix}"
    email = f"{username}@example.com"
    password = "test-password"

    assert register_user(client, username, email, password).status_code == 200
    token = login_user(client, username, password).json()["access_token"]

    presign = presign_media(
        client,
        token,
        {"content_type": "image/jpeg", "size_bytes": 123, "kind": "post_image"},
    )
    media_id = presign.json()["media_id"]

    media = db_session.query(models.Media).filter(models.Media.id == media_id).first()
    media.status = "ready"
    db_session.commit()

    response = client.put(
        "/users/me/avatar",
        json={"media_id": media_id},
        headers=auth_headers(token),
    )

    assert response.status_code == 400


def test_update_cover_rejects_non_cover_kind(client, db_session):
    suffix = uuid.uuid4().hex[:8]
    username = f"user_{suffix}"
    email = f"{username}@example.com"
    password = "test-password"

    assert register_user(client, username, email, password).status_code == 200
    token = login_user(client, username, password).json()["access_token"]

    presign = presign_media(
        client,
        token,
        {"content_type": "image/jpeg", "size_bytes": 123, "kind": "post_image"},
    )
    media_id = presign.json()["media_id"]

    media = db_session.query(models.Media).filter(models.Media.id == media_id).first()
    media.status = "ready"
    db_session.commit()

    response = client.put(
        "/users/me/cover",
        json={"media_id": media_id},
        headers=auth_headers(token),
    )

    assert response.status_code == 400
