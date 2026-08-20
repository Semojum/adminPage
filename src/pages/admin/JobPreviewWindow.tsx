import { useState } from 'react'
import { useParams } from 'react-router-dom'
import type { PageTextItem } from '@/api/types'
import { useJobPage, useSendJobToMyPage } from '@/api/queries'
import { Loading, Pagination, queryFallback } from '@/components/ui'
import { Modal } from '@/components/Modal'
import { useToast } from '@/components/Toast'
import { useAuth } from '@/auth/AuthContext'
import { WindowShell } from '@/layouts/WindowShell'
import { resultFormat } from '@/lib/format'

/** text_list · braille_text_list 는 문자열이거나 {contents} 입니다. */
const textOf = (item: PageTextItem): string =>
  typeof item === 'string' ? item : (item.contents ?? '')

/** 점자 유니코드(U+2800~U+28FF)가 섞여 있으면 점자 타이포로 보여줍니다. */
const hasBraille = (text: string) => /[⠀-⣿]/.test(text)

/**
 * 원본 글줄을 블록으로 묶습니다.
 * 앱은 의미 단위 블록(originalTextBlocks)을 받지만 운영자 API 는 줄 배열만 줍니다.
 * 빈 줄을 경계로 삼아 문단처럼 끊으면 앱과 같은 모양이 됩니다.
 */
function groupLines(lines: string[]): string[] {
  const blocks: string[][] = []
  for (const line of lines) {
    if (line.trim() === '') {
      if (blocks.length > 0 && blocks[blocks.length - 1].length > 0) blocks.push([])
      continue
    }
    if (blocks.length === 0) blocks.push([])
    blocks[blocks.length - 1].push(line)
  }
  return blocks.filter((block) => block.length > 0).map((block) => block.join('\n'))
}

/**
 * AD-T1-5 · 변환 결과 미리보기 (새 창, T1-4 의 [변환 결과 보기])
 *
 * GET /api/admin/jobs/{jobId}/pages/{pageNo} — 원본(a·c 는 presigned PDF, b 는 글줄)과 변환 결과.
 * POST /api/admin/jobs/{jobId}/send-to-mypage — 운영자 계정 마이페이지로 사본을 보냅니다.
 *
 * 입출력 패널은 세모점 앱(FE)의 변환 화면 디자인을 그대로 씁니다.
 * 다만 이 창은 확인용이라 편집·재변환 컨트롤은 두지 않습니다(기획 확정).
 */
