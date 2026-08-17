import type { Api } from '../AdminApi'
import type * as T from '../types'
import { LoginFailure } from '../types'
import * as fx from './fixtures'

const LATENCY = Number(import.meta.env.VITE_MOCK_LATENCY ?? 250)

/** 실제 네트워크처럼 보이도록 살짝 늦춥니다. 로딩 상태를 화면에서 확인하려는 목적입니다. */
function delay<V>(value: V): Promise<V> {
  const copy = structuredClone(value)
  if (LATENCY <= 0) return Promise.resolve(copy)
  return new Promise((resolve) => setTimeout(() => resolve(copy), LATENCY))
}

function notFound(what: string): never {
  throw new Error(`${what}을(를) 찾을 수 없습니다.`)
}

/* 목업은 메모리 상태를 들고 있어서, 등록·잠금 같은 조작이 화면에 반영됩니다. */
const state = {
  jobs: structuredClone(fx.jobs),
  orgs: structuredClone(fx.adminOrgs),
  orgDetails: structuredClone(fx.orgDetails),
  inquiries: structuredClone(fx.inquiries),
  notices: structuredClone(fx.notices),
  orgAccounts: structuredClone(fx.orgAccounts),
  orgOrders: structuredClone(fx.orgOrders),
}

let seq = 100
const nextId = (prefix: string) => `${prefix}-${++seq}`

/** UTF-8 BOM. 기획서 §6: 엑셀에서 한글이 깨지지 않게. */
function toCsvBlob(rows: string[][]): Blob {
  const escape = (cell: string) => (/[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell)
  const body = rows.map((row) => row.map(escape).join(',')).join('\r\n')
  return new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8' })
}

const STATUS_TEXT: Record<T.JobStatus, string> = {
  uploaded: '업로드',
  processing: '진행 중',
  done: '완료',
  partialFailed: '부분 실패',
}

/** 모니터링을 다시 부를 때마다 진행 중 작업이 조금씩 나아갑니다. */
function advanceProcessingJobs() {
  for (const job of state.jobs) {
    if (job.status !== 'processing') continue
    const processed = (job.processedPages ?? 0) + 1
    if (processed >= job.pages) {
      job.status = 'done'
      job.processedPages = undefined
      job.durationSec = job.pages * 9
      job.cost = job.pages * 32
    } else {
      job.processedPages = processed
    }
  }
}

/* ─────────────── 로그인 (목업) ─────────────── */

/** 새로고침해도 로그인이 유지되도록 세션만 sessionStorage 에 둡니다. */
const SESSION_KEY = 'semojum.mock.session'

function readStoredSession(): T.Session | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as T.Session) : null
  } catch {
    return null
  }
}

function writeStoredSession(session: T.Session | null) {
  try {
    if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
    else sessionStorage.removeItem(SESSION_KEY)
  } catch {
    /* 저장이 막혀 있으면 이번 화면에서만 로그인 상태를 씁니다. */
  }
}

function authenticate(input: T.LoginInput, allowedRoles: T.Role[]): T.Session {
  const account = fx.loginAccounts.find(
    (item) => item.session.accountId === input.accountId.trim() && item.password === input.password,
  )

  // 아이디가 없는 건지 비밀번호가 틀린 건지 구분해 알려주지 않습니다 — 계정 존재 여부가 새기 때문입니다.
  if (!account) throw new LoginFailure('invalidCredentials', '아이디 또는 비밀번호를 확인해 주세요.')
  if (account.locked) throw new LoginFailure('locked', '잠긴 계정입니다. 세모점에 문의해 주세요.')

  // 기획서 §6 권한별 진입 분리 — 실제 서버에서도 같은 검사를 해야 합니다.
  if (!allowedRoles.includes(account.session.role)) {
    throw new LoginFailure('forbiddenRole', '이 주소로는 들어올 수 없는 계정입니다.')
  }

  writeStoredSession(account.session)
  return account.session
}

