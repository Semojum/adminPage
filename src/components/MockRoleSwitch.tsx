import { demoLoginAccounts, isMockApi } from '@/api'
import type { Role } from '@/api/types'
import { useAuth, type Entry } from '@/auth/AuthContext'

/**
 * 목업 전용 화면 전환 버튼.
 *
 * 실제로는 T1(admin.semo-jum.com)과 T2(semo-jum.com)가 다른 주소이고 로그인도 따로입니다.
 * 여기서는 한 저장소에 둘 다 있어서, 검토할 때 계정을 다시 입력하지 않고 건너갈 수 있게 둡니다.
 * VITE_API_SOURCE=http 이면 렌더링되지 않습니다.
 */
export function MockRoleSwitch({
  role,
  entry,
  to,
  label,
}: {
  /** 어떤 역할로 바꿔 들어갈지 */
  role: Role
  /** 그 역할이 쓰는 로그인 진입점 */
  entry: Entry
  to: string
  label: string
}) {
  const { login } = useAuth()

  const account = demoLoginAccounts.find((item) => item.role === role)
  if (!isMockApi || !account) return null

  const switchRole = async () => {
    await login(entry, { accountId: account.accountId, password: account.password })
    // 통째로 다시 띄웁니다. 지금 화면을 지키는 가드가 새 역할을 보고 로그인으로 돌려보내는 것을 피하려는 것입니다.
    window.location.assign(to)
  }

  return (
    <button type="button" className="btn btn--sm" onClick={switchRole} title="목업 전용 · 계정을 바꿔 들어갑니다">
      {label}
    </button>
  )
}
