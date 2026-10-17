import * as React from "react";
import { cn } from "@/lib/utils";

/** An inset grouped list, like iOS Settings. */
export function List({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("divide-y divide-border/70 overflow-hidden rounded-[22px] border border-border/70 bg-card shadow-card", className)} {...p} />;
}

export function ListHeader({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("mb-2 px-1 text-[13px] font-medium text-muted-foreground", className)} {...p} />;
}

export function ListRow({ className, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex min-h-[52px] items-center gap-3 px-4 py-2.5", className)} {...p} />;
}
