import { Link } from 'react-router-dom'
import { isMockApi } from '@/api'
import { LoginForm } from './LoginForm'

/**
 * AD-T1-0 · 로그인 (웹 콘솔 진입 · ROLE_ADMIN 전용)
 *
 * 명세: POST /api/auth/login 은 공용입니다. 응답 role 이 ROLE_ADMIN 일 때만 콘솔로 들이고,
 * 그 밖의 역할은 안내 후 막습니다. 이후 /api/admin/** 호출은 JWT Bearer 로 나갑니다.
 */
export function AdminLoginPage() {
  return (
    <LoginForm
      host="admin.semo-jum.com"
      title="관리자 콘솔"
      description="운영자 계정으로 로그인"
      destinations={{ ROLE_ADMIN: '/admin/stats' }}
      footNote="운영자 권한(ROLE_ADMIN) 계정만 접근할 수 있습니다."
      demoRoles={['ROLE_ADMIN']}
      crossLink={
        isMockApi ? (
          <>
            기관 관리자·점역사는 서비스 앱으로 들어갑니다 —{' '}
            <Link to="/org/login" className="table__link">
              앱 로그인
            </Link>
          </>
        ) : undefined
      }
    />
  )
}
