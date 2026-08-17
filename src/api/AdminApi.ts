import type {
  AdminAccountDetail,
  AdminOrgRow,
  Bucket,
  CostSummary,
  CreateAccountInput,
  CreateNoticeInput,
  CreateOrgInput,
  Inquiry,
  InquiryDetail,
  InquiryStatus,
  InquiryType,
  IssueCouponInput,
  JobDetail,
  JobPreview,
  JobStatus,
  JobSummary,
  JobVolumePoint,
  LayoutCostRow,
  ListResponse,
  LoginInput,
  Notice,
  OrgAccountDetail,
  OrgAccountList,
  OrgDetail,
  OrgMonthlyUsage,
  OrgNotice,
  OrgOrderList,
  OrgProfitReport,
  OrgSummary,
  Period,
  Session,
  StatsSummary,
} from './types'

/**
 * 앱이 서버에 요구하는 것 전부.
 *
 * 화면은 이 인터페이스만 봅니다. 구현은 두 벌입니다.
 *   - src/api/mock/mockApi.ts : 기획서 목업 값을 그대로 돌려줍니다 (현재 기본값)
 *   - src/api/http/httpApi.ts : 실제 서버를 호출합니다
 *
 * API 명세가 나오면 httpApi 의 경로·페이로드만 맞추고 VITE_API_SOURCE=http 로 바꾸면 됩니다.
 * 화면 코드는 손대지 않습니다.
 */
export interface Api {
  /**
   * 세션 · 로그인.
   *
   * 기획서 §6 "권한별 진입 분리": 관리자 페이지는 앱과 다른 주소로 띄우고 서버에서도 막습니다.
   * 그래서 진입점마다 로그인 호출을 따로 둡니다 — 어느 역할을 받는지가 서버 책임이 되도록.
   */
  auth: {
    /** 로그인하지 않았으면 null 을 돌려줍니다. */
    getSession(): Promise<Session | null>
    /** 운영자 콘솔(T1). ROLE_ADMIN 만 받습니다. */
    loginAdmin(input: LoginInput): Promise<Session>
    /** 서비스 앱(T2 · T3). ROLE_ORG_ADMIN 과 ROLE_USER 를 받습니다. */
    loginApp(input: LoginInput): Promise<Session>
    logout(): Promise<void>
  }

  /* ── T1 · 운영자 콘솔 ── */
  admin: {
    /** T1-1 전체 작업 현황 */
    getStatsSummary(period: Period): Promise<StatsSummary>
    /** T1-1 누적 원가 */
    getCostSummary(period: Period): Promise<CostSummary>

    /** T1-2 작업량 */
    getJobVolume(bucket: Bucket): Promise<ListResponse<JobVolumePoint>>
    /** T1-2 레이아웃 유형별 평균 원가 (month: 'YYYY-MM') */
    getLayoutCost(month: string): Promise<ListResponse<LayoutCostRow>>
    /** T1-2 기관별 수익성 (month: 'YYYY-MM') */
    getOrgProfit(month: string): Promise<OrgProfitReport>

    /** T1-3 실시간 모니터링. 10초마다 다시 부릅니다. */
    getJobs(params?: { status?: JobStatus | 'all' }): Promise<ListResponse<JobSummary>>
    /** T1-3 CSV — 화면에 걸린 필터 그대로, UTF-8 BOM */
    exportJobsCsv(params?: { status?: JobStatus | 'all' }): Promise<Blob>

    /** T1-4 작업 상세 */
    getJob(jobId: string): Promise<JobDetail>
    /** T1-4 CSV */
    exportJobCsv(jobId: string): Promise<Blob>

    /** T1-5 변환 결과 미리보기 */
    getJobPreview(jobId: string, page?: number): Promise<JobPreview>
    /** T1-5 운영자 계정 마이페이지로 사본 보내기 */
    sendJobToMyPage(jobId: string): Promise<void>

    /** T1-6 기관 및 계정 통합 표 */
    getOrgs(): Promise<ListResponse<AdminOrgRow>>
    createOrg(input: CreateOrgInput): Promise<AdminOrgRow>
    deleteOrg(orgId: string): Promise<void>
    /** 기관 관리자 비밀번호 재발급 */
    resetOrgAdminPassword(orgId: string): Promise<void>

    createAccount(input: CreateAccountInput): Promise<void>
    deleteAccount(accountId: string): Promise<void>
    resetAccountPassword(accountId: string): Promise<void>
    /** 누르는 즉시 로그인이 끊기고 진행 중이던 변환도 멈춥니다. */
    setAccountLocked(accountId: string, locked: boolean): Promise<void>

    /** T1-7 기관 정보 */
    getOrg(orgId: string): Promise<OrgDetail>
    updateOrg(orgId: string, patch: Partial<CreateOrgInput>): Promise<OrgDetail>
    /** 입금 확인 기록 */
    recordOrderPayment(orgId: string, orderId: string, paidAt: string): Promise<void>
    issueCoupon(orgId: string, input: IssueCouponInput): Promise<void>

    /** T1-8 계정 정보 (조회 전용) */
    getAccount(accountId: string): Promise<AdminAccountDetail>

    /** T1-9 문의 */
    getInquiries(params?: {
      type?: InquiryType | 'all'
      unansweredOnly?: boolean
    }): Promise<ListResponse<Inquiry>>
    getInquiry(inquiryId: string): Promise<InquiryDetail>
    replyInquiry(inquiryId: string, body: string): Promise<void>
    setInquiryStatus(inquiryId: string, status: InquiryStatus): Promise<void>

    /** T1-10 공지 */
    getNotices(): Promise<ListResponse<Notice>>
    createNotice(input: CreateNoticeInput): Promise<Notice>
  }

  /* ── T2 · 기관 관리 (기관 관리자) ── */
  org: {
    getSummary(): Promise<OrgSummary>
    getMonthlyUsage(): Promise<OrgMonthlyUsage>
    getNotices(): Promise<ListResponse<OrgNotice>>

    getAccounts(): Promise<OrgAccountList>
    updateAccountAlias(accountId: string, alias: string): Promise<void>
    setAccountLocked(accountId: string, locked: boolean): Promise<void>

    /** 세모점 문의 목록(T1-9)으로 접수됩니다. */
    requestCredit(input: { amount?: number; message?: string }): Promise<void>
    requestAccount(input: { alias?: string }): Promise<void>
    cancelAccountRequest(requestId: string): Promise<void>

    getOrders(): Promise<OrgOrderList>
    updateBillingEmail(email: string): Promise<void>

    /** T2-2 계정 상세 */
    getAccountDetail(accountId: string, range?: { from: string; to: string }): Promise<OrgAccountDetail>
  }
}
