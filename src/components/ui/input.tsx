import * as React from "react"

import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "border-border/70 bg-white/80 placeholder:text-muted-foreground selection:bg-primary/20 selection:text-foreground flex h-11 w-full min-w-0 rounded-[var(--radius-sm)] border px-4 text-sm tracking-[0.02em] text-foreground shadow-sm transition-colors duration-150 outline-none file:inline-flex file:h-8 file:border-0 file:bg-transparent file:px-3 file:text-xs file:font-medium disabled:pointer-events-none disabled:opacity-60",
        "focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/30",
        "aria-invalid:border-destructive/70 aria-invalid:focus-visible:ring-destructive/30",
        className
      )}
      {...props}
    />
  )
}

export { Input }
