import type { components, operations, paths } from './types'

import { apiFetch } from './client'

type Token = components['schemas']['Token']
type User = components['schemas']['User']
type UserCreate = components['schemas']['UserCreate']
type Post = components['schemas']['Post']
type PostCreate = components['schemas']['PostCreate']
type PostUpdate = components['schemas']['PostUpdate']
type PostWithCounts = components['schemas']['PostWithCounts']

type FeedQuery =
  operations['read_posts_with_counts_posts_with_counts__get']['parameters']['query']

export async function registerUser(payload: UserCreate): Promise<User> {
  return apiFetch<User>('/users/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function loginUser(
  username: string,
  password: string,
): Promise<Token> {
  const body = new URLSearchParams()
  body.set('username', username)
  body.set('password', password)

  return apiFetch<Token>('/token', {
    method: 'POST',
    auth: false,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  })
}

export async function getMe(): Promise<User> {
  return apiFetch<User>('/users/me')
}

export async function getFeed(
  params: FeedQuery = {},
): Promise<PostWithCounts[]> {
  const search = new URLSearchParams()
  if (params?.skip !== undefined) search.set('skip', String(params.skip))
  if (params?.limit !== undefined) search.set('limit', String(params.limit))

  const query = search.toString()
  const path = query ? `/posts/with_counts/?${query}` : '/posts/with_counts/'

  return apiFetch<
    paths['/posts/with_counts/']['get']['responses'][200]['content']['application/json']
  >(path)
}

export async function createPost(payload: PostCreate): Promise<Post> {
  return apiFetch<Post>('/posts/', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updatePost(
  postId: number,
  payload: PostUpdate,
): Promise<Post> {
  return apiFetch<Post>(`/posts/${postId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deletePost(postId: number): Promise<void> {
  return apiFetch<void>(`/posts/${postId}`, {
    method: 'DELETE',
  })
}

export async function likePost(postId: number): Promise<void> {
  return apiFetch<void>(`/posts/${postId}/like`, { method: 'POST' })
}

export async function unlikePost(postId: number): Promise<void> {
  return apiFetch<void>(`/posts/${postId}/unlike`, { method: 'POST' })
}

export async function retweetPost(postId: number): Promise<void> {
  return apiFetch<void>(`/posts/${postId}/retweet`, { method: 'POST' })
}

export async function unretweetPost(postId: number): Promise<void> {
  return apiFetch<void>(`/posts/${postId}/unretweet`, { method: 'POST' })
}
