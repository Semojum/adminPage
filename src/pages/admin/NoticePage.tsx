import { useState } from 'react'
import { useCreateNotice, useNotices, useOrgs } from '@/api/queries'
import { Badge, Card, Query } from '@/components/ui'
import { Modal } from '@/components/Modal'
import { useToast } from '@/components/Toast'
import { noticeStatusLabel, noticeStatusTone, shortDate } from '@/lib/format'

const EMPTY_FORM = {
  scope: 'all' as 'all' | 'org',
  orgId: '',
  startsOn: '',
  endsOn: '',
  title: '',
  body: '',
}

/**
 * AD-T1-10 · 공지 (탭)
 *
 * POST·GET /api/admin/notices
 * 특정 기관을 고르면 그 기관 담당자 화면(T2)에만 뜹니다.
 * 노출 기간이 지나면 자동으로 종료됩니다 — 서버가 조회 시점에 판정합니다(스케줄러 없음).
 */
export function NoticePage() {
  const notices = useNotices()
  const orgs = useOrgs()
  const createNotice = useCreateNotice()
  const toast = useToast()

  const [form, setForm] = useState(EMPTY_FORM)
  const [previewOpen, setPreviewOpen] = useState(false)

  const canSubmit =
    Boolean(form.title && form.startsOn && form.endsOn) &&
    form.startsOn <= form.endsOn &&
    (form.scope === 'all' || Boolean(form.orgId))

  const submit = () => {
    createNotice.mutate(
      {
        targetOrganizationId: form.scope === 'org' ? form.orgId : null,
        startsOn: form.startsOn,
        endsOn: form.endsOn,
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

  const targetName = orgs.data?.items.find((org) => org.orgId === form.orgId)?.name

  return (
    <div className="grid-2">
      <Card title="공지 작성">
        <div className="form">
          <div className="field">
            <span className="field__label">분류</span>
            <select
              className="select"
              value={form.scope}
              onChange={(event) => setForm({ ...form, scope: event.target.value as 'all' | 'org' })}
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
                onChange={(event) => setForm({ ...form, orgId: event.target.value })}
              >
                <option value="">기관을 고르세요</option>
                {orgs.data?.items.map((org) => (
                  <option key={org.orgId} value={org.orgId}>
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
                value={form.startsOn}
                onChange={(event) => setForm({ ...form, startsOn: event.target.value })}
              />
              <span className="muted">~</span>
              <input
                className="input"
                type="date"
                value={form.endsOn}
                onChange={(event) => setForm({ ...form, endsOn: event.target.value })}
              />
            </div>
          </div>

          <div className="field">
            <span className="field__label">제목</span>
            <input
              className="input"
              maxLength={200}
              placeholder="8/15 새벽 서버 점검 안내"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
          </div>

          <textarea
            className="textarea"
            placeholder="본문"
            value={form.body}
            onChange={(event) => setForm({ ...form, body: event.target.value })}
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

          <p className="card__note">
            특정 기관 공지는 그 기관 담당자 화면(T2)에만 노출 · 노출 기간이 지나면 자동 종료
          </p>
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
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="muted">
                        보낸 공지가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    data.map((notice) => (
                      <tr key={notice.id}>
                        <td>{shortDate(notice.createdAt)}</td>
                        <td>
                          <Badge tone={notice.targetOrganizationId ? 'danger' : 'muted'}>
                            {notice.targetOrganizationId
                              ? (notice.targetOrgName ?? '특정 기관')
                              : '전체'}
                          </Badge>
                        </td>
                        <td>{notice.title}</td>
                        <td>
                          <Badge tone={noticeStatusTone[notice.displayStatus]}>
                            {noticeStatusLabel[notice.displayStatus]}
                          </Badge>
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

      <Modal open={previewOpen} title="미리 보기" onClose={() => setPreviewOpen(false)} width={520}>
        <div className="notice-box">
          <div style={{ marginBottom: 8 }}>
            <Badge tone={form.scope === 'all' ? 'muted' : 'danger'}>
              {form.scope === 'all' ? '전체' : (targetName ?? '특정 기관')}
            </Badge>
          </div>
          <div style={{ color: 'var(--ink)', fontWeight: 700, marginBottom: 6 }}>{form.title}</div>
          <div style={{ color: 'var(--ink)', whiteSpace: 'pre-wrap' }}>{form.body}</div>
        </div>
        {/* 노출 기간은 공지 내용이 아니라 운영 정보라 블록 밖에 둡니다. */}
        <p className="card__note">
          노출 {form.startsOn || '—'} ~ {form.endsOn || '—'}
        </p>
      </Modal>
    </div>
  )
}