export function JobPreviewWindow() {
  const { jobId = '' } = useParams()
  const [pageNo, setPageNo] = useState(1)

  const page = useJobPage(jobId, pageNo)
  const send = useSendJobToMyPage()
  const toast = useToast()
  const { session } = useAuth()

  /** 사본을 받을 계정. 비우면 지금 로그인한 계정으로 갑니다(명세 §send-to-mypage). */
  const [sendOpen, setSendOpen] = useState(false)
  const [targetLoginId, setTargetLoginId] = useState('')

  // 에러·중단(오프라인)을 로딩보다 먼저 봅니다 — 이유 없이 스켈레톤만 도는 걸 막습니다.
  const fallback = queryFallback(page, 6)
  if (fallback || !page.data) {
    return <div className="window">{fallback ?? <Loading rows={6} />}</div>
  }

  const data = page.data
  const format = resultFormat(data.mode)
  const blocks = (data.result.braille_text_list ?? data.result.text_list ?? [])
    .map(textOf)
    .filter((text) => text.trim() !== '')
  const sourceBlocks = groupLines(data.original.lines ?? [])
  const resultFileName =
    data.originalFileName.replace(/\.[^.]+$/, '') + (format === 'BRF' ? '.brf' : '.txt')

  return (
    <WindowShell
      title={`변환 결과 — ${data.originalFileName}`}
      actions={
        <button type="button" className="btn btn--primary" onClick={() => setSendOpen(true)}>
          마이페이지로 보내기
        </button>
      }
    >
      <div className="io">
        {/* 입력 — 원본 파일 */}
        <section className="io-panel">
          <header className="io-panel__head">
            <h2 className="io-panel__title">원본 파일</h2>
            <span className="io-panel__meta">
              {data.originalFileName} · {data.pageNo}/{data.totalPages}쪽
            </span>
          </header>
          <div className="io-panel__body">
            {data.original.type === 'pdf' && data.original.url ? (
              <div className="io-doc">
                <div className="io-doc__paper">
                  {/* presigned URL 은 15분이면 만료됩니다 — 저장하지 않고 그때그때 받은 것을 씁니다. */}
                  <iframe
                    className="io-doc__frame"
                    src={data.original.url}
                    title={`${data.originalFileName} ${data.pageNo}쪽 원본`}
                  />
                </div>
              </div>
            ) : sourceBlocks.length > 0 ? (
              <div className="io-lines">
                {sourceBlocks.map((block, index) => (
                  <p className="io-line" key={index}>
                    {block}
                  </p>
                ))}
              </div>
            ) : (
              <div className="io-empty">
                <span>원본을 불러오지 못했습니다.</span>
              </div>
            )}
          </div>
        </section>

        {/* 출력 — 점역/번역 결과 */}
        <section className="io-panel">
          <header className="io-panel__head">
            <h2 className="io-panel__title">점역/번역 결과</h2>
            <span className="io-panel__meta">
              {resultFileName} · {format} · {data.pageNo}/{data.totalPages}쪽
            </span>
          </header>
          <div className="io-panel__body">
            {blocks.length > 0 ? (
              <div className="io-blocks">
                {blocks.map((text, index) => (
                  <div className="io-block" key={index}>
                    <div className={hasBraille(text) ? 'io-braille' : 'io-text'}>{text}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="io-empty">
                <span>결과가 없습니다.</span>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* 쪽을 옮기면 원본과 결과가 같이 움직입니다 — 한 번의 조회로 둘 다 받습니다. */}
      <Pagination
        currentPage={data.pageNo}
        totalPages={data.totalPages}
        onPageChange={(next) => setPageNo(Math.min(Math.max(1, next), data.totalPages))}
      />

      <Modal
        open={sendOpen}
        title="마이페이지로 보내기"
        width={460}
        onClose={() => setSendOpen(false)}
        footer={
          <>
            <button type="button" className="btn" onClick={() => setSendOpen(false)}>
              취소
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={send.isPending}
              onClick={() =>
                send.mutate(
                  { jobId, targetLoginId: targetLoginId.trim() || undefined },
                  {
                    onSuccess: () => {
                      toast(
                        `${targetLoginId.trim() || session?.loginId} 마이페이지로 사본을 보냈습니다.`,
                      )
                      setSendOpen(false)
                    },
                  },
                )
              }
            >
              보내기
            </button>
          </>
        }
      >
        <div className="form">
          <div className="field">
            <span className="field__label">받는 계정</span>
            <input
              className="input"
              placeholder={session?.loginId ?? '비우면 내 계정'}
              value={targetLoginId}
              onChange={(event) => setTargetLoginId(event.target.value)}
            />
          </div>
          <p className="card__note">
            비우면 지금 로그인한 계정({session?.loginId ?? '—'})으로 갑니다. 받는 계정은{' '}
            <strong>운영자(ROLE_ADMIN) 계정만</strong> 됩니다 — 고객 계정으로 잘못 보내는 것을 서버가
            막습니다. 사본에는 파일명 뒤에 &quot;(관리자 사본)&quot;이 붙고 크레딧은 차감되지 않습니다.
          </p>
        </div>
      </Modal>

      <p className="notice-box">
        원본과 결과는 <strong>같은 쪽</strong>을 봅니다 — 아래에서 쪽을 옮기면 둘 다 함께 움직입니다.
        이 창은 <strong>확인용</strong>이라 편집이나 재변환은 하지 않습니다. 자세히 보려면 마이페이지로
        보내 앱에서 엽니다.
      </p>
    </WindowShell>
  )
}
