import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { Role } from '@/api/types'
import { useAuth } from './AuthContext'
import { LoginLayout } from '@/pages/auth/LoginLayout'

/**
 * 역할이 맞지 않으면 해당 진입점의 로그인 화면으로 보냅니다.
 *
 * 화면에서 막는 것은 편의일 뿐입니다. 기획서 §6 대로 서버에서도 같이 막아야 합니다.
 */
export function RequireRole({ roles, loginPath }: { roles: Role[]; loginPath: string }) {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <LoginLayout>
        <div className="skeleton" style={{ height: 220 }} />
      </LoginLayout>
    )
  }

  if (!session) {
    // 돌아올 곳을 넘겨, 로그인 뒤 원래 보려던 화면으로 보냅니다.
    return <Navigate to={loginPath} replace state={{ from: location }} />
  }

  if (!roles.includes(session.role)) {
    return <Navigate to={loginPath} replace state={{ from: location, forbidden: true }} />
  }

  return <Outlet />
}
