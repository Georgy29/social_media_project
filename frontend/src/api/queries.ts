import {
  keepPreviousData,
  type InfiniteData,
  type QueryKey,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import type { components, operations } from "./types";

import {
  createComment,
  createPost,
  deleteComment,
  deletePost,
  addBookmark,
  removeBookmark,
  followUser,
  getFeed,
  getBookmarks,
  getMe,
  getMutualsPreview,
  getPostWithCounts,
  getSuggestions,
  getUserProfile,
  getUserTimeline,
  likeComment,
  likePost,
  listReplies,
  listTopLevelComments,
  loginUser,
  presignMedia,
  completeMedia,
  registerUser,
  retweetPost,
  unlikeComment,
  unlikePost,
  unretweetPost,
  unfollowUser,
  updateComment,
  updateProfile,
  updatePost,
  updateAvatar,
  updateCover,
} from "./endpoints";
import { clearToken, getToken, setToken, toApiError, type ApiError } from "./client";

type Token = components["schemas"]["Token"];
type User = components["schemas"]["User"];
type UserCreate = components["schemas"]["UserCreate"];
type UserProfile = components["schemas"]["UserProfile"];
type UserProfileUpdate = components["schemas"]["UserProfileUpdate"];
type MutualsPreview = components["schemas"]["MutualsPreview"];
type SuggestionsResponse = components["schemas"]["SuggestionsResponse"];
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
type AvatarUpdate = components["schemas"]["AvatarUpdate"];
type CoverUpdate = components["schemas"]["CoverUpdate"];
type TimelineItem = components["schemas"]["TimelineItem"];

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
type CommentsListParams = Omit<CommentsQuery, "cursor">;
type RepliesListParams = Omit<RepliesQuery, "cursor">;

export const queryKeys = {
  me: ["me"] as const,
  profile: {
    root: ["profile"] as const,
    detail: (username: string) => ["profile", username] as const,
  },
  timeline: {
    root: ["timeline"] as const,
    list: (username: string, params: TimelineQuery) =>
      ["timeline", username, params] as const,
  },
  mutualsPreview: {
    root: ["mutuals-preview"] as const,
    detail: (username: string, params: MutualsPreviewQuery) =>
      ["mutuals-preview", username, params] as const,
  },
  suggestions: {
    root: ["suggestions"] as const,
    list: (params: SuggestionsQuery) => ["suggestions", params] as const,
  },
  feed: {
    root: ["feed"] as const,
    list: (params: FeedQuery) => ["feed", params] as const,
  },
  post: {
    root: ["post"] as const,
    detail: (postId: number) => ["post", postId] as const,
  },
  bookmarks: {
    root: ["bookmarks"] as const,
    list: (params: BookmarksQuery) => ["bookmarks", params] as const,
  },
  comments: {
    root: ["comments"] as const,
    detail: (postId: number) => ["comments", postId] as const,
    list: (postId: number, params: CommentsListParams) =>
      ["comments", postId, params] as const,
  },
  replies: {
    root: ["replies"] as const,
    detail: (commentId: number) => ["replies", commentId] as const,
    list: (commentId: number, params: RepliesListParams) =>
      ["replies", commentId, params] as const,
  },
} as const;

function updateCommentInInfiniteData(
  data: InfiniteData<CommentListResponse> | undefined,
  commentId: number,
  isLiked: boolean,
) {
  if (!data) return data;

  return {
    ...data,
    pages: data.pages.map((page) => ({
      ...page,
      items: page.items.map((item) => {
        if (item.id !== commentId) return item;
        const nextIsLiked = !isLiked;
        const nextLikeCount = isLiked
          ? Math.max(item.like_count - 1, 0)
          : item.like_count + 1;
        return {
          ...item,
          is_liked: nextIsLiked,
          like_count: nextLikeCount,
        };
      }),
    })),
  };
}

export function useMeQuery() {
  const queryClient = useQueryClient();

  return useQuery<User, ApiError>({
    queryKey: queryKeys.me,
    queryFn: async () => {
      try {
        return await getMe();
      } catch (e) {
        const err = toApiError(e);
        if (err.status === 401) {
          clearToken();
          queryClient.removeQueries({ queryKey: queryKeys.me });
          queryClient.removeQueries({ queryKey: queryKeys.feed.root });
        }
        throw err;
      }
    },
    enabled: Boolean(getToken()),
    retry: false,
  });
}

export function useLoginMutation() {
  const queryClient = useQueryClient();

  return useMutation<Token, ApiError, { username: string; password: string }>({
    mutationFn: ({ username, password }) => loginUser(username, password),
    onSuccess: (token) => {
      queryClient.clear();
      setToken(token.access_token);
      void queryClient.invalidateQueries({ queryKey: queryKeys.me });
      void queryClient.invalidateQueries({ queryKey: queryKeys.feed.root });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return () => {
    clearToken();
    queryClient.clear();
  };
}

export function useRegisterMutation() {
  return useMutation<User, ApiError, UserCreate>({
    mutationFn: registerUser, // add on success later?
  });
}

export function useFeedQuery(params: FeedQuery = {}) {
  return useQuery<PostWithCounts[], ApiError>({
    queryKey: queryKeys.feed.list(params),
    queryFn: () => getFeed(params),
    enabled: Boolean(getToken()),
    placeholderData: keepPreviousData,
  });
}

export function usePostWithCountsQuery(postId?: number) {
  const queryClient = useQueryClient();

  return useQuery<PostWithCounts, ApiError>({
    queryKey: queryKeys.post.detail(postId ?? 0),
    queryFn: () => getPostWithCounts(postId ?? 0),
    enabled: typeof postId === "number",
    initialData: () => {
      if (typeof postId !== "number") return undefined;

      const feedData = queryClient.getQueriesData<PostWithCounts[]>({
        queryKey: queryKeys.feed.root,
      });
      for (const [, posts] of feedData) {
        const found = posts?.find((post) => post.id === postId);
        if (found) return found;
      }

      const bookmarkData = queryClient.getQueriesData<PostWithCounts[]>({
        queryKey: queryKeys.bookmarks.root,
      });
      for (const [, posts] of bookmarkData) {
        const found = posts?.find((post) => post.id === postId);
        if (found) return found;
      }

      return undefined;
    },
  });
}

export function useBookmarksQuery(params: BookmarksQuery = {}) {
  return useQuery<PostWithCounts[], ApiError>({
    queryKey: queryKeys.bookmarks.list(params),
    queryFn: () => getBookmarks(params),
    enabled: Boolean(getToken()),
    placeholderData: keepPreviousData,
  });
}

export function useTopLevelCommentsQuery(
  postId?: number,
  params: CommentsListParams = {},
) {
  return useInfiniteQuery<CommentListResponse, ApiError>({
    queryKey: queryKeys.comments.list(postId ?? 0, params),
    queryFn: ({ pageParam }) =>
      listTopLevelComments(postId ?? 0, {
        ...params,
        cursor: typeof pageParam === "string" ? pageParam : undefined,
      }),
    enabled: typeof postId === "number",
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
  });
}

export function useRepliesQuery(commentId?: number, params: RepliesListParams = {}) {
  return useInfiniteQuery<CommentListResponse, ApiError>({
    queryKey: queryKeys.replies.list(commentId ?? 0, params),
    queryFn: ({ pageParam }) =>
      listReplies(commentId ?? 0, {
        ...params,
        cursor: typeof pageParam === "string" ? pageParam : undefined,
      }),
    enabled: typeof commentId === "number",
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.next_cursor ?? undefined,
  });
}

export function useUserProfileQuery(
  username?: string,
  options?: { enabled?: boolean; staleTime?: number },
) {
  const enabled = options?.enabled ?? true;

  return useQuery<UserProfile, ApiError>({
    queryKey: queryKeys.profile.detail(username ?? ""),
    queryFn: () => getUserProfile(username ?? ""),
    enabled: Boolean(username) && enabled,
    staleTime: options?.staleTime,
  });
}

export function useUserTimelineQuery(
  username?: string,
  params: TimelineQuery = {},
) {
  return useQuery<TimelineItem[], ApiError>({
    queryKey: queryKeys.timeline.list(username ?? "", params),
    queryFn: () => getUserTimeline(username ?? "", params),
    enabled: Boolean(username),
    placeholderData: keepPreviousData,
  });
}

export function useMutualsPreviewQuery(
  username?: string,
  params: MutualsPreviewQuery = {},
  options?: { enabled?: boolean; staleTime?: number },
) {
  const enabled = options?.enabled ?? true;

  return useQuery<MutualsPreview, ApiError>({
    queryKey: queryKeys.mutualsPreview.detail(username ?? "", params),
    queryFn: () => getMutualsPreview(username ?? "", params),
    enabled: Boolean(username) && Boolean(getToken()) && enabled,
    staleTime: options?.staleTime ?? 60_000,
  });
}

export function useSuggestionsQuery(
  params: SuggestionsQuery = {},
  options?: { enabled?: boolean; staleTime?: number },
) {
  const enabled = options?.enabled ?? true;

  return useQuery<SuggestionsResponse, ApiError>({
    queryKey: queryKeys.suggestions.list(params),
    queryFn: () => getSuggestions(params),
    enabled: Boolean(getToken()) && enabled,
    staleTime: options?.staleTime ?? 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useCreatePostMutation() {
  const queryClient = useQueryClient();

  return useMutation<Post, ApiError, PostCreate>({
    mutationFn: createPost,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.feed.root });
      void queryClient.invalidateQueries({ queryKey: queryKeys.timeline.root });
    },
  });
}

export function useUpdatePostMutation() {
  const queryClient = useQueryClient();

  return useMutation<Post, ApiError, { postId: number; payload: PostUpdate }>({
    mutationFn: ({ postId, payload }) => updatePost(postId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.feed.root });
      void queryClient.invalidateQueries({ queryKey: queryKeys.timeline.root });
    },
  });
}

export function useDeletePostMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, { postId: number }>({
    mutationFn: ({ postId }) => deletePost(postId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.feed.root });
      void queryClient.invalidateQueries({ queryKey: queryKeys.timeline.root });
    },
  });
}

