"use client";
import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

export const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & { color?: string }
>(({ className, value, color, ...props }, ref) => {
  const v = Math.min(100, Math.max(0, value || 0));
  return (
    <ProgressPrimitive.Root ref={ref} value={v} className={cn("relative h-1.5 w-full overflow-hidden rounded-full bg-secondary", className)} {...props}>
      <ProgressPrimitive.Indicator
        className={cn("h-full w-full rounded-full transition-transform duration-700 ease-out", !color && "bg-primary")}
        style={{ transform: `translateX(-${100 - v}%)`, background: color }}
      />
    </ProgressPrimitive.Root>
  );
});
Progress.displayName = "Progress";
