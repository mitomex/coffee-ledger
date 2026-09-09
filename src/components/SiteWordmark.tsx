import type { ElementType, HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type SiteWordmarkProps = {
  as?: ElementType
} & HTMLAttributes<HTMLElement>

export function SiteWordmark({ as: Component = 'div', className, ...rest }: SiteWordmarkProps) {
  return (
    <Component
      {...rest}
      className={cn('tracking-tight text-lg sm:text-xl font-semibold', className)}
    >
      Coffee Ledger
    </Component>
  )
}