export function useToggleLikeMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, { postId: number; isLiked: boolean }>({
    mutationFn: async ({ postId, isLiked }) => {
      if (isLiked) {
        await unlikePost(postId);
      } else {
        await likePost(postId);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.feed.root });
      void queryClient.invalidateQueries({ queryKey: queryKeys.timeline.root });
    },
  });
}

export function useToggleRetweetMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, { postId: number; isRetweeted: boolean }>({
    mutationFn: async ({ postId, isRetweeted }) => {
      if (isRetweeted) {
        await unretweetPost(postId);
      } else {
        await retweetPost(postId);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.feed.root });
      void queryClient.invalidateQueries({ queryKey: queryKeys.timeline.root });
    },
  });
}

export function useToggleBookmarkMutation() {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, { postId: number; nextState: boolean }>({
    mutationFn: async ({ postId, nextState }) => {
      if (nextState) {
        await addBookmark(postId);
      } else {
        await removeBookmark(postId);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.feed.root });
      void queryClient.invalidateQueries({ queryKey: queryKeys.timeline.root });
      void queryClient.invalidateQueries({
        queryKey: queryKeys.bookmarks.root,
      });
    },
  });
}

export function useCreateCommentMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    CommentResponse,
    ApiError,
    { postId: number; payload: CommentCreate }
  >({
    mutationFn: ({ postId, payload }) => createComment(postId, payload),
    onSuccess: (comment) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.comments.detail(comment.post_id),
      });
      if (comment.parent_id != null) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.replies.detail(comment.parent_id),
        });
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.feed.root });
    },
  });
}

