import type * as React from 'react'

import { cn } from '../cn'

function Skeleton({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
  return <div className={cn('bg-muted rounded animate-pulse', className)} {...props} />
}

export { Skeleton }
