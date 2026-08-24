import { useState } from 'react'
import type { Inquiry, InquiryDetail, InquiryFile, InquiryStatus, InquiryType } from '@/api/types'
import { useInquiries, useInquiry, useSetInquiryStatus } from '@/api/queries'
import { Badge, Card, Pagination, Query, queryFallback } from '@/components/ui'
import { Modal } from '@/components/Modal'
import { useToast } from '@/components/Toast'
import {
  fileSize,
  inquiryElapsed,
  inquiryStatusLabel,
  inquiryStatusTone,
  inquiryTypeLabel,
  shortDateTime,
} from '@/lib/format'
import { htmlToText } from '@/lib/html'

const TYPES = [
  { value: 'all', label: '전체 유형' },
  { value: 'CREDIT_ADD', label: '크레딧 추가' },
  { value: 'ACCOUNT_ISSUE', label: '계정 발급' },
  { value: 'ERROR_REPORT', label: '오류 신고' },
  { value: 'ONBOARDING', label: '도입 문의' },
  { value: 'EMAIL', label: '메일 문의' },
  { value: 'ETC', label: '기타' },
] as const satisfies ReadonlyArray<{ value: InquiryType | 'all'; label: string }>

/** 서버가 대문자로 줄 때가 있습니다 — IMAGE/PNG */
const isImage = (contentType: string) => contentType.toLowerCase().startsWith('image/')

/**
 * 보낸 사람 — 미가입(홈페이지·메일) 문의는 기관·계정이 없습니다.
 * 명세: 미가입 문의는 senderEmail 이 보낸 사람 자리에 옵니다.
 * 홈페이지 문의는 subject 에 이름이 들어오고, 메일 문의의 subject 는 메일 제목이라 여기서는 쓰지 않습니다.
 */
function sender(inquiry: Inquiry | InquiryDetail) {
  if (inquiry.orgName) {
    return (
      <>
        {inquiry.orgName}
        {inquiry.loginId && <span className="muted"> · {inquiry.loginId}</span>}
      </>
    )
  }

  const name = inquiry.type === 'EMAIL' ? null : inquiry.subject
  const email = inquiry.senderEmail

  return (
    <>
      {name ?? email ?? '미가입'}
      {name && email && <span className="muted"> · {email}</span>}
      <span className="muted"> 미가입</span>
    </>
  )
}

/**
 * AD-T1-9 · 문의 (탭)
 *
 * GET   /api/admin/inquiries?status=&type=&page=  — 목록(본문은 preview 100자, 첨부는 개수만)
 * GET   /api/admin/inquiries/{inquiryId}          — 본문 전문 · 인라인 이미지 · 첨부 (2026-08-21 신설)
 * PATCH /api/admin/inquiries/{inquiryId}/status
 *
 * T2 의 크레딧 추가·계정 발급 요청도 이 목록으로 들어옵니다.
 * 경과 열은 "2일 안에 답한다"는 약속을 지키는지 보기 위한 것이고, 화면이 createdAt 으로 계산합니다.
 */
