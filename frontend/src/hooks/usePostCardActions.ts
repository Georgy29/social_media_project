import { useCallback } from "react";
import { toast } from "sonner";

import type { components } from "@/api/types";
import { type ApiError } from "@/api/client";
import {
  useDeletePostMutation,
  useToggleBookmarkMutation,
  useToggleLikeMutation,
  useToggleRetweetMutation,
  useUpdatePostMutation,
} from "@/api/queries";

type PostWithCounts = components["schemas"]["PostWithCounts"];

type UsePostCardActionsOptions = {
  onDeleteSuccess?: (postId: number) => void;
};

export function usePostCardActions(options?: UsePostCardActionsOptions) {
  const updatePostMutation = useUpdatePostMutation();
  const deletePostMutation = useDeletePostMutation();
  const toggleLikeMutation = useToggleLikeMutation();
  const toggleRetweetMutation = useToggleRetweetMutation();
  const toggleBookmarkMutation = useToggleBookmarkMutation();
  const onDeleteSuccess = options?.onDeleteSuccess;

  const isPostMutating = useCallback(
    (postId: number) =>
      (updatePostMutation.isPending &&
        updatePostMutation.variables?.postId === postId) ||
      (deletePostMutation.isPending &&
        deletePostMutation.variables?.postId === postId) ||
      (toggleLikeMutation.isPending &&
        toggleLikeMutation.variables?.postId === postId) ||
      (toggleRetweetMutation.isPending &&
        toggleRetweetMutation.variables?.postId === postId) ||
      (toggleBookmarkMutation.isPending &&
        toggleBookmarkMutation.variables?.postId === postId),
    [
      updatePostMutation.isPending,
      updatePostMutation.variables?.postId,
      deletePostMutation.isPending,
      deletePostMutation.variables?.postId,
      toggleLikeMutation.isPending,
      toggleLikeMutation.variables?.postId,
      toggleRetweetMutation.isPending,
      toggleRetweetMutation.variables?.postId,
      toggleBookmarkMutation.isPending,
      toggleBookmarkMutation.variables?.postId,
    ],
  );

  const handleToggleLike = useCallback(
    (post: PostWithCounts) => {
      toggleLikeMutation.mutate({ postId: post.id, isLiked: post.is_liked });
    },
    [toggleLikeMutation],
  );

  const handleToggleRetweet = useCallback(
    (post: PostWithCounts) => {
      toggleRetweetMutation.mutate(
        { postId: post.id, isRetweeted: post.is_retweeted },
        {
          onSuccess: () => {
            toast.success(post.is_retweeted ? "Repost removed" : "Reposted");
          },
          onError: (error: ApiError) => {
            toast.error(error.message);
          },
        },
      );
    },
    [toggleRetweetMutation],
  );

  const handleToggleBookmark = useCallback(
    async (post: PostWithCounts, nextState: boolean) => {
      await toggleBookmarkMutation.mutateAsync({
        postId: post.id,
        nextState,
      });
    },
    [toggleBookmarkMutation],
  );

  const handleUpdatePost = useCallback(
    async (postId: number, content: string) => {
      try {
        await updatePostMutation.mutateAsync({
          postId,
          payload: { content },
        });
        toast.success("Updated");
      } catch (error) {
        const apiError = error as ApiError;
        toast.error(apiError.message);
        throw error;
      }
    },
    [updatePostMutation],
  );

  const handleDeletePost = useCallback(
    async (postId: number) => {
      try {
        await deletePostMutation.mutateAsync({ postId });
        toast.success("Deleted");
        onDeleteSuccess?.(postId);
      } catch (error) {
        const apiError = error as ApiError;
        toast.error(apiError.message);
        throw error;
      }
    },
    [deletePostMutation, onDeleteSuccess],
  );

  return {
    isPostMutating,
    handleToggleLike,
    handleToggleRetweet,
    handleToggleBookmark,
    handleUpdatePost,
    handleDeletePost,
  };
}
