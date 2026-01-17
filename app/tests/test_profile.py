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
        "/posts/",
        json={"content": content},
        headers=auth_headers(token),
    )


def retweet_post(client, token: str, post_id: int):
    return client.post(
        f"/posts/{post_id}/retweet",
        headers=auth_headers(token),
    )


def follow_user(client, token: str, user_id: int):
    return client.post(
        f"/users/{user_id}/follow",
        headers=auth_headers(token),
    )


def get_profile(client, username: str):
    return client.get(f"/users/{username}")


def get_timeline(client, username: str):
    return client.get(f"/users/{username}/timeline?skip=0&limit=10")


def test_profile_counts(client):
    suffix = uuid.uuid4().hex[:8]
    user_a = f"user_a_{suffix}"
    user_b = f"user_b_{suffix}"

    reg_a = register_user(client, user_a, f"{user_a}@example.com", "pass-a")
    reg_b = register_user(client, user_b, f"{user_b}@example.com", "pass-b")
    assert reg_a.status_code == 200
    assert reg_b.status_code == 200

    user_a_id = reg_a.json()["id"]
    token_a = login_user(client, user_a, "pass-a").json()["access_token"]
    token_b = login_user(client, user_b, "pass-b").json()["access_token"]

    # A creates one post
    assert create_post(client, token_a, "post from A").status_code == 200

    # B follows A
    assert follow_user(client, token_b, user_a_id).status_code == 204

    profile = get_profile(client, user_a)
    assert profile.status_code == 200
    data = profile.json()

    assert data["username"] == user_a
    assert data["posts_count"] == 1
    assert data["followers_count"] == 1
    assert data["following_count"] == 0


def test_timeline_posts_and_retweets_ordered(client):
    suffix = uuid.uuid4().hex[:8]
    user_a = f"user_a_{suffix}"
    user_b = f"user_b_{suffix}"

    reg_a = register_user(client, user_a, f"{user_a}@example.com", "pass-a")
    reg_b = register_user(client, user_b, f"{user_b}@example.com", "pass-b")
    assert reg_a.status_code == 200
    assert reg_b.status_code == 200

    token_a = login_user(client, user_a, "pass-a").json()["access_token"]
    token_b = login_user(client, user_b, "pass-b").json()["access_token"]

    # B creates a post
    post_b = create_post(client, token_b, "post from B")
    assert post_b.status_code == 200
    post_b_id = post_b.json()["id"]

    # A creates own post, then retweets B (retweet should be newest activity)
    assert create_post(client, token_a, "post from A").status_code == 200
    assert retweet_post(client, token_a, post_b_id).status_code == 204

    timeline = get_timeline(client, user_a)
    assert timeline.status_code == 200
    items = timeline.json()

    # Should contain both A's post and A's retweet of B
    types = [i["type"] for i in items]
    contents = [i["post"]["content"] for i in items]

    assert "posts" in types
    assert "retweets" in types
    assert "post from A" in contents
    assert "post from B" in contents

    # Newest activity should be the retweet (type=retweets)
    assert items[0]["type"] == "retweets"
