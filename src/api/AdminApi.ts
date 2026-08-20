import type {
  AdminOrgList,
  Coupon,
  CreateAccountInput,
  CreateNoticeInput,
  CreateOrderInput,
  CreateOrgInput,
  CreatedOrg,
  Inquiry,
  InquiryStatus,
  InquiryType,
  IssueCouponInput,
  IssuedCredential,
  JobDetail,
  JobList,
  JobPageView,
  JobStatusFilter,
  LayoutCostReport,
  LoginInput,
  Notice,
  Order,
  OrgAccountJobs,
  OrgAccountList,
  OrgDashboard,
  OrgDetail,
  OrgNotice,
  OrgOrderList,
  OrgRequest,
  OrgRequestType,
  Period,
  ProfitReport,
  ReceiptLink,
  Role,
  Session,
  StatsOverview,
  UpdateOrderInput,
  UpdateOrgInput,
  Workload,
} from './types'
import type { AccountStatus, Bucket } from './types'

/**
 * 앱이 서버에 요구하는 것 전부 — V3 API 명세(2026-08-19 판)의 관리자/기관 구간.
 *
 * 화면은 이 인터페이스만 봅니다. 구현은 두 벌입니다.
 *   - src/api/mock/mockApi.ts : 기획서 목업 값을 그대로 돌려줍니다
 *   - src/api/http/httpApi.ts : 명세의 실제 엔드포인트를 호출합니다
 *
 * 메서드 이름 옆 주석이 실제 경로입니다. 명세가 바뀌면 httpApi 만 고칩니다.
 */
export interface Api {
  auth: {
    /**
     * 저장해 둔 토큰으로 세션을 복구합니다. 로그인 상태가 아니면 null.
     * (명세에 세션 조회 API 가 없어 /api/auth/refresh 로 살아 있는지 확인합니다.)
     */
    getSession(): Promise<Session | null>
    /** POST /api/auth/login — 운영자·기관 관리자·점역사 공용. 역할 분기는 응답 role 로 합니다. */
    login(input: LoginInput): Promise<Session>
    /** POST /api/auth/logout */
    logout(): Promise<void>
  }

