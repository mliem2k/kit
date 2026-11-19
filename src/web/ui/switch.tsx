import * as SwitchPrimitives from '@radix-ui/react-switch'
import * as React from 'react'

import { cn } from '../cn'

const TRACK =
  'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input'
const THUMB =
  'pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0'

/**
 * Builds a Switch. rms makes it larger and recolours the track for a finger on a shop tablet, so
 * an app passes classes that are merged over the defaults instead of copying the component.
 */
export function createSwitch({ track, thumb }: { track?: string; thumb?: string } = {}) {
  const Switch = React.forwardRef<
    React.ElementRef<typeof SwitchPrimitives.Root>,
    React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
  >(({ className, ...props }, ref) => (
    <SwitchPrimitives.Root className={cn(TRACK, track, className)} {...props} ref={ref}>
      <SwitchPrimitives.Thumb className={cn(THUMB, thumb)} />
    </SwitchPrimitives.Root>
  ))
  Switch.displayName = SwitchPrimitives.Root.displayName

  return { Switch }
}

export const { Switch } = createSwitch()
