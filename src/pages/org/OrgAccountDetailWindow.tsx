import { useParams } from 'react-router-dom'
import { useOrgAccountJobs, useOrgAccounts, useOrgDashboard } from '@/api/queries'
import { Badge, Card, ErrorBox, Loading, Meter } from '@/components/ui'
import { WindowShell } from '@/layouts/WindowShell'
import { date, jobStatusText, jobStatusTone, number, shortDate, usageRate } from '@/lib/format'

/**
 * T2-2 · 계정 상세 (새 창, T2 의 계정 ID)
 *
 * GET /api/org/accounts/{loginId}/jobs?from=&to=  (기간 미지정이면 최근 30일)
 * 기관 담당자는 목록·상태·크레딧까지 봅니다 — 파일 내용과 접속 정보는 보이지 않습니다(열람 범위).
 */
export function OrgAccountDetailWindow() {
  const { loginId = '' } = useParams()
  const jobs = useOrgAccountJobs(loginId)
  const dashboard = useOrgDashboard()
  const accounts = useOrgAccounts()

  if (jobs.isPending) {
    return (
      <div className="window">
        <Loading rows={5} />
      </div>
    )
  }
  if (jobs.error || !jobs.data) {
    return (
      <div className="window">
        <ErrorBox error={jobs.error} onRetry={jobs.refetch} />
      </div>
    )
  }

  const data = jobs.data
  const allocated = dashboard.data?.creditAllocated ?? 0
  // 게이지는 이번 달 사용량으로 봅니다 — 아래 표의 기간 합계와는 기준이 다릅니다.
  const monthCredits =
    accounts.data?.items.find((account) => account.loginId === loginId)?.monthCredits ?? data.totalCredits

  return (
    <WindowShell title={`계정 상세 — ${data.loginId}${data.alias ? ` · ${data.alias}` : ''}`}>
      <div className="grid-2">
        <Card className="card--flat">
          <div className="form">
            <div className="field">
              <span className="field__label">기관</span>
              <input className="input input--readonly" value={dashboard.data?.orgName ?? '—'} readOnly />
            </div>
            <div className="field">
              <span className="field__label">계정 ID</span>
              <input className="input input--readonly" value={data.loginId} readOnly />
            </div>
            <div className="field">
              <span className="field__label">별칭</span>
              <input className="input input--readonly" value={data.alias ?? '—'} readOnly />
            </div>
          </div>
        </Card>

        <Card className="card--flat">
          {/* 분모는 기관 할당량입니다 — 기관 몫에서 이 계정이 얼마를 썼는지 보는 값입니다. */}
          <Meter
            label="기관 할당 대비 이 계정 (이번 달)"
            used={monthCredits}
            total={allocated}
            rate={usageRate(monthCredits, allocated)}
          />
        </Card>
      </div>

      <Card
        title="이 계정의 작업"
        actions={
          <span className="btn">
            {date(data.from)} ~ {date(data.to)}
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
              {data.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted">
                    이 기간에 처리한 작업이 없습니다.
                  </td>
                </tr>
              ) : (
                data.items.map((job) => (
                  <tr key={job.jobId}>
                    <td>{job.fileName}</td>
                    <td>
                      <Badge tone={jobStatusTone(job)}>{jobStatusText(job)}</Badge>
                    </td>
                    <td className="table__num">{number(job.totalPages)}</td>
                    {/* 진행 중이면 크레딧은 —. 끝나야 확정됩니다. */}
                    <td className="table__num">
                      {job.credits === null ? <span className="dash">—</span> : number(job.credits)}
                    </td>
                    <td className={job.finishedAt ? '' : 'dash'}>{shortDate(job.finishedAt)}</td>
                  </tr>
                ))
              )}
              <tr className="table__total">
                <td>기간 합계</td>
                <td className="dash">—</td>
                <td className="table__num">{number(data.totalPages)}</td>
                <td className="table__num">{number(data.totalCredits)}</td>
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
