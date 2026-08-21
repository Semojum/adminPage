import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { demoLoginAccounts, isMockApi } from '@/api'
import { LoginFailure, type Role, type Session } from '@/api/types'
import { useAuth } from '@/auth/AuthContext'
import { LoginLayout } from './LoginLayout'

interface Props {
  /** 카드 위에 적는 주소 — 이 진입점이 어디인지 알려 줍니다. */
  host: string
  title: string
  description: string
  /** 이 진입점을 쓰는 역할 → 로그인 뒤 갈 곳. 여기 없는 역할은 안내 후 막습니다. */
  destinations: Partial<Record<Role, string>>
  /** 카드 아래 안내 문구 */
  footNote: ReactNode
  /** 목업 안내에 띄울 역할 */
  demoRoles: Role[]
  /** 다른 진입점으로 건너가는 링크 */
  crossLink?: ReactNode
}

/**
 * 로그인 (AD-T1-0 · V3-01).
 *
 * 명세 §로그인: POST /api/auth/login 하나로 모두 로그인하고, **응답 role 로 화면이 갈립니다.**
 * 그래서 "로그인은 됐지만 이 주소에 들어올 수 없는" 경우를 화면이 직접 안내합니다.
 */
export function LoginForm({
  host,
  title,
  description,
  destinations,
  footNote,
  demoRoles,
  crossLink,
}: Props) {
  const { login, logout, loggingIn, session } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const formId = useId()

  const [loginId, setLoginId] = useState('')
  const [password, setPassword] = useState('')
  // 기기 MAC (V28) — 웹 콘솔 로그인은 등록 기기만 허용됩니다. 최초 1회 입력하면 이 브라우저에 저장됩니다.
  const [deviceMac, setDeviceMac] = useState(() => localStorage.getItem(DEVICE_MAC_KEY) ?? '')
  const [error, setError] = useState<string | null>(
    (location.state as { forbidden?: boolean } | null)?.forbidden
      ? '이 화면을 볼 수 있는 계정으로 로그인해 주세요.'
      : null,
  )
  /** 로그인은 됐지만 이 진입점이 받지 않는 역할 */
  const [wrongEntry, setWrongEntry] = useState<Session | null>(null)

  const goAfterLogin = (next: Session) => {
    const destination = destinations[next.role]
    if (!destination) {
      setWrongEntry(next)
      return
    }
    // 로그인하러 튕겨 나온 화면이 있으면 그곳으로 되돌려 보냅니다.
    const from = (location.state as { from?: { pathname: string } } | null)?.from
    navigate(from?.pathname ?? destination, { replace: true })
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError(null)
    try {
      const mac = deviceMac.trim()
      localStorage.setItem(DEVICE_MAC_KEY, mac)
      goAfterLogin(await login({ loginId, password, deviceMac: mac || undefined }))
    } catch (caught) {
      setError(
        caught instanceof LoginFailure
          ? caught.message
          : '로그인하지 못했습니다. 잠시 뒤 다시 시도해 주세요.',
      )
    }
  }

  // 이미 로그인한 채로 로그인 화면에 들어왔으면 곧바로 제 화면으로 보냅니다.
  const alreadyIn = session && !wrongEntry ? destinations[session.role] : undefined
  if (alreadyIn) return <Navigate to={alreadyIn} replace />

  if (wrongEntry) {
    return (
      <LoginLayout>
        <LoginHeader host={host} title={title} description={description} />
        <p className="notice-box">
          <strong>{wrongEntry.loginId}</strong> 은 <strong>{ROLE_LABEL[wrongEntry.role]}</strong> 계정입니다.
          {' '}
          {ENTRY_HINT[wrongEntry.role]}
        </p>
        <button
          type="button"
          className="btn btn--primary btn--block"
          onClick={async () => {
            await logout()
            setWrongEntry(null)
            setPassword('')
          }}
        >
          다른 계정으로 로그인
        </button>
      </LoginLayout>
    )
  }

  return (
    <LoginLayout>
      <LoginHeader host={host} title={title} description={description} />

      <form className="login__form" onSubmit={submit}>
        <div className="login__field">
          <label className="login__label" htmlFor={`${formId}-id`}>
            아이디
          </label>
          <input
            id={`${formId}-id`}
            className="input"
            autoComplete="username"
            autoFocus
            placeholder="admin01"
            value={loginId}
            onChange={(event) => setLoginId(event.target.value)}
          />
        </div>

        <div className="login__field">
          <label className="login__label" htmlFor={`${formId}-pw`}>
            비밀번호
          </label>
          <input
            id={`${formId}-pw`}
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <div className="login__field">
          <label className="login__label" htmlFor={`${formId}-mac`}>
            기기 MAC 주소
          </label>
          <input
            id={`${formId}-mac`}
            className="input"
            placeholder="74:a6:cd:cf:4d:3a"
            value={deviceMac}
            onChange={(event) => setDeviceMac(event.target.value)}
          />
          <p className="login__desc">
            등록된 기기에서만 로그인할 수 있습니다. 한 번 입력하면 이 브라우저에 저장됩니다.
          </p>
        </div>

        {error && (
          <p className="error-box" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="btn btn--primary btn--block btn--tall"
          disabled={!loginId || !password || loggingIn}
        >
          {loggingIn ? '확인 중…' : '로그인'}
        </button>
      </form>

      <p className="login__foot">{footNote}</p>

      {crossLink && <p className="login__foot">{crossLink}</p>}

      {isMockApi && <MockAccountHint roles={demoRoles} />}
    </LoginLayout>
  )
}

/** 기기 MAC 저장 키 — 팀원마다 자기 기기에서 한 번만 입력하면 됩니다. */
const DEVICE_MAC_KEY = 'semojum.deviceMac'

const ROLE_LABEL: Record<Role, string> = {
  ROLE_ADMIN: '세모점 운영자',
  ROLE_ORG_ADMIN: '기관 관리자',
  ROLE_USER: '점역사',
}

const ENTRY_HINT: Record<Role, string> = {
  ROLE_ADMIN: '운영자 콘솔(admin.semo-jum.com)로 들어가 주세요.',
  ROLE_ORG_ADMIN: '서비스 앱의 [기관 관리] 탭에서 볼 수 있습니다.',
  ROLE_USER: '점역사가 보는 사용량(T3) 화면은 이번 범위에 없습니다.',
}

function LoginHeader({
  host,
  title,
  description,
}: {
  host: string
  title: string
  description: string
}) {
  return (
    <header className="login__head">
      <div className="login__brand">
        <span className="brand">세모점</span>
        <span className="login__host">{host}</span>
      </div>
      <h1 className="login__title">{title}</h1>
      <p className="login__desc">{description}</p>
    </header>
  )
}

/** 목업 모드에서만 보이는 안내. 실제 서버를 쓰면 사라집니다. */
function MockAccountHint({ roles }: { roles: Role[] }) {
  const accounts = demoLoginAccounts.filter((account) => roles.includes(account.role))
  if (accounts.length === 0) return null

  return (
    <div className="login__mock">
      <div className="login__mock-head">
        <span className="mock-flag">MOCK</span>
        <span>아래 계정으로 들어갈 수 있습니다</span>
      </div>
      <ul className="login__mock-list">
        {accounts.map((account) => (
          <li key={account.loginId}>
            <code>{account.loginId}</code>
            <code>{account.password}</code>
            <span>{account.hint}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
