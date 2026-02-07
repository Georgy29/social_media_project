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


def create_comment(
    client,
    token: str,
    post_id: int,
    content: str,
    parent_id: int | None = None,
    reply_to_comment_id: int | None = None,
    reply_to_user_id: int | None = None,
):
    payload = {"content": content}
    if parent_id is not None:
        payload["parent_id"] = parent_id
    if reply_to_comment_id is not None:
        payload["reply_to_comment_id"] = reply_to_comment_id
    if reply_to_user_id is not None:
        payload["reply_to_user_id"] = reply_to_user_id

    return client.post(
        f"/posts/{post_id}/comments",
        json=payload,
        headers=auth_headers(token),
    )


def get_top_level_comments(client, post_id: int):
    return client.get(f"/posts/{post_id}/comments?limit=20")


def test_edit_comment_author_only_and_validation(client):
    suffix = uuid.uuid4().hex[:8]
    author = f"author_{suffix}"
    other = f"other_{suffix}"

    reg_author = register_user(client, author, f"{author}@example.com", "pass-author")
    reg_other = register_user(client, other, f"{other}@example.com", "pass-other")
    assert reg_author.status_code == 200
    assert reg_other.status_code == 200

    token_author = login_user(client, author, "pass-author").json()["access_token"]
    token_other = login_user(client, other, "pass-other").json()["access_token"]

    post = create_post(client, token_author, "post for comments")
    assert post.status_code == 200
    post_id = post.json()["id"]

    created = create_comment(client, token_author, post_id, "  initial comment  ")
    assert created.status_code == 200
    assert created.json()["content"] == "initial comment"
    comment_id = created.json()["id"]

    forbidden_edit = client.patch(
        f"/comments/{comment_id}",
        json={"content": "not allowed"},
        headers=auth_headers(token_other),
    )
    assert forbidden_edit.status_code == 403

    bad_edit = client.patch(
        f"/comments/{comment_id}",
        json={"content": "   "},
        headers=auth_headers(token_author),
    )
    assert bad_edit.status_code == 400

    updated = client.patch(
        f"/comments/{comment_id}",
        json={"content": "  updated content  "},
        headers=auth_headers(token_author),
    )
    assert updated.status_code == 200
    assert updated.json()["content"] == "updated content"


def test_like_unlike_comment_idempotent_and_counts(client):
    suffix = uuid.uuid4().hex[:8]
    author = f"author_{suffix}"
    liker = f"liker_{suffix}"

    reg_author = register_user(client, author, f"{author}@example.com", "pass-author")
    reg_liker = register_user(client, liker, f"{liker}@example.com", "pass-liker")
    assert reg_author.status_code == 200
    assert reg_liker.status_code == 200

    token_author = login_user(client, author, "pass-author").json()["access_token"]
    token_liker = login_user(client, liker, "pass-liker").json()["access_token"]

    post = create_post(client, token_author, "post for likes")
    assert post.status_code == 200
    post_id = post.json()["id"]

    created = create_comment(client, token_author, post_id, "like me")
    assert created.status_code == 200
    comment_id = created.json()["id"]

    like_1 = client.post(
        f"/comments/{comment_id}/like",
        headers=auth_headers(token_liker),
    )
    like_2 = client.post(
        f"/comments/{comment_id}/like",
        headers=auth_headers(token_liker),
    )
    assert like_1.status_code == 204
    assert like_2.status_code == 204

    listed_after_like = get_top_level_comments(client, post_id)
    assert listed_after_like.status_code == 200
    liked_comment = listed_after_like.json()["items"][0]
    assert liked_comment["id"] == comment_id
    assert liked_comment["like_count"] == 1

    unlike_1 = client.delete(
        f"/comments/{comment_id}/like",
        headers=auth_headers(token_liker),
    )
    unlike_2 = client.delete(
        f"/comments/{comment_id}/like",
        headers=auth_headers(token_liker),
    )
    assert unlike_1.status_code == 204
    assert unlike_2.status_code == 204

    listed_after_unlike = get_top_level_comments(client, post_id)
    assert listed_after_unlike.status_code == 200
    unliked_comment = listed_after_unlike.json()["items"][0]
    assert unliked_comment["id"] == comment_id
    assert unliked_comment["like_count"] == 0


def test_like_unlike_missing_comment_returns_not_found(client):
    suffix = uuid.uuid4().hex[:8]
    username = f"user_{suffix}"

    reg = register_user(client, username, f"{username}@example.com", "pass")
    assert reg.status_code == 200
    token = login_user(client, username, "pass").json()["access_token"]

    like_res = client.post(
        "/comments/999999/like",
        headers=auth_headers(token),
    )
    unlike_res = client.delete(
        "/comments/999999/like",
        headers=auth_headers(token),
    )
    assert like_res.status_code == 404
    assert unlike_res.status_code == 404
