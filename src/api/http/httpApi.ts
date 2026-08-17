import type { Api } from '../AdminApi'
import type * as T from '../types'
import { LoginFailure } from '../types'
import { ApiError, http } from './client'

const LOGIN_MESSAGE: Record<T.LoginFailureCode, string> = {
  invalidCredentials: '아이디 또는 비밀번호를 확인해 주세요.',
  locked: '잠긴 계정입니다. 세모점에 문의해 주세요.',
  forbiddenRole: '이 주소로는 들어올 수 없는 계정입니다.',
}

/**
 * 로그인 실패를 화면이 다룰 수 있는 형태로 바꿉니다.
 *
 * 서버 에러 코드가 정해지면 이 매핑만 고칩니다.
 * 아이디가 틀렸는지 비밀번호가 틀렸는지는 구분해 알려주지 않습니다 — 계정 존재 여부가 새기 때문입니다.
 */
function toLoginFailure(error: unknown): never {
  if (error instanceof ApiError) {
    const code: T.LoginFailureCode =
      error.code === 'ACCOUNT_LOCKED'
        ? 'locked'
        : error.code === 'FORBIDDEN_ROLE' || error.status === 403
          ? 'forbiddenRole'
          : 'invalidCredentials'
    throw new LoginFailure(code, LOGIN_MESSAGE[code])
  }
  throw error
}

/**
 * 실제 서버 구현.
 *
 * 아래 경로는 아직 명세가 없어 임시로 잡아둔 것입니다.
 * 명세가 나오면 **이 파일의 경로/쿼리/바디만** 고치면 화면은 그대로 동작합니다.
 * 응답 모양이 types.ts 와 다르면 여기서 매핑 함수를 하나 끼워 넣으세요.
 */
export const httpApi: Api = {
  auth: {
    // 로그인하지 않은 상태는 오류가 아니라 값입니다. 401 은 null 로 접습니다.
    getSession: () =>
      http.get<T.Session>('/session').catch((error) => {
        if (error instanceof ApiError && error.status === 401) return null
        throw error
      }),

    // 진입점마다 다른 엔드포인트를 씁니다. 역할 검사는 서버가 합니다.
    loginAdmin: (input) => http.post<T.Session>('/admin/login', input).catch(toLoginFailure),
    loginApp: (input) => http.post<T.Session>('/login', input).catch(toLoginFailure),

    logout: () => http.post<void>('/logout'),
  },

  admin: {
    getStatsSummary: (period) => http.get<T.StatsSummary>('/admin/stats/summary', { period }),
    getCostSummary: (period) => http.get<T.CostSummary>('/admin/stats/cost', { period }),

    getJobVolume: (bucket) =>
      http.get<T.ListResponse<T.JobVolumePoint>>('/admin/stats/job-volume', { bucket }),
    getLayoutCost: (month) =>
      http.get<T.ListResponse<T.LayoutCostRow>>('/admin/stats/layout-cost', { month }),
    getOrgProfit: (month) => http.get<T.OrgProfitReport>('/admin/stats/org-profit', { month }),

    getJobs: (params) =>
      http.get<T.ListResponse<T.JobSummary>>('/admin/jobs', { status: params?.status }),
    exportJobsCsv: (params) => http.blob('/admin/jobs.csv', { status: params?.status }),

    getJob: (jobId) => http.get<T.JobDetail>(`/admin/jobs/${jobId}`),
    exportJobCsv: (jobId) => http.blob(`/admin/jobs/${jobId}.csv`),

    getJobPreview: (jobId, page) => http.get<T.JobPreview>(`/admin/jobs/${jobId}/preview`, { page }),
    sendJobToMyPage: (jobId) => http.post<void>(`/admin/jobs/${jobId}/send-to-mypage`),

    getOrgs: () => http.get<T.ListResponse<T.AdminOrgRow>>('/admin/orgs'),
    createOrg: (input) => http.post<T.AdminOrgRow>('/admin/orgs', input),
    deleteOrg: (orgId) => http.delete<void>(`/admin/orgs/${orgId}`),
    resetOrgAdminPassword: (orgId) => http.post<void>(`/admin/orgs/${orgId}/admin-password/reset`),

    createAccount: (input) => http.post<void>('/admin/accounts', input),
    deleteAccount: (accountId) => http.delete<void>(`/admin/accounts/${accountId}`),
    resetAccountPassword: (accountId) => http.post<void>(`/admin/accounts/${accountId}/password/reset`),
    setAccountLocked: (accountId, locked) =>
      http.post<void>(`/admin/accounts/${accountId}/lock`, { locked }),

    getOrg: (orgId) => http.get<T.OrgDetail>(`/admin/orgs/${orgId}`),
    updateOrg: (orgId, patch) => http.patch<T.OrgDetail>(`/admin/orgs/${orgId}`, patch),
    recordOrderPayment: (orgId, orderId, paidAt) =>
      http.post<void>(`/admin/orgs/${orgId}/orders/${orderId}/payment`, { paidAt }),
    issueCoupon: (orgId, input) => http.post<void>(`/admin/orgs/${orgId}/coupons`, input),

    getAccount: (accountId) => http.get<T.AdminAccountDetail>(`/admin/accounts/${accountId}`),

    getInquiries: (params) =>
      http.get<T.ListResponse<T.Inquiry>>('/admin/inquiries', {
        type: params?.type,
        unansweredOnly: params?.unansweredOnly,
      }),
    getInquiry: (inquiryId) => http.get<T.InquiryDetail>(`/admin/inquiries/${inquiryId}`),
    replyInquiry: (inquiryId, body) => http.post<void>(`/admin/inquiries/${inquiryId}/replies`, { body }),
    setInquiryStatus: (inquiryId, status) =>
      http.patch<void>(`/admin/inquiries/${inquiryId}`, { status }),

    getNotices: () => http.get<T.ListResponse<T.Notice>>('/admin/notices'),
    createNotice: (input) => http.post<T.Notice>('/admin/notices', input),
  },

  org: {
    getSummary: () => http.get<T.OrgSummary>('/org/summary'),
    getMonthlyUsage: () => http.get<T.OrgMonthlyUsage>('/org/usage/monthly'),
    getNotices: () => http.get<T.ListResponse<T.OrgNotice>>('/org/notices'),

    getAccounts: () => http.get<T.OrgAccountList>('/org/accounts'),
    updateAccountAlias: (accountId, alias) => http.patch<void>(`/org/accounts/${accountId}`, { alias }),
    setAccountLocked: (accountId, locked) =>
      http.post<void>(`/org/accounts/${accountId}/lock`, { locked }),

    requestCredit: (input) => http.post<void>('/org/credit-requests', input),
    requestAccount: (input) => http.post<void>('/org/account-requests', input),
    cancelAccountRequest: (requestId) => http.delete<void>(`/org/account-requests/${requestId}`),

    getOrders: () => http.get<T.OrgOrderList>('/org/orders'),
    updateBillingEmail: (email) => http.patch<void>('/org/billing-email', { email }),

    getAccountDetail: (accountId, range) =>
      http.get<T.OrgAccountDetail>(`/org/accounts/${accountId}/detail`, {
        from: range?.from,
        to: range?.to,
      }),
  },
}
