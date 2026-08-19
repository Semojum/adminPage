import type { Api } from '../AdminApi'
import type * as T from '../types'
import { LoginFailure } from '../types'
import { ApiError, http } from './client'
import { getStoredSession, setStoredSession } from './session'

/**
 * 실제 서버 구현 — V3 API 명세(2026-08-19 판).
 *
 * 경로·쿼리·본문은 명세 그대로입니다. 서버 응답이 목록을 배열로 줄 때와
 * `{items: []}` 로 줄 때가 섞여 있어, 화면이 흔들리지 않도록 여기서만 다듬습니다.
 */

/** 배열이든 {items:[]} 든 배열로 맞춰 줍니다. */
function list<V>(value: unknown): V[] {
  if (Array.isArray(value)) return value as V[]
  if (value && typeof value === 'object' && Array.isArray((value as { items?: unknown }).items)) {
    return (value as { items: V[] }).items
  }
  return []
}

const LOGIN_MESSAGE: Record<T.LoginFailureCode, string> = {
  AUTH4001: '아이디 또는 비밀번호가 올바르지 않습니다.',
  AUTH4004: '비활성화된 계정입니다. 세모점 담당자에게 문의해 주세요.',
  forbiddenRole: '이 주소로는 들어올 수 없는 계정입니다.',
  unknown: '로그인하지 못했습니다. 잠시 뒤 다시 시도해 주세요.',
}

/**
 * 로그인 실패를 화면이 다룰 수 있는 형태로 바꿉니다.
 * 아이디가 틀렸는지 비밀번호가 틀렸는지는 구분해 알려주지 않습니다 — 계정 존재 여부가 새기 때문입니다.
 */
function toLoginFailure(error: unknown): never {
  if (error instanceof ApiError) {
    const code: T.LoginFailureCode =
      error.code === 'AUTH4004' ? 'AUTH4004' : error.code === 'AUTH4001' ? 'AUTH4001' : 'unknown'
    throw new LoginFailure(code, error.code ? LOGIN_MESSAGE[code] : error.message)
  }
  throw error
}

interface LoginResult {
  accessToken: string
  refreshToken: string
  role: T.Role
}

