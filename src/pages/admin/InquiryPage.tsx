import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api'
import type { InquiryType } from '@/api/types'
import { qk, useInquiries } from '@/api/queries'
import { Badge, Card, Loading, Query } from '@/components/ui'
import { Modal } from '@/components/Modal'
import { useToast } from '@/components/Toast'

const TYPES = [
  { value: 'all', label: '전체 유형' },
  { value: 'error', label: '오류 신고' },
  { value: 'sales', label: '도입 문의' },
  { value: 'creditRequest', label: '크레딧 추가' },
  { value: 'accountRequest', label: '계정 발급' },
  { value: 'etc', label: '기타' },
] as const

const STATUS = {
  unanswered: { label: '미답변', tone: 'danger' },
  checking: { label: '확인 중', tone: 'warn' },
  answered: { label: '답변 완료', tone: 'ok' },
} as const

/**
 * T1-9 · 문의 (탭)
 *
 * 기획서: 홈페이지 문의와 서비스 문의를 한곳에 모읍니다.
 * 경과 열은 "2일 안에 답한다"는 약속을 지키는지 보기 위한 것입니다.
 * T2 에서 넣은 크레딧 추가·계정 발급 요청도 이 목록으로 들어옵니다.
 */
export function InquiryPage() {
  const [type, setType] = useState<InquiryType | 'all'>('all')
  const [unansweredOnly, setUnansweredOnly] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)

  const inquiries = useInquiries(type, unansweredOnly)

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
              onChange={(e) => setType(e.target.value as InquiryType | 'all')}
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
                  {data.items.map((inquiry) => (
                    <tr key={inquiry.id}>
                      <td>{inquiry.createdAt}</td>
                      <td>
                        {inquiry.sender.orgName}
                        {inquiry.sender.accountId && (
                          <span className="muted"> · {inquiry.sender.accountId}</span>
                        )}
                        {inquiry.sender.unregistered && <span className="muted"> 미가입</span>}
                      </td>
                      <td>{inquiry.typeLabel}</td>
                      <td>
                        <Badge tone={STATUS[inquiry.status].tone}>{STATUS[inquiry.status].label}</Badge>
                      </td>
                      <td
                        className="table__num"
                        style={{
                          color: inquiry.elapsed.overdue ? 'var(--danger)' : undefined,
                          fontWeight: inquiry.elapsed.overdue ? 700 : 600,
                        }}
                      >
                        {inquiry.elapsed.text}
                      </td>
                      <td className="table__actions">
                        <button type="button" className="btn btn--sm" onClick={() => setOpenId(inquiry.id)}>
                          열기
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

      {openId && <InquiryModal inquiryId={openId} onClose={() => setOpenId(null)} />}
    </>
  )
}

function InquiryModal({ inquiryId, onClose }: { inquiryId: string; onClose: () => void }) {
  const qc = useQueryClient()
  const toast = useToast()
  const [body, setBody] = useState('')

  const inquiry = useQuery({
    queryKey: ['admin', 'inquiry', inquiryId],
    queryFn: () => api.admin.getInquiry(inquiryId),
  })

  const reply = useMutation({
    mutationFn: (text: string) => api.admin.replyInquiry(inquiryId, text),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.inquiries('all', false) })
      qc.invalidateQueries({ queryKey: ['admin', 'inquiries'] })
      toast('답변을 보냈습니다.')
      onClose()
    },
  })

  return (
    <Modal
      open
      width={560}
      title={inquiry.data?.title ?? '문의'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            닫기
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={!body || reply.isPending}
            onClick={() => reply.mutate(body)}
          >
            답변 보내기
          </button>
        </>
      }
    >
      {inquiry.isPending ? (
        <Loading rows={3} />
      ) : (
        <>
          <div className="notice-box">
            <div style={{ marginBottom: 6 }}>
              {inquiry.data?.sender.orgName}
              {inquiry.data?.sender.accountId ? ` · ${inquiry.data.sender.accountId}` : ''} ·{' '}
              {inquiry.data?.createdAt}
            </div>
            <div style={{ color: 'var(--ink)' }}>{inquiry.data?.body}</div>
          </div>
          <textarea
            className="textarea"
            placeholder="답변을 적습니다"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
        </>
      )}
    </Modal>
  )
}
