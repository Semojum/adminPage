import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { ContractType, IssueCouponInput, UpdateOrgInput } from '@/api/types'
import {
  useAdminOrders,
  useCoupons,
  useIssueCoupon,
  useOrg,
  useUpdateOrder,
  useUpdateOrg,
} from '@/api/queries'
import { api } from '@/api'
import { Badge, Card, ErrorBox, Loading, Meter, queryFallback } from '@/components/ui'
import { Modal } from '@/components/Modal'
import { useToast } from '@/components/Toast'
import { WindowShell } from '@/layouts/WindowShell'
import { CONTRACT_TYPES, contractTypeLabel, date, number, shortDate, usageRate, won } from '@/lib/format'

const COUPON_STATUS = {
  SCHEDULED: { label: '예정', tone: 'info' },
  ACTIVE: { label: '사용 중', tone: 'ok' },
  EXHAUSTED: { label: '소진', tone: 'muted' },
  ENDED: { label: '기간 종료', tone: 'muted' },
} as const

const EMPTY_COUPON: IssueCouponInput = { name: '', creditAmount: 1_000, startsOn: '', endsOn: '' }

/**
 * AD-T1-7 · 기관 정보 (새 창, T1-6 의 기관명)
 *
 * GET·PATCH /api/admin/orgs/{orgId} · GET /api/admin/orders?organizationId=
 * GET·POST  /api/admin/orgs/{orgId}/coupons
 *
 * 결제 연동은 없습니다 — 기관과 직접 주고받고 입금 확인만 담당자가 기록합니다(명세 §주문·수납).
 */
