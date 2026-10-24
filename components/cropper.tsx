"use client";

import { useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Circle, Maximize, Minus, Plus, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";

const OUT_PX = 512;
const MAX_BYTES = 380_000;
const MAX_ZOOM = 4;

interface Size { w: number; h: number }

/**
 * Renders the chosen area to a square JPEG data URL, small enough for the
 * server. The area may be larger than the photo (zoomed out to keep all of
 * it): the space around it is filled with a soft, blurred copy of the photo.
 */
async function cropToDataUrl(src: string, area: Area): Promise<string> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = src;
  });
  const nw = img.naturalWidth, nh = img.naturalHeight;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = OUT_PX;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#1B2440";
  ctx.fillRect(0, 0, OUT_PX, OUT_PX);

  const scale = OUT_PX / area.width;
  const dx = -area.x * scale, dy = -area.y * scale, dw = nw * scale, dh = nh * scale;
  const covers = dx <= 0 && dy <= 0 && dx + dw >= OUT_PX && dy + dh >= OUT_PX;
  if (!covers) {
    // backdrop: the photo shrunk to a few pixels and stretched back up blurs it in every browser
    const tiny = document.createElement("canvas");
    tiny.width = tiny.height = 12;
    const t = tiny.getContext("2d")!;
    const s = Math.max(12 / nw, 12 / nh);
    t.drawImage(img, (12 - nw * s) / 2, (12 - nh * s) / 2, nw * s, nh * s);
    ctx.drawImage(tiny, 0, 0, OUT_PX, OUT_PX);
    ctx.fillStyle = "rgba(0,0,0,.12)";
    ctx.fillRect(0, 0, OUT_PX, OUT_PX);
  }
  ctx.drawImage(img, dx, dy, dw, dh);
  for (const q of [0.88, 0.8, 0.7, 0.6]) {
    const url = canvas.toDataURL("image/jpeg", q);
    if (url.length < MAX_BYTES) return url;
  }
  return canvas.toDataURL("image/jpeg", 0.5);
}

/** A live preview of the crop, without rendering a canvas on every move. Works when zoomed out past the photo's edges too. */
function Preview({ src, area, natural, round, size = 64 }: { src: string; area: Area | null; natural: Size | null; round: boolean; size?: number }) {
  const style = area && natural ? (() => {
    const k = size / area.width;
    return {
      backgroundImage: `url(${src})`,
      backgroundSize: `${natural.w * k}px ${natural.h * k}px`,
      backgroundPosition: `${-area.x * k}px ${-area.y * k}px`,
    };
  })() : {};
  return <div className={cn("shrink-0 bg-secondary bg-no-repeat ring-1 ring-border", round ? "rounded-full" : "rounded-[24%]")} style={{ width: size, height: size, ...style }} />;
}

/**
 * Crop, zoom and reposition a photo before it becomes a profile picture.
 * Drag to move; pinch, scroll or use the slider to zoom. Zoom out far enough
 * and the whole photo fits, nothing cut off. Works with touch, mouse and
 * keyboard (arrow keys move the image).
 */
export function PhotoCropper({ file, onCancel, onDone }: { file: File | null; onCancel: () => void; onDone: (dataUrl: string) => void }) {
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [shape, setShape] = useState<"round" | "rect">("round");
  const [area, setArea] = useState<Area | null>(null);
  const [pixels, setPixels] = useState<Area | null>(null);
  const [natural, setNatural] = useState<Size | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // zooming out to this shows the whole photo inside the square
  const fitZoom = natural ? Math.min(natural.w, natural.h) / Math.max(natural.w, natural.h) : 1;
  const minZoom = Math.min(1, fitZoom);

  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSrc(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setNatural(null);
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
  const fitWhole = () => { setZoom(minZoom); setCrop({ x: 0, y: 0 }); };
  const step = (d: number) => setZoom((z) => Math.min(MAX_ZOOM, Math.max(minZoom, +(z + d).toFixed(2))));

  return (
    <Dialog open={!!file} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Position your photo</DialogTitle>
          <DialogDescription>Drag to move it, pinch or use the slider to zoom. Zoom out to keep the whole picture.</DialogDescription>
        </DialogHeader>
        <div className="relative h-[300px] overflow-hidden rounded-2xl bg-[#0B1120] sm:h-[340px]">
          {src && (
            <Cropper
              image={src} crop={crop} zoom={zoom} aspect={1} cropShape={shape} showGrid={false} minZoom={minZoom} maxZoom={MAX_ZOOM} zoomSpeed={0.4}
              restrictPosition={zoom >= 1}
              onCropChange={setCrop} onZoomChange={setZoom}
              onCropComplete={(a, p) => { setArea(a); setPixels(p); }}
              onMediaLoaded={(m) => { setError(""); setNatural({ w: m.naturalWidth, h: m.naturalHeight }); }}
              style={{ cropAreaStyle: { border: "2px solid hsl(var(--primary))", boxShadow: "0 0 0 9999px rgba(5,7,14,.72)" } }}
            />
          )}
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button type="button" aria-label="Zoom out" className="grid h-9 w-9 place-items-center rounded-full bg-secondary" onClick={() => step(-0.2)}><Minus className="h-4 w-4" /></button>
          <input type="range" min={minZoom} max={MAX_ZOOM} step={0.01} value={zoom} onChange={(e) => setZoom(+e.target.value)} className="flex-1" aria-label="Zoom" />
          <button type="button" aria-label="Zoom in" className="grid h-9 w-9 place-items-center rounded-full bg-secondary" onClick={() => step(0.2)}><Plus className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {src && <Preview src={src} area={pixels} natural={natural} round />}
            {src && <Preview src={src} area={pixels} natural={natural} round={false} />}
          </div>
          <div className="flex items-center gap-2">
            {fitZoom < 0.999 && <Button type="button" size="sm" variant="secondary" onClick={fitWhole} aria-pressed={Math.abs(zoom - minZoom) < 0.01}><Maximize />Fit whole photo</Button>}
            <Tabs value={shape} onValueChange={(v) => setShape(v as "round" | "rect")}>
              <TabsList>
                <TabsTrigger value="round" aria-label="Circle preview"><Circle className="h-4 w-4" /></TabsTrigger>
                <TabsTrigger value="rect" aria-label="Square preview"><Square className="h-4 w-4" /></TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
        {zoom < 1 && <p className="mt-3 text-[12px] text-muted-foreground">The space around your photo is filled with a soft blur of it, so nothing is cut off.</p>}
        {error && <p role="alert" className="mt-3 text-[14px] text-destructive">{error}</p>}
        <div className="mt-5 flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={onCancel}>Cancel</Button>
          <Button className="flex-1" onClick={save} disabled={busy || !pixels}>{busy ? "Saving…" : "Use this photo"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
