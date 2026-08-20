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

/**
 * 기관 ID 를 찾아냅니다.
 *
 * 명세 예시는 목록이 `orgId`, 생성 응답이 `organizationId` 로 서로 다릅니다.
 * 어느 쪽이 와도 화면이 같은 이름으로 쓰도록 여기서 맞춰 둡니다 —
 * 비어 있으면 기관 정보 창이 열려도 조회할 대상이 없습니다.
 */
function orgIdOf(raw: unknown): string {
  const value = raw as { orgId?: string; organizationId?: string; id?: string } | null
  return value?.orgId ?? value?.organizationId ?? value?.id ?? ''
}

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
     * 저장해 둔 세션을 그대로 돌려줍니다. (세션 조회 API 가 따로 없습니다.)
     *
     * 부팅할 때 재발급을 미리 때리지 않습니다 — 액세스 토큰이 만료됐으면
     * 첫 호출이 401 을 받고 client 가 그때 한 번 재발급한 뒤 재요청합니다.
     *
     * 새 창(작업 상세·기관 정보 …)은 새 문서라 앱이 한 번 더 뜹니다.
     * 부팅마다 재발급을 부르면 창을 열 때마다 같은 리프레시 토큰을 다시 쓰게 되고,
     * 서버가 토큰을 한 번만 허용하거나 원래 창과 겹치면 AUTH4003 으로 세션이 끊깁니다.
     */
    async getSession() {
      return getStoredSession()
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

    getOrgs: (month) =>
      http.get<T.AdminOrgList>('/api/admin/orgs', { month }).then((result) => ({
        month: result?.month ?? '',
        items: list<T.AdminOrgRow>(result).map((org) => ({
          ...org,
          orgId: orgIdOf(org),
          // 계정이 없는 기관이 배열 없이 올 수 있습니다 — 목록을 그리다 터지지 않게 맞춰 둡니다.
          accounts: Array.isArray(org?.accounts) ? org.accounts : [],
          subtotal: org?.subtotal ?? { accountCount: 0, monthCredits: 0, adminLastLoginAt: null },
        })),
      })),

    createOrg: (input) => http.post<T.CreatedOrg>('/api/admin/orgs', input),

    /**
     * 명세에 이 응답의 필드가 열거돼 있지 않습니다.
     * 없는 값이 와도 화면이 터지지 않도록 여기서 빈 값을 채워 둡니다 —
     * 특히 accounts 가 없으면 목록을 그리다 예외가 납니다.
     */
    getOrg: (orgId) =>
      http.get<Partial<T.OrgDetail>>(`/api/admin/orgs/${encodeURIComponent(orgId)}`).then((result) => ({
        orgId: orgIdOf(result) || orgId,
        name: result?.name ?? '',
        code: result?.code ?? '',
        contractType: result?.contractType ?? 'FREE',
        contractStartedAt: result?.contractStartedAt ?? null,
        contractExpiresAt: result?.contractExpiresAt ?? null,
        creditAllocated: result?.creditAllocated ?? 0,
        creditUsed: result?.creditUsed ?? 0,
        creditRemaining:
          result?.creditRemaining ?? (result?.creditAllocated ?? 0) - (result?.creditUsed ?? 0),
        receiptEmail: result?.receiptEmail ?? null,
        accountLoginIds: Array.isArray(result?.accountLoginIds) ? result.accountLoginIds : [],
      })),

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
