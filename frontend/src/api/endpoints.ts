import type { components, operations, paths } from "./types";

import { apiFetch } from "./client";

type Token = components["schemas"]["Token"];
type User = components["schemas"]["User"];
type UserCreate = components["schemas"]["UserCreate"];
type UserProfile = components["schemas"]["UserProfile"];
type UserProfileUpdate = components["schemas"]["UserProfileUpdate"];
type AvatarUpdate = components["schemas"]["AvatarUpdate"];
type CoverUpdate = components["schemas"]["CoverUpdate"];
type Post = components["schemas"]["Post"];
type PostCreate = components["schemas"]["PostCreate"];
type PostUpdate = components["schemas"]["PostUpdate"];
type PostWithCounts = components["schemas"]["PostWithCounts"];
type MediaPresignRequest = components["schemas"]["MediaPresignRequest"];
type MediaPresignResponse = components["schemas"]["MediaPresignResponse"];
type MediaCompleteResponse = components["schemas"]["MediaCompleteResponse"];

type FeedQuery =
  operations["read_posts_with_counts_posts_with_counts__get"]["parameters"]["query"];
type TimelineQuery =
  operations["get_user_timeline_users__username__timeline_get"]["parameters"]["query"];

export async function registerUser(payload: UserCreate): Promise<User> {
  return apiFetch<User>("/users/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function loginUser(
  username: string,
  password: string,
): Promise<Token> {
  const body = new URLSearchParams();
  body.set("username", username);
  body.set("password", password);

  return apiFetch<Token>("/token", {
    method: "POST",
    auth: false,
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
}

export async function getMe(): Promise<User> {
  return apiFetch<User>("/users/me");
}

export async function getUserProfile(username: string): Promise<UserProfile> {
  return apiFetch<UserProfile>(`/users/${encodeURIComponent(username)}`);
}

export async function updateProfile(payload: UserProfileUpdate): Promise<User> {
  return apiFetch<User>("/users/me/profile", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function getUserTimeline(
  username: string,
  params: TimelineQuery = {},
): Promise<
  paths["/users/{username}/timeline"]["get"]["responses"][200]["content"]["application/json"]
> {
  const search = new URLSearchParams();
  if (params?.skip !== undefined) search.set("skip", String(params.skip));
  if (params?.limit !== undefined) search.set("limit", String(params.limit));

  const query = search.toString();
  const path = query
    ? `/users/${encodeURIComponent(username)}/timeline?${query}`
    : `/users/${encodeURIComponent(username)}/timeline`;

  return apiFetch<
    paths["/users/{username}/timeline"]["get"]["responses"][200]["content"]["application/json"]
  >(path);
}

export async function getFeed(
  params: FeedQuery = {},
): Promise<PostWithCounts[]> {
  const search = new URLSearchParams();
  if (params?.skip !== undefined) search.set("skip", String(params.skip));
  if (params?.limit !== undefined) search.set("limit", String(params.limit));
  if (params?.view) search.set("view", params.view);

  const query = search.toString();
  const path = query ? `/posts/with_counts/?${query}` : "/posts/with_counts/";

  return apiFetch<
    paths["/posts/with_counts/"]["get"]["responses"][200]["content"]["application/json"]
  >(path);
}

export async function createPost(payload: PostCreate): Promise<Post> {
  return apiFetch<Post>("/posts/", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updatePost(
  postId: number,
  payload: PostUpdate,
): Promise<Post> {
  return apiFetch<Post>(`/posts/${postId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deletePost(postId: number): Promise<void> {
  return apiFetch<void>(`/posts/${postId}`, {
    method: "DELETE",
  });
}

export async function likePost(postId: number): Promise<void> {
  return apiFetch<void>(`/posts/${postId}/like`, { method: "POST" });
}

export async function unlikePost(postId: number): Promise<void> {
  return apiFetch<void>(`/posts/${postId}/unlike`, { method: "POST" });
}

export async function retweetPost(postId: number): Promise<void> {
  return apiFetch<void>(`/posts/${postId}/retweet`, { method: "POST" });
}

export async function unretweetPost(postId: number): Promise<void> {
  return apiFetch<void>(`/posts/${postId}/unretweet`, { method: "POST" });
}

export async function presignMedia(
  payload: MediaPresignRequest,
): Promise<MediaPresignResponse> {
  return apiFetch<MediaPresignResponse>("/media/presign", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function completeMedia(
  mediaId: number,
): Promise<MediaCompleteResponse> {
  return apiFetch<MediaCompleteResponse>(`/media/${mediaId}/complete`, {
    method: "POST",
  });
}

export async function updateAvatar(payload: AvatarUpdate): Promise<User> {
  return apiFetch<User>("/users/me/avatar", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function updateCover(payload: CoverUpdate): Promise<User> {
  return apiFetch<User>("/users/me/cover", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function followUser(userId: number): Promise<void> {
  return apiFetch<void>(`/users/${userId}/follow`, { method: "POST" });
}

export async function unfollowUser(userId: number): Promise<void> {
  return apiFetch<void>(`/users/${userId}/unfollow`, { method: "POST" });
}
