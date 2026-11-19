import { cva, type VariantProps } from 'class-variance-authority'
import type * as React from 'react'
import { cn } from '../cn'

const badgeVariants = cva(
  'rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider whitespace-nowrap inline-flex items-center transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        neutral: 'bg-muted border border-border text-muted-foreground',
        active: 'bg-primary text-primary-foreground',
        success: 'bg-success/10 border border-success/30 text-success',
        warning: 'bg-warning/10 border border-warning/30 text-warning',
        destructive: 'bg-destructive/10 border border-destructive/30 text-destructive',
        secondary: 'bg-muted border border-border text-muted-foreground',
        outline: 'bg-transparent border border-border text-muted-foreground',
        // Legacy status variants — map to semantic ones
        occupied: 'bg-primary text-primary-foreground',
        closed: 'bg-muted border border-border text-muted-foreground',
        empty: 'bg-muted border border-border text-muted-foreground',
        status: 'bg-muted border border-border text-muted-foreground',
        info: 'bg-info/10 border border-info/30 text-info',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

type BadgeProps = React.ComponentPropsWithoutRef<'div'> & VariantProps<typeof badgeVariants>

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

// Helper to determine if table is billiard from data
export const isBilliardTable = (
  tableData:
    | {
        is_billiard?: string | boolean
        nm?: string
        table_nm?: string
      }
    | null
    | undefined,
) => {
  // First check explicit is_billiard field from backend
  if (tableData?.is_billiard === 'Y' || tableData?.is_billiard === true) {
    return true
  }
  if (tableData?.is_billiard === 'N' || tableData?.is_billiard === false) {
    return false
  }
  // Fallback: check table name pattern
  const tableName = tableData?.nm || tableData?.table_nm || ''
  return /billiard|biliar/i.test(tableName)
}

type StatusBadgeProps = {
  text?: string
  isBilliard?: boolean
  tableData?: Parameters<typeof isBilliardTable>[0]
  size?: 'sm' | 'lg'
}

// StatusBadge component for table/order status display
function StatusBadge({ text, isBilliard, tableData, size = 'sm' }: StatusBadgeProps) {
  // Determine isBilliard from tableData if not explicitly provided
  const checkIsBilliard = isBilliard !== undefined ? isBilliard : isBilliardTable(tableData)

  const statusVariant = (text: string | undefined) => {
    // Handle English values from backend
    switch (text?.toUpperCase()) {
      case 'FIXED':
      case 'OPEN':
      case 'OCCUPIED':
        return 'occupied'
      case 'CLOSED':
        return 'closed'
      case 'EMPTY':
        return 'empty'
      default:
        return 'status'
    }
  }

  const statusTitle = (text: string | undefined) => {
    // Convert English to Indonesian display
    switch (text?.toUpperCase()) {
      case 'FIXED':
        // For dining tables, FIXED status should display as "Terisi" not "Durasi"
        return checkIsBilliard ? 'Durasi' : 'Terisi'
      case 'OPEN':
        return 'Aktif'
      case 'OCCUPIED':
        return 'Terisi'
      case 'CLOSED':
        return 'Tutup'
      case 'EMPTY':
        return 'Kosong'
      default:
        return text || 'Kosong'
    }
  }

  const sizeClasses = size === 'lg' ? 'text-xs px-3' : ''

  return (
    <Badge variant={statusVariant(text)} className={sizeClasses}>
      {statusTitle(text)}
    </Badge>
  )
}

export { Badge, badgeVariants, StatusBadge }