export function useUpdateCommentMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    CommentResponse,
    ApiError,
    { commentId: number; payload: CommentUpdate }
  >({
    mutationFn: ({ commentId, payload }) => updateComment(commentId, payload),
    onSuccess: (comment) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.comments.detail(comment.post_id),
      });
      if (comment.parent_id != null) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.replies.detail(comment.parent_id),
        });
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.feed.root });
    },
  });
}

export function useDeleteCommentMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    ApiError,
    { commentId: number; postId: number; parentId?: number | null }
  >({
    mutationFn: ({ commentId }) => deleteComment(commentId),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.comments.detail(variables.postId),
      });
      if (variables.parentId != null) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.replies.detail(variables.parentId),
        });
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.feed.root });
    },
  });
}

export function useToggleCommentLikeMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    ApiError,
    {
      commentId: number;
      postId: number;
      parentId?: number | null;
      isLiked: boolean;
    },
    {
      previousComments: [QueryKey, InfiniteData<CommentListResponse> | undefined][];
      previousReplies: [QueryKey, InfiniteData<CommentListResponse> | undefined][];
    }
  >({
    mutationFn: async ({ commentId, isLiked }) => {
      if (isLiked) {
        await unlikeComment(commentId);
      } else {
        await likeComment(commentId);
      }
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({
        queryKey: queryKeys.comments.detail(variables.postId),
      });

      const previousComments =
        queryClient.getQueriesData<InfiniteData<CommentListResponse>>({
          queryKey: queryKeys.comments.detail(variables.postId),
        });

      for (const [key] of previousComments) {
        queryClient.setQueryData<InfiniteData<CommentListResponse>>(key, (oldData) =>
          updateCommentInInfiniteData(
            oldData,
            variables.commentId,
            variables.isLiked,
          ),
        );
      }

      let previousReplies: [
        QueryKey,
        InfiniteData<CommentListResponse> | undefined,
      ][] = [];
      if (variables.parentId != null) {
        await queryClient.cancelQueries({
          queryKey: queryKeys.replies.detail(variables.parentId),
        });
        previousReplies =
          queryClient.getQueriesData<InfiniteData<CommentListResponse>>({
            queryKey: queryKeys.replies.detail(variables.parentId),
          });

        for (const [key] of previousReplies) {
          queryClient.setQueryData<InfiniteData<CommentListResponse>>(
            key,
            (oldData) =>
              updateCommentInInfiniteData(
                oldData,
                variables.commentId,
                variables.isLiked,
              ),
          );
        }
      }

      return {
        previousComments,
        previousReplies,
      };
    },
    onError: (_error, _variables, context) => {
      if (!context) return;

      for (const [key, data] of context.previousComments) {
        queryClient.setQueryData(key, data);
      }
      for (const [key, data] of context.previousReplies) {
        queryClient.setQueryData(key, data);
      }
    },
    onSettled: (_data, _error, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.comments.detail(variables.postId),
      });
      if (variables.parentId != null) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.replies.detail(variables.parentId),
        });
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.feed.root });
    },
  });
}

