import { Link } from 'react-router-dom'
import { isMockApi } from '@/api'
import { LoginForm } from './LoginForm'

/**
 * 운영자 콘솔 로그인 (기획서 화면 흐름의 "로그인 ROLE_ADMIN")
 *
 * §6 권한별 진입 분리: 관리자 페이지는 앱과 다른 주소로 띄웁니다.
 * 그래서 기관 관리자·점역사 계정은 여기서 막고, 서버도 같이 막아야 합니다.
 */
export function AdminLoginPage() {
  return (
    <LoginForm
      entry="admin"
      host="admin.semo-jum.com"
      title="운영자 콘솔"
      description="세모점 운영자 계정으로 로그인합니다."
      destinations={{ ROLE_ADMIN: '/admin/stats' }}
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
