import { useEffect, type ReactNode } from 'react'

export function Modal({
  title,
  open,
  onClose,
  footer,
  children,
  width = 460,
}: {
  title: string
  open: boolean
  onClose: () => void
  footer?: ReactNode
  children: ReactNode
  width?: number
}) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.32)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        zIndex: 40,
      }}
    >
      <div
        role="dialog"
        aria-modal
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        style={{
          background: 'var(--surface)',
          borderRadius: 'var(--radius)',
          width,
          maxWidth: '100%',
          maxHeight: '100%',
          overflowY: 'auto',
          boxShadow: '0 24px 60px rgba(15, 23, 42, 0.24)',
          padding: '22px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <h2 className="card__title">{title}</h2>
        {children}
        {footer && <div className="form__footer">{footer}</div>}
      </div>
    </div>
  )
}

/** 삭제처럼 되돌리기 어려운 조작 앞에 한 번 물어봅니다. */
export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = '확인',
  danger = false,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  message: ReactNode
  confirmLabel?: string
  danger?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            className={danger ? 'btn btn--danger' : 'btn btn--primary'}
            onClick={() => {
              onConfirm()
              onClose()
            }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p style={{ fontSize: 13, color: 'var(--sub)' }}>{message}</p>
    </Modal>
  )
}