  /* ── T1 · 운영자 콘솔 (Bearer ROLE_ADMIN) ── */
  admin: {
    /** GET /api/admin/stats/overview?period= */
    getStatsOverview(period: Period): Promise<StatsOverview>
    /** GET /api/admin/stats/workload?unit= */
    getWorkload(unit: Bucket): Promise<Workload>
    /** GET /api/admin/stats/layout-cost?month= */
    getLayoutCost(month: string): Promise<LayoutCostReport>
    /** GET /api/admin/stats/profitability?month= */
    getProfitability(month: string): Promise<ProfitReport>

    /** GET /api/admin/jobs — 10초마다 다시 부릅니다. */
    getJobs(params?: { status?: JobStatusFilter; hours?: number; size?: number }): Promise<JobList>
    /** GET /api/admin/jobs/{jobId} */
    getJob(jobId: string): Promise<JobDetail>
    /** GET /api/admin/jobs/{jobId}/pages/{pageNo} */
    getJobPage(jobId: string, pageNo: number): Promise<JobPageView>
    /** POST /api/admin/jobs/{jobId}/send-to-mypage — 대상은 ROLE_ADMIN 계정만 */
    sendJobToMyPage(jobId: string, targetLoginId?: string): Promise<void>

    /** GET /api/admin/orgs?month= */
    getOrgs(month?: string): Promise<AdminOrgList>
    /** POST /api/admin/orgs */
    createOrg(input: CreateOrgInput): Promise<CreatedOrg>
    /** GET /api/admin/orgs/{orgId} */
    getOrg(orgId: string): Promise<OrgDetail>
    /** PATCH /api/admin/orgs/{orgId} */
    updateOrg(orgId: string, patch: UpdateOrgInput): Promise<OrgDetail>
    /** DELETE /api/admin/orgs/{orgId} — 소프트 삭제. 소속 계정이 전부 잠깁니다. */
    deleteOrg(orgId: string): Promise<void>

    /** POST /api/admin/accounts — 비밀번호는 이 응답에서 한 번만 볼 수 있습니다. */
    createAccounts(input: CreateAccountInput): Promise<IssuedCredential[]>
    /** DELETE /api/admin/accounts/{loginId} */
    deleteAccount(loginId: string): Promise<void>
    /** POST /api/admin/accounts/{loginId}/password-reissue */
    reissuePassword(loginId: string): Promise<IssuedCredential>
    /** PATCH /api/admin/accounts/{loginId}/status — INACTIVE 는 즉시 세션을 끊습니다. */
    setAccountStatus(loginId: string, status: AccountStatus): Promise<void>
    /** PATCH /api/admin/accounts/{loginId}/role */
    setAccountRole(loginId: string, role: Extract<Role, 'ROLE_ADMIN' | 'ROLE_USER'>): Promise<void>

    /** GET /api/admin/orgs/{orgId}/coupons */
    getCoupons(orgId: string): Promise<Coupon[]>
    /** POST /api/admin/orgs/{orgId}/coupons */
    issueCoupon(orgId: string, input: IssueCouponInput): Promise<Coupon>

    /** GET /api/admin/orders?organizationId= */
    getOrders(organizationId?: string): Promise<Order[]>
    /** POST /api/admin/orders */
    createOrder(input: CreateOrderInput): Promise<Order>
    /** PATCH /api/admin/orders/{orderId} — 입금·계산서 기록 */
    updateOrder(orderId: string, patch: UpdateOrderInput): Promise<Order>
    /** GET /api/admin/orders/{orderId}/receipt — presigned 15분 */
    getOrderReceipt(orderId: string): Promise<ReceiptLink>

    /** GET /api/admin/inquiries?status=&type= */
    getInquiries(params?: { status?: InquiryStatus; type?: InquiryType }): Promise<Inquiry[]>
    /** PATCH /api/admin/inquiries/{inquiryId}/status */
    setInquiryStatus(inquiryId: string, status: InquiryStatus): Promise<void>
    /** GET /api/admin/inquiries/{inquiryId}/attachments/{attachmentId} — presigned 15분 */
    getInquiryAttachment(inquiryId: string, attachmentId: string): Promise<ReceiptLink>

    /** GET /api/admin/notices */
    getNotices(): Promise<Notice[]>
    /** POST /api/admin/notices */
    createNotice(input: CreateNoticeInput): Promise<Notice>
  }

  /* ── T2 · 기관 관리 (Bearer ROLE_ORG_ADMIN) ── */
  org: {
    /** GET /api/org/dashboard */
    getDashboard(): Promise<OrgDashboard>

    /** GET /api/org/accounts?month= */
    getAccounts(month?: string): Promise<OrgAccountList>
    /** PATCH /api/org/accounts/{loginId}/alias — 빈 값이면 별칭을 지웁니다. */
    setAccountAlias(loginId: string, alias: string | null): Promise<void>
    /** PATCH /api/org/accounts/{loginId}/lock — 잠금은 즉시 반영됩니다. */
    setAccountLocked(loginId: string, locked: boolean): Promise<{ canceledJobs: number }>
    /** GET /api/org/accounts/{loginId}/jobs?from=&to= */
    getAccountJobs(loginId: string, range?: { from?: string; to?: string }): Promise<OrgAccountJobs>

    /** GET /api/org/requests */
    getRequests(): Promise<OrgRequest[]>
    /** POST /api/org/requests — 세모점 문의 목록(T1-9)으로 들어갑니다. */
    createRequest(input: { type: OrgRequestType; message?: string }): Promise<OrgRequest>
    /** DELETE /api/org/requests/{requestId} — OPEN 상태에서만 */
    cancelRequest(requestId: string): Promise<void>

    /** GET /api/org/notices */
    getNotices(): Promise<OrgNotice[]>

    /** GET /api/org/orders */
    getOrders(): Promise<OrgOrderList>
    /** PATCH /api/org/receipt-email */
    updateReceiptEmail(email: string | null): Promise<void>
    /** GET /api/org/orders/{orderId}/receipt */
    getOrderReceipt(orderId: string): Promise<ReceiptLink>
  }
}
