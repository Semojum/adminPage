import type { ReactNode } from 'react'

/** 로그인 화면 껍데기. 탭도 헤더도 없이 카드 하나만 둡니다. */
export function LoginLayout({ children }: { children: ReactNode }) {
  return (
    <div className="login">
      <div className="login__card">{children}</div>
    </div>
  )
}
