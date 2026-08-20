import { useMemo, useState } from 'react'
import type { JobStatusFilter, JobSummary } from '@/api/types'
import { MONITORING_MAX_HOURS, MONITORING_REFETCH_MS, useJobs } from '@/api/queries'
import { Badge, Card, DownloadIcon, Query } from '@/components/ui'
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

const EMPTY_FILTERS = {
  org: 'all',
  account: '',
  fileName: '',
  from: '',
  to: '',
  minCost: '',
  maxCost: '',
}

type Filters = typeof EMPTY_FILTERS

/**
 * 서버에 물어볼 조회 범위(시간).
 *
 * 명세 §T1-3: hours 기본 24, 최대 168(7일). 시작일을 고르면 그 날짜가 들어오도록 넓힙니다.
 * 7일보다 이전은 서버가 주지 않으므로 화면에서도 안내합니다.
 */
function hoursFor(from: string): number {
  if (!from) return 24
  const start = new Date(`${from}T00:00:00`)
  if (Number.isNaN(start.getTime())) return 24
  const elapsed = Math.ceil((Date.now() - start.getTime()) / 3_600_000)
  return Math.min(MONITORING_MAX_HOURS, Math.max(24, elapsed))
}

/** 고른 시작일이 서버가 주는 7일 범위를 넘었는지 */
function beyondWindow(from: string): boolean {
  if (!from) return false
  const start = new Date(`${from}T00:00:00`)
  if (Number.isNaN(start.getTime())) return false
  return Date.now() - start.getTime() > MONITORING_MAX_HOURS * 3_600_000
}

/** 날짜 문자열(yyyy-MM-dd)을 그 날의 시작/끝 시각으로 */
const dayStart = (value: string) => new Date(`${value}T00:00:00`).getTime()
const dayEnd = (value: string) => new Date(`${value}T23:59:59.999`).getTime()

function applyFilters(items: JobSummary[], filters: Filters): JobSummary[] {
  const keyword = filters.fileName.trim().toLowerCase()
  const account = filters.account.trim().toLowerCase()
  const min = filters.minCost === '' ? null : Number(filters.minCost)
  const max = filters.maxCost === '' ? null : Number(filters.maxCost)

  return items.filter((job) => {
    if (filters.org !== 'all' && job.orgName !== filters.org) return false
    if (keyword && !job.fileName.toLowerCase().includes(keyword)) return false
    if (account && !(job.loginId ?? '').toLowerCase().includes(account)) return false

    if (filters.from || filters.to) {
      // 요청 시각(startedAt) 기준입니다 — 명세도 이 값을 목록 정렬 기준으로 씁니다.
      const startedAt = job.startedAt ? new Date(job.startedAt).getTime() : null
      if (startedAt === null) return false
      if (filters.from && startedAt < dayStart(filters.from)) return false
      if (filters.to && startedAt > dayEnd(filters.to)) return false
    }

    if (min !== null || max !== null) {
      // 진행 중은 원가가 아직 없습니다(명세: 끝나야 확정) — 금액으로 거르면 빠집니다.
      if (job.costKrw === null) return false
      if (min !== null && job.costKrw < min) return false
      if (max !== null && job.costKrw > max) return false
    }

    return true
  })
}

/**
 * AD-T1-3 · 실시간 모니터링 (탭)
 *
 * GET /api/admin/jobs — 10초마다 다시 부릅니다.
 * 서버가 받는 건 status · hours · size 뿐이라, 기관·작업명·계정·원가는 화면에서 거릅니다.
 * 목록에는 재시도 버튼을 두지 않습니다(명세 확정).
 */
