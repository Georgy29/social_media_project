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


def create_post(client, token: str, content: str):
    return client.post(
        "/posts",
        json={"content": content},
        headers=auth_headers(token),
    )


def get_feed(client, token: str, view: str):
    return client.get(
        f"/posts/with_counts/?view={view}&skip=0&limit=10",
        headers=auth_headers(token),
    )


def get_post_with_counts(client, token: str, post_id: int):
    return client.get(
        f"/posts/{post_id}/with_counts",
        headers=auth_headers(token),
    )


def test_create_post_appears_in_feed(client):
    suffix = uuid.uuid4().hex[:8]
    username = f"user_{suffix}"
    email = f"{username}@example.com"
    password = "test-password"

    reg = register_user(client, username, email, password)
    assert reg.status_code == 200

    login = login_user(client, username, password)
    assert login.status_code == 200
    token = login.json()["access_token"]

    content = "hello from test"
    created = create_post(client, token, content)
    assert created.status_code == 200

    feed = get_feed(client, token, view="public")
    assert feed.status_code == 200
    posts = feed.json()
    assert any(p["content"] == content for p in posts)


def test_subsriptions_feed_filters_by_following(client):
    suffix = uuid.uuid4().hex[:8]
    user_a = f"user_a_{suffix}"
    user_b = f"user_b_{suffix}"

    reg_a = register_user(client, user_a, f"{user_a}@example.com", "pass-a")
    reg_b = register_user(client, user_b, f"{user_b}@example.com", "pass-b")
    assert reg_a.status_code == 200
    assert reg_b.status_code == 200

    user_b_id = reg_b.json()["id"]

    token_a = login_user(client, user_a, "pass-a").json()["access_token"]
    token_b = login_user(client, user_b, "pass-b").json()["access_token"]

    content_a = "post from A"
    content_b = "post from B"

    assert create_post(client, token_a, content_a).status_code == 200
    assert create_post(client, token_b, content_b).status_code == 200

    # feed before following should show only 1 post
    subs_before = get_feed(client, token_a, view="subscriptions")
    assert subs_before.status_code == 200
    posts_before = subs_before.json()
    assert any(p["content"] == content_a for p in posts_before)
    assert all(p["content"] != content_b for p in posts_before)

    # Follow B
    follow = client.post(
        f"/users/{user_b_id}/follow",
        headers=auth_headers(token_a),
    )

    assert follow.status_code == 204

    subs_after = get_feed(client, token_a, view="subscriptions")
    assert subs_after.status_code == 200
    posts_after = subs_after.json()
    assert any(p["content"] == content_b for p in posts_after)


def test_get_post_with_counts_by_id(client):
    suffix = uuid.uuid4().hex[:8]
    username = f"user_{suffix}"
    email = f"{username}@example.com"
    password = "test-password"

    reg = register_user(client, username, email, password)
    assert reg.status_code == 200

    token = login_user(client, username, password).json()["access_token"]
    created = create_post(client, token, "hello detail endpoint")
    assert created.status_code == 200
    post_id = created.json()["id"]

    post_detail = get_post_with_counts(client, token, post_id)
    assert post_detail.status_code == 200
    data = post_detail.json()
    assert data["id"] == post_id
    assert data["content"] == "hello detail endpoint"
    assert data["owner_username"] == username

    missing = get_post_with_counts(client, token, 999999)
    assert missing.status_code == 404