export function usePresignMediaMutation() {
  return useMutation<MediaPresignResponse, ApiError, MediaPresignRequest>({
    mutationFn: presignMedia,
  });
}

export function useCompleteMediaMutation() {
  return useMutation<MediaCompleteResponse, ApiError, { mediaId: number }>({
    mutationFn: ({ mediaId }) => completeMedia(mediaId),
  });
}

export function useUpdateAvatarMutation() {
  const queryClient = useQueryClient();

  return useMutation<User, ApiError, AvatarUpdate>({
    mutationFn: updateAvatar,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.me });
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile.root });
    },
  });
}

export function useUpdateCoverMutation() {
  const queryClient = useQueryClient();

  return useMutation<User, ApiError, CoverUpdate>({
    mutationFn: updateCover,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.me });
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile.root });
    },
  });
}

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient();

  return useMutation<User, ApiError, UserProfileUpdate>({
    mutationFn: updateProfile,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.me });
      void queryClient.invalidateQueries({ queryKey: queryKeys.profile.root });
    },
  });
}

export function useToggleFollowMutation() {
  const queryClient = useQueryClient();

  return useMutation<
    void,
    ApiError,
    { userId: number; username: string; isFollowed: boolean }
  >({
    mutationFn: async ({ userId, isFollowed }) => {
      if (isFollowed) {
        await unfollowUser(userId);
      } else {
        await followUser(userId);
      }
    },
    onSuccess: (_data, variables) => {
      toast.success(variables.isFollowed ? "Unfollowed" : "Followed");
      void queryClient.invalidateQueries({
        queryKey: queryKeys.profile.detail(variables.username),
      });
    },
  });
}
