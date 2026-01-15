import { useMemo, useState, type ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { IconHome, IconSettings, IconUser } from "@tabler/icons-react"

import { CreatePost } from "@/components/CreatePost"
import { Logo } from "@/components/Logo"
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
  const [showComposer, setShowComposer] = useState(false)

  const isMutating =
    createPostMutation.isPending ||
    updatePostMutation.isPending ||
    deletePostMutation.isPending ||
    toggleLikeMutation.isPending ||
    toggleRetweetMutation.isPending
  const isRefreshing = feedQuery.isFetching && !feedQuery.isPending

  return (
    <div className="bg-background text-foreground min-h-screen w-full">
      <div className="mx-auto grid w-full max-w-6xl gap-6 p-4 md:grid-cols-[240px_minmax(0,1fr)_240px]">
        <aside className="md:sticky md:top-4 md:h-[calc(100vh-2rem)]">
          <div className="hidden md:flex h-full flex-col gap-4">
            <div className="border-border bg-card rounded-lg border px-4 py-3">
              <Logo size="md" name="Social" />
              <div className="text-muted-foreground mt-1 text-xs">
                {meQuery.data ? `@${meQuery.data.username}` : "Welcome back"}
              </div>
            </div>
            <nav className="border-border bg-card rounded-lg border p-2">
              <Button
                className="w-full justify-start gap-2"
                variant="secondary"
                size="sm"
              >
                <IconHome className="h-4 w-4" aria-hidden="true" />
                Feed
              </Button>
              <Button
                className="mt-1 w-full justify-start gap-2"
                variant="ghost"
                size="sm"
              >
                <IconUser className="h-4 w-4" aria-hidden="true" />
                Profile
              </Button>
              <Button
                className="mt-1 w-full justify-start gap-2"
                variant="ghost"
                size="sm"
              >
                <IconSettings className="h-4 w-4" aria-hidden="true" />
                Settings
              </Button>
            </nav>
            <Button
              className="mt-auto"
              onClick={() => setShowComposer(true)}
            >
              Post
            </Button>
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
        </aside>

        <main className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xl font-semibold">Feed</div>
              <div className="text-muted-foreground text-sm">
                {meQuery.data ? `Logged in as @${meQuery.data.username}` : null}
              </div>
            </div>
            <div className="flex items-center gap-2 md:hidden">
              <Button
                variant="outline"
                onClick={() => setShowComposer((prev) => !prev)}
                aria-expanded={showComposer}
                aria-controls="mobile-composer"
              >
                Post
              </Button>
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
          </div>

          <div className="border-border bg-card rounded-lg border p-1">
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm">
                Public feed
              </Button>
              <Button variant="ghost" size="sm">
                Subscriptions
              </Button>
            </div>
          </div>

          <div
            id="mobile-composer"
            className={`border-border bg-card rounded-lg border p-3 ${
              showComposer ? "block" : "hidden"
            } md:block`}
          >
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
          </div>

          {feedQuery.isPending ? (
            <FeedSkeleton />
          ) : feedQuery.isError ? (
            <div className="border-destructive/30 bg-destructive/10 rounded-md border p-4 text-center">
              <div className="text-destructive font-medium">
                Couldn’t load feed
              </div>
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
              disabled={
                feedQuery.isFetching || (feedQuery.data?.length ?? 0) < limit
              }
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </main>

        <aside className="md:sticky md:top-4 md:h-[calc(100vh-2rem)]">
          <div className="hidden md:flex flex-col gap-4">
            <SidebarCard title="Search">
              <div className="text-muted-foreground text-sm">
                Find people or topics.
              </div>
            </SidebarCard>
            <SidebarCard title="Trends">
              <ul className="text-muted-foreground space-y-2 text-sm">
                <li>#fastapi</li>
                <li>#react</li>
                <li>#shadcn</li>
              </ul>
            </SidebarCard>
            <SidebarCard title="Who to follow">
              <ul className="text-muted-foreground space-y-2 text-sm">
                <li>@frontendwizard</li>
                <li>@backendhero</li>
                <li>@productmind</li>
              </ul>
            </SidebarCard>
          </div>
        </aside>
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

type SidebarCardProps = {
  title: string
  children: ReactNode
}

function SidebarCard({ title, children }: SidebarCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="text-sm font-semibold">{title}</div>
      </CardHeader>
      <CardContent className="text-sm">{children}</CardContent>
    </Card>
  )
}
