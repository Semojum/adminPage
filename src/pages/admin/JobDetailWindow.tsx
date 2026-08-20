import { useParams } from 'react-router-dom'
import type { LayoutType } from '@/api/types'
import { useJob } from '@/api/queries'
import { Badge, Card, Def, Defs, Loading, queryFallback } from '@/components/ui'
import { WindowShell } from '@/layouts/WindowShell'
import {
  dateTime,
  duration,
  elapsedSec,
  jobStatusText,
  jobStatusTone,
  layoutLabel,
  number,
  won,
} from '@/lib/format'
import { openWindow } from '@/lib/openWindow'

/**
 * AD-T1-4 · 작업 상세 (새 창, T1-3 의 [상세 보기])
 *
 * GET /api/admin/jobs/{jobId}
 * 누가 어디서 언제 올렸는지 남깁니다 — 오류 문의가 왔을 때 환경을 재현하는 근거입니다.
 * 우리 원가와 고객 크레딧을 나란히 둡니다. 서로 다른 값이라 붙여 두어야 헷갈리지 않습니다.
 */
export function JobDetailWindow() {
  const { jobId = '' } = useParams()
  const job = useJob(jobId)

  // 에러·중단(오프라인)을 로딩보다 먼저 봅니다 — 이유 없이 스켈레톤만 도는 걸 막습니다.
  const fallback = queryFallback(job, 6)
  if (fallback || !job.data) {
    return <div className="window">{fallback ?? <Loading rows={6} />}</div>
  }

  const data = job.data
  const { processing, request } = data
  const seconds = elapsedSec(processing.startedAt, processing.finishedAt)
  const perPage = processing.costKrw !== null && processing.totalPages > 0
    ? processing.costKrw / processing.totalPages
    : null

  return (
    <WindowShell
      title={data.fileName}
      badge={
        <Badge tone={jobStatusTone({ status: data.status, failedPages: processing.failedPages })}>
          {jobStatusText({
            status: data.status,
            totalPages: processing.totalPages,
            failedPages: processing.failedPages,
          })}
        </Badge>
      }
    >
      <div className="grid-2">
        <Card title="요청 정보">
          <Defs>
            <Def label="계정">
              {request.loginId}
              {request.alias ? ` · ${request.alias}` : ''}
            </Def>
            <Def label="기관">{request.orgName}</Def>
            <Def label="요청 시각">{dateTime(request.requestedAt)}</Def>
            {/* 명세 §T1-4: 위치는 서버가 주지 않습니다. IP 를 그대로 적습니다. */}
            <Def label="IP">{request.clientIp ?? '—'}</Def>
            <Def label="접속 환경">
              {[request.clientOs, request.clientBrowser].filter(Boolean).join(' · ') || '—'}
            </Def>
          </Defs>
        </Card>

        <Card title="처리 · 비용">
          <Defs>
            <Def label="쪽수">
              {processing.totalPages}쪽 · 성공 {processing.successPages} · 실패 {processing.failedPages}
            </Def>
            <Def label="소요">
              {duration(seconds)}
              {seconds !== null && processing.totalPages > 0
                ? ` · 쪽당 ${(seconds / processing.totalPages).toFixed(1)}초`
                : ''}
            </Def>
            <Def label="원가">
              {processing.costKrw === null ? '—' : won(processing.costKrw)}
              {perPage === null ? '' : ` · 쪽당 ${won(perPage)}`}
              {processing.costUncertain ? ' (일부 미계상)' : ''}
            </Def>
            {/* 크레딧은 고객에게서 차감하는 값, 원가는 우리가 쓴 비용입니다. */}
            <Def label="크레딧">{number(processing.credits)} 크레딧 차감</Def>
            <Def label="레이아웃">
              {(Object.keys(layoutLabel) as LayoutType[])
                .filter((type) => (processing.layoutCounts[type] ?? 0) > 0)
                .map((type) => `${layoutLabel[type]} ${processing.layoutCounts[type]}`)
                .join(' · ') || '—'}
            </Def>
          </Defs>
        </Card>
      </div>

      <Card
        title="쪽별 결과"
        actions={
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => openWindow(`/admin/jobs/${jobId}/preview`, `preview-${jobId}`)}
          >
            변환 결과 보기
          </button>
        }
      >
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th className="table__num">쪽</th>
                <th>레이아웃</th>
                <th className="table__num">원가</th>
                <th className="table__num">크레딧</th>
                <th>상태</th>
                <th>사유</th>
              </tr>
            </thead>
            <tbody>
              {/* 서버가 주는 쪽 그대로 한 줄씩 봅니다. */}
              {[...data.pages]
                .sort((a, b) => a.pageNo - b.pageNo)
                .map((page) => {
                  const reason = page.reasons.length > 0 ? page.reasons.join(' · ') : null
                  const failed = page.status !== 'COMPLETED' || reason !== null
                  return (
                    <tr key={page.pageNo}>
                      <td className="num">{page.pageNo}</td>
                      <td>{page.layoutType ? layoutLabel[page.layoutType] : '—'}</td>
                      <td className="table__num">
                        {page.costKrw === null ? <span className="dash">—</span> : won(page.costKrw)}
                      </td>
                      <td className="table__num">
                        {/* 실패한 쪽은 차감하지 않습니다 — 명세 §T1-4 pages[].credit */}
                        {page.credit === null ? <span className="dash">—</span> : number(page.credit)}
                      </td>
                      <td>
                        <Badge tone={failed ? 'danger' : 'ok'}>{failed ? '실패' : '완료'}</Badge>
                      </td>
                      <td className={reason ? '' : 'dash'}>{reason ?? '—'}</td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      </Card>
    </WindowShell>
  )
}
