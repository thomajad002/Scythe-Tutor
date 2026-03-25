"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { uploadAvatar } from "@/lib/auth/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const CROP_SIZE = 360;
const OUTPUT_SIZE = 512;

type AvatarUploadProps = {
  avatarUrl: string | null;
};

type WebkitGestureEvent = Event & {
  scale: number;
  clientX: number;
  clientY: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getBoundedPosition(
  nextX: number,
  nextY: number,
  imageWidth: number,
  imageHeight: number,
  zoom: number,
) {
  const displayWidth = imageWidth * zoom;
  const displayHeight = imageHeight * zoom;
  const minX = Math.min(0, CROP_SIZE - displayWidth);
  const minY = Math.min(0, CROP_SIZE - displayHeight);

  return {
    x: clamp(nextX, minX, 0),
    y: clamp(nextY, minY, 0),
  };
}

export function AvatarUpload({ avatarUrl }: AvatarUploadProps) {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(avatarUrl);
  const [cropOpen, setCropOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [baseScale, setBaseScale] = useState(1);
  const [baseSize, setBaseSize] = useState({ width: CROP_SIZE, height: CROP_SIZE });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasPreparedAvatar, setHasPreparedAvatar] = useState(false);

  const cropImageRef = useRef<HTMLImageElement | null>(null);
  const cropAreaRef = useRef<HTMLDivElement | null>(null);
  const hiddenInputRef = useRef<HTMLInputElement | null>(null);
  const pointerRef = useRef<{ pointerId: number; startX: number; startY: number; originX: number; originY: number } | null>(
    null,
  );
  const touchPointsRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchRef = useRef<{ startDistance: number; startZoom: number } | null>(null);
  const gestureStartZoomRef = useRef<number>(1);

  const sourceUrl = useMemo(() => (sourceFile ? URL.createObjectURL(sourceFile) : null), [sourceFile]);

  useEffect(() => {
    return () => {
      if (sourceUrl) {
        URL.revokeObjectURL(sourceUrl);
      }
    };
  }, [sourceUrl]);

  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl !== avatarUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [avatarUrl, previewUrl]);

  const canAcceptCrop = useMemo(() => Boolean(sourceFile && sourceUrl), [sourceFile, sourceUrl]);

  const applyZoom = useCallback((nextZoomRaw: number, anchorX = CROP_SIZE / 2, anchorY = CROP_SIZE / 2) => {
    const nextZoom = clamp(nextZoomRaw, 1, 5);
    const imageX = (anchorX - position.x) / zoom;
    const imageY = (anchorY - position.y) / zoom;
    const nextX = anchorX - imageX * nextZoom;
    const nextY = anchorY - imageY * nextZoom;
    const bounded = getBoundedPosition(nextX, nextY, baseSize.width, baseSize.height, nextZoom);

    setZoom(nextZoom);
    setPosition(bounded);
  }, [baseSize.height, baseSize.width, position.x, position.y, zoom]);

  useEffect(() => {
    const cropElement = cropAreaRef.current;

    if (!cropElement) {
      return;
    }

    const onGestureStart = (event: Event) => {
      const gestureEvent = event as WebkitGestureEvent;
      event.preventDefault();
      gestureStartZoomRef.current = zoom;

      const rect = cropElement.getBoundingClientRect();
      const anchorX = clamp(gestureEvent.clientX - rect.left, 0, CROP_SIZE);
      const anchorY = clamp(gestureEvent.clientY - rect.top, 0, CROP_SIZE);
      applyZoom(gestureStartZoomRef.current, anchorX, anchorY);
    };

    const onGestureChange = (event: Event) => {
      const gestureEvent = event as WebkitGestureEvent;
      event.preventDefault();

      const rect = cropElement.getBoundingClientRect();
      const anchorX = clamp(gestureEvent.clientX - rect.left, 0, CROP_SIZE);
      const anchorY = clamp(gestureEvent.clientY - rect.top, 0, CROP_SIZE);
      applyZoom(gestureStartZoomRef.current * gestureEvent.scale, anchorX, anchorY);
    };

    const onGestureEnd = (event: Event) => {
      event.preventDefault();
      gestureStartZoomRef.current = zoom;
    };

    cropElement.addEventListener("gesturestart", onGestureStart as EventListener, { passive: false });
    cropElement.addEventListener("gesturechange", onGestureChange as EventListener, { passive: false });
    cropElement.addEventListener("gestureend", onGestureEnd as EventListener, { passive: false });

    return () => {
      cropElement.removeEventListener("gesturestart", onGestureStart as EventListener);
      cropElement.removeEventListener("gesturechange", onGestureChange as EventListener);
      cropElement.removeEventListener("gestureend", onGestureEnd as EventListener);
    };
  }, [applyZoom, zoom]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;

    if (!selected) {
      return;
    }

    if (!selected.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }

    setError(null);
    setHasPreparedAvatar(false);
    setSourceFile(selected);
    setCropOpen(true);
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    event.target.value = "";
  };

  const handleCropImageLoad = () => {
    const image = cropImageRef.current;

    if (!image) {
      return;
    }

    const width = image.naturalWidth;
    const height = image.naturalHeight;
    const initialBaseScale = Math.max(CROP_SIZE / width, CROP_SIZE / height);
    const initialBaseSize = {
      width: width * initialBaseScale,
      height: height * initialBaseScale,
    };
    const centered = getBoundedPosition(
      (CROP_SIZE - initialBaseSize.width) / 2,
      (CROP_SIZE - initialBaseSize.height) / 2,
      initialBaseSize.width,
      initialBaseSize.height,
      1,
    );

    setBaseScale(initialBaseScale);
    setBaseSize(initialBaseSize);
    setZoom(1);
    setPosition(centered);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!sourceUrl) {
      return;
    }

    if (event.pointerType === "touch") {
      touchPointsRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (touchPointsRef.current.size === 2) {
        const points = [...touchPointsRef.current.values()];
        const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
        pinchRef.current = {
          startDistance: Math.max(distance, 1),
          startZoom: zoom,
        };
      }
    }

    event.currentTarget.setPointerCapture(event.pointerId);

    if (touchPointsRef.current.size > 1) {
      pointerRef.current = null;
      return;
    }

    pointerRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: position.x,
      originY: position.y,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch" && touchPointsRef.current.has(event.pointerId)) {
      touchPointsRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

      if (touchPointsRef.current.size === 2) {
        const points = [...touchPointsRef.current.values()];
        const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
        const centerX = (points[0].x + points[1].x) / 2;
        const centerY = (points[0].y + points[1].y) / 2;
        const rect = event.currentTarget.getBoundingClientRect();
        const anchorX = clamp(centerX - rect.left, 0, CROP_SIZE);
        const anchorY = clamp(centerY - rect.top, 0, CROP_SIZE);

        if (!pinchRef.current) {
          pinchRef.current = {
            startDistance: Math.max(distance, 1),
            startZoom: zoom,
          };
        }

        const distanceRatio = distance / Math.max(pinchRef.current.startDistance, 1);
        applyZoom(pinchRef.current.startZoom * distanceRatio, anchorX, anchorY);
        return;
      }
    }

    const activePointer = pointerRef.current;

    if (!activePointer || activePointer.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - activePointer.startX;
    const deltaY = event.clientY - activePointer.startY;
    const bounded = getBoundedPosition(
      activePointer.originX + deltaX,
      activePointer.originY + deltaY,
      baseSize.width,
      baseSize.height,
      zoom,
    );

    setPosition(bounded);
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") {
      touchPointsRef.current.delete(event.pointerId);

      if (touchPointsRef.current.size < 2) {
        pinchRef.current = null;
      }
    }

    if (pointerRef.current?.pointerId === event.pointerId) {
      pointerRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleZoomChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextZoom = Number(event.target.value);
    applyZoom(nextZoom);
  };

  const handleWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();

    const container = event.currentTarget.getBoundingClientRect();
    const anchorX = clamp(event.clientX - container.left, 0, CROP_SIZE);
    const anchorY = clamp(event.clientY - container.top, 0, CROP_SIZE);
    const intensity = event.ctrlKey ? 0.004 : 0.002;
    const zoomFactor = Math.exp(-event.deltaY * intensity);
    applyZoom(zoom * zoomFactor, anchorX, anchorY);
  };

  const acceptCrop = async () => {
    const image = cropImageRef.current;

    if (!image || !sourceFile) {
      setError("Choose an image to crop first.");
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const context = canvas.getContext("2d");

    if (!context) {
      setError("Unable to process the image in this browser.");
      return;
    }

    context.clearRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    context.save();
    context.beginPath();
    context.arc(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, OUTPUT_SIZE / 2, 0, Math.PI * 2);
    context.closePath();
    context.clip();

    const scaleToNatural = baseScale * zoom;
    const sx = -position.x / scaleToNatural;
    const sy = -position.y / scaleToNatural;
    const sw = CROP_SIZE / scaleToNatural;
    const sh = CROP_SIZE / scaleToNatural;

    context.drawImage(image, sx, sy, sw, sh, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    context.restore();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((createdBlob) => resolve(createdBlob), "image/png", 0.95);
    });

    if (!blob) {
      setError("Unable to export cropped image.");
      return;
    }

    const croppedFile = new File([blob], `${sourceFile.name.replace(/\.[^/.]+$/, "")}-avatar.png`, {
      type: "image/png",
      lastModified: Date.now(),
    });

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(croppedFile);

    if (hiddenInputRef.current) {
      hiddenInputRef.current.files = dataTransfer.files;
    }
    setHasPreparedAvatar(true);

    if (previewUrl && previewUrl !== avatarUrl && previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl(URL.createObjectURL(croppedFile));
    setCropOpen(false);
    setError(null);
  };

  return (
    <div className="space-y-4">
      {previewUrl ? (
        <Image
          src={previewUrl}
          alt="Current avatar"
          width={96}
          height={96}
          unoptimized
          className="h-24 w-24 rounded-full border border-border object-cover"
        />
      ) : (
        <p className="text-sm text-muted">No avatar uploaded yet.</p>
      )}

      {error && <p className="rounded-xl bg-rose-950/60 p-3 text-sm text-rose-200">{error}</p>}

      <div className="space-y-2">
        <label htmlFor="avatar-source" className="block text-sm text-muted">
          Choose Image
        </label>
        <Input id="avatar-source" type="file" accept="image/*" onChange={handleFileChange} />
      </div>

      <form
        action={uploadAvatar}
        onSubmit={() => {
          setIsSubmitting(true);
        }}
      >
        <input ref={hiddenInputRef} name="avatar" type="file" className="hidden" required />
        <Button type="submit" variant="secondary" disabled={isSubmitting || !hasPreparedAvatar}>
          {isSubmitting ? "Uploading..." : "Save Avatar"}
        </Button>
      </form>

      {cropOpen && sourceUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background p-4">
          <div className="w-full max-w-2xl space-y-5 rounded-2xl border border-border bg-surface-1 p-6">
            <h3 className="text-lg font-semibold">Fit your photo</h3>
            <p className="text-sm text-muted">Drag to center your face and use zoom to fit inside the circle.</p>

            <div
              ref={cropAreaRef}
              className="relative mx-auto touch-none overflow-hidden rounded-2xl border border-border bg-surface-2"
              style={{ width: CROP_SIZE, height: CROP_SIZE }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onWheel={handleWheel}
            >
              <Image
                ref={cropImageRef}
                src={sourceUrl}
                alt="Crop avatar"
                width={Math.round(baseSize.width)}
                height={Math.round(baseSize.height)}
                unoptimized
                draggable={false}
                onLoad={handleCropImageLoad}
                style={{
                  width: baseSize.width,
                  height: baseSize.height,
                  transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                  transformOrigin: "top left",
                  userSelect: "none",
                }}
                className="absolute left-0 top-0 max-w-none"
              />
              <div className="pointer-events-none absolute inset-0 rounded-2xl border border-border" />
              <div className="pointer-events-none absolute inset-0 rounded-full border-2 border-foreground/80" />
            </div>

            <div className="space-y-1">
              <label htmlFor="avatar-zoom" className="block text-sm text-muted">
                Zoom
              </label>
              <Input
                id="avatar-zoom"
                type="range"
                min={1}
                max={5}
                step={0.01}
                value={zoom}
                onChange={handleZoomChange}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setCropOpen(false);
                  setSourceFile(null);
                  setError(null);
                }}
              >
                Cancel
              </Button>
              <Button type="button" onClick={acceptCrop} disabled={!canAcceptCrop}>
                Accept
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}