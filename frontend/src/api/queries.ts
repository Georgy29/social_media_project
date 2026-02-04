import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

import type { components, operations } from "./types";

import {
  createPost,
  deletePost,
  addBookmark,
  removeBookmark,
  followUser,
  getFeed,
  getBookmarks,
  getMe,
  getMutualsPreview,
  getSuggestions,
  getUserProfile,
  getUserTimeline,
  likePost,
  loginUser,
  presignMedia,
  completeMedia,
  registerUser,
  retweetPost,
  unlikePost,
  unretweetPost,
  unfollowUser,
  updateProfile,
  updatePost,
  updateAvatar,
  updateCover,
} from "./endpoints";
import { clearToken, getToken, setToken, type ApiError } from "./client";

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
  bookmarks: {
    root: ["bookmarks"] as const,
    list: (params: BookmarksQuery) => ["bookmarks", params] as const,
  },
} as const;

export function useMeQuery() {
  const queryClient = useQueryClient();

  return useQuery<User, ApiError>({
    queryKey: queryKeys.me,
    queryFn: async () => {
      try {
        return await getMe();
      } catch (e) {
        const err = e as ApiError;
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

export function useBookmarksQuery(params: BookmarksQuery = {}) {
  return useQuery<PostWithCounts[], ApiError>({
    queryKey: queryKeys.bookmarks.list(params),
    queryFn: () => getBookmarks(params),
    enabled: Boolean(getToken()),
    placeholderData: keepPreviousData,
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
