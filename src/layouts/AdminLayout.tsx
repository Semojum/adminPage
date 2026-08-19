import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { isMockApi } from '@/api'
import { useAuth } from '@/auth/AuthContext'
import { MockRoleSwitch } from '@/components/MockRoleSwitch'

/** 기획서 §T1: 탭 여섯 개. 한 화면에 겹쳐 놓지 않고 탭마다 화면이 하나씩입니다. */
const TABS = [
  { to: '/admin/stats', label: '통계' },
  { to: '/admin/monitoring', label: '실시간 모니터링' },
  { to: '/admin/orgs', label: '기관·계정' },
  { to: '/admin/inquiries', label: '문의' },
  { to: '/admin/notices', label: '공지' },
  { to: '/admin/analysis', label: 'ANALYSIS' },
] as const

/** 헤더 오른쪽 부제. T1-2 처럼 같은 탭 안의 하위 화면을 구분해 줍니다. */
const SUBTITLES: Record<string, string> = {
  '/admin/stats/detail': '상세 통계',
  '/admin/inquiries': '문의',
  '/admin/notices': '공지',
  '/admin/analysis': 'ANALYSIS',
}

export function AdminLayout() {
  const { pathname } = useLocation()
  const subtitle = SUBTITLES[pathname]
  const { session, logout } = useAuth()
  const navigate = useNavigate()

  const signOut = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <>
      <header className="app-header">
        <div className="app-header__bar">
          <span className="brand">세모점</span>
          <span className="brand-tag">ADMIN</span>
          <div className="app-header__right">
            {/* 한 저장소에 T1·T2 가 함께 있어, mock 으로 볼 때만 건너가는 길을 둡니다. */}
            {isMockApi && (
              <>
                <span className="mock-flag">MOCK</span>
                <MockRoleSwitch role="ROLE_ORG_ADMIN" to="/org" label="T2 기관 관리 화면" />
              </>
            )}
            <span className="app-header__title">운영자 콘솔{subtitle ? ` · ${subtitle}` : ''}</span>
            <span className="btn btn--sm">{session?.loginId}</span>
            <button type="button" className="btn btn--sm" onClick={signOut}>
              로그아웃
            </button>
          </div>
        </div>
        <nav className="nav">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) => `nav__item ${isActive ? 'nav__item--active' : ''}`}
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="page">
        <Outlet />
      </main>
    </>
  )
}
