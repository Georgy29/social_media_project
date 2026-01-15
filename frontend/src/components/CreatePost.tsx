import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

type CreatePostProps = {
  pending?: boolean
  onCreate: (content: string) => void
  showTitle?: boolean
  className?: string
  contentClassName?: string
}

export function CreatePost({
  pending = false,
  onCreate,
  showTitle = true,
  className,
  contentClassName,
}: CreatePostProps) {
  const [content, setContent] = useState("")

  const trimmed = content.trim()
  const canSubmit = Boolean(trimmed) && !pending

  return (
    <Card className={className}>
      {showTitle ? (
        <CardHeader>
          <CardTitle className="text-base">Create post</CardTitle>
        </CardHeader>
      ) : null}
      <CardContent
        className={cn("space-y-3", !showTitle && "pt-0", contentClassName)}
      >
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's happening?"
          rows={3}
          className="min-h-[96px]"
          disabled={pending}
        />
        <div className="flex justify-end">
          <Button
            disabled={!canSubmit}
            onClick={() => {
              onCreate(trimmed)
              setContent("")
            }}
          >
            {pending ? "Posting..." : "Post"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
