import { useState } from 'react'
import type { NoticeScope } from '@/api/types'
import { useCreateNotice, useNotices, useOrgs } from '@/api/queries'
import { Badge, Card, Query } from '@/components/ui'
import { Modal } from '@/components/Modal'
import { useToast } from '@/components/Toast'

const STATE = {
  live: { label: '노출 중', tone: 'ok' },
  scheduled: { label: '예약', tone: 'info' },
  ended: { label: '종료', tone: 'muted' },
} as const

const EMPTY_FORM = {
  scope: 'all' as NoticeScope,
  orgId: '',
  startAt: '',
  endAt: '',
  title: '',
  body: '',
}

/**
 * T1-10 · 공지 (탭)
 *
 * 기획서: 점검과 변경 사항을 알립니다. 노출 기간이 지나면 자동으로 내려갑니다.
 * 특정 기관을 고르면 그 기관 담당자 화면(T2)에만 뜹니다.
 */
export function NoticePage() {
  const notices = useNotices()
  const orgs = useOrgs()
  const createNotice = useCreateNotice()
  const toast = useToast()

  const [form, setForm] = useState(EMPTY_FORM)
  const [previewOpen, setPreviewOpen] = useState(false)

  const canSubmit = Boolean(form.title && form.startAt && form.endAt) && (form.scope === 'all' || form.orgId)

  const submit = () => {
    createNotice.mutate(
      {
        scope: form.scope,
        orgId: form.scope === 'org' ? form.orgId : undefined,
        startAt: form.startAt,
        endAt: form.endAt,
        title: form.title,
        body: form.body,
      },
      {
        onSuccess: () => {
          toast('공지를 등록했습니다.')
          setForm(EMPTY_FORM)
        },
      },
    )
  }

  return (
    <div className="grid-2">
      <Card title="공지 작성">
        <div className="form">
          <div className="field">
            <span className="field__label">분류</span>
            <select
              className="select"
              value={form.scope}
              onChange={(e) => setForm({ ...form, scope: e.target.value as NoticeScope })}
            >
              <option value="all">전체 공지</option>
              <option value="org">특정 기관</option>
            </select>
          </div>

          <div className="field">
            <span className="field__label">받는 기관</span>
            {form.scope === 'all' ? (
              <input className="input input--readonly" value="전체" readOnly />
            ) : (
              <select
                className="select"
                value={form.orgId}
                onChange={(e) => setForm({ ...form, orgId: e.target.value })}
              >
                <option value="">기관을 고르세요</option>
                {orgs.data?.items.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="field">
            <span className="field__label">노출 기간</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                className="input"
                type="date"
                value={form.startAt}
                onChange={(e) => setForm({ ...form, startAt: e.target.value })}
              />
              <span className="muted">~</span>
              <input
                className="input"
                type="date"
                value={form.endAt}
                onChange={(e) => setForm({ ...form, endAt: e.target.value })}
              />
            </div>
          </div>

          <div className="field">
            <span className="field__label">제목</span>
            <input
              className="input"
              placeholder="8/15 새벽 서버 점검 안내"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <textarea
            className="textarea"
            placeholder="본문"
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
          />

          <div className="form__footer">
            <button
              type="button"
              className="btn"
              disabled={!form.title}
              onClick={() => setPreviewOpen(true)}
            >
              미리 보기
            </button>
            <button
              type="button"
              className="btn btn--primary"
              disabled={!canSubmit || createNotice.isPending}
              onClick={submit}
            >
              등록
            </button>
          </div>

          <p className="card__note">노출 기간이 지나면 자동으로 내려갑니다.</p>
        </div>
      </Card>

      <Card title="보낸 공지">
        <Query state={notices} rows={4}>
          {(data) => (
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>등록</th>
                    <th>분류</th>
                    <th>제목</th>
                    <th>상태</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((notice) => (
                    <tr key={notice.id}>
                      <td>{notice.createdAt}</td>
                      <td>
                        <Badge tone={notice.scope === 'all' ? 'muted' : 'danger'}>
                          {notice.scope === 'all' ? '전체' : (notice.orgName ?? '특정 기관')}
                        </Badge>
                      </td>
                      <td>{notice.title}</td>
                      <td>
                        <Badge tone={STATE[notice.state].tone}>{STATE[notice.state].label}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Query>
      </Card>

      <Modal open={previewOpen} title="미리 보기" onClose={() => setPreviewOpen(false)} width={520}>
        <div className="notice-box">
          <div style={{ marginBottom: 8 }}>
            <Badge tone={form.scope === 'all' ? 'muted' : 'danger'}>
              {form.scope === 'all'
                ? '전체'
                : (orgs.data?.items.find((org) => org.id === form.orgId)?.name ?? '특정 기관')}
            </Badge>
          </div>
          <div style={{ color: 'var(--ink)', fontWeight: 700, marginBottom: 6 }}>{form.title}</div>
          <div style={{ color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>{form.body}</div>
          <div style={{ marginTop: 10 }}>
            노출 {form.startAt || '—'} ~ {form.endAt || '—'}
          </div>
        </div>
      </Modal>
    </div>
  )
}
