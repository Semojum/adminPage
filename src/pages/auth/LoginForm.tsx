import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { demoLoginAccounts, isMockApi } from '@/api'
import { LoginFailure, type Role, type Session } from '@/api/types'
import { useAuth, type Entry } from '@/auth/AuthContext'
import { LoginLayout } from './LoginLayout'

interface Props {
  entry: Entry
  /** 카드 위에 적는 주소 — 이 진입점이 어디인지 알려 줍니다. */
  host: string
  title: string
  description: string
  /** 이 진입점을 쓰는 역할 → 로그인 뒤 갈 곳 */
  destinations: Partial<Record<Role, string>>
  /** 목업 안내에 띄울 역할 */
  demoRoles: Role[]
  /** 다른 진입점으로 건너가는 링크 */
  crossLink?: ReactNode
}

export function LoginForm({
  entry,
  host,
  title,
  description,
  destinations,
  demoRoles,
  crossLink,
}: Props) {
  const { login, logout, loggingIn, session } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const formId = useId()

  const [accountId, setAccountId] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(
    // 권한이 없어 되돌려 보내진 경우엔 이유를 먼저 알려 줍니다.
    (location.state as { forbidden?: boolean } | null)?.forbidden
      ? '이 화면을 볼 수 있는 계정으로 로그인해 주세요.'
      : null,
  )
  /** 로그인은 됐지만 이 빌드에 갈 화면이 없는 경우 (점역사 · T3) */
  const [noDestination, setNoDestination] = useState<Session | null>(null)

  const goAfterLogin = (next: Session) => {
    const destination = destinations[next.role]
    if (!destination) {
      setNoDestination(next)
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
      goAfterLogin(await login(entry, { accountId, password }))
    } catch (caught) {
      setError(
        caught instanceof LoginFailure
          ? caught.message
          : '로그인하지 못했습니다. 잠시 뒤 다시 시도해 주세요.',
      )
    }
  }

  // 이미 로그인한 채로 로그인 화면에 들어왔으면 곧바로 제 화면으로 보냅니다.
  const alreadyIn = session && !noDestination ? destinations[session.role] : undefined
  if (alreadyIn) return <Navigate to={alreadyIn} replace />


  if (noDestination) {
    return (
      <LoginLayout>
        <LoginHeader host={host} title={title} description={description} />
        <p className="notice-box">
          <strong>{noDestination.displayName}</strong> 은 점역사(ROLE_USER) 계정입니다. 로그인은
          되었지만, 점역사가 보는 <strong>T3 사용량</strong> 화면은 이번 범위에 없습니다.
        </p>
        <button
          type="button"
          className="btn btn--primary btn--block"
          onClick={async () => {
            await logout()
            setNoDestination(null)
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
            value={accountId}
            onChange={(event) => setAccountId(event.target.value)}
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

        {error && (
          <p className="error-box" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          className="btn btn--primary btn--block btn--tall"
          disabled={!accountId || !password || loggingIn}
        >
          {loggingIn ? '확인 중…' : '로그인'}
        </button>
      </form>

      <p className="login__foot">
        비밀번호는 세모점이 발급합니다. 잊었으면 담당자에게 재발급을 요청해 주세요.
      </p>

      {crossLink && <p className="login__foot">{crossLink}</p>}

      {isMockApi && <MockAccountHint roles={demoRoles} />}
    </LoginLayout>
  )
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

/** 목업 모드에서만 보이는 안내. 실제 인증이 붙으면 사라집니다. */
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
          <li key={account.accountId}>
            <code>{account.accountId}</code>
            <code>{account.password}</code>
            <span>{account.hint}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