export const httpApi: Api = {
  auth: {
    /**
     * 저장해 둔 리프레시 토큰이 아직 살아 있는지 확인합니다.
     * 살아 있으면 그 세션을, 아니면 null 을 돌려줍니다. (세션 조회 API 가 따로 없습니다.)
     */
    async getSession() {
      const stored = getStoredSession()
      if (!stored) return null
      try {
        const result = await http.post<{ accessToken: string }>(
          '/api/auth/refresh',
          { refreshToken: stored.refreshToken },
          { anonymous: true },
        )
        const next = { ...stored, accessToken: result.accessToken }
        setStoredSession(next)
        return next
      } catch {
        // AUTH4003(만료·밀려난 세션) · AUTH4004(비활성 계정) — 다시 로그인해야 합니다.
        setStoredSession(null)
        return null
      }
    },

    async login(input) {
      const result = await http
        .post<LoginResult>('/api/auth/login', input, { anonymous: true })
        .catch(toLoginFailure)

      const session: T.Session = {
        loginId: input.loginId,
        role: result.role,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      }
      setStoredSession(session)
      return session
    },

    async logout() {
      const stored = getStoredSession()
      setStoredSession(null)
      if (!stored) return
      // 실패해도 화면에서는 이미 나간 상태입니다. 리프레시 토큰 무효화만 시도합니다.
      await http
        .post<null>('/api/auth/logout', { refreshToken: stored.refreshToken }, { anonymous: true })
        .catch(() => undefined)
    },
  },

  admin: {
    getStatsOverview: (period) => http.get<T.StatsOverview>('/api/admin/stats/overview', { period }),

    getWorkload: (unit) => http.get<T.Workload>('/api/admin/stats/workload', { unit }),

    getLayoutCost: (month) => http.get<T.LayoutCostReport>('/api/admin/stats/layout-cost', { month }),

    getProfitability: (month) => http.get<T.ProfitReport>('/api/admin/stats/profitability', { month }),

    getJobs: (params) =>
      http.get<T.JobList>('/api/admin/jobs', {
        // '전체'는 파라미터를 아예 빼서 서버 기본값을 씁니다.
        status: params?.status && params.status !== 'all' ? params.status : undefined,
        hours: params?.hours,
        size: params?.size,
      }),

    getJob: (jobId) => http.get<T.JobDetail>(`/api/admin/jobs/${encodeURIComponent(jobId)}`),

    getJobPage: (jobId, pageNo) =>
      http.get<T.JobPageView>(`/api/admin/jobs/${encodeURIComponent(jobId)}/pages/${pageNo}`),

    sendJobToMyPage: (jobId, targetLoginId) =>
      http
        .post<unknown>(`/api/admin/jobs/${encodeURIComponent(jobId)}/send-to-mypage`, {
          targetLoginId,
        })
        .then(() => undefined),

    getOrgs: (month) => http.get<T.AdminOrgList>('/api/admin/orgs', { month }),

    createOrg: (input) => http.post<T.CreatedOrg>('/api/admin/orgs', input),

    getOrg: (orgId) => http.get<T.OrgDetail>(`/api/admin/orgs/${encodeURIComponent(orgId)}`),

    updateOrg: (orgId, patch) =>
      http.patch<T.OrgDetail>(`/api/admin/orgs/${encodeURIComponent(orgId)}`, patch),

    deleteOrg: (orgId) =>
      http.delete<unknown>(`/api/admin/orgs/${encodeURIComponent(orgId)}`).then(() => undefined),

    createAccounts: (input) =>
      http
        .post<{ accounts: T.IssuedCredential[] }>('/api/admin/accounts', input)
        .then((result) => result.accounts ?? []),

    deleteAccount: (loginId) =>
      http.delete<unknown>(`/api/admin/accounts/${encodeURIComponent(loginId)}`).then(() => undefined),

    reissuePassword: (loginId) =>
      http.post<T.IssuedCredential>(
        `/api/admin/accounts/${encodeURIComponent(loginId)}/password-reissue`,
      ),

    setAccountStatus: (loginId, status) =>
      http
        .patch<unknown>(`/api/admin/accounts/${encodeURIComponent(loginId)}/status`, { status })
        .then(() => undefined),

    setAccountRole: (loginId, role) =>
      http
        .patch<unknown>(`/api/admin/accounts/${encodeURIComponent(loginId)}/role`, { role })
        .then(() => undefined),

    getCoupons: (orgId) =>
      http
        .get<unknown>(`/api/admin/orgs/${encodeURIComponent(orgId)}/coupons`)
        .then((result) => list<T.Coupon>(result)),

    issueCoupon: (orgId, input) =>
      http.post<T.Coupon>(`/api/admin/orgs/${encodeURIComponent(orgId)}/coupons`, input),

    getOrders: (organizationId) =>
      http.get<unknown>('/api/admin/orders', { organizationId }).then((result) => list<T.Order>(result)),

    createOrder: (input) => http.post<T.Order>('/api/admin/orders', input),

    updateOrder: (orderId, patch) =>
      http.patch<T.Order>(`/api/admin/orders/${encodeURIComponent(orderId)}`, patch),

    getOrderReceipt: (orderId) =>
      http.get<T.ReceiptLink>(`/api/admin/orders/${encodeURIComponent(orderId)}/receipt`),

    getInquiries: (params) =>
      http
        .get<unknown>('/api/admin/inquiries', { status: params?.status, type: params?.type })
        .then((result) => list<T.Inquiry>(result)),

    setInquiryStatus: (inquiryId, status) =>
      http
        .patch<unknown>(`/api/admin/inquiries/${encodeURIComponent(inquiryId)}/status`, { status })
        .then(() => undefined),

    getNotices: () => http.get<unknown>('/api/admin/notices').then((result) => list<T.Notice>(result)),

    createNotice: (input) => http.post<T.Notice>('/api/admin/notices', input),
  },

  org: {
    getDashboard: () => http.get<T.OrgDashboard>('/api/org/dashboard'),

    getAccounts: (month) => http.get<T.OrgAccountList>('/api/org/accounts', { month }),

    setAccountAlias: (loginId, alias) =>
      http
        .patch<unknown>(`/api/org/accounts/${encodeURIComponent(loginId)}/alias`, { alias })
        .then(() => undefined),

    setAccountLocked: (loginId, locked) =>
      http
        .patch<{ canceledJobs?: number }>(`/api/org/accounts/${encodeURIComponent(loginId)}/lock`, {
          locked,
        })
        .then((result) => ({ canceledJobs: result?.canceledJobs ?? 0 })),

    getAccountJobs: (loginId, range) =>
      http.get<T.OrgAccountJobs>(`/api/org/accounts/${encodeURIComponent(loginId)}/jobs`, {
        from: range?.from,
        to: range?.to,
      }),

    getRequests: () => http.get<unknown>('/api/org/requests').then((result) => list<T.OrgRequest>(result)),

    createRequest: (input) => http.post<T.OrgRequest>('/api/org/requests', input),

    cancelRequest: (requestId) =>
      http.delete<unknown>(`/api/org/requests/${encodeURIComponent(requestId)}`).then(() => undefined),

    getNotices: () => http.get<unknown>('/api/org/notices').then((result) => list<T.OrgNotice>(result)),

    getOrders: () =>
      http.get<T.OrgOrderList>('/api/org/orders').then((result) => ({
        receiptEmail: result?.receiptEmail ?? null,
        items: list<T.Order>(result),
      })),

    updateReceiptEmail: (email) =>
      http.patch<unknown>('/api/org/receipt-email', { email }).then(() => undefined),

    getOrderReceipt: (orderId) =>
      http.get<T.ReceiptLink>(`/api/org/orders/${encodeURIComponent(orderId)}/receipt`),
  },
}
