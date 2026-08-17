import { useParams } from 'react-router-dom'
import type { PreviewBlock } from '@/api/types'
import { useJobPreview, useSendJobToMyPage } from '@/api/queries'
import { ErrorBox, Loading } from '@/components/ui'
import { useToast } from '@/components/Toast'
import { WindowShell } from '@/layouts/WindowShell'

function SourceBlock({ block }: { block: PreviewBlock }) {
  switch (block.kind) {
    case 'heading':
      return <h3 style={{ fontSize: 15, fontWeight: 700 }}>{block.text}</h3>
    case 'paragraph':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {Array.from({ length: block.lines }, (_, i) => (
            <div key={i} className="preview-line" style={{ width: i % 2 === 0 ? '92%' : '68%' }} />
          ))}
        </div>
      )
    case 'table':
      return (
        <table className="table" style={{ border: '1px solid var(--line)', borderRadius: 8 }}>
          <thead>
            <tr>
              {block.head.map((cell) => (
                <th key={cell}>{cell}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row) => (
              <tr key={row.join('|')}>
                {row.map((cell) => (
                  <td key={cell}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )
  }
}

/**
 * T1-5 · 변환 결과 미리보기 (새 창, T1-4 의 [변환 결과 보기])
 *
 * 기획서: 관리자 화면에 앱 기능을 옮겨 담지 않습니다.
 * 원본과 결과를 나란히 보는 것까지만 합니다. 편집이나 재변환은 하지 않습니다.
 */
export function JobPreviewWindow() {
  const { jobId = '' } = useParams()
  const preview = useJobPreview(jobId)
  const send = useSendJobToMyPage()
  const toast = useToast()

  if (preview.isPending) {
    return (
      <div className="window">
        <Loading rows={6} />
      </div>
    )
  }
  if (preview.error || !preview.data) {
    return (
      <div className="window">
        <ErrorBox error={preview.error} onRetry={preview.refetch} />
      </div>
    )
  }

  const { source, result } = preview.data

  return (
    <WindowShell
      title={`변환 결과 — ${source.fileName}`}
      actions={
        <button
          type="button"
          className="btn btn--primary"
          disabled={send.isPending}
          onClick={() =>
            send.mutate(jobId, {
              onSuccess: () => toast('운영자 계정 마이페이지로 사본을 보냈습니다.'),
            })
          }
        >
          마이페이지로 보내기
        </button>
      }
    >
      <div className="grid-2">
        <div>
          <p className="card__note" style={{ marginBottom: 8 }}>
            원본 · {source.page}쪽
          </p>
          <div className="preview-pane">
            <div className="preview-pane__head">{source.fileName}</div>
            <div className="preview-pane__body">
              {source.blocks.map((block, index) => (
                <SourceBlock key={index} block={block} />
              ))}
            </div>
          </div>
        </div>

        <div>
          <p className="card__note" style={{ marginBottom: 8 }}>
            변환 결과 · <strong>{result.format}</strong>{' '}
            {result.format === 'BRF' ? '(점역·통합 변환)' : '(OCR 변환)'}
          </p>
          <div className="preview-pane">
            <div className="preview-pane__head">{result.fileName}</div>
            <div className="preview-pane__body">
              <pre className="braille">{result.content}</pre>
            </div>
          </div>
        </div>
      </div>

      <p className="notice-box">
        이 창은 <strong>확인용</strong>입니다. 편집이나 재변환은 하지 않습니다. 자세히 보려면 마이페이지로
        보내 앱에서 엽니다.
      </p>
    </WindowShell>
  )
}
