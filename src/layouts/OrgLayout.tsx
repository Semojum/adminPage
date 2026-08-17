import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { isMockApi } from '@/api'
import { useAuth } from '@/auth/AuthContext'
import { MockRoleSwitch } from '@/components/MockRoleSwitch'

/**
 * T2 는 서비스 앱(semo-jum.com) 안의 상단 탭입니다.
 * 이 저장소에는 관리자 화면만 있으므로 변환·마이페이지는 자리만 잡아 둡니다.
 */
export function OrgLayout() {
  const { session, logout } = useAuth()
  const navigate = useNavigate()

  const signOut = async () => {
    await logout()
    navigate('/org/login', { replace: true })
  }

  return (
    <>
      <header className="app-header">
        <div className="app-header__bar">
          <span className="brand">세모점</span>
          <div className="app-header__right">
            {isMockApi && (
              <>
                <span className="mock-flag">MOCK</span>
                <MockRoleSwitch
                  role="ROLE_ADMIN"
                  entry="admin"
                  to="/admin/stats"
                  label="T1 운영자 콘솔"
                />
              </>
            )}
            <span className="btn btn--sm">{session?.displayName}</span>
            <button type="button" className="btn btn--sm" onClick={signOut}>
              로그아웃
            </button>
          </div>
        </div>
        <nav className="nav">
          <span className="nav__item" aria-disabled title="서비스 앱 화면입니다">
            변환
          </span>
          <span className="nav__item" aria-disabled title="서비스 앱 화면입니다">
            마이페이지
          </span>
          <NavLink
            to="/org"
            end
            className={({ isActive }) => `nav__item ${isActive ? 'nav__item--active' : ''}`}
          >
            기관 관리
          </NavLink>
        </nav>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </>
  )
}
