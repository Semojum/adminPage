import { useParams } from 'react-router-dom'
import { useAdminAccount } from '@/api/queries'
import { Card, ErrorBox, Loading, Meter } from '@/components/ui'
import { WindowShell } from '@/layouts/WindowShell'

/**
 * T1-8 · 계정 정보 (새 창, T1-6 의 계정 ID)
 *
 * 기획서: 기관 전체 사용량 위에 이 계정 몫을 겹쳐 봅니다. 조회 전용 창입니다.
 * 잠금·삭제·비밀번호 재발급은 T1-6 목록에서 합니다.
 */
export function AccountInfoWindow() {
  const { accountId = '' } = useParams()
  const account = useAdminAccount(accountId)

  if (account.isPending) {
    return (
      <div className="window">
        <Loading rows={5} />
      </div>
    )
  }
  if (account.error || !account.data) {
    return (
      <div className="window">
        <ErrorBox error={account.error} onRetry={account.refetch} />
      </div>
    )
  }

  const data = account.data

  return (
    <WindowShell title={`계정 정보 — ${data.accountId}`}>
      <Card className="card--flat">
        <div className="form">
          <div className="field">
            <span className="field__label">기관</span>
            <input className="input input--readonly" value={`${data.orgName} · ${data.orgCode}`} readOnly />
          </div>
          <div className="field">
            <span className="field__label">계정 ID</span>
            <input className="input input--readonly" value={data.accountId} readOnly />
          </div>
          <div className="field">
            <span className="field__label">별칭</span>
            <input className="input input--readonly" value={data.alias ?? '—'} readOnly />
          </div>
        </div>
      </Card>

      <Card>
        <Meter
          label="기관 전체"
          used={data.orgCredit.used}
          total={data.orgCredit.total}
          rate={data.orgCredit.rate}
        />
        <Meter
          label="이 계정"
          used={data.accountCredit.used}
          total={data.accountCredit.total}
          rate={data.accountCredit.rate}
        />
      </Card>

      <p className="notice-box">
        계정 창에서는 <strong>조회만</strong> 합니다. 잠금·삭제·비밀번호 재발급은 T1-6 목록에서 합니다.
      </p>
    </WindowShell>
  )
}
