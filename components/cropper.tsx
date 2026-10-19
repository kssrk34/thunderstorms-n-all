"use client";

import { useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Circle, Minus, Plus, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";

const OUT_PX = 512;
const MAX_BYTES = 380_000;

/** Renders the chosen area to a square JPEG data URL, small enough for the server. */
async function cropToDataUrl(src: string, area: Area): Promise<string> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = OUT_PX;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#0B1120";
  ctx.fillRect(0, 0, OUT_PX, OUT_PX);
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, OUT_PX, OUT_PX);
  for (const q of [0.88, 0.8, 0.7, 0.6]) {
    const url = canvas.toDataURL("image/jpeg", q);
    if (url.length < MAX_BYTES) return url;
  }
  return canvas.toDataURL("image/jpeg", 0.5);
}

/** A live preview of the crop, without rendering a canvas on every move. */
function Preview({ src, area, round }: { src: string; area: Area | null; round: boolean }) {
  const style = area ? {
    backgroundImage: `url(${src})`,
    backgroundSize: `${10000 / area.width}% ${10000 / area.height}%`,
    backgroundPosition: `${area.width >= 100 ? 0 : (area.x / (100 - area.width)) * 100}% ${area.height >= 100 ? 0 : (area.y / (100 - area.height)) * 100}%`,
  } : {};
  return <div className={cn("h-16 w-16 shrink-0 bg-secondary bg-no-repeat ring-1 ring-white/10", round ? "rounded-full" : "rounded-[24%]")} style={style} />;
}

/**
 * Crop, zoom and reposition a photo before it becomes a profile picture.
 * Drag to move; pinch, scroll or use the slider to zoom. Works with touch,
 * mouse and keyboard (arrow keys move the image).
 */
export function PhotoCropper({ file, onCancel, onDone }: { file: File | null; onCancel: () => void; onDone: (dataUrl: string) => void }) {
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [shape, setShape] = useState<"round" | "rect">("round");
  const [area, setArea] = useState<Area | null>(null);
  const [pixels, setPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSrc(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setError("");
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const save = async () => {
    if (!src || !pixels) return;
    setBusy(true);
    try {
      onDone(await cropToDataUrl(src, pixels));
    } catch {
      setError("That image couldn't be opened. Try a JPEG or PNG.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!file} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Position your photo</DialogTitle>
          <DialogDescription>Drag to move it. Pinch, scroll or use the slider to zoom.</DialogDescription>
        </DialogHeader>
        <div className="relative h-[300px] overflow-hidden rounded-2xl bg-black sm:h-[340px]">
          {src && (
            <Cropper
              image={src} crop={crop} zoom={zoom} aspect={1} cropShape={shape} showGrid={false} minZoom={1} maxZoom={4} zoomSpeed={0.4}
              onCropChange={setCrop} onZoomChange={setZoom}
              onCropComplete={(a, p) => { setArea(a); setPixels(p); }}
              onMediaLoaded={() => setError("")}
              style={{ cropAreaStyle: { border: "2px solid hsl(var(--primary))", boxShadow: "0 0 0 9999px rgba(5,7,14,.72)" } }}
            />
          )}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button type="button" aria-label="Zoom out" className="grid h-9 w-9 place-items-center rounded-full bg-secondary" onClick={() => setZoom((z) => Math.max(1, +(z - 0.2).toFixed(2)))}><Minus className="h-4 w-4" /></button>
          <input type="range" min={1} max={4} step={0.01} value={zoom} onChange={(e) => setZoom(+e.target.value)} className="flex-1" aria-label="Zoom" />
          <button type="button" aria-label="Zoom in" className="grid h-9 w-9 place-items-center rounded-full bg-secondary" onClick={() => setZoom((z) => Math.min(4, +(z + 0.2).toFixed(2)))}><Plus className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {src && <Preview src={src} area={area} round />}
            {src && <Preview src={src} area={area} round={false} />}
          </div>
          <Tabs value={shape} onValueChange={(v) => setShape(v as "round" | "rect")}>
            <TabsList>
              <TabsTrigger value="round" aria-label="Circle preview"><Circle className="h-4 w-4" /></TabsTrigger>
              <TabsTrigger value="rect" aria-label="Square preview"><Square className="h-4 w-4" /></TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        {error && <p role="alert" className="mt-3 text-[14px] text-destructive">{error}</p>}
        <div className="mt-5 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>Cancel</Button>
          <Button className="flex-1" onClick={save} disabled={busy || !pixels}>{busy ? "Saving…" : "Use this photo"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
