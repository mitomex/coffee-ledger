import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-border/70 bg-white/80 placeholder:text-muted-foreground focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/30 aria-invalid:border-destructive/70 aria-invalid:focus-visible:ring-destructive/30 flex field-sizing-content min-h-28 w-full rounded-[var(--radius-sm)] border px-4 py-3 text-sm tracking-[0.02em] text-foreground shadow-sm transition-colors duration-150 outline-none disabled:cursor-not-allowed disabled:opacity-60",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
