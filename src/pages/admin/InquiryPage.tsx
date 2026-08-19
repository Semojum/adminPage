import { useState } from 'react'
import type { Inquiry, InquiryStatus, InquiryType } from '@/api/types'
import { useInquiries, useSetInquiryStatus } from '@/api/queries'
import { Badge, Card, Query } from '@/components/ui'
import { Modal } from '@/components/Modal'
import { useToast } from '@/components/Toast'
import {
  inquiryElapsed,
  inquiryStatusLabel,
  inquiryStatusTone,
  inquiryTypeLabel,
  shortDateTime,
} from '@/lib/format'

const TYPES = [
  { value: 'all', label: '전체 유형' },
  { value: 'CREDIT_ADD', label: '크레딧 추가' },
  { value: 'ACCOUNT_ISSUE', label: '계정 발급' },
  { value: 'ERROR_REPORT', label: '오류 신고' },
  { value: 'ONBOARDING', label: '도입 문의' },
  { value: 'EMAIL', label: '메일 문의' },
  { value: 'ETC', label: '기타' },
] as const satisfies ReadonlyArray<{ value: InquiryType | 'all'; label: string }>

/** 보낸 사람 — 미가입(홈페이지·메일) 문의는 기관·계정이 없습니다. */
function sender(inquiry: Inquiry) {
  if (inquiry.orgName) {
    return (
      <>
        {inquiry.orgName}
        {inquiry.loginId && <span className="muted"> · {inquiry.loginId}</span>}
      </>
    )
  }
  return (
    <>
      {inquiry.subject ?? inquiry.senderEmail ?? '미가입'}
      <span className="muted"> 미가입</span>
    </>
  )
}

/**
 * AD-T1-9 · 문의 (탭)
 *
 * GET   /api/admin/inquiries?status=&type=
 * PATCH /api/admin/inquiries/{inquiryId}/status
 *
 * T2 의 크레딧 추가·계정 발급 요청도 이 목록으로 들어옵니다.
 * 경과 열은 "2일 안에 답한다"는 약속을 지키는지 보기 위한 것이고, 화면이 createdAt 으로 계산합니다.
 * 답변 본문을 주고받는 API 는 아직 없어, 여기서는 상태만 옮깁니다.
 */
export function InquiryPage() {
  const [type, setType] = useState<InquiryType | 'all'>('all')
  const [unansweredOnly, setUnansweredOnly] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)

  const inquiries = useInquiries(unansweredOnly ? 'OPEN' : 'all', type)
  const openInquiry = inquiries.data?.find((inquiry) => inquiry.id === openId) ?? null

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
              onChange={(event) => setType(event.target.value as InquiryType | 'all')}
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
              onClick={() => setUnansweredOnly((value) => !value)}
            >
              미답변만
            </button>
          </>
        }
      >
        <Query state={inquiries} rows={4}>
          {(data) => (
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
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="muted">
                        조건에 맞는 문의가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    data.map((inquiry) => {
                      const elapsed = inquiryElapsed(inquiry)
                      return (
                        <tr key={inquiry.id}>
                          <td>{shortDateTime(inquiry.createdAt)}</td>
                          <td>{sender(inquiry)}</td>
                          <td>{inquiryTypeLabel[inquiry.type]}</td>
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
          )}
        </Query>

        <p className="card__note">
          T2 의 크레딧 추가·계정 발급 요청이 이 목록으로 들어옵니다 · 경과 열 = &quot;2일 안 답변&quot;
          약속 준수 확인 (임박·초과는 빨간색)
        </p>
      </Card>

      <InquiryModal inquiry={openInquiry} onClose={() => setOpenId(null)} />
    </>
  )
}

const NEXT_STATUS: Array<{ status: InquiryStatus; label: string }> = [
  { status: 'IN_REVIEW', label: '확인 중으로' },
  { status: 'ANSWERED', label: '답변 완료로' },
]

function InquiryModal({ inquiry, onClose }: { inquiry: Inquiry | null; onClose: () => void }) {
  const setStatus = useSetInquiryStatus()
  const toast = useToast()

  return (
    <Modal
      open={inquiry !== null}
      width={560}
      title={inquiry ? inquiryTypeLabel[inquiry.type] : '문의'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            닫기
          </button>
          {NEXT_STATUS.filter((next) => next.status !== inquiry?.status).map((next) => (
            <button
              key={next.status}
              type="button"
              className={next.status === 'ANSWERED' ? 'btn btn--primary' : 'btn'}
              disabled={setStatus.isPending}
              onClick={() =>
                inquiry &&
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
      {inquiry && (
        <>
          <div className="notice-box">
            <div style={{ marginBottom: 6 }}>
              {inquiry.orgName ?? inquiry.senderEmail ?? '미가입'}
              {inquiry.loginId ? ` · ${inquiry.loginId}` : ''} · {shortDateTime(inquiry.createdAt)} ·{' '}
              {inquiryStatusLabel[inquiry.status]}
            </div>
            <div style={{ color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>{inquiry.message}</div>
          </div>
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
