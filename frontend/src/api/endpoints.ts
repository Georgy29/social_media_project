import type { components, operations, paths } from "./types";

import { apiFetch } from "./client";

type Token = components["schemas"]["Token"];
type User = components["schemas"]["User"];
type UserCreate = components["schemas"]["UserCreate"];
type UserProfile = components["schemas"]["UserProfile"];
type UserProfileUpdate = components["schemas"]["UserProfileUpdate"];
type MutualsPreview = components["schemas"]["MutualsPreview"];
type SuggestionsResponse = components["schemas"]["SuggestionsResponse"];
type AvatarUpdate = components["schemas"]["AvatarUpdate"];
type CoverUpdate = components["schemas"]["CoverUpdate"];
type Post = components["schemas"]["Post"];
type PostCreate = components["schemas"]["PostCreate"];
type PostUpdate = components["schemas"]["PostUpdate"];
type PostWithCounts = components["schemas"]["PostWithCounts"];
type CommentCreate = components["schemas"]["CommentCreate"];
type CommentUpdate = components["schemas"]["CommentUpdate"];
type CommentResponse = components["schemas"]["CommentResponse"];
type CommentListResponse = components["schemas"]["CommentListResponse"];
type MediaPresignRequest = components["schemas"]["MediaPresignRequest"];
type MediaPresignResponse = components["schemas"]["MediaPresignResponse"];
type MediaCompleteResponse = components["schemas"]["MediaCompleteResponse"];

type FeedQuery =
  operations["read_posts_with_counts_posts_with_counts__get"]["parameters"]["query"];
type TimelineQuery =
  operations["get_user_timeline_users__username__timeline_get"]["parameters"]["query"];
type BookmarksQuery =
  operations["list_bookmarks_bookmarks__get"]["parameters"]["query"];
type MutualsPreviewQuery =
  operations["get_mutuals_preview_users__username__mutuals_preview_get"]["parameters"]["query"];
type SuggestionsQuery =
  operations["get_suggestions_users_discover_suggestions_get"]["parameters"]["query"];
type CommentsQuery =
  operations["list_top_level_comments_posts__post_id__comments_get"]["parameters"]["query"];
type RepliesQuery =
  operations["list_replies_comments__comment_id__replies_get"]["parameters"]["query"];

function withQuery(
  path: string,
  params: Record<string, string | number | boolean | null | undefined>,
): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    search.set(key, String(value));
  }

  const query = search.toString();
  return query ? `${path}?${query}` : path;
}

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
  const path = withQuery(`/users/${encodeURIComponent(username)}/timeline`, {
    skip: params?.skip,
    limit: params?.limit,
  });

  return apiFetch<
    paths["/users/{username}/timeline"]["get"]["responses"][200]["content"]["application/json"]
  >(path);
}

export async function getMutualsPreview(
  username: string,
  params: MutualsPreviewQuery = {},
): Promise<MutualsPreview> {
  const path = withQuery(
    `/users/${encodeURIComponent(username)}/mutuals/preview`,
    {
      limit: params?.limit,
    },
  );

  return apiFetch<MutualsPreview>(path);
}

export async function getSuggestions(
  params: SuggestionsQuery = {},
): Promise<SuggestionsResponse> {
  const path = withQuery("/users/discover/suggestions", {
    limit: params?.limit,
  });

  return apiFetch<SuggestionsResponse>(path);
}

export async function getFeed(
  params: FeedQuery = {},
): Promise<PostWithCounts[]> {
  const path = withQuery("/posts/with_counts/", {
    skip: params?.skip,
    limit: params?.limit,
    view: params?.view,
  });

  return apiFetch<
    paths["/posts/with_counts/"]["get"]["responses"][200]["content"]["application/json"]
  >(path);
}

export async function getPostWithCounts(
  postId: number,
): Promise<PostWithCounts> {
  return apiFetch<
    paths["/posts/{post_id}/with_counts"]["get"]["responses"][200]["content"]["application/json"]
  >(`/posts/${postId}/with_counts`);
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

export async function addBookmark(postId: number): Promise<void> {
  return apiFetch<void>(`/bookmarks/${postId}`, { method: "POST" });
}

export async function removeBookmark(postId: number): Promise<void> {
  return apiFetch<void>(`/bookmarks/${postId}`, { method: "DELETE" });
}

export async function getBookmarks(
  params: BookmarksQuery = {},
): Promise<PostWithCounts[]> {
  const path = withQuery("/bookmarks/", {
    skip: params?.skip,
    limit: params?.limit,
  });

  return apiFetch<
    paths["/bookmarks/"]["get"]["responses"][200]["content"]["application/json"]
  >(path);
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

export async function createComment(
  postId: number,
  payload: CommentCreate,
): Promise<CommentResponse> {
  return apiFetch<CommentResponse>(`/posts/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function listTopLevelComments(
  postId: number,
  params: CommentsQuery = {},
): Promise<CommentListResponse> {
  const path = withQuery(`/posts/${postId}/comments`, {
    limit: params?.limit,
    cursor: params?.cursor,
  });

  return apiFetch<CommentListResponse>(path);
}

export async function listReplies(
  commentId: number,
  params: RepliesQuery = {},
): Promise<CommentListResponse> {
  const path = withQuery(`/comments/${commentId}/replies`, {
    limit: params?.limit,
    cursor: params?.cursor,
  });

  return apiFetch<CommentListResponse>(path);
}

export async function updateComment(
  commentId: number,
  payload: CommentUpdate,
): Promise<CommentResponse> {
  return apiFetch<CommentResponse>(`/comments/${commentId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteComment(commentId: number): Promise<void> {
  return apiFetch<void>(`/comments/${commentId}`, { method: "DELETE" });
}

export async function likeComment(commentId: number): Promise<void> {
  return apiFetch<void>(`/comments/${commentId}/like`, { method: "POST" });
}

export async function unlikeComment(commentId: number): Promise<void> {
  return apiFetch<void>(`/comments/${commentId}/like`, { method: "DELETE" });
}