export const mockApi: Api = {
  auth: {
    getSession: () => delay(readStoredSession()),
    // async 로 두어 authenticate 의 throw 가 동기 예외가 아니라 거부된 Promise 로 나가게 합니다.
    loginAdmin: async (input) => delay(authenticate(input, ['ROLE_ADMIN'])),
    loginApp: async (input) => delay(authenticate(input, ['ROLE_ORG_ADMIN', 'ROLE_USER'])),
    logout: () => {
      writeStoredSession(null)
      return delay(undefined)
    },
  },

  admin: {
    getStatsSummary: (period) => delay(fx.statsSummary[period]),
    getCostSummary: (period) => delay(fx.costSummary[period]),

    getJobVolume: (bucket) => delay({ items: fx.jobVolume[bucket] }),
    getLayoutCost: () => delay({ items: fx.layoutCost }),
    getOrgProfit: () => delay(fx.orgProfit),

    getJobs: (params) => {
      advanceProcessingJobs()
      const status = params?.status ?? 'all'
      const items = status === 'all' ? state.jobs : state.jobs.filter((j) => j.status === status)
      return delay({ items })
    },

    exportJobsCsv: async (params) => {
      const { items } = await mockApi.admin.getJobs(params)
      return toCsvBlob([
        ['작업명', '기관', '쪽수', '소요(초)', '원가', '상태'],
        ...items.map((j) => [
          j.fileName,
          j.orgName,
          String(j.pages),
          j.durationSec === null ? '—' : String(j.durationSec),
          j.cost === null ? '—' : String(j.cost),
          j.status === 'processing'
            ? `진행 중 ${j.processedPages}/${j.pages}쪽`
            : j.status === 'partialFailed'
              ? `부분 실패 ${j.failedPages}쪽`
              : STATUS_TEXT[j.status],
        ]),
      ])
    },

    getJob: (jobId) => delay(fx.jobDetails[jobId] ?? notFound('작업')),

    exportJobCsv: async (jobId) => {
      const job = await mockApi.admin.getJob(jobId)
      return toCsvBlob([
        ['쪽', '레이아웃', '원가', '상태', '사유'],
        ...job.pageResults.map((p) => [
          p.range,
          p.layoutLabel,
          String(p.cost),
          p.status === 'done' ? '완료' : '실패',
          p.reason ?? '—',
        ]),
      ])
    },

    getJobPreview: (jobId) => delay(fx.jobPreviews[jobId] ?? notFound('미리보기')),
    sendJobToMyPage: () => delay(undefined),

    getOrgs: () => delay({ items: state.orgs }),

    createOrg: async (input) => {
      const org: T.AdminOrgRow = {
        id: nextId('org'),
        name: input.name,
        code: input.code,
        contractType: input.contractType,
        accounts: [],
        subtotal: { accountCount: 0, lastLoginAt: null, monthUsage: 0 },
      }
      state.orgs.push(org)
      return delay(org)
    },

    deleteOrg: (orgId) => {
      state.orgs = state.orgs.filter((o) => o.id !== orgId)
      return delay(undefined)
    },

    resetOrgAdminPassword: () => delay(undefined),

    createAccount: (input) => {
      const org = state.orgs.find((o) => o.id === input.orgId) ?? notFound('기관')
      // 아이디는 기관 코드에 번호를 붙여 자동 생성합니다. (기획서 §6 계정과 기관)
      const number = String(org.accounts.length + 1).padStart(2, '0')
      org.accounts.push({
        id: nextId('acc'),
        accountId: `${org.code}${number}`,
        alias: input.alias ?? null,
        status: 'active',
        lastLoginAt: null,
        monthUsage: 0,
      })
      org.subtotal.accountCount = org.accounts.length
      return delay(undefined)
    },

    deleteAccount: (accountId) => {
      for (const org of state.orgs) {
        org.accounts = org.accounts.filter((a) => a.id !== accountId)
        org.subtotal.accountCount = org.accounts.length
        org.subtotal.monthUsage = org.accounts.reduce((sum, a) => sum + a.monthUsage, 0)
      }
      return delay(undefined)
    },

    resetAccountPassword: () => delay(undefined),

    setAccountLocked: (accountId, locked) => {
      for (const org of state.orgs) {
        const account = org.accounts.find((a) => a.id === accountId)
        if (account) account.status = locked ? 'locked' : 'active'
      }
      return delay(undefined)
    },

    getOrg: (orgId) => delay(state.orgDetails[orgId] ?? notFound('기관')),

    updateOrg: (orgId, patch) => {
      const org = state.orgDetails[orgId] ?? notFound('기관')
      Object.assign(org, patch)
      return delay(org)
    },

    recordOrderPayment: (orgId, orderId, paidAt) => {
      const order = state.orgDetails[orgId]?.orders.find((o) => o.id === orderId) ?? notFound('주문')
      order.paidAt = paidAt
      return delay(undefined)
    },

    issueCoupon: (orgId, input) => {
      const org = state.orgDetails[orgId] ?? notFound('기관')
      org.coupons.push({ id: nextId('cpn'), used: 0, ...input })
      return delay(undefined)
    },

    getAccount: (accountId) => delay(fx.adminAccountDetails[accountId] ?? notFound('계정')),

    getInquiries: (params) => {
      let items = state.inquiries
      if (params?.type && params.type !== 'all') items = items.filter((i) => i.type === params.type)
      if (params?.unansweredOnly) items = items.filter((i) => i.status !== 'answered')
      return delay({ items })
    },

    getInquiry: (inquiryId) => {
      const base = state.inquiries.find((i) => i.id === inquiryId) ?? notFound('문의')
      const body = fx.inquiryBodies[inquiryId] ?? { title: '문의', body: '' }
      return delay({ ...base, ...body, replies: [] })
    },

    replyInquiry: (inquiryId) => {
      const inquiry = state.inquiries.find((i) => i.id === inquiryId) ?? notFound('문의')
      inquiry.status = 'answered'
      return delay(undefined)
    },

    setInquiryStatus: (inquiryId, status) => {
      const inquiry = state.inquiries.find((i) => i.id === inquiryId) ?? notFound('문의')
      inquiry.status = status
      return delay(undefined)
    },

    getNotices: () => delay({ items: state.notices }),

    createNotice: (input) => {
      const org = input.orgId ? state.orgs.find((o) => o.id === input.orgId) : undefined
      const notice: T.Notice = {
        id: nextId('ntc'),
        createdAt: input.startAt,
        scope: input.scope,
        orgId: org?.id ?? null,
        orgName: org?.name ?? null,
        title: input.title,
        body: input.body,
        startAt: input.startAt,
        endAt: input.endAt,
        state: 'live',
      }
      state.notices.unshift(notice)
      return delay(notice)
    },
  },

  org: {
    getSummary: () => delay(fx.orgSummary),
    getMonthlyUsage: () => delay(fx.orgMonthlyUsage),
    getNotices: () => delay({ items: fx.orgNotices }),

    getAccounts: () =>
      delay({
        items: state.orgAccounts,
        pendingRequestCount: state.orgAccounts.filter((a) => a.status === 'requested').length,
      }),

    updateAccountAlias: (accountId, alias) => {
      const account = state.orgAccounts.find((a) => a.id === accountId) ?? notFound('계정')
      account.alias = alias
      return delay(undefined)
    },

    setAccountLocked: (accountId, locked) => {
      const account = state.orgAccounts.find((a) => a.id === accountId) ?? notFound('계정')
      account.status = locked ? 'locked' : 'active'
      return delay(undefined)
    },

    // 추가·발급 요청은 T1-9 문의 목록으로 들어갑니다. (기획서 §화면 이동)
    requestCredit: () => {
      state.inquiries.unshift({
        id: nextId('inq'),
        createdAt: '오늘',
        sender: { orgName: fx.orgSummary.orgName, accountId: 'kblib01', unregistered: false },
        type: 'creditRequest',
        typeLabel: '크레딧 추가',
        status: 'unanswered',
        elapsed: { text: '방금', overdue: false },
      })
      return delay(undefined)
    },

    requestAccount: (input) => {
      state.orgAccounts.push({
        id: nextId('req'),
        accountId: null,
        alias: input.alias ?? null,
        status: 'requested',
        lastLoginAt: null,
        usage: null,
        requestedAt: '오늘 요청',
        self: false,
        orgAdmin: false,
      })
      state.inquiries.unshift({
        id: nextId('inq'),
        createdAt: '오늘',
        sender: { orgName: fx.orgSummary.orgName, accountId: 'kblib01', unregistered: false },
        type: 'accountRequest',
        typeLabel: '계정 발급',
        status: 'unanswered',
        elapsed: { text: '방금', overdue: false },
      })
      return delay(undefined)
    },

    cancelAccountRequest: (requestId) => {
      state.orgAccounts = state.orgAccounts.filter((a) => a.id !== requestId)
      return delay(undefined)
    },

    getOrders: () => delay(state.orgOrders),

    updateBillingEmail: (email) => {
      state.orgOrders.billingEmail = email
      return delay(undefined)
    },

    getAccountDetail: (accountId) => delay(fx.orgAccountDetails[accountId] ?? notFound('계정')),
  },
}
