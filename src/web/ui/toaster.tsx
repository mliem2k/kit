import { useToast } from '../hooks/use-toast'
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from './toast'

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, ...props }) => (
        <Toast key={id} {...props}>
          {/* Grows to fill the row. The close button is absolutely positioned,
              so this is the only child in flow and would otherwise shrink to
              its text and sit against the left edge, leaving a toast with
              centred content unable to centre on anything. Text stays
              left aligned by default, so toasts that want that are unchanged. */}
          <div className="grid flex-1 gap-1 min-w-0">
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && <ToastDescription>{description}</ToastDescription>}
          </div>
          {action}
          <ToastClose />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  )
}
