import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

import { CreatePost } from "@/components/CreatePost"
import { PostCard } from "@/components/PostCard"
import { Button } from "@/components/ui/button"

import {
  useCreatePostMutation,
  useDeletePostMutation,
  useFeedQuery,
  useLogout,
  useMeQuery,
  useToggleLikeMutation,
  useToggleRetweetMutation,
  useUpdatePostMutation,
} from "@/api/queries"

export default function FeedPage() {
  const navigate = useNavigate()
  const logout = useLogout()
  const meQuery = useMeQuery()

  const [page, setPage] = useState(0)
  const limit = 10
  const params = useMemo(
    () => ({ skip: page * limit, limit }),
    [page, limit],
  )

  const feedQuery = useFeedQuery(params)
  const createPostMutation = useCreatePostMutation()
  const updatePostMutation = useUpdatePostMutation()
  const deletePostMutation = useDeletePostMutation()
  const toggleLikeMutation = useToggleLikeMutation()
  const toggleRetweetMutation = useToggleRetweetMutation()

  const isMutating =
    createPostMutation.isPending ||
    updatePostMutation.isPending ||
    deletePostMutation.isPending ||
    toggleLikeMutation.isPending ||
    toggleRetweetMutation.isPending

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-xl font-semibold">Feed</div>
          <div className="text-muted-foreground text-sm">
            {meQuery.data ? `Logged in as @${meQuery.data.username}` : null}
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            logout()
            navigate("/login", { replace: true })
          }}
        >
          Logout
        </Button>
      </div>

      <CreatePost
        pending={createPostMutation.isPending}
        onCreate={(content) => {
          createPostMutation.mutate({ content })
        }}
      />

      {feedQuery.isPending ? (
        <div className="text-muted-foreground py-8 text-center">Loading…</div>
      ) : feedQuery.isError ? (
        <div className="text-muted-foreground py-8 text-center">
          {feedQuery.error.message}
        </div>
      ) : feedQuery.data.length ? (
        <div className="space-y-3">
          {feedQuery.data.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              pending={isMutating}
              isOwner={meQuery.data?.id === post.owner_id}
              onToggleLike={(p) =>
                toggleLikeMutation.mutate({
                  postId: p.id,
                  isLiked: p.is_liked,
                })
              }
              onToggleRetweet={(p) =>
                toggleRetweetMutation.mutate({
                  postId: p.id,
                  isRetweeted: p.is_retweeted,
                })
              }
              onUpdate={(postId, content) =>
                updatePostMutation.mutateAsync({
                  postId,
                  payload: { content },
                })
              }
              onDelete={(postId) => deletePostMutation.mutateAsync({ postId })}
            />
          ))}
        </div>
      ) : (
        <div className="text-muted-foreground py-8 text-center">
          No posts yet.
        </div>
      )}

      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          disabled={page === 0 || feedQuery.isFetching}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          Previous
        </Button>
        <div className="text-muted-foreground text-sm">Page {page + 1}</div>
        <Button
          variant="outline"
          disabled={feedQuery.isFetching || (feedQuery.data?.length ?? 0) < limit}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  )
}
