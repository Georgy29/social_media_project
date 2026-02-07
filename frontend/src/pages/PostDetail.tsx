import { Link, useParams } from "react-router-dom";

import { usePostWithCountsQuery } from "@/api/queries";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

export default function PostDetailPage() {
  const { postId } = useParams();
  const parsedPostId = Number(postId);
  const postIdNumber = Number.isInteger(parsedPostId) ? parsedPostId : undefined;

  const postQuery = usePostWithCountsQuery(postIdNumber);

  if (!postIdNumber) {
    return (
      <div className="mx-auto w-full max-w-2xl p-4">
        <Card>
          <CardContent className="text-muted-foreground p-6 text-center">
            Invalid post id.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-3 p-4">
      <Link to="/feed" className="text-sm underline underline-offset-4">
        Back to feed
      </Link>

      {postQuery.isPending ? (
        <div className="flex justify-center py-10">
          <Spinner size="lg" />
        </div>
      ) : postQuery.isError ? (
        <Card>
          <CardContent className="text-destructive p-6 text-center">
            {postQuery.error.message}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="space-y-1">
            <div className="font-medium">@{postQuery.data.owner_username}</div>
            <div className="text-muted-foreground text-xs">
              {new Date(postQuery.data.timestamp).toLocaleString()}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="whitespace-pre-wrap break-words">
              {postQuery.data.content}
            </div>
            {postQuery.data.media_url ? (
              <div className="overflow-hidden rounded-lg border border-border/50 bg-muted/20">
                <img
                  src={postQuery.data.media_url}
                  alt={`Post image by @${postQuery.data.owner_username}`}
                  width={1200}
                  height={1200}
                  className="h-auto w-full max-h-105 object-contain"
                />
              </div>
            ) : null}
          </CardContent>
          <CardFooter className="text-muted-foreground flex gap-4 text-sm">
            <span>{postQuery.data.likes_count} likes</span>
            <span>{postQuery.data.retweets_count} reposts</span>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}
