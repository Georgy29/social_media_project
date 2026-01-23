import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { IconUpload } from "@tabler/icons-react";

import { CreatePost } from "@/components/CreatePost";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { uploadMediaFromDevice } from "@/api/mediaUpload";

type PostComposerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending?: boolean;
  onCreate: (
    content: string,
    mediaId: number | null,
  ) => Promise<boolean> | boolean;
};

export function PostComposerDialog({
  open,
  onOpenChange,
  pending = false,
  onCreate,
}: PostComposerDialogProps) {
  const [pendingUpload, setPendingUpload] = useState(false);
  const [mediaId, setMediaId] = useState<number | null>(null);
  const [mediaName, setMediaName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isPending = pending || pendingUpload;

  useEffect(() => {
    if (!open) {
      setMediaId(null);
      setMediaName(null);
      setPendingUpload(false);
    }
  }, [open]);

  const handleCreate = async (content: string) => {
    try {
      const didCreate = await Promise.resolve(onCreate(content, mediaId));
      if (didCreate) {
        setMediaId(null);
        setMediaName(null);
        onOpenChange(false);
        return true;
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create post";
      toast.error(message);
      return false;
    }
    return false;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base">New Post</DialogTitle>
        </DialogHeader>
        <div className="border-muted-foreground/30 bg-muted/30 rounded-xl border border-dashed p-6 text-center">
          <div className="border-muted-foreground/40 bg-background mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-dashed">
            <IconUpload
              className="text-muted-foreground h-5 w-5"
              aria-hidden="true"
            />
          </div>
          <div className="text-sm font-medium">Add Image to Your Post</div>
          <div className="text-muted-foreground mt-1 text-xs">
            Upload from your device.
          </div>
          <div className="mt-4 flex items-center justify-center">
            <Button
              type="button"
              variant="secondary"
              disabled={pendingUpload}
              onClick={() => fileInputRef.current?.click()}
            >
              Upload From Device
            </Button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            aria-label="Upload image"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              setPendingUpload(true);
              try {
                const result = await uploadMediaFromDevice(file, "post_image");
                setMediaId(result.mediaId);
                setMediaName(file.name);
                toast.success("Image uploaded");
              } catch (error) {
                const message =
                  error instanceof Error ? error.message : "Upload failed";
                toast.error(message);
              } finally {
                setPendingUpload(false);
                event.target.value = "";
              }
            }}
          />
          {mediaName ? (
            <div className="text-muted-foreground mt-3 text-xs">
              Attached: {mediaName}
            </div>
          ) : null}
        </div>
        <CreatePost
          pending={isPending}
          onCreate={(content) => handleCreate(content)}
          showTitle={false}
          showMediaButton={false}
          className="ring-0 shadow-none"
        />
      </DialogContent>
    </Dialog>
  );
}