export function InquiryPage() {
  const [type, setType] = useState<InquiryType | 'all'>('all')
  const [unansweredOnly, setUnansweredOnly] = useState(false)
  const [page, setPage] = useState(0)
  const [openId, setOpenId] = useState<string | null>(null)

  const inquiries = useInquiries(unansweredOnly ? 'OPEN' : 'all', type, page)

  const reset = <V,>(setter: (value: V) => void) => (value: V) => {
    setter(value)
    setPage(0)
  }

  return (
    <>
      <Card
        title="문의"
        actions={
          <>
            <select
              className="select"
              style={{ width: 'auto' }}
              value={type}
              onChange={(event) => reset(setType)(event.target.value as InquiryType | 'all')}
              aria-label="유형 필터"
            >
              {TYPES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={unansweredOnly ? 'btn btn--primary' : 'btn'}
              aria-pressed={unansweredOnly}
              onClick={() => reset(setUnansweredOnly)(!unansweredOnly)}
            >
              미답변만
            </button>
          </>
        }
      >
        <Query state={inquiries} rows={4}>
          {(data) => (
            <>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>일시</th>
                      <th>보낸 사람</th>
                      <th>유형</th>
                      <th>상태</th>
                      <th className="table__num">경과</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="muted">
                          조건에 맞는 문의가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      data.items.map((inquiry) => {
                        const elapsed = inquiryElapsed(inquiry)
                        return (
                          <tr key={inquiry.id}>
                            <td>{shortDateTime(inquiry.createdAt)}</td>
                            <td>{sender(inquiry)}</td>
                            <td>
                              {inquiryTypeLabel[inquiry.type]}
                              {inquiry.attachmentCount > 0 && (
                                <span className="muted"> · 첨부 {inquiry.attachmentCount}</span>
                              )}
                            </td>
                            <td>
                              <Badge tone={inquiryStatusTone[inquiry.status]}>
                                {inquiryStatusLabel[inquiry.status]}
                              </Badge>
                            </td>
                            <td
                              className="table__num"
                              style={{
                                color: elapsed.overdue ? 'var(--danger)' : undefined,
                                fontWeight: elapsed.overdue ? 700 : 600,
                              }}
                            >
                              {elapsed.text}
                            </td>
                            <td className="table__actions">
                              <button
                                type="button"
                                className="btn btn--sm"
                                onClick={() => setOpenId(inquiry.id)}
                              >
                                열기
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <Pagination
                currentPage={data.page + 1}
                totalPages={data.totalPages}
                onPageChange={(next) => setPage(next - 1)}
              />
            </>
          )}
        </Query>

        <p className="card__note">
          T2 의 크레딧 추가·계정 발급 요청이 이 목록으로 들어옵니다 · 경과 열 = &quot;2일 안 답변&quot;
          약속 준수 확인 (임박·초과는 빨간색)
        </p>
      </Card>

      <InquiryModal inquiryId={openId} onClose={() => setOpenId(null)} />
    </>
  )
}

const NEXT_STATUS: Array<{ status: InquiryStatus; label: string }> = [
  { status: 'IN_REVIEW', label: '확인 중으로' },
  { status: 'ANSWERED', label: '답변 완료로' },
]

function InquiryModal({ inquiryId, onClose }: { inquiryId: string | null; onClose: () => void }) {
  const detail = useInquiry(inquiryId)
  const setStatus = useSetInquiryStatus()
  const toast = useToast()

  const inquiry = detail.data ?? null
  const fallback = queryFallback(detail, 3)

  return (
    <Modal
      open={inquiryId !== null}
      width={560}
      title={inquiry ? (inquiry.subject ?? inquiryTypeLabel[inquiry.type]) : '문의'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            닫기
          </button>
          {inquiry &&
            NEXT_STATUS.filter((next) => next.status !== inquiry.status).map((next) => (
              <button
                key={next.status}
                type="button"
                className={next.status === 'ANSWERED' ? 'btn btn--primary' : 'btn'}
                disabled={setStatus.isPending}
                onClick={() =>
                  setStatus.mutate(
                    { inquiryId: inquiry.id, status: next.status },
                    {
                      onSuccess: () => {
                        toast('상태를 바꿨습니다.')
                        onClose()
                      },
                    },
                  )
                }
              >
                {next.label}
              </button>
            ))}
        </>
      }
    >
      {/* 조회 중·실패면 그 이유만 보여줍니다. queryFallback 이 로딩까지 맡습니다. */}
      {fallback}

      {!fallback && inquiry && (
        <>
          <div className="notice-box">
            <div style={{ marginBottom: 6 }}>
              {sender(inquiry)} · {shortDateTime(inquiry.createdAt)} ·{' '}
              {inquiryTypeLabel[inquiry.type]} · {inquiryStatusLabel[inquiry.status]}
            </div>
            {/*
              메일 본문은 HTML 원문으로 올 수 있습니다(명세 §문의).
              태그를 걷어내고 글자만 보여줍니다 — 바깥에서 온 본문이라 HTML 로 그리지 않습니다.
              10,000자까지 올 수 있어 길면 이 칸 안에서 스크롤합니다.
            */}
            <div
              style={{
                color: 'var(--ink)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                maxHeight: 280,
                overflowY: 'auto',
              }}
            >
              {htmlToText(inquiry.message) || '본문이 없습니다.'}
            </div>
          </div>

          {/* 본문에 박힌 이미지 — 상세 응답이 URL 을 함께 줘서 바로 그립니다. */}
          {inquiry.inlineImages.length > 0 && (
            <div className="attachments">
              <span className="card__note">본문 이미지 {inquiry.inlineImages.length}개</span>
              {inquiry.inlineImages.map((image) => (
                <FileItem key={image.id} file={image} />
              ))}
            </div>
          )}

          {inquiry.attachments.length > 0 && (
            <div className="attachments">
              <span className="card__note">첨부 {inquiry.attachments.length}개</span>
              {inquiry.attachments.map((file) => (
                <FileItem key={file.id} file={file} />
              ))}
            </div>
          )}

          {/* 답변 본문을 저장하는 API 가 아직 없습니다 — 회신은 메일·전화로 하고 상태만 남깁니다. */}
          <p className="card__note">
            답변 본문을 주고받는 API 는 아직 없습니다. 회신은 기존 경로로 하고, 여기서는 처리 상태만
            옮깁니다.
          </p>
        </>
      )}
    </Modal>
  )
}

/**
 * 파일 하나 — 인라인 이미지든 첨부든 같은 모양입니다.
 * URL 은 presigned 15분이라 저장하지 않고 받은 것을 그대로 씁니다.
 * 만료됐으면 문의를 다시 열면 새 URL 을 받습니다.
 */
function FileItem({ file }: { file: InquiryFile }) {
  return (
    <div className="attachment">
      <div className="attachment__head">
        <span className="attachment__name">{file.fileName}</span>
        <span className="attachment__size">{fileSize(file.sizeBytes)}</span>
        <span className="attachment__actions">
          <a className="btn btn--sm" href={file.url} target="_blank" rel="noopener noreferrer">
            내려받기
          </a>
        </span>
      </div>
      {isImage(file.contentType) && (
        <img className="attachment__preview" src={file.url} alt={file.fileName} />
      )}
    </div>
  )
}
