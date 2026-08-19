import { useParams } from 'react-router-dom'
import { useOrg, useOrgs } from '@/api/queries'
import { Card, Empty, ErrorBox, Loading, Meter } from '@/components/ui'
import { WindowShell } from '@/layouts/WindowShell'
import { number, usageRate } from '@/lib/format'

/**
 * AD-T1-8 · 계정 정보 (새 창, T1-6 의 계정 ID · 조회 전용)
 *
 * 계정 하나만 주는 엔드포인트는 명세에 없습니다.
 * 그래서 GET /api/admin/orgs 의 계정 줄(이번 달 사용 크레딧)과
 * GET /api/admin/orgs/{orgId} 의 기관 할당·사용량을 합쳐 보여줍니다.
 *
 * 잠금·삭제·비밀번호 재발급은 T1-6 목록에서 합니다.
 */
export function AccountInfoWindow() {
  const { loginId = '' } = useParams()
  const orgs = useOrgs()

  const org = orgs.data?.items.find((item) =>
    item.accounts.some((account) => account.loginId === loginId),
  )
  const account = org?.accounts.find((item) => item.loginId === loginId)
  const detail = useOrg(org?.orgId ?? '')

  if (orgs.isPending || (org && detail.isPending)) {
    return (
      <div className="window">
        <Loading rows={5} />
      </div>
    )
  }
  if (orgs.error) {
    return (
      <div className="window">
        <ErrorBox error={orgs.error} onRetry={orgs.refetch} />
      </div>
    )
  }
  if (!org || !account) {
    return (
      <WindowShell title={`계정 정보 — ${loginId}`}>
        <Empty title="계정을 찾지 못했습니다">
          <p>삭제되었거나 다른 기관으로 옮겨졌을 수 있습니다.</p>
        </Empty>
      </WindowShell>
    )
  }

  const allocated = detail.data?.creditAllocated ?? 0
  const orgUsed = detail.data?.creditUsed ?? org.subtotal.monthCredits

  return (
    <WindowShell title={`계정 정보 — ${account.loginId}`}>
      <Card className="card--flat">
        <div className="form">
          <div className="field">
            <span className="field__label">기관</span>
            <input className="input input--readonly" value={`${org.name} · ${org.code}`} readOnly />
          </div>
          <div className="field">
            <span className="field__label">계정 ID</span>
            <input className="input input--readonly" value={account.loginId} readOnly />
          </div>
          <div className="field">
            <span className="field__label">별칭</span>
            <input className="input input--readonly" value={account.alias ?? '—'} readOnly />
          </div>
        </div>
      </Card>

      <Card>
        <Meter
          label="기관 전체"
          used={orgUsed}
          total={allocated}
          rate={usageRate(orgUsed, allocated)}
        />
        {/* 분모는 기관 할당량입니다 — 이 계정이 기관 몫에서 얼마를 썼는지 보는 값입니다. */}
        <Meter
          label={`이 계정 (${number(account.monthCredits)} 크레딧 · 이번 달)`}
          used={account.monthCredits}
          total={allocated}
          rate={usageRate(account.monthCredits, allocated)}
        />
      </Card>

      <p className="notice-box">
        계정 창에서는 <strong>조회만</strong> 합니다. 잠금·삭제·비밀번호 재발급은 T1-6 목록에서 합니다.
      </p>
    </WindowShell>
  )
}
