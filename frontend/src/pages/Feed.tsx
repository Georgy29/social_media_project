import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { CreatePost } from "@/components/CreatePost"
import { PostCard } from "@/components/PostCard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

import { type ApiError } from "@/api/client"
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
  const isRefreshing = feedQuery.isFetching && !feedQuery.isPending

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
          createPostMutation.mutate(
            { content },
            {
              onSuccess: () => toast.success("Posted"),
              onError: (e: ApiError) => toast.error(e.message),
            },
          )
        }}
      />

      {feedQuery.isPending ? (
        <FeedSkeleton />
      ) : feedQuery.isError ? (
        <div className="border-destructive/30 bg-destructive/10 rounded-md border p-4 text-center">
          <div className="text-destructive font-medium">Couldn’t load feed</div>
          <div className="text-muted-foreground mt-1 text-sm">
            {feedQuery.error.message}
          </div>
          <Button
            className="mt-3"
            variant="outline"
            onClick={() => feedQuery.refetch()}
          >
            Retry
          </Button>
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
              onUpdate={async (postId, content) => {
                try {
                  await updatePostMutation.mutateAsync({
                    postId,
                    payload: { content },
                  })
                  toast.success("Updated")
                } catch (e) {
                  const error = e as ApiError
                  toast.error(error.message)
                  throw e
                }
              }}
              onDelete={async (postId) => {
                try {
                  await deletePostMutation.mutateAsync({ postId })
                  toast.success("Deleted")
                } catch (e) {
                  const error = e as ApiError
                  toast.error(error.message)
                  throw e
                }
              }}
            />
          ))}
        </div>
      ) : (
        <div className="text-muted-foreground py-8 text-center">
          No posts yet. Create your first post above.
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
        <div className="text-muted-foreground text-sm">
          Page {page + 1}
          {isRefreshing ? " • Refreshing…" : ""}
        </div>
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

function FeedSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="animate-pulse">
          <CardHeader className="space-y-2">
            <div className="bg-muted h-4 w-32 rounded" />
            <div className="bg-muted h-3 w-24 rounded" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="bg-muted h-3 w-full rounded" />
            <div className="bg-muted h-3 w-5/6 rounded" />
            <div className="mt-4 flex gap-2">
              <div className="bg-muted h-8 w-20 rounded" />
              <div className="bg-muted h-8 w-20 rounded" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
