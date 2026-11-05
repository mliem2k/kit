import * as React from 'react'

import { cn } from '../cn'

/** rms's keyboard-only ring; bms swaps in a border colour change instead. */
export const DEFAULT_INPUT_FOCUS =
  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'

/**
 * Builds the text input. The focus treatment is the only thing that differs
 * between the apps that share this field.
 */
export function createInput({ focusClass = DEFAULT_INPUT_FOCUS }: { focusClass?: string } = {}) {
  const Input = React.forwardRef<HTMLInputElement, React.ComponentPropsWithoutRef<'input'>>(
    ({ className, type, ...props }, ref) => {
      return (
        <input
          type={type}
          className={cn(
            'h-9 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed transition-colors duration-150 file:border-0 file:bg-transparent file:text-sm file:font-medium',
            focusClass,
            className,
          )}
          ref={ref}
          {...props}
        />
      )
    },
  )
  Input.displayName = 'Input'

  return { Input }
}

export const { Input } = createInput()
