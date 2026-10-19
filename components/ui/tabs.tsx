"use client";
import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

/** iOS-style segmented control. */
export const Tabs = TabsPrimitive.Root;
export const TabsList = React.forwardRef<React.ElementRef<typeof TabsPrimitive.List>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>>(
  ({ className, ...p }, ref) => (
    <TabsPrimitive.List ref={ref} className={cn("no-scrollbar inline-flex max-w-full items-center overflow-x-auto rounded-[11px] bg-secondary p-[3px]", className)} {...p} />
  ),
);
TabsList.displayName = "TabsList";
export const TabsTrigger = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Trigger>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>>(
  ({ className, ...p }, ref) => (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        "flex-1 whitespace-nowrap rounded-[8px] px-3.5 py-1.5 text-[13px] font-medium text-muted-foreground transition-all duration-200 hover:text-foreground data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-[0_1px_3px_rgba(16,24,40,.12),0_0_0_.5px_rgba(16,24,40,.04)] dark:data-[state=active]:bg-[hsl(226_30%_21%)] dark:data-[state=active]:shadow-[inset_0_1px_0_rgba(255,255,255,.06)]",
        className,
      )}
      {...p}
    />
  ),
);
TabsTrigger.displayName = "TabsTrigger";
export const TabsContent = React.forwardRef<React.ElementRef<typeof TabsPrimitive.Content>, React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>>(
  ({ className, ...p }, ref) => <TabsPrimitive.Content ref={ref} className={cn("mt-5 focus-visible:outline-none data-[state=active]:animate-fade-up", className)} {...p} />,
);
TabsContent.displayName = "TabsContent";
