import type { Api } from '../AdminApi'
import type * as T from '../types'
import { LoginFailure } from '../types'
import { getStoredSession, setStoredSession } from '../http/session'
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

/* 목업은 메모리 상태를 들고 있어서 등록·잠금 같은 조작이 화면에 반영됩니다. */
const state = {
  jobs: structuredClone(fx.jobs),
  orgs: structuredClone(fx.adminOrgs),
  orgDetails: structuredClone(fx.orgDetails),
  coupons: structuredClone(fx.coupons),
  orders: structuredClone(fx.orders),
  inquiries: structuredClone(fx.inquiries),
  notices: structuredClone(fx.notices),
  orgDashboard: structuredClone(fx.orgDashboard),
  orgAccounts: structuredClone(fx.orgAccounts),
  orgRequests: structuredClone(fx.orgRequests),
  orgNotices: structuredClone(fx.orgNotices),
  orgAccountJobs: structuredClone(fx.orgAccountJobs),
  receiptEmail: 'account@kblib.or.kr' as string | null,
}

let seq = 100
const nextId = (prefix: string) => `${prefix}-${(seq += 1)}`

/** 발급 비밀번호처럼 보이는 난수 12자 */
const randomPassword = () =>
  Array.from({ length: 12 }, () => 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'[
    Math.floor(Math.random() * 55)
  ]).join('')

const nowIso = () => new Date().toISOString()

/** 모니터링을 다시 부를 때마다 진행 중 작업이 조금씩 나아갑니다. */
function advanceProcessingJobs() {
  for (const job of state.jobs) {
    if (job.status !== 'IN_PROGRESS') continue
    const done = (job.donePages ?? 0) + 1
    if (done >= job.totalPages) {
      job.status = 'COMPLETED'
      job.donePages = null
      job.finishedAt = nowIso()
      job.costKrw = job.totalPages * 32
    } else {
      job.donePages = done
    }
  }
}

function findOrgByAccount(loginId: string) {
  return state.orgs.find((org) => org.accounts.some((account) => account.loginId === loginId))
}

