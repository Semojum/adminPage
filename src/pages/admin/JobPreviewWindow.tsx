import { useState } from 'react'
import { useParams } from 'react-router-dom'
import type { PageTextItem } from '@/api/types'
import { useJobPage, useSendJobToMyPage } from '@/api/queries'
import { ErrorBox, Loading } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { WindowShell } from '@/layouts/WindowShell'
import { resultFormat } from '@/lib/format'

/** text_list · braille_text_list 는 문자열이거나 {contents} 입니다. */
const textOf = (item: PageTextItem): string =>
  typeof item === 'string' ? item : (item.contents ?? '')

/**
 * AD-T1-5 · 변환 결과 미리보기 (새 창, T1-4 의 [변환 결과 보기])
 *
 * GET /api/admin/jobs/{jobId}/pages/{pageNo} — 원본(a·c 는 presigned PDF, b 는 글줄)과 변환 결과를 나란히.
 * POST /api/admin/jobs/{jobId}/send-to-mypage — 운영자 계정 마이페이지로 사본을 보냅니다.
 *
 * 이 창은 확인용입니다. 편집이나 재변환은 하지 않습니다(기획 확정).
 */
export function JobPreviewWindow() {
  const { jobId = '' } = useParams()
  const [pageNo, setPageNo] = useState(1)

  const page = useJobPage(jobId, pageNo)
  const send = useSendJobToMyPage()
  const toast = useToast()

  if (page.isPending) {
    return (
      <div className="window">
        <Loading rows={6} />
      </div>
    )
  }
  if (page.error || !page.data) {
    return (
      <div className="window">
        <ErrorBox error={page.error} onRetry={page.refetch} />
      </div>
    )
  }

  const data = page.data
  const format = resultFormat(data.mode)
  const resultLines = (data.result.braille_text_list ?? data.result.text_list ?? []).map(textOf)
  const resultFileName = data.originalFileName.replace(/\.[^.]+$/, '') + (format === 'BRF' ? '.brf' : '.txt')

  return (
    <WindowShell
      title={`변환 결과 — ${data.originalFileName}`}
      actions={
        <button
          type="button"
          className="btn btn--primary"
          disabled={send.isPending}
          onClick={() =>
            send.mutate(
              { jobId },
              { onSuccess: () => toast('운영자 계정 마이페이지로 사본을 보냈습니다.') },
            )
          }
        >
          마이페이지로 보내기
        </button>
      }
    >
      <div className="grid-2">
        <div>
          <p className="card__note" style={{ marginBottom: 8 }}>
            원본 · {data.pageNo}쪽 / {data.totalPages}쪽
          </p>
          <div className="preview-pane">
            <div className="preview-pane__head">{data.originalFileName}</div>
            <div className="preview-pane__body">
              {data.original.type === 'pdf' && data.original.url ? (
                // presigned URL 은 15분이면 만료됩니다 — 저장하지 않고 그때그때 받은 것을 씁니다.
                <object
                  data={data.original.url}
                  type="application/pdf"
                  style={{ width: '100%', height: 420, border: 0 }}
                  aria-label={`${data.originalFileName} ${data.pageNo}쪽 원본`}
                >
                  <a className="table__link" href={data.original.url}>
                    원본 PDF 열기
                  </a>
                </object>
              ) : (
                <pre className="braille">{(data.original.lines ?? []).join('\n')}</pre>
              )}
            </div>
          </div>
        </div>

        <div>
          <p className="card__note" style={{ marginBottom: 8 }}>
            변환 결과 · <strong>{format}</strong>{' '}
            {format === 'BRF' ? '(점역·통합 변환)' : '(OCR 변환)'}
          </p>
          <div className="preview-pane">
            <div className="preview-pane__head">{resultFileName}</div>
            <div className="preview-pane__body">
              <pre className="braille">{resultLines.join('\n')}</pre>
            </div>
          </div>
        </div>
      </div>

      <div className="window__bar" style={{ borderBottom: 'none', paddingBottom: 0 }}>
        <button
          type="button"
          className="btn btn--sm"
          disabled={pageNo <= 1}
          onClick={() => setPageNo((value) => Math.max(1, value - 1))}
        >
          ‹ 이전 쪽
        </button>
        <span className="card__note num">
          {data.pageNo} / {data.totalPages}
        </span>
        <button
          type="button"
          className="btn btn--sm"
          disabled={pageNo >= data.totalPages}
          onClick={() => setPageNo((value) => Math.min(data.totalPages, value + 1))}
        >
          다음 쪽 ›
        </button>
      </div>

      <p className="notice-box">
        이 창은 <strong>확인용</strong>입니다. 편집이나 재변환은 하지 않습니다. 자세히 보려면 마이페이지로
        보내 앱에서 엽니다.
      </p>
    </WindowShell>
  )
}
