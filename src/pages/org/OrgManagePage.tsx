import { useEffect, useState } from 'react'
import type { OrgAccountRow, OrgNotice, OrgRequestType } from '@/api/types'
import { api } from '@/api'
import {
  useCancelOrgRequest,
  useCreateOrgRequest,
  useOrgAccountAction,
  useOrgAccounts,
  useOrgDashboard,
  useOrgNotices,
  useOrgOrders,
  useOrgRequests,
  useUpdateReceiptEmail,
} from '@/api/queries'
import { Badge, Card, Meter, Query, VBarChart } from '@/components/ui'
import { ConfirmModal, Modal } from '@/components/Modal'
import { useToast } from '@/components/Toast'
import { accountStatusLabel, date, lastLogin, number, shortDate, usageRate, won } from '@/lib/format'
import { openWindow } from '@/lib/openWindow'

/** 계약 만료까지 남은 날. (FE 계산 — 명세 §기관 대시보드) */
function daysLeft(expiresOn: string | null): number | null {
  if (!expiresOn) return null
  const end = new Date(`${expiresOn}T00:00:00`)
  if (Number.isNaN(end.getTime())) return null
  const today = new Date()
  return Math.ceil((end.getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86_400_000)
}

/**
 * 소진 예상 — "9월 중순". (FE 계산)
 * 최근 석 달 평균 사용량으로 남은 크레딧이 몇 달 갈지 어림합니다.
 */
function expectedDepletion(remaining: number, monthly: Array<{ credits: number }>): string | null {
  if (remaining <= 0) return '이미 소진'
  const recent = monthly.slice(-3).map((point) => point.credits).filter((credits) => credits > 0)
  if (recent.length === 0) return null
  const average = recent.reduce((sum, credits) => sum + credits, 0) / recent.length
  if (average <= 0) return null

  const months = remaining / average
  const target = new Date()
  target.setDate(target.getDate() + Math.round(months * 30))
  const day = target.getDate()
  const part = day <= 10 ? '초순' : day <= 20 ? '중순' : '하순'
  return `${target.getMonth() + 1}월 ${part}`
}

/** 월 라벨 — "2026-08" → "8월" */
const monthTick = (month: string) => `${Number(month.split('-')[1])}월`

/**
 * T2 · 기관 관리 (V3-06 · ROLE_ORG_ADMIN)
 *
 * GET /api/org/dashboard · /accounts · /requests · /notices · /orders
 * 열람 범위(명세 확정): 기관 담당자는 목록·상태·크레딧까지 봅니다. 원가는 보이지 않습니다.
 */
export function OrgManagePage() {
  const dashboard = useOrgDashboard()
  const notices = useOrgNotices()
  const accounts = useOrgAccounts()
  const requests = useOrgRequests()
  const orders = useOrgOrders()

  const createRequest = useCreateOrgRequest()
  const cancelRequest = useCancelOrgRequest()
  const accountAction = useOrgAccountAction()
  const updateEmail = useUpdateReceiptEmail()
  const toast = useToast()

  const [requestType, setRequestType] = useState<OrgRequestType | null>(null)
  const [requestMessage, setRequestMessage] = useState('')
  const [lockTarget, setLockTarget] = useState<OrgAccountRow | null>(null)
  const [aliasTarget, setAliasTarget] = useState<OrgAccountRow | null>(null)
  const [alias, setAlias] = useState('')
  const [email, setEmail] = useState('')
  const [openNotice, setOpenNotice] = useState<OrgNotice | null>(null)

  useEffect(() => {
    if (orders.data) setEmail(orders.data.receiptEmail ?? '')
  }, [orders.data])

  /** 처리 중인 요청 — "발급 요청 1건 처리 중" 과 목록의 요청 줄에 씁니다. */
  const pending = (requests.data ?? []).filter((request) => request.status !== 'ANSWERED')
  const pendingAccountRequests = pending.filter((request) => request.type === 'ACCOUNT_ISSUE')

  const downloadReceipt = async (orderId: string) => {
    try {
      // presigned URL 은 15분짜리라 누를 때마다 새로 받습니다.
      const receipt = await api.org.getOrderReceipt(orderId)
      window.open(receipt.url, '_blank', 'noopener')
    } catch {
      toast('증빙을 받지 못했습니다.')
    }
  }

  return (
    <>
      <Query state={dashboard} rows={3}>
        {(data) => {
          const rate = usageRate(data.creditUsed, data.creditAllocated)
          const depletion = expectedDepletion(data.creditRemaining, data.monthlyUsage)
          const left = daysLeft(data.contractExpiresAt)
          return (
            <div className="grid-3">
              <Card title="할당 크레딧">
                <span className="stat__value num">{number(data.creditAllocated)}</span>
                <Meter used={data.creditUsed} total={data.creditAllocated} rate={rate} />
              </Card>

              <Card title="남은 크레딧">
                <span className="stat__value num">{number(data.creditRemaining)}</span>
                <span className="card__note">{depletion ? `${depletion} 소진 예상` : ' '}</span>
                {/* 누르면 세모점 문의 목록(T1-9)으로 들어갑니다. */}
                <button
                  type="button"
                  className="btn btn--primary btn--block"
                  onClick={() => {
                    setRequestType('CREDIT_ADD')
                    setRequestMessage('')
                  }}
                >
                  ＋ 크레딧 추가 요청
                </button>
              </Card>

              <Card title="계약">
                <span className="stat__value num">{date(data.contractExpiresAt)}</span>
                {left !== null && (
                  <span
                    style={{
                      color: left <= 30 ? 'var(--danger)' : 'var(--sub)',
                      fontWeight: 700,
                      fontSize: 13,
                    }}
                  >
                    {left >= 0 ? `${left}일 남음` : `${Math.abs(left)}일 지남`}
                  </span>
                )}
                <span className="card__note">시작 {date(data.contractStartedAt)}</span>
              </Card>
            </div>
          )
        }}
      </Query>

      <div className="grid-2">
        <Card title="월별 사용 추이">
          <Query state={dashboard} rows={4}>
            {(data) => {
              const points = data.monthlyUsage
              const average =
                points.length > 0
                  ? Math.round(points.reduce((sum, point) => sum + point.credits, 0) / points.length)
                  : 0
              return (
                <>
                  <VBarChart
                    data={points.map((point) => ({
                      label: monthTick(point.month),
                      primary: point.credits,
                      caption: number(point.credits),
                    }))}
                  />
                  <div className="legend">
                    <span className="legend__item">
                      <i className="legend__swatch" />월 사용 크레딧
                    </span>
                    <span className="legend__spacer">
                      {points.length}개월 평균 {number(average)}
                    </span>
                  </div>
                </>
              )
            }}
          </Query>
        </Card>

        <Card title="공지">
          <Query state={notices} rows={3}>
            {(data) => (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>받은 날</th>
                      <th>분류</th>
                      <th>제목</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="muted">
                          받은 공지가 없습니다.
                        </td>
                      </tr>
                    ) : (
                      data.map((notice) => (
                        <tr key={notice.id}>
                          <td>{shortDate(notice.createdAt)}</td>
                          <td>
                            <Badge tone={notice.scope === 'ALL' ? 'muted' : 'danger'}>
                              {notice.scope === 'ALL' ? '전체' : '우리 기관'}
                            </Badge>
                          </td>
                          <td>
                            <button
                              type="button"
                              className="btn btn--link"
                              onClick={() => setOpenNotice(notice)}
                            >
                              {notice.title}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </Query>
        </Card>
      </div>

      <Card
        title="소속 계정"
        note={pending.length ? `발급 요청 ${pending.length}건 처리 중` : undefined}
        actions={
          <button
            type="button"
            className="btn"
            onClick={() => {
              setRequestType('ACCOUNT_ISSUE')
              setRequestMessage('')
            }}
          >
            ＋ 계정 발급 요청
          </button>
        }
      >
        <Query state={accounts} rows={5}>
          {(data) => (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>계정 ID</th>
                    <th>별칭</th>
                    <th>상태</th>
                    <th>마지막 로그인</th>
                    <th className="table__num">사용</th>
                    <th>제어</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((account) => (
                    <tr key={account.loginId}>
                      <td>
                        {/* 계정 ID 를 누르면 T2-2 계정 상세 창이 열립니다. */}
                        <button
                          type="button"
                          className="btn btn--link"
                          onClick={() =>
                            openWindow(`/org/accounts/${account.loginId}`, `orgacc-${account.loginId}`)
                          }
                        >
                          {account.loginId}
                        </button>
                        {account.self && <span className="muted"> 본인</span>}
                      </td>
                      <td>
                        <button
                          type="button"
                          className={account.alias ? 'btn btn--link' : 'btn btn--link dash'}
                          title="별칭 바꾸기"
                          onClick={() => {
                            setAliasTarget(account)
                            setAlias(account.alias ?? '')
                          }}
                        >
                          {account.alias ?? '—'}
                        </button>
                      </td>
                      <td>
                        <Badge tone={account.status === 'ACTIVE' ? 'ok' : 'muted'}>
                          {accountStatusLabel[account.status]}
                        </Badge>
                      </td>
                      <td className={account.lastLoginAt ? '' : 'dash'}>
                        {lastLogin(account.lastLoginAt)}
                      </td>
                      <td className="table__num">{number(account.monthCredits)}</td>
                      <td className="table__actions">
                        {/* 본인 계정은 잠글 수 없습니다(명세 §계정 잠금). */}
                        {account.self ? (
                          <span className="dash">—</span>
                        ) : account.status === 'INACTIVE' ? (
                          <button
                            type="button"
                            className="btn btn--sm"
                            onClick={() =>
                              accountAction.mutate(
                                { type: 'lock', loginId: account.loginId, locked: false },
                                { onSuccess: () => toast('잠금을 풀었습니다.') },
                              )
                            }
                          >
                            잠금 해제
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn--sm"
                            onClick={() => setLockTarget(account)}
                          >
                            잠금
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}

                  {/* 발급 요청 중인 줄 — 아직 계정이 아니라 목록에는 없고 요청에서 끌어옵니다. */}
                  {pendingAccountRequests.map((request) => (
                    <tr key={request.id}>
                      <td className="muted">발급 요청 중</td>
                      <td className={request.message ? '' : 'dash'}>{request.message ?? '—'}</td>
                      <td>
                        <Badge tone="warn">{shortDate(request.createdAt)} 요청</Badge>
                      </td>
                      <td className="dash">—</td>
                      <td className="table__num dash">—</td>
                      <td className="table__actions">
                        <button
                          type="button"
                          className="btn btn--sm"
                          disabled={request.status !== 'OPEN'}
                          title={request.status !== 'OPEN' ? '이미 처리 중이라 취소할 수 없습니다.' : undefined}
                          onClick={() =>
                            cancelRequest.mutate(request.id, {
                              onSuccess: () => toast('요청을 취소했습니다.'),
                            })
                          }
                        >
                          요청 취소
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Query>
        <p className="card__note">
          발급·삭제·비밀번호 재발급은 세모점이 합니다. 이 화면에서는 별칭과 잠금만 다룹니다.
        </p>
      </Card>

      <Card title="주문 내역">
        <Query state={orders} rows={3}>
          {(data) => (
            <>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>일자</th>
                      <th>내용</th>
                      <th className="table__num">금액</th>
                      <th>결제</th>
                      <th>계산서</th>
                      <th>증빙</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.items.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="muted">
                          주문 내역이 없습니다.
                        </td>
                      </tr>
                    ) : (
                      data.items.map((order) => (
                        <tr key={order.id}>
                          <td>{date(order.orderDate)}</td>
                          <td>{order.description}</td>
                          <td className="table__num">{won(order.amountKrw)}</td>
                          <td>
                            <Badge tone={order.paidAt ? 'ok' : 'warn'}>
                              {order.paidAt ? '완납' : '미납'}
                            </Badge>
                          </td>
                          <td>{order.invoiceStatus === 'ISSUED' ? '발행 완료' : '발행 대기'}</td>
                          <td>
                            {order.receiptFileName ? (
                              <button
                                type="button"
                                className="btn btn--link"
                                onClick={() => downloadReceipt(order.id)}
                              >
                                내려받기
                              </button>
                            ) : (
                              <span className="dash">—</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="field" style={{ gridTemplateColumns: '110px minmax(0, 320px)' }}>
                <span className="field__label">증빙 받는 사람</span>
                <input
                  className="input"
                  type="email"
                  placeholder="account@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  onBlur={() => {
                    if (email !== (data.receiptEmail ?? '')) {
                      updateEmail.mutate(email || null, {
                        onSuccess: () => toast('증빙 수신자를 바꿨습니다.'),
                      })
                    }
                  }}
                />
              </div>
            </>
          )}
        </Query>
      </Card>

      <Modal
        open={requestType !== null}
        title={requestType === 'CREDIT_ADD' ? '크레딧 추가 요청' : '계정 발급 요청'}
        onClose={() => setRequestType(null)}
        footer={
          <>
            <button type="button" className="btn" onClick={() => setRequestType(null)}>
              취소
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={createRequest.isPending}
              onClick={() =>
                createRequest.mutate(
                  { type: requestType!, message: requestMessage || undefined },
                  {
                    onSuccess: () => {
                      toast('세모점 문의로 요청을 보냈습니다.')
                      setRequestType(null)
                    },
                  },
                )
              }
            >
              요청 보내기
            </button>
          </>
        }
      >
        <div className="form">
          <textarea
            className="textarea"
            maxLength={1000}
            placeholder={
              requestType === 'CREDIT_ADD'
                ? '3,000 크레딧 추가 요청드립니다.'
                : '국어 담당 계정 1개 발급 요청드립니다.'
            }
            value={requestMessage}
            onChange={(event) => setRequestMessage(event.target.value)}
          />
          <p className="card__note">
            요청은 세모점 문의 목록으로 들어갑니다. 처리 상태가 이 화면에 남고, 접수 전이면 취소할 수
            있습니다.
          </p>
        </div>
      </Modal>

      <Modal
        open={aliasTarget !== null}
        title={`별칭 — ${aliasTarget?.loginId ?? ''}`}
        onClose={() => setAliasTarget(null)}
        footer={
          <>
            <button type="button" className="btn" onClick={() => setAliasTarget(null)}>
              취소
            </button>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() =>
                accountAction.mutate(
                  { type: 'alias', loginId: aliasTarget!.loginId, alias: alias || null },
                  {
                    onSuccess: () => {
                      toast('별칭을 바꿨습니다.')
                      setAliasTarget(null)
                    },
                  },
                )
              }
            >
              저장
            </button>
          </>
        }
      >
        <div className="form">
          <div className="field">
            <span className="field__label">별칭</span>
            <input
              className="input"
              maxLength={50}
              placeholder="수학 담당"
              value={alias}
              onChange={(event) => setAlias(event.target.value)}
            />
          </div>
          <p className="card__note">실명 대신 역할로 적기를 권합니다. 비우면 별칭을 지웁니다.</p>
        </div>
      </Modal>

      <ConfirmModal
        open={lockTarget !== null}
        title="계정 잠금"
        message={`${lockTarget?.loginId} 계정을 잠급니다. 누르는 즉시 로그인이 끊기고 진행 중이던 변환도 멈춥니다.`}
        confirmLabel="잠금"
        danger
        onConfirm={() =>
          accountAction.mutate(
            { type: 'lock', loginId: lockTarget!.loginId, locked: true },
            {
              onSuccess: (result) =>
                toast(
                  result && result.canceledJobs > 0
                    ? `계정을 잠갔습니다. 진행 중이던 변환 ${result.canceledJobs}건이 멈췄습니다.`
                    : '계정을 잠갔습니다.',
                ),
            },
          )
        }
        onClose={() => setLockTarget(null)}
      />

      <Modal
        open={openNotice !== null}
        title={openNotice?.title ?? ''}
        onClose={() => setOpenNotice(null)}
        width={520}
      >
        <div className="notice-box" style={{ color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>
          {openNotice?.body}
        </div>
        <p className="card__note">
          노출 {shortDate(openNotice?.startsOn)} ~ {shortDate(openNotice?.endsOn)}
        </p>
      </Modal>
    </>
  )
}
