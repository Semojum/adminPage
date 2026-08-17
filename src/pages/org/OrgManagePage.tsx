import { useEffect, useState } from 'react'
import {
  useOrgAccountAction,
  useOrgAccounts,
  useOrgMonthlyUsage,
  useOrgNoticeList,
  useOrgOrders,
  useOrgSummary,
  useRequestAccount,
  useRequestCredit,
  useUpdateBillingEmail,
} from '@/api/queries'
import { Badge, Card, Meter, Query, VBarChart } from '@/components/ui'
import { ConfirmModal, Modal } from '@/components/Modal'
import { useToast } from '@/components/Toast'
import { accountStatusLabel, number, won } from '@/lib/format'
import { openWindow } from '@/lib/openWindow'

/**
 * T2 · 기관 관리 (기관 관리자 계정으로 앱 로그인)
 *
 * 기획서 §6 열람 범위: 기관 담당자는 자기 기관의 작업 목록·상태·크레딧까지 봅니다.
 * 파일 내용과 접속 정보는 보이지 않습니다. 원가도 나오지 않습니다 — 고객 화면에는 크레딧만.
 */
export function OrgManagePage() {
  const summary = useOrgSummary()
  const usage = useOrgMonthlyUsage()
  const notices = useOrgNoticeList()
  const accounts = useOrgAccounts()
  const orders = useOrgOrders()

  const requestCredit = useRequestCredit()
  const requestAccount = useRequestAccount()
  const accountAction = useOrgAccountAction()
  const updateEmail = useUpdateBillingEmail()
  const toast = useToast()

  const [creditOpen, setCreditOpen] = useState(false)
  const [creditForm, setCreditForm] = useState({ amount: 3000, message: '' })
  const [accountOpen, setAccountOpen] = useState(false)
  const [accountAlias, setAccountAlias] = useState('')
  const [lockTarget, setLockTarget] = useState<{ id: string; accountId: string } | null>(null)
  const [email, setEmail] = useState('')
  const [noticeId, setNoticeId] = useState<string | null>(null)

  useEffect(() => {
    if (orders.data) setEmail(orders.data.billingEmail)
  }, [orders.data])

  const openNotice = notices.data?.items.find((notice) => notice.id === noticeId)

  return (
    <>
      <Query state={summary} rows={3}>
        {(data) => (
          <div className="grid-3">
            <Card title="할당 크레딧">
              <span className="stat__value num">{number(data.credit.total)}</span>
              <Meter used={data.credit.used} total={data.credit.total} rate={data.credit.rate} />
            </Card>

            <Card title="남은 크레딧">
              <span className="stat__value num">{number(data.credit.remaining)}</span>
              {data.credit.expectedDepletion && (
                <span className="card__note">{data.credit.expectedDepletion} 소진 예상</span>
              )}
              {/* 누르면 세모점 문의 목록(T1-9)으로 들어갑니다. */}
              <button
                type="button"
                className="btn btn--primary btn--block"
                onClick={() => setCreditOpen(true)}
              >
                ＋ 크레딧 추가 요청
              </button>
            </Card>

            <Card title="계약">
              <span className="stat__value num">{data.contract.endAt}</span>
              <span style={{ color: 'var(--danger)', fontWeight: 700, fontSize: 13 }}>
                {data.contract.daysLeft}일 남음
              </span>
              <span className="card__note">시작 {data.contract.startAt}</span>
            </Card>
          </div>
        )}
      </Query>

      <div className="grid-2">
        <Card title="월별 사용 추이">
          <Query state={usage} rows={4}>
            {(data) => (
              <>
                <VBarChart
                  data={data.points.map((point) => ({
                    label: point.label,
                    primary: point.credit,
                    caption: number(point.credit),
                  }))}
                />
                <div className="legend">
                  <span className="legend__item">
                    <i className="legend__swatch" />월 사용 크레딧
                  </span>
                  <span className="legend__spacer">6개월 평균 {number(data.average)}</span>
                </div>
              </>
            )}
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
                    {data.items.map((notice) => (
                      <tr key={notice.id}>
                        <td>{notice.receivedAt}</td>
                        <td>
                          <Badge tone={notice.scope === 'all' ? 'muted' : 'danger'}>
                            {notice.scope === 'all' ? '전체' : '우리 기관'}
                          </Badge>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn--link"
                            onClick={() => setNoticeId(notice.id)}
                          >
                            {notice.title}
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
      </div>

      <Card
        title="소속 계정"
        note={
          accounts.data?.pendingRequestCount
            ? `발급 요청 ${accounts.data.pendingRequestCount}건 처리 중`
            : undefined
        }
        actions={
          <button type="button" className="btn" onClick={() => setAccountOpen(true)}>
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
                    <tr key={account.id}>
                      <td>
                        {account.accountId ? (
                          <>
                            {/* 계정 ID 를 누르면 T2-2 계정 상세 창이 열립니다. */}
                            <button
                              type="button"
                              className="btn btn--link"
                              onClick={() => openWindow(`/org/accounts/${account.id}`, `orgacc-${account.id}`)}
                            >
                              {account.accountId}
                            </button>
                            {account.self && <span className="muted"> 본인</span>}
                          </>
                        ) : (
                          <span className="muted">발급 요청 중</span>
                        )}
                      </td>
                      <td className={account.alias ? '' : 'dash'}>{account.alias ?? '—'}</td>
                      <td>
                        {account.status === 'requested' ? (
                          <Badge tone="warn">{account.requestedAt}</Badge>
                        ) : (
                          <Badge tone={account.status === 'active' ? 'ok' : 'muted'}>
                            {accountStatusLabel[account.status]}
                          </Badge>
                        )}
                      </td>
                      <td className={account.lastLoginAt ? '' : 'dash'}>{account.lastLoginAt ?? '—'}</td>
                      <td className="table__num">
                        {account.usage === null ? <span className="dash">—</span> : number(account.usage)}
                      </td>
                      <td className="table__actions">
                        {account.status === 'requested' ? (
                          <button
                            type="button"
                            className="btn btn--sm"
                            onClick={() =>
                              accountAction.mutate(
                                { type: 'cancelRequest', accountId: account.id },
                                { onSuccess: () => toast('요청을 취소했습니다.') },
                              )
                            }
                          >
                            요청 취소
                          </button>
                        ) : account.self ? (
                          <span className="dash">—</span>
                        ) : account.status === 'locked' ? (
                          <button
                            type="button"
                            className="btn btn--sm"
                            onClick={() =>
                              accountAction.mutate(
                                { type: 'unlock', accountId: account.id },
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
                            onClick={() =>
                              setLockTarget({ id: account.id, accountId: account.accountId ?? '' })
                            }
                          >
                            잠금
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Query>
        <p className="card__note">발급과 삭제는 세모점이 합니다. 요청 상태가 목록에 함께 보입니다.</p>
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
                    {data.items.map((order) => (
                      <tr key={order.id}>
                        <td>{order.date}</td>
                        <td>{order.description}</td>
                        <td className="table__num">{won(order.amount)}</td>
                        <td>
                          <Badge tone={order.payment === 'paid' ? 'ok' : 'warn'}>
                            {order.payment === 'paid' ? '완납' : '미납'}
                          </Badge>
                        </td>
                        <td>{order.invoice === 'issued' ? '발행 완료' : '발행 대기'}</td>
                        <td>
                          {order.receiptUrl ? (
                            <a className="table__link" href={order.receiptUrl}>
                              내려받기
                            </a>
                          ) : (
                            <span className="dash">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="field" style={{ gridTemplateColumns: '110px minmax(0, 320px)' }}>
                <span className="field__label">증빙 받는 사람</span>
                <input
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => {
                    if (email && email !== data.billingEmail) {
                      updateEmail.mutate(email, { onSuccess: () => toast('증빙 수신자를 바꿨습니다.') })
                    }
                  }}
                />
              </div>
            </>
          )}
        </Query>
      </Card>

      <Modal
        open={creditOpen}
        title="크레딧 추가 요청"
        onClose={() => setCreditOpen(false)}
        footer={
          <>
            <button type="button" className="btn" onClick={() => setCreditOpen(false)}>
              취소
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={requestCredit.isPending}
              onClick={() =>
                requestCredit.mutate(creditForm, {
                  onSuccess: () => {
                    toast('세모점 문의로 요청을 보냈습니다.')
                    setCreditOpen(false)
                  },
                })
              }
            >
              요청 보내기
            </button>
          </>
        }
      >
        <div className="form">
          <div className="field">
            <span className="field__label">필요 크레딧</span>
            <input
              className="input"
              type="number"
              value={creditForm.amount}
              onChange={(e) => setCreditForm({ ...creditForm, amount: Number(e.target.value) })}
            />
          </div>
          <textarea
            className="textarea"
            placeholder="남길 말 (선택)"
            value={creditForm.message}
            onChange={(e) => setCreditForm({ ...creditForm, message: e.target.value })}
          />
          <p className="card__note">요청은 세모점 문의 목록으로 들어갑니다. 처리 상태가 이 화면에 남습니다.</p>
        </div>
      </Modal>

      <Modal
        open={accountOpen}
        title="계정 발급 요청"
        onClose={() => setAccountOpen(false)}
        footer={
          <>
            <button type="button" className="btn" onClick={() => setAccountOpen(false)}>
              취소
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={requestAccount.isPending}
              onClick={() =>
                requestAccount.mutate(
                  { alias: accountAlias || undefined },
                  {
                    onSuccess: () => {
                      toast('세모점 문의로 요청을 보냈습니다.')
                      setAccountAlias('')
                      setAccountOpen(false)
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
          <div className="field">
            <span className="field__label">별칭</span>
            <input
              className="input"
              placeholder="국어 담당"
              value={accountAlias}
              onChange={(e) => setAccountAlias(e.target.value)}
            />
          </div>
          <p className="card__note">실명 대신 역할로 적기를 권합니다.</p>
        </div>
      </Modal>

      <ConfirmModal
        open={lockTarget !== null}
        title="계정 잠금"
        message={`${lockTarget?.accountId} 계정을 잠급니다. 누르는 즉시 로그인이 끊기고 진행 중이던 변환도 멈춥니다.`}
        confirmLabel="잠금"
        danger
        onConfirm={() =>
          accountAction.mutate(
            { type: 'lock', accountId: lockTarget!.id },
            { onSuccess: () => toast('계정을 잠갔습니다.') },
          )
        }
        onClose={() => setLockTarget(null)}
      />

      <Modal
        open={openNotice !== undefined}
        title={openNotice?.title ?? ''}
        onClose={() => setNoticeId(null)}
        width={520}
      >
        <div className="notice-box" style={{ color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>
          {openNotice?.body}
        </div>
      </Modal>
    </>
  )
}
