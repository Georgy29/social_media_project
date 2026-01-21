import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { IconX, IconCamera, IconPhoto, IconTrash } from "@tabler/icons-react";

import type { components } from "@/api/types";

import { uploadMediaFromDevice } from "@/api/mediaUpload";
import {
  useUpdateAvatarMutation,
  useUpdateCoverMutation,
  useUpdateProfileMutation,
} from "@/api/queries";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";

type UserProfile = components["schemas"]["UserProfile"];

type ProfileEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: UserProfile;
  avatarUrl?: string | null;
};

export function ProfileEditDialog({
  open,
  onOpenChange,
  profile,
  avatarUrl,
}: ProfileEditDialogProps) {
  const updateProfileMutation = useUpdateProfileMutation();
  const updateAvatarMutation = useUpdateAvatarMutation();
  const updateCoverMutation = useUpdateCoverMutation();
  const [bioDraft, setBioDraft] = useState(profile.bio ?? "");
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [coverHovered, setCoverHovered] = useState(false);
  const [avatarHovered, setAvatarHovered] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setBioDraft(profile.bio ?? "");
      setCoverHovered(false);
      setAvatarHovered(false);
    }
  }, [open, profile.bio]);

  const handleSave = async () => {
    try {
      await updateProfileMutation.mutateAsync({ bio: bioDraft });
      toast.success("Profile updated");
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update profile";
      toast.error(message);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    setAvatarBusy(true);
    try {
      const uploaded = await uploadMediaFromDevice(file, "avatar");
      await updateAvatarMutation.mutateAsync({ media_id: uploaded.mediaId });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Avatar upload failed";
      toast.error(message);
    } finally {
      setAvatarBusy(false);
    }
  };

  const handleCoverUpload = async (file: File) => {
    setCoverBusy(true);
    try {
      const uploaded = await uploadMediaFromDevice(file, "profile_cover");
      await updateCoverMutation.mutateAsync({ media_id: uploaded.mediaId });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Cover upload failed";
      toast.error(message);
    } finally {
      setCoverBusy(false);
    }
  };

  const handleRemoveCover = async () => {
    setCoverBusy(true);
    try {
      await updateCoverMutation.mutateAsync({ media_id: null });
      toast.success("Cover removed");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to remove cover";
      toast.error(message);
    } finally {
      setCoverBusy(false);
    }
  };

  const handleRemoveAvatar = async () => {
    setAvatarBusy(true);
    try {
      await updateAvatarMutation.mutateAsync({ media_id: null });
      toast.success("Avatar removed");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to remove avatar";
      toast.error(message);
    } finally {
      setAvatarBusy(false);
    }
  };

  const initials = (profile.username ?? "?").slice(0, 2).toUpperCase();
  const isSaving =
    updateProfileMutation.isPending || avatarBusy || coverBusy;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl p-0" showCloseButton={false}>
        <DialogHeader className="flex flex-row items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <DialogClose asChild>
              <Button variant="ghost" size="icon-lg">
                <IconX className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </Button>
            </DialogClose>
            <DialogTitle className="text-base">Edit profile</DialogTitle>
          </div>
          <Button
            size="lg"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogHeader>
        <div className="space-y-6 px-4 pb-6 pt-4">
          <div className="relative overflow-visible rounded-xl border border-border">
            {profile.cover_url ? (
              <img
                src={profile.cover_url}
                alt={`${profile.username} cover`}
                className="h-40 w-full object-cover sm:h-48 rounded-t-xl"
                loading="lazy"
              />
            ) : (
              <div className="bg-muted h-40 w-full sm:h-48 rounded-t-xl" />
            )}
            {/* Cover overlay with edit options */}
            <div
              className={`absolute inset-0 flex items-center justify-center gap-2 bg-black/50 transition-opacity rounded-t-xl ${
                coverHovered ? "opacity-100" : "opacity-0"
              }`}
              onMouseEnter={() => setCoverHovered(true)}
              onMouseLeave={() => setCoverHovered(false)}
            >
              <Button
                size="sm"
                variant="secondary"
                disabled={coverBusy}
                onClick={() => coverInputRef.current?.click()}
                className="gap-2"
              >
                <IconPhoto className="h-4 w-4" />
                {coverBusy ? "Uploading..." : "Change cover"}
              </Button>
              {profile.cover_url && (
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={coverBusy}
                  onClick={handleRemoveCover}
                  className="gap-2"
                >
                  <IconTrash className="h-4 w-4" />
                  Remove
                </Button>
              )}
            </div>
            {/* Avatar positioned at bottom-left, same layer as cover */}
            <div className="absolute -bottom-10 left-4 z-10">
              <div
                className="relative"
                onMouseEnter={() => setAvatarHovered(true)}
                onMouseLeave={() => setAvatarHovered(false)}
              >
                <Avatar className="size-20 ring-4 ring-background">
                  {avatarUrl ? (
                    <AvatarImage src={avatarUrl} alt={profile.username} />
                  ) : null}
                  <AvatarFallback className="text-lg font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                {/* Avatar edit overlay - transparent edit icon */}
                <div
                  className={`absolute inset-0 flex items-center justify-center rounded-full bg-primary/50 transition-opacity ${
                    avatarHovered && !avatarBusy ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-full w-full rounded-full text-white hover:bg-transparent"
                    disabled={avatarBusy}
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    <IconCamera className="h-8 w-8" />
                  </Button>
                  {/* Small X button to remove avatar - appears on hover */}
                  {avatarUrl && (
                    <Button
                      variant="default"
                      size="icon-xs"
                      className="absolute -top-0.5 -right-0.5 rounded-full h-5 w-5 p-0"
                      disabled={avatarBusy}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveAvatar();
                      }}
                    >
                      <IconX className="h-3 w-3" />
                      <span className="sr-only">Remove avatar</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* Separator to prevent content overlap with avatar */}
          <div className="pt-10">
            <Separator />
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-bio">Bio</Label>
            <Textarea
              id="profile-bio"
              value={bioDraft}
              maxLength={100}
              rows={4}
              placeholder="Tell people about yourself"
              onChange={(event) => setBioDraft(event.target.value)}
            />
            <div className="text-muted-foreground text-xs">
              {bioDraft.length}/100
            </div>
          </div>
        </div>
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            await handleAvatarUpload(file);
            event.target.value = "";
          }}
        />
        <input
          ref={coverInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            await handleCoverUpload(file);
            event.target.value = "";
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
