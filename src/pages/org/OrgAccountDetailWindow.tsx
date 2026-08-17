import { useParams } from 'react-router-dom'
import { useOrgAccountDetail } from '@/api/queries'
import { Badge, Card, ErrorBox, Loading, Meter } from '@/components/ui'
import { WindowShell } from '@/layouts/WindowShell'
import { jobStatusText, jobStatusTone, number } from '@/lib/format'

/**
 * T2-2 · 계정 상세 (새 창, T2 의 계정 ID)
 *
 * 기획서: 크레딧을 함께 적어 어떤 작업이 비쌌는지 바로 압니다.
 * 기관 담당자는 목록과 크레딧까지 봅니다 — 파일 내용과 접속 정보는 보이지 않습니다.
 */
export function OrgAccountDetailWindow() {
  const { accountId = '' } = useParams()
  const account = useOrgAccountDetail(accountId)

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
    <WindowShell title={`계정 상세 — ${data.accountId}${data.alias ? ` · ${data.alias}` : ''}`}>
      <div className="grid-2">
        <Card className="card--flat">
          <div className="form">
            <div className="field">
              <span className="field__label">기관</span>
              <input className="input input--readonly" value={data.orgName} readOnly />
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

        <Card className="card--flat">
          <Meter
            label="기관 할당 대비 이 계정"
            used={data.credit.used}
            total={data.credit.total}
            rate={data.credit.rate}
          />
        </Card>
      </div>

      <Card
        title="이 계정의 작업"
        actions={
          <span className="btn">
            {data.range.from} ~ {data.range.to}
          </span>
        }
      >
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>작업명</th>
                <th>상태</th>
                <th className="table__num">쪽수</th>
                <th className="table__num">크레딧</th>
                <th>완료</th>
              </tr>
            </thead>
            <tbody>
              {data.jobs.map((job) => (
                <tr key={job.id}>
                  <td>{job.fileName}</td>
                  <td>
                    <Badge tone={jobStatusTone(job.status)}>{jobStatusText(job)}</Badge>
                  </td>
                  <td className="table__num">{number(job.pages)}</td>
                  <td className="table__num">
                    {job.credit === null ? <span className="dash">—</span> : number(job.credit)}
                  </td>
                  <td className={job.completedAt ? '' : 'dash'}>{job.completedAt ?? '—'}</td>
                </tr>
              ))}
              <tr className="table__total">
                <td>기간 합계</td>
                <td className="dash">—</td>
                <td className="table__num">{number(data.total.pages)}</td>
                <td className="table__num">{number(data.total.credit)}</td>
                <td className="dash">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <p className="notice-box">
        기관 담당자는 <strong>목록과 크레딧까지</strong> 봅니다. 파일 내용과 접속 정보는 보이지 않습니다.
      </p>
    </WindowShell>
  )
}