export const mockApi: Api = {
  auth: {
    getSession: () => delay(getStoredSession()),

    login: async ({ loginId, password }) => {
      const account = fx.loginAccounts.find((item) => item.loginId === loginId)
      await delay(null)

      if (!account || account.password !== password) {
        throw new LoginFailure('AUTH4001', '아이디 또는 비밀번호가 올바르지 않습니다.')
      }
      if (account.status === 'INACTIVE') {
        throw new LoginFailure('AUTH4004', '비활성화된 계정입니다. 세모점 담당자에게 문의해 주세요.')
      }

      const session: T.Session = {
        loginId: account.loginId,
        role: account.role,
        accessToken: `mock-access-${account.loginId}`,
        refreshToken: `mock-refresh-${account.loginId}`,
      }
      setStoredSession(session)
      return session
    },

    logout: async () => {
      setStoredSession(null)
      await delay(null)
    },
  },

  admin: {
    getStatsOverview: (period) => delay(fx.statsOverview[period]),
    getWorkload: (unit) => delay(fx.workload[unit]),
    getLayoutCost: (month) => delay({ ...fx.layoutCost, month }),
    getProfitability: (month) => delay({ ...fx.profitability, month }),

    getJobs: (params) => {
      advanceProcessingJobs()
      const status = params?.status
      const items =
        !status || status === 'all' ? state.jobs : state.jobs.filter((job) => job.status === status)
      return delay({ since: new Date(Date.now() - 24 * 3_600_000).toISOString(), items })
    },

    getJob: (jobId) => delay(fx.jobDetails[jobId] ?? notFound('작업')),

    getJobPage: (jobId, pageNo) => delay({ ...fx.jobPage, jobId, pageNo }),

    sendJobToMyPage: async () => {
      await delay(null)
    },

    getOrgs: (month) => delay({ month: month ?? fx.THIS_MONTH, items: state.orgs }),

    createOrg: (input) => {
      const orgId = nextId('org')
      const code = input.code || `org${state.orgs.length + 1}`
      state.orgs.push({
        orgId,
        name: input.name,
        code,
        // 명세 §기관 생성: 신규 기관 기본 FREE
        contractType: 'FREE',
        accounts: [],
        subtotal: { accountCount: 0, monthCredits: 0, adminLastLoginAt: null },
      })
      state.orgDetails[orgId] = {
        orgId,
        name: input.name,
        code,
        contractType: 'FREE',
        contractStartedAt: new Date().toISOString().slice(0, 10),
        contractExpiresAt: input.contractExpiresAt ?? null,
        creditAllocated: 0,
        creditUsed: 0,
        creditRemaining: 0,
        receiptEmail: null,
        accounts: [],
      }
      state.coupons[orgId] = []
      return delay({ organizationId: orgId, name: input.name, code })
    },

    getOrg: (orgId) => delay(state.orgDetails[orgId] ?? notFound('기관')),

    updateOrg: (orgId, patch) => {
      const detail = state.orgDetails[orgId] ?? notFound('기관')
      Object.assign(detail, {
        ...patch,
        creditRemaining:
          (patch.creditAllocated ?? detail.creditAllocated) - detail.creditUsed,
      })
      const row = state.orgs.find((org) => org.orgId === orgId)
      if (row) {
        if (patch.name) row.name = patch.name
        if (patch.contractType) row.contractType = patch.contractType
      }
      return delay(detail)
    },

    deleteOrg: async (orgId) => {
      state.orgs = state.orgs.filter((org) => org.orgId !== orgId)
      delete state.orgDetails[orgId]
      await delay(null)
    },

    createAccounts: ({ organizationId, count }) => {
      const org = state.orgs.find((item) => item.orgId === organizationId) ?? notFound('기관')
      const detail = state.orgDetails[organizationId]
      const issued: T.IssuedCredential[] = []

      for (let index = 0; index < count; index += 1) {
        const seqNo = org.accounts.length + 1
        const loginId = `${org.code}${String(seqNo).padStart(2, '0')}`
        org.accounts.push({
          loginId,
          alias: null,
          role: org.accounts.length === 0 ? 'ROLE_ORG_ADMIN' : 'ROLE_USER',
          status: 'ACTIVE',
          lastLoginAt: null,
          monthCredits: 0,
        })
        detail?.accounts.push({
          loginId,
          alias: null,
          role: org.accounts.length === 1 ? 'ROLE_ORG_ADMIN' : 'ROLE_USER',
          status: 'ACTIVE',
        })
        issued.push({ loginId, password: randomPassword() })
      }
      org.subtotal.accountCount = org.accounts.length
      return delay(issued)
    },

    deleteAccount: async (loginId) => {
      const org = findOrgByAccount(loginId)
      if (org) {
        org.accounts = org.accounts.filter((account) => account.loginId !== loginId)
        org.subtotal.accountCount = org.accounts.length
        org.subtotal.monthCredits = org.accounts.reduce((sum, item) => sum + item.monthCredits, 0)
        const detail = state.orgDetails[org.orgId]
        if (detail) detail.accounts = detail.accounts.filter((item) => item.loginId !== loginId)
      }
      await delay(null)
    },

    reissuePassword: (loginId) => delay({ loginId, password: randomPassword() }),

    setAccountStatus: async (loginId, status) => {
      const account = findOrgByAccount(loginId)?.accounts.find((item) => item.loginId === loginId)
      if (account) account.status = status
      await delay(null)
    },

    setAccountRole: async (loginId, role) => {
      const account = findOrgByAccount(loginId)?.accounts.find((item) => item.loginId === loginId)
      if (account) account.role = role
      await delay(null)
    },

    getCoupons: (orgId) => delay(state.coupons[orgId] ?? []),

    issueCoupon: (orgId, input) => {
      const coupon: T.Coupon = {
        id: nextId('coupon'),
        name: input.name,
        creditAmount: input.creditAmount,
        used: 0,
        remaining: input.creditAmount,
        startsOn: input.startsOn,
        endsOn: input.endsOn,
        displayStatus: 'ACTIVE',
      }
      state.coupons[orgId] = [...(state.coupons[orgId] ?? []), coupon]
      return delay(coupon)
    },

    getOrders: (organizationId) =>
      delay(
        organizationId
          ? state.orders.filter((order) => order.organizationId === organizationId)
          : state.orders,
      ),

    createOrder: (input) => {
      const order: T.Order = {
        id: nextId('order'),
        organizationId: input.organizationId,
        orgName: state.orgs.find((org) => org.orgId === input.organizationId)?.name ?? null,
        orderDate: input.orderDate,
        description: input.description,
        amountKrw: input.amountKrw,
        creditAmount: input.creditAmount ?? null,
        paidAt: null,
        invoiceStatus: 'PENDING',
        receiptFileName: null,
        createdAt: nowIso(),
      }
      state.orders = [order, ...state.orders]
      return delay(order)
    },

    updateOrder: (orderId, patch) => {
      const order = state.orders.find((item) => item.id === orderId) ?? notFound('주문')
      if (patch.paidAt !== undefined) order.paidAt = patch.paidAt
      if (patch.invoiceStatus !== undefined) order.invoiceStatus = patch.invoiceStatus
      return delay(order)
    },

    getOrderReceipt: (orderId) => {
      const order = state.orders.find((item) => item.id === orderId)
      if (!order?.receiptFileName) notFound('증빙')
      // 목업에는 S3 가 없어 빈 PDF 를 만들어 넘깁니다.
      return delay({ fileName: order.receiptFileName, url: 'about:blank' })
    },

    getInquiries: (params) =>
      delay(
        state.inquiries.filter(
          (inquiry) =>
            (!params?.status || inquiry.status === params.status) &&
            (!params?.type || inquiry.type === params.type),
        ),
      ),

    setInquiryStatus: async (inquiryId, status) => {
      const inquiry = state.inquiries.find((item) => item.id === inquiryId) ?? notFound('문의')
      inquiry.status = status
      inquiry.statusChangedAt = nowIso()
      await delay(null)
    },

    getNotices: () => delay(state.notices),

    createNotice: (input) => {
      const notice: T.Notice = {
        id: nextId('notice'),
        targetOrganizationId: input.targetOrganizationId ?? null,
        targetOrgName: input.targetOrganizationId
          ? (state.orgs.find((org) => org.orgId === input.targetOrganizationId)?.name ?? null)
          : null,
        title: input.title,
        body: input.body,
        startsOn: input.startsOn,
        endsOn: input.endsOn,
        // 서버는 조회 시점 KST 로 판정합니다. 목업도 같은 규칙으로 계산합니다.
        displayStatus: displayStatusOf(input.startsOn, input.endsOn),
        createdAt: nowIso(),
      }
      state.notices = [notice, ...state.notices]
      return delay(notice)
    },
  },

  org: {
    getDashboard: () => delay(state.orgDashboard),

    getAccounts: (month) => delay({ month: month ?? fx.THIS_MONTH, items: state.orgAccounts }),

    setAccountAlias: async (loginId, alias) => {
      const account = state.orgAccounts.find((item) => item.loginId === loginId) ?? notFound('계정')
      account.alias = alias?.trim() ? alias.trim() : null
      await delay(null)
    },

    setAccountLocked: (loginId, locked) => {
      const account = state.orgAccounts.find((item) => item.loginId === loginId) ?? notFound('계정')
      if (account.self) throw new Error('본인 계정은 잠글 수 없습니다.')
      account.status = locked ? 'INACTIVE' : 'ACTIVE'
      return delay({ canceledJobs: locked ? 1 : 0 })
    },

    getAccountJobs: (loginId) =>
      delay(
        state.orgAccountJobs[loginId] ?? {
          loginId,
          alias: state.orgAccounts.find((item) => item.loginId === loginId)?.alias ?? null,
          from: fx.THIS_MONTH + '-01',
          to: new Date().toISOString().slice(0, 10),
          items: [],
          totalPages: 0,
          totalCredits: 0,
        },
      ),

    getRequests: () => delay(state.orgRequests),

    createRequest: (input) => {
      const request: T.OrgRequest = {
        id: nextId('req'),
        type: input.type,
        status: 'OPEN',
        message: input.message ?? null,
        createdAt: nowIso(),
      }
      state.orgRequests = [request, ...state.orgRequests]
      // 접수분은 운영자 문의 목록(T1-9)으로 그대로 들어갑니다.
      state.inquiries = [
        {
          id: nextId('inq'),
          type: input.type,
          status: 'OPEN',
          orgName: state.orgDashboard.orgName,
          loginId: getStoredSession()?.loginId ?? null,
          message: input.message ?? '',
          senderEmail: null,
          subject: null,
          createdAt: request.createdAt!,
          statusChangedAt: null,
        },
        ...state.inquiries,
      ]
      return delay(request)
    },

    cancelRequest: async (requestId) => {
      state.orgRequests = state.orgRequests.filter((request) => request.id !== requestId)
      await delay(null)
    },

    getNotices: () => delay(state.orgNotices),

    getOrders: () =>
      delay({
        receiptEmail: state.receiptEmail,
        items: state.orders.filter((order) => order.organizationId === 'org-kblib'),
      }),

    updateReceiptEmail: async (email) => {
      state.receiptEmail = email?.trim() ? email.trim() : null
      await delay(null)
    },

    getOrderReceipt: (orderId) => {
      const order = state.orders.find((item) => item.id === orderId)
      if (!order?.receiptFileName) notFound('증빙')
      return delay({ fileName: order.receiptFileName, url: 'about:blank' })
    },
  },
}

/** 노출 기간으로 상태를 판정합니다 (명세: 스케줄러 없이 조회 시점 판정). */
function displayStatusOf(startsOn: string, endsOn: string): T.NoticeStatus {
  const todayText = new Date().toISOString().slice(0, 10)
  if (startsOn > todayText) return 'SCHEDULED'
  if (endsOn < todayText) return 'ENDED'
  return 'ACTIVE'
}