export function OrgInfoWindow() {
  const { orgId = '' } = useParams()
  const org = useOrg(orgId)
  const orders = useAdminOrders(orgId)
  const coupons = useCoupons(orgId)

  const updateOrg = useUpdateOrg(orgId)
  const updateOrder = useUpdateOrder(orgId)
  const issueCoupon = useIssueCoupon(orgId)
  const toast = useToast()

  const [form, setForm] = useState<UpdateOrgInput | null>(null)
  const [paymentTarget, setPaymentTarget] = useState<string | null>(null)
  const [paidAt, setPaidAt] = useState('')
  const [couponOpen, setCouponOpen] = useState(false)
  const [coupon, setCoupon] = useState<IssueCouponInput>(EMPTY_COUPON)

  // 불러온 값을 그대로 폼의 시작점으로 씁니다.
  useEffect(() => {
    if (!org.data) return
    setForm({
      name: org.data.name,
      contractType: (CONTRACT_TYPES as readonly string[]).includes(org.data.contractType)
        ? (org.data.contractType as ContractType)
        : 'FREE',
      contractStartedAt: org.data.contractStartedAt ?? '',
      contractExpiresAt: org.data.contractExpiresAt ?? '',
      creditAllocated: org.data.creditAllocated,
    })
  }, [org.data])

  if (!orgId) {
    return (
      <div className="window">
        <ErrorBox error={new Error('기관 ID 가 없습니다. 목록에서 다시 열어 주세요.')} />
      </div>
    )
  }
  // 에러·중단을 로딩보다 먼저 봅니다 — 조회가 실패하면 form 이 끝내 채워지지 않아
  // 로딩 분기에 갇히고 이유가 영영 안 보입니다.
  const fallback = queryFallback(org, 6)
  if (fallback || !org.data || !form) {
    return <div className="window">{fallback ?? <Loading rows={6} />}</div>
  }

  const data = org.data
  const rate = usageRate(data.creditUsed, data.creditAllocated)

  const save = () => {
    updateOrg.mutate(
      {
        name: form.name,
        contractType: form.contractType,
        contractStartedAt: form.contractStartedAt || undefined,
        contractExpiresAt: form.contractExpiresAt || undefined,
        creditAllocated: form.creditAllocated,
      },
      { onSuccess: () => toast('기관 정보를 저장했습니다.') },
    )
  }

  const downloadReceipt = async (orderId: string) => {
    try {
      // presigned URL 은 15분짜리라 누를 때마다 새로 받습니다.
      const receipt = await api.admin.getOrderReceipt(orderId)
      window.open(receipt.url, '_blank', 'noopener')
    } catch {
      toast('증빙을 받지 못했습니다.')
    }
  }

  return (
    <WindowShell
      title={`기관 정보 — ${data.name}`}
      actions={
        <button type="button" className="btn btn--primary" disabled={updateOrg.isPending} onClick={save}>
          저장
        </button>
      }
    >
      <Card className="card--flat">
        <div className="form">
          <div className="field">
            <span className="field__label">기관명</span>
            <input
              className="input"
              value={form.name ?? ''}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </div>
          <div className="field">
            <span className="field__label">코드</span>
            {/* 코드는 계정 ID 앞머리라 바꿀 수 없습니다. */}
            <input className="input input--readonly" value={`${data.code} · 변경 불가`} readOnly />
          </div>
          <div className="field">
            <span className="field__label">계약 유형</span>
            <select
              className="select"
              value={form.contractType}
              onChange={(event) => setForm({ ...form, contractType: event.target.value as ContractType })}
            >
              {CONTRACT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {contractTypeLabel[type]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <span className="field__label">계약 기간</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                className="input"
                type="date"
                value={form.contractStartedAt ?? ''}
                onChange={(event) => setForm({ ...form, contractStartedAt: event.target.value })}
              />
              <span className="muted">~</span>
              <input
                className="input"
                type="date"
                value={form.contractExpiresAt ?? ''}
                onChange={(event) => setForm({ ...form, contractExpiresAt: event.target.value })}
              />
            </div>
          </div>
          <div className="field">
            <span className="field__label">소속 계정</span>
            <input
              className="input input--readonly"
              value={data.accounts.map((account) => account.loginId).join(' · ') || '없음'}
              readOnly
            />
          </div>
          <div className="field">
            <span className="field__label">증빙 이메일</span>
            <input className="input input--readonly" value={data.receiptEmail ?? '—'} readOnly />
          </div>
        </div>
      </Card>

      <Card title="크레딧">
        <div className="field">
          <span className="field__label">할당</span>
          {/* T2 의 크레딧 추가 요청은 이 값을 올려 처리합니다(명세 §기관 상세·수정). */}
          <input
            className="input"
            type="number"
            min={0}
            value={form.creditAllocated ?? 0}
            onChange={(event) => setForm({ ...form, creditAllocated: Number(event.target.value) })}
          />
        </div>
        <Meter used={data.creditUsed} total={data.creditAllocated} rate={rate} />
        <p className="card__note">
          남은 크레딧 <strong className="num">{number(data.creditRemaining)}</strong>
          {data.creditRemaining < 0 && ' · 할당을 넘겨 쓰고 있습니다'}
        </p>
      </Card>

      <Card title="주문 · 수납">
        {orders.isPending ? (
          <Loading rows={2} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>일자</th>
                  <th>내용</th>
                  <th className="table__num">금액</th>
                  <th>입금</th>
                  <th>계산서</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(orders.data ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="muted">
                      기록된 주문이 없습니다.
                    </td>
                  </tr>
                ) : (
                  (orders.data ?? []).map((order) => (
                    <tr key={order.id}>
                      <td>{shortDate(order.orderDate)}</td>
                      <td>{order.description}</td>
                      <td className="table__num">{won(order.amountKrw)}</td>
                      <td>
                        {order.paidAt ? (
                          <Badge tone="ok">{shortDate(order.paidAt)}</Badge>
                        ) : (
                          <Badge tone="danger">미입금</Badge>
                        )}
                      </td>
                      <td className="muted">
                        {order.invoiceStatus === 'ISSUED' ? '발행 완료' : '발행 대기'}
                      </td>
                      <td className="table__actions">
                        {order.receiptFileName && (
                          <button
                            type="button"
                            className="btn btn--sm"
                            onClick={() => downloadReceipt(order.id)}
                          >
                            전표
                          </button>
                        )}
                        {!order.paidAt && (
                          <button
                            type="button"
                            className="btn btn--sm"
                            onClick={() => {
                              setPaymentTarget(order.id)
                              setPaidAt('')
                            }}
                          >
                            기록
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card
        title="쿠폰"
        actions={
          <button type="button" className="btn" onClick={() => setCouponOpen(true)}>
            ＋ 발급
          </button>
        }
      >
        {coupons.isPending ? (
          <Loading rows={2} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>쿠폰</th>
                  <th className="table__num">크레딧</th>
                  <th>기간</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {(coupons.data ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="muted">
                      발급한 쿠폰이 없습니다.
                    </td>
                  </tr>
                ) : (
                  (coupons.data ?? []).map((item) => (
                    <tr key={item.id}>
                      <td>{item.name}</td>
                      <td className="table__num">{number(item.creditAmount)}</td>
                      <td>
                        {shortDate(item.startsOn)} ~ {shortDate(item.endsOn)}
                      </td>
                      <td>
                        <Badge tone={COUPON_STATUS[item.displayStatus].tone}>
                          {number(item.used)} 사용 · {COUPON_STATUS[item.displayStatus].label}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
        {/* 명세 §차감 규칙: 쿠폰부터 차감하고, 쿠폰 차감은 계약 잔여를 건드리지 않습니다. */}
        <p className="card__note">
          체험·무료 제공은 쿠폰으로 줍니다. 차감은 쿠폰부터, 소진되면 계약 크레딧에서 빠집니다.
        </p>
      </Card>

      <Modal
        open={paymentTarget !== null}
        title="입금 기록"
        onClose={() => setPaymentTarget(null)}
        footer={
          <>
            <button type="button" className="btn" onClick={() => setPaymentTarget(null)}>
              취소
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={!paidAt || updateOrder.isPending}
              onClick={() =>
                updateOrder.mutate(
                  { orderId: paymentTarget!, paidAt },
                  {
                    onSuccess: () => {
                      toast('입금을 기록했습니다.')
                      setPaymentTarget(null)
                    },
                  },
                )
              }
            >
              기록
            </button>
          </>
        }
      >
        <div className="form">
          <div className="field">
            <span className="field__label">입금일</span>
            <input
              className="input"
              type="date"
              value={paidAt}
              onChange={(event) => setPaidAt(event.target.value)}
            />
          </div>
          <p className="card__note">결제 연동 없이 담당자가 확인한 날짜를 적습니다.</p>
        </div>
      </Modal>

      <Modal
        open={couponOpen}
        title="쿠폰 발급"
        onClose={() => setCouponOpen(false)}
        footer={
          <>
            <button type="button" className="btn" onClick={() => setCouponOpen(false)}>
              취소
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={
                !coupon.name || !coupon.startsOn || !coupon.endsOn || coupon.creditAmount <= 0 ||
                issueCoupon.isPending
              }
              onClick={() =>
                issueCoupon.mutate(coupon, {
                  onSuccess: () => {
                    toast('쿠폰을 발급했습니다.')
                    setCoupon(EMPTY_COUPON)
                    setCouponOpen(false)
                  },
                })
              }
            >
              발급
            </button>
          </>
        }
      >
        <div className="form">
          <div className="field">
            <span className="field__label">쿠폰명</span>
            <input
              className="input"
              placeholder="PoC 체험"
              value={coupon.name}
              onChange={(event) => setCoupon({ ...coupon, name: event.target.value })}
            />
          </div>
          <div className="field">
            <span className="field__label">크레딧</span>
            <input
              className="input"
              type="number"
              min={1}
              value={coupon.creditAmount}
              onChange={(event) => setCoupon({ ...coupon, creditAmount: Number(event.target.value) })}
            />
          </div>
          <div className="field">
            <span className="field__label">기간</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                className="input"
                type="date"
                value={coupon.startsOn}
                onChange={(event) => setCoupon({ ...coupon, startsOn: event.target.value })}
              />
              <span className="muted">~</span>
              <input
                className="input"
                type="date"
                value={coupon.endsOn}
                onChange={(event) => setCoupon({ ...coupon, endsOn: event.target.value })}
              />
            </div>
          </div>
          <p className="card__note">
            계약 시작 {date(data.contractStartedAt)} · 만료 {date(data.contractExpiresAt)}
          </p>
        </div>
      </Modal>
    </WindowShell>
  )
}
