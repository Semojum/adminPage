import { useState } from 'react'
import type { JobStatusFilter, JobSummary } from '@/api/types'
import { MONITORING_REFETCH_MS, useJobs } from '@/api/queries'
import { Badge, Card, Query } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { toCsvBlob } from '@/lib/csv'
import {
  dateTime,
  downloadBlob,
  duration,
  elapsedSec,
  jobStatusText,
  jobStatusTone,
  modeLabel,
  number,
  won,
} from '@/lib/format'
import { openWindow } from '@/lib/openWindow'

const STATUS_OPTIONS = [
  { value: 'all', label: '전체 상태' },
  { value: 'PENDING', label: '업로드' },
  { value: 'IN_PROGRESS', label: '진행 중' },
  { value: 'COMPLETED', label: '완료' },
  { value: 'FAILED', label: '실패' },
] as const satisfies ReadonlyArray<{ value: JobStatusFilter; label: string }>

const STATUS_FILE_NAME: Record<JobStatusFilter, string> = {
  all: '전체',
  PENDING: '업로드',
  IN_PROGRESS: '진행중',
  COMPLETED: '완료',
  FAILED: '실패',
}

/**
 * AD-T1-3 · 실시간 모니터링 (탭)
 *
 * GET /api/admin/jobs — 10초마다 다시 부릅니다.
 * 계정 아이디는 빼고 기관만 둡니다. 목록에는 재시도 버튼을 두지 않습니다(명세 확정).
 */
export function MonitoringPage() {
  const [status, setStatus] = useState<JobStatusFilter>('all')
  const jobs = useJobs(status)
  const toast = useToast()

  /** CSV 는 화면이 만듭니다 — 지금 걸린 필터 그대로. (명세: BE 엔드포인트 없음) */
  const exportCsv = (items: JobSummary[]) => {
    const blob = toCsvBlob(
      ['작업명', '기관', '계정', '모드', '쪽수', '소요(초)', '원가(원)', '상태', '요청 시각', '완료 시각'],
      items.map((job) => [
        job.fileName,
        job.orgName ?? '',
        job.loginId ?? '',
        job.mode ? modeLabel[job.mode] : '',
        job.totalPages,
        elapsedSec(job.startedAt, job.finishedAt) ?? '',
        job.costKrw === null ? '' : Math.round(job.costKrw),
        jobStatusText(job),
        dateTime(job.startedAt),
        dateTime(job.finishedAt),
      ]),
    )
    downloadBlob(blob, `모니터링_${STATUS_FILE_NAME[status]}.csv`)
    toast('CSV 를 내려받았습니다.')
  }

  return (
    <Card
      title="실시간 모니터링"
      note={`${MONITORING_REFETCH_MS / 1000}초마다 자동 갱신`}
      actions={
        <>
          <select
            className="select"
            style={{ width: 'auto' }}
            value={status}
            onChange={(event) => setStatus(event.target.value as JobStatusFilter)}
            aria-label="상태 필터"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn"
            disabled={!jobs.data?.items.length}
            onClick={() => exportCsv(jobs.data?.items ?? [])}
          >
            CSV
          </button>
        </>
      }
    >
      <Query state={jobs} rows={5}>
        {(data) => (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>작업명</th>
                  <th>기관</th>
                  <th>모드</th>
                  <th className="table__num">쪽수</th>
                  <th className="table__num">소요</th>
                  <th className="table__num">원가</th>
                  <th>상태</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.items.map((job) => {
                  const sec = elapsedSec(job.startedAt, job.finishedAt)
                  return (
                    <tr key={job.jobId}>
                      <td>{job.fileName}</td>
                      <td className={job.orgName ? '' : 'dash'}>{job.orgName ?? '—'}</td>
                      {/* 변환 모드 — a OCR / b 점역 / c 통합 (명세 §T1-3 mode) */}
                      <td className={job.mode ? '' : 'dash'}>
                        {job.mode ? modeLabel[job.mode] : '—'}
                      </td>
                      <td className="table__num">{number(job.totalPages)}</td>
                      {/* 진행 중이면 소요·원가는 —. 끝나야 확정됩니다. (명세 §T1-3) */}
                      <td className="table__num">
                        {sec === null ? <span className="dash">—</span> : duration(sec)}
                      </td>
                      <td className="table__num">
                        {job.costKrw === null ? <span className="dash">—</span> : won(job.costKrw)}
                      </td>
                      <td>
                        <Badge tone={jobStatusTone(job)}>{jobStatusText(job)}</Badge>
                      </td>
                      <td className="table__actions">
                        <button
                          type="button"
                          className="btn btn--sm"
                          onClick={() => openWindow(`/admin/jobs/${job.jobId}`, `job-${job.jobId}`)}
                        >
                          상세 보기
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Query>

      <p className="card__note">
        기관만 표시(계정은 상세에서) · 상태는 업로드/진행 중/완료/부분 실패 · 목록에 재시도 버튼 없음
      </p>
    </Card>
  )
}
