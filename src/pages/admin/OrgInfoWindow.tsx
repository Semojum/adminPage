import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useIssueCoupon, useOrg, useRecordOrderPayment } from '@/api/queries'
import { Badge, Card, ErrorBox, Loading, Meter } from '@/components/ui'
import { Modal } from '@/components/Modal'
import { useToast } from '@/components/Toast'
import { WindowShell } from '@/layouts/WindowShell'
import { contractTypeLabel, number, won } from '@/lib/format'

/**
 * T1-7 · 기관 정보 (새 창, T1-6 의 기관명)
 *
 * 기획서: 계약과 크레딧, 수납, 쿠폰을 한자리에서 봅니다.
 * 결제는 기관과 직접 주고받고, 입금 확인만 담당자가 기록합니다. 결제 연동은 하지 않습니다.
 */
export function OrgInfoWindow() {
  const { orgId = '' } = useParams()
  const org = useOrg(orgId)
  const recordPayment = useRecordOrderPayment(orgId)
  const issueCoupon = useIssueCoupon(orgId)
  const toast = useToast()

  const [paymentTarget, setPaymentTarget] = useState<string | null>(null)
  const [paidAt, setPaidAt] = useState('')
  const [couponOpen, setCouponOpen] = useState(false)
  const [coupon, setCoupon] = useState({ name: '', credit: 1000, startAt: '', endAt: '' })

  if (org.isPending) {
    return (
      <div className="window">
        <Loading rows={6} />
      </div>
    )
  }
  if (org.error || !org.data) {
    return (
      <div className="window">
        <ErrorBox error={org.error} onRetry={org.refetch} />
      </div>
    )
  }

  const data = org.data

  return (
    <WindowShell title={`기관 정보 — ${data.name}`}>
      <Card className="card--flat">
        <div className="form">
          <div className="field">
            <span className="field__label">기관명</span>
            <input className="input" defaultValue={data.name} />
          </div>
          <div className="field">
            <span className="field__label">코드</span>
            <input className="input input--readonly" value={`${data.code} · 변경 불가`} readOnly />
          </div>
          <div className="field">
            <span className="field__label">계약 구분</span>
            <select className="select" defaultValue={data.contractType}>
              {(['paid', 'trial', 'internal'] as const).map((type) => (
                <option key={type} value={type}>
                  {contractTypeLabel[type]}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <span className="field__label">계약 기간</span>
            <input className="input" defaultValue={`${data.contractStart} ~ ${data.contractEnd}`} />
          </div>
          <div className="field">
            <span className="field__label">소속 계정</span>
            <input className="input input--readonly" value={data.accountIds.join(' · ')} readOnly />
          </div>
        </div>
      </Card>

      <Card title="크레딧">
        <Meter used={data.credit.used} total={data.credit.total} rate={data.credit.rate} />
        {data.credit.expectedDepletion && (
          <p className="card__note">소진 예상 · {data.credit.expectedDepletion}</p>
        )}
      </Card>

      <Card title="주문 · 수납">
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>일자</th>
                <th>내용</th>
                <th className="table__num">금액</th>
                <th>입금</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.orders.map((order) => (
                <tr key={order.id}>
                  <td>{order.date}</td>
                  <td>{order.description}</td>
                  <td className="table__num">{won(order.amount)}</td>
                  <td>
                    {order.paidAt ? (
                      <Badge tone="ok">{order.paidAt}</Badge>
                    ) : (
                      <Badge tone="danger">미입금</Badge>
                    )}
                  </td>
                  <td className="table__actions">
                    {order.paidAt ? (
                      <span className="muted">전표</span>
                    ) : (
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
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card
        title="쿠폰"
        actions={
          <button type="button" className="btn" onClick={() => setCouponOpen(true)}>
            ＋ 발급
          </button>
        }
      >
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
              {data.coupons.length === 0 ? (
                <tr>
                  <td colSpan={4} className="muted">
                    발급한 쿠폰이 없습니다.
                  </td>
                </tr>
              ) : (
                data.coupons.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name}</td>
                    <td className="table__num">{number(item.credit)}</td>
                    <td>
                      {item.startAt}~{item.endAt}
                    </td>
                    <td>
                      <Badge tone="warn">{number(item.used)} 사용</Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {/* 기획서 §6: 쿠폰부터 차감하고 소진되면 계약 크레딧에서 빠집니다. */}
        <p className="card__note">체험·무료 제공은 쿠폰으로 줍니다. 쿠폰부터 차감됩니다.</p>
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
              disabled={!paidAt}
              onClick={() =>
                recordPayment.mutate(
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
        <div className="field">
          <span className="field__label">입금일</span>
          <input className="input" type="date" value={paidAt} onChange={(e) => setPaidAt(e.target.value)} />
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
              disabled={!coupon.name || !coupon.credit}
              onClick={() =>
                issueCoupon.mutate(coupon, {
                  onSuccess: () => {
                    toast('쿠폰을 발급했습니다.')
                    setCoupon({ name: '', credit: 1000, startAt: '', endAt: '' })
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
              onChange={(e) => setCoupon({ ...coupon, name: e.target.value })}
            />
          </div>
          <div className="field">
            <span className="field__label">크레딧</span>
            <input
              className="input"
              type="number"
              value={coupon.credit}
              onChange={(e) => setCoupon({ ...coupon, credit: Number(e.target.value) })}
            />
          </div>
          <div className="field">
            <span className="field__label">기간</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                className="input"
                type="date"
                value={coupon.startAt}
                onChange={(e) => setCoupon({ ...coupon, startAt: e.target.value })}
              />
              <span className="muted">~</span>
              <input
                className="input"
                type="date"
                value={coupon.endAt}
                onChange={(e) => setCoupon({ ...coupon, endAt: e.target.value })}
              />
            </div>
          </div>
        </div>
      </Modal>
    </WindowShell>
  )
}
