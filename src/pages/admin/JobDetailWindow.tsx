import { useParams } from 'react-router-dom'
import type { JobPageResult, LayoutType } from '@/api/types'
import { useJob } from '@/api/queries'
import { Badge, Card, Def, Defs, ErrorBox, Loading } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { WindowShell } from '@/layouts/WindowShell'
import { toCsvBlob } from '@/lib/csv'
import {
  dateTime,
  downloadBlob,
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
 * 쪽별 결과 묶음.
 *
 * 서버는 쪽 단위로 내려주고, 화면이 "같은 유형·같은 결과"끼리 묶어 "1~7", "11 · 13" 처럼 적습니다.
 * (Figma AD-T1-4 의 표기)
 */
interface PageGroup {
  key: string
  pages: number[]
  layoutType: LayoutType | null
  costKrw: number
  failed: boolean
  reason: string | null
}

function groupPages(pages: JobPageResult[]): PageGroup[] {
  const groups = new Map<string, PageGroup>()
  for (const page of pages) {
    const reason = page.reasons.length > 0 ? page.reasons.join(' · ') : null
    const key = `${page.layoutType ?? '-'}|${reason ?? ''}`
    const found = groups.get(key)
    if (found) {
      found.pages.push(page.pageNo)
      found.costKrw += page.costKrw ?? 0
    } else {
      groups.set(key, {
        key,
        pages: [page.pageNo],
        layoutType: page.layoutType,
        costKrw: page.costKrw ?? 0,
        failed: reason !== null,
        reason,
      })
    }
  }
  // 표는 쪽 번호 순으로 보여줍니다.
  return [...groups.values()].sort((a, b) => a.pages[0] - b.pages[0])
}

/** [1,2,3,5] → "1~3 · 5" */
function pageRange(pages: number[]): string {
  const sorted = [...pages].sort((a, b) => a - b)
  const runs: number[][] = []
  for (const page of sorted) {
    const last = runs[runs.length - 1]
    if (last && page === last[last.length - 1] + 1) last.push(page)
    else runs.push([page])
  }
  return runs
    .map((run) => (run.length > 1 ? `${run[0]}~${run[run.length - 1]}` : `${run[0]}`))
    .join(' · ')
}

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
  const toast = useToast()

  if (job.isPending) {
    return (
      <div className="window">
        <Loading rows={6} />
      </div>
    )
  }
  if (job.error || !job.data) {
    return (
      <div className="window">
        <ErrorBox error={job.error} onRetry={job.refetch} />
      </div>
    )
  }

  const data = job.data
  const { processing, request } = data
  const groups = groupPages(data.pages)
  const seconds = elapsedSec(processing.startedAt, processing.finishedAt)
  const perPage = processing.costKrw !== null && processing.totalPages > 0
    ? processing.costKrw / processing.totalPages
    : null

  const exportCsv = () => {
    const blob = toCsvBlob(
      ['쪽', '레이아웃', '원가(원)', '상태', '사유'],
      groups.map((group) => [
        pageRange(group.pages),
        group.layoutType ? layoutLabel[group.layoutType] : '',
        Math.round(group.costKrw),
        group.failed ? '실패' : '완료',
        group.reason ?? '',
      ]),
    )
    downloadBlob(blob, `${data.fileName}_쪽별결과.csv`)
    toast('CSV 를 내려받았습니다.')
  }

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
      actions={
        <button type="button" className="btn" onClick={exportCsv}>
          CSV
        </button>
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
                <th>쪽</th>
                <th>레이아웃</th>
                <th className="table__num">원가</th>
                <th>상태</th>
                <th>사유</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <tr key={group.key}>
                  <td>{pageRange(group.pages)}</td>
                  <td>{group.layoutType ? layoutLabel[group.layoutType] : '—'}</td>
                  <td className="table__num">{won(group.costKrw)}</td>
                  <td>
                    <Badge tone={group.failed ? 'danger' : 'ok'}>{group.failed ? '실패' : '완료'}</Badge>
                  </td>
                  <td className={group.reason ? '' : 'dash'}>{group.reason ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </WindowShell>
  )
}
