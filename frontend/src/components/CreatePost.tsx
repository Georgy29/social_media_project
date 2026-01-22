import { useRef, useState } from "react";
import { IconPhoto, IconX } from "@tabler/icons-react";
import { toast } from "sonner";

import { uploadMediaFromDevice } from "@/api/mediaUpload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type CreatePostProps = {
  pending?: boolean;
  onCreate: (
    content: string,
    mediaId: number | null,
  ) => Promise<boolean> | boolean;
  showTitle?: boolean;
  showMediaButton?: boolean;
  className?: string;
  contentClassName?: string;
};

export function CreatePost({
  pending = false,
  onCreate,
  showTitle = true,
  showMediaButton = true,
  className,
  contentClassName,
}: CreatePostProps) {
  const [content, setContent] = useState("");
  const [mediaId, setMediaId] = useState<number | null>(null);
  const [mediaName, setMediaName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const trimmed = content.trim();
  const isBusy = pending || uploading;
  const canSubmit = Boolean(trimmed) && !isBusy;

  return (
    <Card size="sm" className={className}>
      {showTitle ? (
        <CardHeader>
          <CardTitle className="text-base">Create post</CardTitle>
        </CardHeader>
      ) : null}
      <CardContent
        className={cn("space-y-2", !showTitle && "pt-0", contentClassName)}
      >
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's happening?"
          rows={1}
          className="min-h-12"
          disabled={isBusy}
        />
        {mediaName ? (
          <div className="border-border/60 bg-muted/30 flex items-center justify-between gap-3 rounded-md border border-dashed px-3 py-2 text-xs">
            <div className="text-muted-foreground truncate">
              Image attached: {mediaName}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="gap-1"
              onClick={() => {
                setMediaId(null);
                setMediaName(null);
              }}
            >
              <IconX className="h-3 w-3" aria-hidden="true" />
              Remove
            </Button>
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3">
          {showMediaButton ? (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={isBusy}
                aria-label="Attach image"
                onClick={() => fileInputRef.current?.click()}
              >
                <IconPhoto
                  className="text-cyan-500 h-4 w-4"
                  aria-hidden="true"
                />
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={async (event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  setUploading(true);
                  try {
                    const result = await uploadMediaFromDevice(
                      file,
                      "post_image",
                    );
                    setMediaId(result.mediaId);
                    setMediaName(file.name);
                  } catch (error) {
                    const message =
                      error instanceof Error
                        ? error.message
                        : "Image upload failed";
                    toast.error(message);
                  } finally {
                    setUploading(false);
                    event.target.value = "";
                  }
                }}
              />
            </>
          ) : (
            <div />
          )}
          <Button
            disabled={!canSubmit}
            className="px-6"
            onClick={async () => {
              try {
                const didCreate = await Promise.resolve(
                  onCreate(trimmed, mediaId),
                );
                if (didCreate === false) return;
                setContent("");
                setMediaId(null);
                setMediaName(null);
              } catch (error) {
                const message =
                  error instanceof Error
                    ? error.message
                    : "Failed to create post";
                toast.error(message);
                return;
              }
            }}
          >
            {isBusy ? "Posting..." : "Post"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
