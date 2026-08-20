import { Fragment, useState } from 'react'
import type { AdminOrgRow, ContractType, IssuedCredential } from '@/api/types'
import { useAdminAccountAction, useCreateAccounts, useCreateOrg, useOrgs } from '@/api/queries'
import { Badge, Card, Query } from '@/components/ui'
import { ConfirmModal, Modal } from '@/components/Modal'
import { useToast } from '@/components/Toast'
import { CONTRACT_TYPES, accountStatusLabel, contractTypeLabel, lastLogin, number } from '@/lib/format'
import { openWindow } from '@/lib/openWindow'

type Confirm = { title: string; message: string; confirmLabel: string; danger: boolean; run: () => void }

/**
 * AD-T1-6 · 기관 · 계정 (탭)
 *
 * GET /api/admin/orgs — 기관과 소속 계정을 한 표에서 봅니다.
 * 제어는 계정별 API 를 그대로 씁니다:
 *   비번   POST   /api/admin/accounts/{loginId}/password-reissue
 *   잠금   PATCH  /api/admin/accounts/{loginId}/status   (INACTIVE = 즉시 세션 끊김)
 *   삭제   DELETE /api/admin/accounts/{loginId}
 */
export function OrgAccountPage() {
  const orgs = useOrgs()
  const toast = useToast()

  const accountAction = useAdminAccountAction()

  const [orgFormOpen, setOrgFormOpen] = useState(false)
  const [accountFormOpen, setAccountFormOpen] = useState(false)
  const [confirm, setConfirm] = useState<Confirm | null>(null)
  /** 발급·재발급 비밀번호는 응답에서 한 번만 볼 수 있어, 닫기 전까지 띄워 둡니다. */
  const [issued, setIssued] = useState<IssuedCredential[] | null>(null)

  const ask = (next: Confirm) => setConfirm(next)

  const reissue = (loginId: string, label: string) =>
    ask({
      title: '비밀번호 재발급',
      message: `${label} 계정의 비밀번호를 새 난수로 바꿉니다. 새 비밀번호는 이번 한 번만 볼 수 있습니다.`,
      confirmLabel: '재발급',
      danger: false,
      run: () =>
        accountAction.mutate(
          { type: 'reissuePassword', loginId },
          { onSuccess: (result) => result && setIssued([result]) },
        ),
    })

  return (
    <>
      <Card
        title="기관 및 계정"
        actions={
          <>
            <button type="button" className="btn" onClick={() => setOrgFormOpen(true)}>
              ＋ 기관 발급
            </button>
            <button type="button" className="btn btn--primary" onClick={() => setAccountFormOpen(true)}>
              ＋ 계정 발급
            </button>
          </>
        }
      >
        <Query state={orgs} rows={6}>
          {(data) => (
            <div className="table-wrap">
              <table className="table table--rowgroup">
                <thead>
                  <tr>
                    <th>기관명</th>
                    <th>계정 ID</th>
                    <th>상태</th>
                    <th>마지막 로그인</th>
                    <th className="table__num">이번 달 사용 크레딧</th>
                    <th>제어</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((org) => (
                      <Fragment key={org.orgId}>
                        {org.accounts.map((account, index) => (
                          <tr key={account.loginId}>
                            {index === 0 && (
                              <td rowSpan={org.accounts.length + 1} className="table__org">
                                {/* 기관명을 누르면 T1-7 기관 정보 창이 새 창으로 열립니다. */}
                                <button
                                  type="button"
                                  className="btn btn--link"
                                  onClick={() => openWindow(`/admin/orgs/${org.orgId}`, `org-${org.orgId}`)}
                                >
                                  {org.name}
                                </button>
                                <small>
                                  {org.code} · {contractTypeLabel[org.contractType]}
                                </small>
                              </td>
                            )}
                            <td>
                              {/* 계정 ID 를 누르면 T1-8 계정 정보 창이 새 창으로 열립니다. */}
                              <button
                                type="button"
                                className="btn btn--link"
                                onClick={() =>
                                  openWindow(`/admin/accounts/${account.loginId}`, `acc-${account.loginId}`)
                                }
                              >
                                {account.loginId}
                              </button>
                              {account.alias && <small className="muted"> · {account.alias}</small>}
                            </td>
                            <td>
                              <Badge tone={account.status === 'ACTIVE' ? 'ok' : 'muted'}>
                                {accountStatusLabel[account.status]}
                              </Badge>
                            </td>
                            <td className={account.lastLoginAt ? '' : 'dash'}>
                              {lastLogin(account.lastLoginAt)}
                            </td>
                            {/* 기관 관리자 계정은 변환을 돌리지 않습니다 — 사용 크레딧을 — 로 둡니다. */}
                            <td className="table__num">
                              {account.role === 'ROLE_ORG_ADMIN' ? (
                                <span className="dash">—</span>
                              ) : (
                                number(account.monthCredits)
                              )}
                            </td>
                            <td className="table__actions">
                              <button
                                type="button"
                                className="btn btn--sm"
                                onClick={() => reissue(account.loginId, account.loginId)}
                              >
                                PW 재발급
                              </button>
                              <button
                                type="button"
                                /* 잠금은 되돌릴 수 있는 조작이라 회색, 삭제만 빨강으로 둡니다. */
                                className={`btn btn--sm ${account.status === 'INACTIVE' ? '' : 'btn--muted'}`}
                                onClick={() =>
                                  ask({
                                    // 명세 §계정 상태 변경: INACTIVE 는 활성 세션을 즉시 끊습니다.
                                    title: account.status === 'INACTIVE' ? '잠금 해제' : '계정 잠금',
                                    message:
                                      account.status === 'INACTIVE'
                                        ? `${account.loginId} 계정의 잠금을 풉니다.`
                                        : `${account.loginId} 계정을 잠급니다. 누르는 즉시 로그인이 끊기고 진행 중이던 변환도 멈춥니다.`,
                                    confirmLabel: account.status === 'INACTIVE' ? '잠금 해제' : '잠금',
                                    danger: account.status !== 'INACTIVE',
                                    run: () =>
                                      accountAction.mutate(
                                        {
                                          type: 'status',
                                          loginId: account.loginId,
                                          status: account.status === 'INACTIVE' ? 'ACTIVE' : 'INACTIVE',
                                        },
                                        { onSuccess: () => toast('계정 상태를 바꿨습니다.') },
                                      ),
                                  })
                                }
                              >
                                {account.status === 'INACTIVE' ? '잠금 해제' : '잠금'}
                              </button>
                              <button
                                type="button"
                                className="btn btn--sm btn--danger"
                                onClick={() =>
                                  ask({
                                    title: '계정 삭제',
                                    message: `${account.loginId} 계정을 삭제합니다. 로그인이 막히고 목록에서 사라집니다.`,
                                    confirmLabel: '삭제',
                                    danger: true,
                                    run: () =>
                                      accountAction.mutate(
                                        { type: 'delete', loginId: account.loginId },
                                        { onSuccess: () => toast('계정을 삭제했습니다.') },
                                      ),
                                  })
                                }
                              >
                                삭제
                              </button>
                            </td>
                          </tr>
                        ))}

                        {/* 소계 줄 — 마지막 로그인은 기관 관리자 기준, 사용량은 소속 계정 전체 합입니다. */}
                        <tr className="table__subtotal">
                          {org.accounts.length === 0 && (
                            <td className="table__org">
                              <button
                                type="button"
                                className="btn btn--link"
                                onClick={() => openWindow(`/admin/orgs/${org.orgId}`, `org-${org.orgId}`)}
                              >
                                {org.name}
                              </button>
                              <small>
                                {org.code} · {contractTypeLabel[org.contractType]}
                              </small>
                            </td>
                          )}
                          <td>소계 · 계정 {org.subtotal.accountCount}</td>
                          <td className="dash">—</td>
                          <td>
                            {lastLogin(org.subtotal.adminLastLoginAt)}{' '}
                            <span className="muted">(관리자)</span>
                          </td>
                          <td className="table__num">{number(org.subtotal.monthCredits)}</td>
                          {/* 소계는 합계만 봅니다 — 기관 제어(PW 재발급·삭제)는 기관 정보 창에서 합니다. */}
                          <td />
                        </tr>
                      </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Query>

        <p className="card__note">
          기관명 클릭 → 기관 정보(새 창) · 계정 ID 클릭 → 계정 정보(새 창) · 소계 줄 = 기관 합계(마지막
          로그인은 기관 관리자 기준)
        </p>
      </Card>

      <CreateOrgModal open={orgFormOpen} onClose={() => setOrgFormOpen(false)} />
      <CreateAccountModal
        open={accountFormOpen}
        orgs={orgs.data?.items ?? []}
        onClose={() => setAccountFormOpen(false)}
        onIssued={setIssued}
      />

      <IssuedModal credentials={issued} onClose={() => setIssued(null)} />

      <ConfirmModal
        open={confirm !== null}
        title={confirm?.title ?? ''}
        message={confirm?.message ?? ''}
        confirmLabel={confirm?.confirmLabel}
        danger={confirm?.danger}
        onConfirm={() => confirm?.run()}
        onClose={() => setConfirm(null)}
      />
    </>
  )
}

/** 비밀번호는 응답에서 한 번만 나옵니다 — 닫기 전에 옮겨 적어야 합니다. */
function IssuedModal({
  credentials,
  onClose,
}: {
  credentials: IssuedCredential[] | null
  onClose: () => void
}) {
  return (
    <Modal
      open={credentials !== null}
      title="발급 결과"
      width={480}
      onClose={onClose}
      footer={
        <button type="button" className="btn btn--primary" onClick={onClose}>
          확인했습니다
        </button>
      }
    >
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>계정 ID</th>
              <th>초기 비밀번호</th>
            </tr>
          </thead>
          <tbody>
            {(credentials ?? []).map((credential) => (
              <tr key={credential.loginId}>
                <td>{credential.loginId}</td>
                <td className="num">{credential.password}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="notice-box">
        비밀번호는 <strong>이 창에서만</strong> 볼 수 있습니다. 서버는 해시만 보관해 다시 조회할 수
        없습니다. 창을 닫기 전에 옮겨 적어 주세요.
      </p>
    </Modal>
  )
}

function CreateOrgModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createOrg = useCreateOrg()
  const toast = useToast()
  const [form, setForm] = useState({
    name: '',
    code: '',
    // 서버 기본값과 같은 값에서 시작합니다(명세 §기관 생성: 신규 기관 기본 FREE).
    contractType: 'FREE' as ContractType,
    contractExpiresAt: '',
  })

  const submit = () => {
    createOrg.mutate(
      {
        name: form.name,
        code: form.code || undefined,
        contractType: form.contractType,
        contractExpiresAt: form.contractExpiresAt || undefined,
      },
      {
        onSuccess: (created) => {
          toast(`${created.name}(${created.code}) 기관을 발급했습니다.`)
          setForm({ name: '', code: '', contractType: 'FREE', contractExpiresAt: '' })
          onClose()
        },
      },
    )
  }

  return (
    <Modal
      open={open}
      title="기관 발급"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={!form.name || createOrg.isPending}
            onClick={submit}
          >
            발급
          </button>
        </>
      }
    >
      <div className="form">
        <div className="field">
          <span className="field__label">기관명</span>
          <input
            className="input"
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </div>
        <div className="field">
          <span className="field__label">코드</span>
          <input
            className="input"
            placeholder="kblib (비우면 자동)"
            value={form.code}
            onChange={(event) => setForm({ ...form, code: event.target.value })}
          />
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
          <span className="field__label">계약 만료일</span>
          <input
            className="input"
            type="date"
            value={form.contractExpiresAt}
            onChange={(event) => setForm({ ...form, contractExpiresAt: event.target.value })}
          />
        </div>
        <p className="card__note">
          코드는 소문자 영숫자 2~12자(첫 글자 영문)이고 계정 ID 앞머리가 됩니다 — kblib → kblib01.
          할당 크레딧과 계약 시작일은 기관 정보 창에서 채웁니다.
        </p>
      </div>
    </Modal>
  )
}

const CONTRACT_HINT: Record<ContractType, string> = {
  BASIC: '유료 BASIC',
  STANDARD: '유료 STANDARD',
  PREMIUM: '유료 PREMIUM',
  FREE: '무료 FREE',
  COUPON: 'COUPON',
}

function CreateAccountModal({
  open,
  orgs,
  onClose,
  onIssued,
}: {
  open: boolean
  orgs: AdminOrgRow[]
  onClose: () => void
  onIssued: (credentials: IssuedCredential[]) => void
}) {
  const createAccounts = useCreateAccounts()
  const [orgId, setOrgId] = useState('')
  const [count, setCount] = useState(1)

  const targetOrgId = orgId || orgs[0]?.orgId || ''

  return (
    <Modal
      open={open}
      title="계정 발급"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            className="btn btn--primary"
            disabled={!targetOrgId || count < 1 || count > 50 || createAccounts.isPending}
            onClick={() =>
              createAccounts.mutate(
                { organizationId: targetOrgId, count },
                {
                  onSuccess: (credentials) => {
                    onIssued(credentials)
                    setCount(1)
                    onClose()
                  },
                },
              )
            }
          >
            발급
          </button>
        </>
      }
    >
      <div className="form">
        <div className="field">
          <span className="field__label">기관</span>
          <select className="select" value={targetOrgId} onChange={(event) => setOrgId(event.target.value)}>
            {orgs.map((org) => (
              <option key={org.orgId} value={org.orgId}>
                {org.name} · {CONTRACT_HINT[org.contractType as ContractType] ?? org.contractType}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <span className="field__label">수량</span>
          <input
            className="input"
            type="number"
            min={1}
            max={50}
            value={count}
            onChange={(event) => setCount(Number(event.target.value))}
          />
        </div>
        <p className="card__note">
          아이디는 서버가 <strong>기관 코드 + 순번</strong>으로 만듭니다(kblib01, kblib02 …). 한 번에
          1~50개까지 발급할 수 있고, 초기 비밀번호는 발급 직후 한 번만 보입니다. 별칭은 기관 담당자가 T2
          에서 붙입니다.
        </p>
      </div>
    </Modal>
  )
}
