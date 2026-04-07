import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmLabel?: string
  variant?: 'danger' | 'warning' | 'default'
  onConfirm: () => void
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  variant = 'danger',
  onConfirm,
}: ConfirmDialogProps) {
  function handleConfirm() {
    onConfirm()
    onOpenChange(false)
  }

  const confirmClass =
    variant === 'danger'
      ? 'bg-red-500 hover:bg-red-600 text-white'
      : variant === 'warning'
      ? 'bg-amber-500 hover:bg-amber-600 text-white'
      : 'bg-gray-800 hover:bg-gray-900 text-white'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-sm">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 flex-shrink-0 rounded-full p-1.5 ${
              variant === 'danger' ? 'bg-red-50 text-red-500' :
              variant === 'warning' ? 'bg-amber-50 text-amber-500' :
              'bg-gray-100 text-gray-500'
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <DialogTitle>{title}</DialogTitle>
              {description && (
                <DialogDescription>{description}</DialogDescription>
              )}
            </div>
          </div>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className={confirmClass} onClick={handleConfirm}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
