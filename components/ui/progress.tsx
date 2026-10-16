"use client";
import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";
import { cn } from "@/lib/utils";

export const Progress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & { indicatorClassName?: string; color?: string }
>(({ className, value, indicatorClassName, color, ...props }, ref) => (
  <ProgressPrimitive.Root ref={ref} className={cn("relative h-2.5 w-full overflow-hidden rounded-full bg-white/10", className)} {...props}>
    <ProgressPrimitive.Indicator
      className={cn("h-full w-full flex-1 rounded-full transition-transform duration-700 ease-out", !color && "bar-shimmer", indicatorClassName)}
      style={{ transform: `translateX(-${100 - Math.min(100, Math.max(0, value || 0))}%)`, background: color }}
    />
  </ProgressPrimitive.Root>
));
Progress.displayName = "Progress";
