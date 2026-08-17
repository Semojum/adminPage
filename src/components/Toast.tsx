import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'

const ToastContext = createContext<(message: string) => void>(() => {})

/** 발급·기록·등록처럼 결과가 화면에 바로 안 보이는 조작을 알려 줍니다. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()

  const show = useCallback((text: string) => {
    setMessage(text)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setMessage(null), 2600)
  }, [])

  const value = useMemo(() => show, [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {message && (
        <div className="toast" role="status">
          {message}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
