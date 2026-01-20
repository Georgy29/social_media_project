import type { components } from "./types";

import { completeMedia, presignMedia } from "./endpoints";

type MediaKind = components["schemas"]["MediaPresignRequest"]["kind"];

const AVATAR_MAX_SIZE = 256;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

async function loadImageSource(file: File): Promise<CanvasImageSource> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file);
    } catch {
      // Fall back to HTMLImageElement for older browsers or decoding failures.
    }
  }

  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to load image"));
    };
    img.src = objectUrl;
  });
}

function getImageSize(source: CanvasImageSource): { width: number; height: number } {
  if (source instanceof HTMLImageElement) {
    return { width: source.naturalWidth, height: source.naturalHeight };
  }
  if (typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap) {
    return { width: source.width, height: source.height };
  }
  if (source instanceof HTMLCanvasElement) {
    return { width: source.width, height: source.height };
  }
  return { width: 0, height: 0 };
}

async function resizeAvatarImage(file: File): Promise<File> {
  if (!file.type || !ALLOWED_IMAGE_TYPES.has(file.type)) {
    return file;
  }

  try {
    const source = await loadImageSource(file);
    const { width, height } = getImageSize(source);
    if (!width || !height) {
      return file;
    }

    const squareSize = Math.min(width, height);
    if (squareSize <= AVATAR_MAX_SIZE && width === height) {
      return file;
    }

    const targetSize = Math.min(squareSize, AVATAR_MAX_SIZE);
    const canvas = document.createElement("canvas");
    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return file;
    }

    const sx = (width - squareSize) / 2;
    const sy = (height - squareSize) / 2;
    ctx.drawImage(
      source,
      sx,
      sy,
      squareSize,
      squareSize,
      0,
      0,
      targetSize,
      targetSize,
    );

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) {
            resolve(result);
          } else {
            reject(new Error("Failed to encode avatar"));
          }
        },
        file.type,
        0.9,
      );
    });

    return new File([blob], file.name, { type: file.type });
  } catch {
    return file;
  }
}

export async function uploadMediaFromDevice(file: File, kind: MediaKind) {
  const uploadFile =
    kind === "avatar" ? await resizeAvatarImage(file) : file;
  const presign = await presignMedia({
    content_type: uploadFile.type,
    size_bytes: uploadFile.size,
    kind,
  });

  const uploadResponse = await fetch(presign.upload_url, {
    method: "PUT",
    headers: { "Content-Type": uploadFile.type },
    body: uploadFile,
  });

  if (!uploadResponse.ok) {
    throw new Error(`Upload failed (${uploadResponse.status})`);
  }

  const completed = await completeMedia(presign.media_id);
  return { mediaId: completed.media_id, publicUrl: completed.public_url };
}
