import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '../cn'

const BUTTON_BASE =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0'

export const defaultButtonSizes = {
  default: 'h-9 px-4 py-2',
  sm: 'h-9 rounded-md px-3 text-xs',
  lg: 'h-10 rounded-md px-5',
  icon: 'h-9 w-9',
}

const VARIANTS = {
  default: 'bg-primary text-primary-foreground hover:bg-primary/90',
  destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  outline: 'border border-border bg-card text-foreground hover:bg-muted hover:border-border-strong',
  secondary: 'bg-secondary text-secondary-foreground hover:bg-muted',
  ghost: 'text-muted-foreground hover:bg-muted hover:text-foreground',
  link: 'text-foreground underline-offset-4 hover:underline',
}

/**
 * Builds a Button whose sizes the app can tune. rms sizes controls for a
 * finger on a shop tablet; bms keeps its denser admin sizing for `sm`, so
 * each app passes the sizes it already shipped instead of one of them
 * silently changing height.
 */
export function createButton(
  options: { sizes?: Partial<Record<keyof typeof defaultButtonSizes, string>> } = {},
) {
  const buttonVariants = cva(BUTTON_BASE, {
    variants: {
      variant: VARIANTS,
      size: { ...defaultButtonSizes, ...options.sizes },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  })

  type ButtonProps = React.ComponentPropsWithoutRef<'button'> &
    VariantProps<typeof buttonVariants> & {
      asChild?: boolean
      /** Text rendered before `children`; kept for the apps that pass labels this way. */
      text?: React.ReactNode
    }

  const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, text, children, ...props }, ref) => {
      const Comp = asChild ? Slot : 'button'
      const content =
        text != null ? (
          <>
            {text}
            {children}
          </>
        ) : (
          children
        )
      return (
        <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props}>
          {content}
        </Comp>
      )
    },
  )
  Button.displayName = 'Button'

  return { Button, buttonVariants }
}

export const { Button, buttonVariants } = createButton()

export type ButtonProps = React.ComponentPropsWithoutRef<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
    text?: React.ReactNode
  }
