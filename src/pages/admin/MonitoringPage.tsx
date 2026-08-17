import { useState } from 'react'
import { api } from '@/api'
import type { JobStatus } from '@/api/types'
import { MONITORING_REFETCH_MS, useJobs } from '@/api/queries'
import { Badge, Card, Query } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { downloadBlob, duration, jobStatusText, jobStatusTone, number, won } from '@/lib/format'
import { openWindow } from '@/lib/openWindow'

const STATUS_OPTIONS = [
  { value: 'all', label: '전체 상태' },
  { value: 'uploaded', label: '업로드' },
  { value: 'processing', label: '진행 중' },
  { value: 'done', label: '완료' },
  { value: 'partialFailed', label: '부분 실패' },
] as const

/**
 * T1-3 · 실시간 모니터링 (탭)
 *
 * 기획서: 지금 서버에서 벌어지는 일을 봅니다. 10초마다 값이 갱신됩니다.
 * 계정 아이디는 빼고 기관만 둡니다. 목록에는 재시도 버튼을 두지 않습니다.
 */
export function MonitoringPage() {
  const [status, setStatus] = useState<JobStatus | 'all'>('all')
  const jobs = useJobs(status)
  const toast = useToast()

  const exportCsv = async () => {
    // 화면에 걸린 필터 그대로 내려받습니다. (기획서 §6)
    const blob = await api.admin.exportJobsCsv({ status })
    downloadBlob(blob, `모니터링_${status}.csv`)
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
            onChange={(e) => setStatus(e.target.value as JobStatus | 'all')}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button type="button" className="btn" onClick={exportCsv}>
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
                  <th className="table__num">쪽수</th>
                  <th className="table__num">소요</th>
                  <th className="table__num">원가</th>
                  <th>상태</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.items.map((job) => (
                  <tr key={job.id}>
                    <td>{job.fileName}</td>
                    <td>{job.orgName}</td>
                    <td className="table__num">{number(job.pages)}</td>
                    {/* 진행 중이면 소요·원가는 —. 끝나야 확정됩니다. (기획서 §6) */}
                    <td className="table__num">
                      {job.durationSec === null ? <span className="dash">—</span> : duration(job.durationSec)}
                    </td>
                    <td className="table__num">
                      {job.cost === null ? <span className="dash">—</span> : won(job.cost)}
                    </td>
                    <td>
                      <Badge tone={jobStatusTone(job.status)}>{jobStatusText(job)}</Badge>
                    </td>
                    <td className="table__actions">
                      <button
                        type="button"
                        className="btn btn--sm"
                        onClick={() => openWindow(`/admin/jobs/${job.id}`, `job-${job.id}`)}
                      >
                        상세 보기
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Query>
    </Card>
  )
}
