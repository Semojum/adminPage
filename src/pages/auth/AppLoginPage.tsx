import { Link } from 'react-router-dom'
import { isMockApi } from '@/api'
import { LoginForm } from './LoginForm'

/**
 * 서비스 앱 로그인 (기획서 화면 흐름의 "기관 관리자 로그인 ROLE_ORG_ADMIN" · "점역사 로그인 ROLE_USER")
 *
 * 기관 관리자는 [기관 관리] 탭(T2)으로 들어갑니다.
 * 점역사는 [사용량](T3)으로 가야 하지만 이번 범위에 없어, 로그인 뒤 안내만 띄웁니다.
 */
export function AppLoginPage() {
  return (
    <LoginForm
      entry="app"
      host="semo-jum.com"
      title="세모점 로그인"
      description="기관 관리자·점역사 계정으로 로그인합니다."
      destinations={{ ROLE_ORG_ADMIN: '/org' }}
      demoRoles={['ROLE_ORG_ADMIN', 'ROLE_USER']}
      crossLink={
        isMockApi ? (
          <>
            세모점 운영자는 별도 주소로 들어갑니다 —{' '}
            <Link to="/login" className="table__link">
              운영자 콘솔 로그인
            </Link>
          </>
        ) : undefined
      }
    />
  )
}
