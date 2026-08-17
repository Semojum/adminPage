import { Fragment, useState } from 'react'
import type { AdminOrgRow, ContractType } from '@/api/types'
import { useAdminAccountAction, useAdminOrgAction, useCreateAccount, useCreateOrg, useOrgs } from '@/api/queries'
import { Badge, Card, Query } from '@/components/ui'
import { ConfirmModal, Modal } from '@/components/Modal'
import { useToast } from '@/components/Toast'
import { accountStatusLabel, contractTypeLabel, number } from '@/lib/format'
import { openWindow } from '@/lib/openWindow'

type Confirm = { title: string; message: string; confirmLabel: string; danger: boolean; run: () => void }

/**
 * T1-6 · 기관 · 계정 (탭)
 *
 * 기획서: 기관과 소속 계정을 한 표에서 봅니다. 기관 수가 적어 화면을 나누지 않았습니다.
 * 발급은 위 버튼에서, 삭제는 각 줄의 버튼으로 합니다.
 */
export function OrgAccountPage() {
  const orgs = useOrgs()
  const toast = useToast()

  const accountAction = useAdminAccountAction()
  const orgAction = useAdminOrgAction()

  const [orgFormOpen, setOrgFormOpen] = useState(false)
  const [accountFormOpen, setAccountFormOpen] = useState(false)
  const [confirm, setConfirm] = useState<Confirm | null>(null)

  const ask = (next: Confirm) => setConfirm(next)

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
                    <th className="table__num">이번 달</th>
                    <th>제어</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((org) => (
                    <Fragment key={org.id}>
                      {org.accounts.map((account, index) => (
                        <tr key={account.id}>
                          {index === 0 && (
                            <td rowSpan={org.accounts.length + 1} className="table__org">
                              {/* 기관명을 누르면 T1-7 기관 정보 창이 새 창으로 열립니다. */}
                              <button
                                type="button"
                                className="btn btn--link"
                                onClick={() => openWindow(`/admin/orgs/${org.id}`, `org-${org.id}`)}
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
                              onClick={() => openWindow(`/admin/accounts/${account.id}`, `acc-${account.id}`)}
                            >
                              {account.accountId}
                            </button>
                            {account.alias && <small className="muted"> · {account.alias}</small>}
                          </td>
                          <td>
                            <Badge tone={account.status === 'active' ? 'ok' : 'muted'}>
                              {accountStatusLabel[account.status]}
                            </Badge>
                          </td>
                          <td className={account.lastLoginAt ? '' : 'dash'}>{account.lastLoginAt ?? '—'}</td>
                          <td className="table__num">{number(account.monthUsage)}</td>
                          <td className="table__actions">
                            <button
                              type="button"
                              className="btn btn--sm"
                              onClick={() =>
                                ask({
                                  title: '비밀번호 재발급',
                                  message: `${account.accountId} 계정의 비밀번호를 재발급합니다.`,
                                  confirmLabel: '재발급',
                                  danger: false,
                                  run: () =>
                                    accountAction.mutate(
                                      { type: 'resetPassword', accountId: account.id },
                                      { onSuccess: () => toast('비밀번호를 재발급했습니다.') },
                                    ),
                                })
                              }
                            >
                              비번
                            </button>
                            <button
                              type="button"
                              className="btn btn--sm btn--danger"
                              onClick={() =>
                                ask({
                                  // 기획서 §6: 누르는 즉시 로그인이 끊기고 진행 중이던 변환도 멈춥니다.
                                  title: account.status === 'locked' ? '잠금 해제' : '계정 잠금',
                                  message:
                                    account.status === 'locked'
                                      ? `${account.accountId} 계정의 잠금을 풉니다.`
                                      : `${account.accountId} 계정을 잠급니다. 누르는 즉시 로그인이 끊기고 진행 중이던 변환도 멈춥니다.`,
                                  confirmLabel: account.status === 'locked' ? '잠금 해제' : '잠금',
                                  danger: account.status !== 'locked',
                                  run: () =>
                                    accountAction.mutate(
                                      {
                                        type: account.status === 'locked' ? 'unlock' : 'lock',
                                        accountId: account.id,
                                      },
                                      { onSuccess: () => toast('계정 상태를 바꿨습니다.') },
                                    ),
                                })
                              }
                            >
                              {account.status === 'locked' ? '잠금 해제' : '잠금'}
                            </button>
                            <button
                              type="button"
                              className="btn btn--sm"
                              onClick={() =>
                                ask({
                                  title: '계정 삭제',
                                  message: `${account.accountId} 계정을 삭제합니다. 되돌릴 수 없습니다.`,
                                  confirmLabel: '삭제',
                                  danger: true,
                                  run: () =>
                                    accountAction.mutate(
                                      { type: 'delete', accountId: account.id },
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
                        <td>소계 · 계정 {org.subtotal.accountCount}</td>
                        <td className="dash">—</td>
                        <td>
                          {org.subtotal.lastLoginAt ?? '—'} <span className="muted">관리자</span>
                        </td>
                        <td className="table__num">{number(org.subtotal.monthUsage)}</td>
                        <td className="table__actions">
                          <button
                            type="button"
                            className="btn btn--sm"
                            onClick={() =>
                              ask({
                                title: '관리자 비밀번호 재발급',
                                message: `${org.name} 기관 관리자 비밀번호를 재발급합니다.`,
                                confirmLabel: '재발급',
                                danger: false,
                                run: () =>
                                  orgAction.mutate(
                                    { type: 'resetAdminPassword', orgId: org.id },
                                    { onSuccess: () => toast('관리자 비밀번호를 재발급했습니다.') },
                                  ),
                              })
                            }
                          >
                            관리자 비번
                          </button>
                          <button
                            type="button"
                            className="btn btn--sm btn--danger"
                            onClick={() =>
                              ask({
                                title: '기관 삭제',
                                message: `${org.name} 기관과 소속 계정을 삭제합니다. 되돌릴 수 없습니다.`,
                                confirmLabel: '삭제',
                                danger: true,
                                run: () =>
                                  orgAction.mutate(
                                    { type: 'delete', orgId: org.id },
                                    { onSuccess: () => toast('기관을 삭제했습니다.') },
                                  ),
                              })
                            }
                          >
                            기관 삭제
                          </button>
                        </td>
                      </tr>
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Query>
      </Card>

      <CreateOrgModal open={orgFormOpen} onClose={() => setOrgFormOpen(false)} />
      <CreateAccountModal
        open={accountFormOpen}
        orgs={orgs.data?.items ?? []}
        onClose={() => setAccountFormOpen(false)}
      />

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

const CONTRACT_TYPES: ContractType[] = ['paid', 'trial', 'internal']

function CreateOrgModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const createOrg = useCreateOrg()
  const toast = useToast()
  const [form, setForm] = useState({
    name: '',
    code: '',
    contractType: 'paid' as ContractType,
    contractStart: '',
    contractEnd: '',
  })

  const submit = () => {
    createOrg.mutate(form, {
      onSuccess: () => {
        toast('기관을 발급했습니다.')
        setForm({ name: '', code: '', contractType: 'paid', contractStart: '', contractEnd: '' })
        onClose()
      },
    })
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
            disabled={!form.name || !form.code || createOrg.isPending}
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
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div className="field">
          <span className="field__label">코드</span>
          <input
            className="input"
            placeholder="kblib"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />
        </div>
        <div className="field">
          <span className="field__label">계약 구분</span>
          <select
            className="select"
            value={form.contractType}
            onChange={(e) => setForm({ ...form, contractType: e.target.value as ContractType })}
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
              value={form.contractStart}
              onChange={(e) => setForm({ ...form, contractStart: e.target.value })}
            />
            <span className="muted">~</span>
            <input
              className="input"
              type="date"
              value={form.contractEnd}
              onChange={(e) => setForm({ ...form, contractEnd: e.target.value })}
            />
          </div>
        </div>
        <p className="card__note">계정 아이디는 기관 코드에 번호를 붙여 자동 생성합니다.</p>
      </div>
    </Modal>
  )
}

function CreateAccountModal({
  open,
  orgs,
  onClose,
}: {
  open: boolean
  orgs: AdminOrgRow[]
  onClose: () => void
}) {
  const createAccount = useCreateAccount()
  const toast = useToast()
  const [orgId, setOrgId] = useState('')
  const [alias, setAlias] = useState('')

  const targetOrgId = orgId || orgs[0]?.id || ''

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
            disabled={!targetOrgId || createAccount.isPending}
            onClick={() =>
              createAccount.mutate(
                { orgId: targetOrgId, alias: alias || undefined },
                {
                  onSuccess: () => {
                    toast('계정을 발급했습니다.')
                    setAlias('')
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
          <select className="select" value={targetOrgId} onChange={(e) => setOrgId(e.target.value)}>
            {orgs.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <span className="field__label">별칭</span>
          <input
            className="input"
            placeholder="수학 담당"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
          />
        </div>
        <p className="card__note">
          아이디는 기관 코드에 번호를 붙여 자동 생성합니다. 별칭은 실명 대신 역할로 적기를 권합니다.
        </p>
      </div>
    </Modal>
  )
}
