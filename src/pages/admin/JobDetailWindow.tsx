import { useParams } from 'react-router-dom'
import { api } from '@/api'
import { useJob } from '@/api/queries'
import { Badge, Card, Def, Defs, ErrorBox, Loading } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { WindowShell } from '@/layouts/WindowShell'
import { downloadBlob, duration, jobStatusText, jobStatusTone, number, won } from '@/lib/format'
import { openWindow } from '@/lib/openWindow'

/**
 * T1-4 · 작업 상세 (새 창, T1-3 의 [상세 보기])
 *
 * 기획서: 누가 어디서 언제 올렸는지 남깁니다. 오류 문의가 왔을 때 환경을 재현하는 근거입니다.
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

  const exportCsv = async () => {
    const blob = await api.admin.exportJobCsv(jobId)
    downloadBlob(blob, `${data.fileName}_쪽별결과.csv`)
    toast('CSV 를 내려받았습니다.')
  }

  return (
    <WindowShell
      title={data.fileName}
      badge={
        <Badge tone={jobStatusTone(data.status)}>
          {jobStatusText({ status: data.status, pages: processing.pages, failedPages: data.failedPages })}
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
              {request.accountId}
              {request.accountAlias ? ` · ${request.accountAlias}` : ''}
            </Def>
            <Def label="기관">{request.orgName}</Def>
            <Def label="요청 시각">{request.requestedAt}</Def>
            <Def label="IP · 위치">
              {request.ip} · {request.location}
            </Def>
            <Def label="접속 환경">{request.userAgent}</Def>
          </Defs>
        </Card>

        <Card title="처리 · 비용">
          <Defs>
            <Def label="쪽수">
              {processing.pages}쪽 · 성공 {processing.successPages} · 실패 {processing.failedPages}
            </Def>
            <Def label="소요">
              {duration(processing.durationSec)} · 쪽당 {processing.secPerPage}초
            </Def>
            <Def label="원가">
              {won(processing.cost)} · 쪽당 {won(processing.costPerPage)}
            </Def>
            {/* 크레딧은 고객에게서 차감하는 값, 원가는 우리가 쓴 비용입니다. (기획서 §6) */}
            <Def label="크레딧">{number(processing.credit)} 크레딧 차감</Def>
            <Def label="레이아웃">
              본문 {processing.layout.text} · 표 {processing.layout.table} · 수식 {processing.layout.formula} ·
              그림 {processing.layout.image}
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
              {data.pageResults.map((page) => (
                <tr key={page.range}>
                  <td>{page.range}</td>
                  <td>{page.layoutLabel}</td>
                  <td className="table__num">{won(page.cost)}</td>
                  <td>
                    <Badge tone={page.status === 'done' ? 'ok' : 'danger'}>
                      {page.status === 'done' ? '완료' : '실패'}
                    </Badge>
                  </td>
                  <td className={page.reason ? '' : 'dash'}>{page.reason ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </WindowShell>
  )
}
