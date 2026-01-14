import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"

export function CreatePost({
  pending = false,
  onCreate,
}: {
  pending?: boolean
  onCreate: (content: string) => void
}) {
  const [content, setContent] = useState("")

  const trimmed = content.trim()
  const canSubmit = Boolean(trimmed) && !pending

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Create post</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What’s happening?"
          rows={3}
        />
        <div className="flex justify-end">
          <Button
            disabled={!canSubmit}
            onClick={() => {
              onCreate(trimmed)
              setContent("")
            }}
          >
            {pending ? "Posting…" : "Post"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