export function MonitoringPage() {
  const [status, setStatus] = useState<JobStatusFilter>('all')
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const toast = useToast()

  const jobs = useJobs(status, hoursFor(filters.from))

  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    setFilters((prev) => ({ ...prev, [key]: value }))

  const loaded = jobs.data?.items ?? []
  const orgNames = useMemo(
    () => [...new Set(loaded.map((job) => job.orgName).filter((name): name is string => Boolean(name)))].sort(),
    [loaded],
  )
  const visible = useMemo(() => applyFilters(loaded, filters), [loaded, filters])
  const filtered = visible.length !== loaded.length

  /** CSV 는 화면이 만듭니다 — 지금 걸린 필터 그대로. (명세: BE 엔드포인트 없음) */
  const exportCsv = () => {
    const blob = toCsvBlob(
      ['작업명', '기관', '계정', '모드', '쪽수', '소요(초)', '원가(원)', '상태', '요청 시각', '완료 시각'],
      visible.map((job) => [
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
          <button type="button" className="btn" disabled={visible.length === 0} onClick={exportCsv}>
            <DownloadIcon />
            CSV 다운로드
          </button>
        </>
      }
    >
      <div className="filters">
        <input
          className="input"
          style={{ minWidth: 180 }}
          placeholder="작업명 검색"
          value={filters.fileName}
          onChange={(event) => set('fileName', event.target.value)}
          aria-label="작업명 검색"
        />
        <input
          className="input"
          style={{ minWidth: 140 }}
          placeholder="계정 검색"
          value={filters.account}
          onChange={(event) => set('account', event.target.value)}
          aria-label="계정 검색"
        />
        <select
          className="select"
          value={filters.org}
          onChange={(event) => set('org', event.target.value)}
          aria-label="기관 필터"
        >
          <option value="all">전체 기관</option>
          {orgNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>

        <span className="filters__group">
          <span className="filters__label">기간</span>
          <input
            className="input"
            type="date"
            value={filters.from}
            onChange={(event) => set('from', event.target.value)}
            aria-label="시작일"
          />
          <span className="muted">~</span>
          <input
            className="input"
            type="date"
            value={filters.to}
            onChange={(event) => set('to', event.target.value)}
            aria-label="종료일"
          />
        </span>

        <span className="filters__group">
          <span className="filters__label">원가</span>
          <input
            className="input num"
            style={{ width: 90 }}
            type="number"
            min={0}
            placeholder="최소"
            value={filters.minCost}
            onChange={(event) => set('minCost', event.target.value)}
            aria-label="최소 원가"
          />
          <span className="muted">~</span>
          <input
            className="input num"
            style={{ width: 90 }}
            type="number"
            min={0}
            placeholder="최대"
            value={filters.maxCost}
            onChange={(event) => set('maxCost', event.target.value)}
            aria-label="최대 원가"
          />
        </span>

        <button
          type="button"
          className="btn"
          disabled={!filtered && filters.from === '' && filters.to === ''}
          onClick={() => setFilters(EMPTY_FILTERS)}
        >
          초기화
        </button>

        <span className="filters__count">
          {filtered ? `${number(visible.length)}건 / 전체 ${number(loaded.length)}건` : `${number(loaded.length)}건`}
        </span>
      </div>

      {beyondWindow(filters.from) && (
        <p className="card__note">
          서버는 최근 <strong>7일</strong>까지만 내려줍니다 — 그 이전 작업은 목록에 없습니다.
        </p>
      )}

      <Query state={jobs} rows={5}>
        {() => (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>작업명</th>
                  <th>기관</th>
                  <th>계정</th>
                  <th>모드</th>
                  <th className="table__num">쪽수</th>
                  <th className="table__num">소요</th>
                  <th className="table__num">원가</th>
                  <th>상태</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="muted">
                      {loaded.length === 0 ? '표시할 작업이 없습니다.' : '조건에 맞는 작업이 없습니다.'}
                    </td>
                  </tr>
                ) : (
                  visible.map((job) => {
                    const sec = elapsedSec(job.startedAt, job.finishedAt)
                    return (
                      <tr key={job.jobId}>
                        <td>{job.fileName}</td>
                        <td className={job.orgName ? '' : 'dash'}>{job.orgName ?? '—'}</td>
                        <td className={job.loginId ? '' : 'dash'}>{job.loginId ?? '—'}</td>
                        {/* 변환 모드 — a OCR / b 점역 / c 통합 (명세 §T1-3 mode) */}
                        <td className={job.mode ? '' : 'dash'}>{job.mode ? modeLabel[job.mode] : '—'}</td>
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
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </Query>

      <p className="card__note">
        상태는 업로드/진행 중/완료/부분 실패 · 목록에 재시도 버튼 없음 · 기관·작업명·계정·원가는 화면에서
        거릅니다(서버는 상태·기간만 받습니다) · 원가로 거르면 아직 원가가 없는 진행 중 작업은 빠집니다
      </p>
    </Card>
  )
}
