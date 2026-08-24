/**
 * 도메인 타입 = V3 API 명세(Notion "[V3] API 명세서", 2026-08-19 판) 응답 스키마.
 *
 * 원칙: **서버 enum 값을 그대로 들고 다닙니다.** (COMPLETED / PAGE_LAYOUT_TEXT / ROLE_ADMIN …)
 * 화면에 보일 한국어는 src/lib/format.ts 가 붙입니다. 매핑을 한 겹으로 줄여
 * 명세가 바뀌면 이 파일과 http/httpApi.ts 만 고치면 되게 했습니다.
 *
 * 서버가 계산해 주지 않아 **화면이 계산하는 값**은 필드 주석에 (FE 계산)으로 적어 둡니다.
 */

/* ─────────────────────────── 공통 ─────────────────────────── */

/** 모든 응답의 겉껍데기. client.ts 가 벗겨서 result 만 넘깁니다. */
export interface Envelope<T> {
  isSuccess: boolean
  code: string
  message: string
  result: T
}

/** 기간 탭 (T1-1) */
export type Period = 'today' | 'week' | 'month'

/** 작업량 그래프 구간 (T1-2) — 서버 unit 파라미터 그대로 */
export type Bucket = 'daily' | 'weekly' | 'monthly' | 'all'

/**
 * 작업 상태 (서버 enum).
 * 화면 문구는 넷입니다 — 업로드(PENDING) / 진행 중(IN_PROGRESS) /
 * 완료·부분 실패(COMPLETED, failedPages 유무) / 실패(FAILED).
 */
export type JobStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'

/** 쪽 레이아웃 유형 (서버 enum) */
export type LayoutType =
  | 'PAGE_LAYOUT_TEXT'
  | 'PAGE_LAYOUT_FORMULA'
  | 'PAGE_LAYOUT_TABLE'
  | 'PAGE_LAYOUT_VISUAL'
  | 'PAGE_LAYOUT_UNSPECIFIED'

/** 변환 모드 — a 초안 생성(OCR) / b 텍스트 점역 / c 이미지 점역(통합) */
export type ConvertMode = 'a' | 'b' | 'c'

/**
 * 계약 유형. V24 개편(2026-08-18)으로 다섯 가지가 되었습니다.
 * 유료 BASIC(200원/크레딧) · STANDARD(150) · PREMIUM(120) / 무료 FREE(체험) · COUPON(쿠폰 제공)
 */
export type ContractType = 'BASIC' | 'STANDARD' | 'PREMIUM' | 'FREE' | 'COUPON'

/**
 * 실제로 내려올 수 있는 값. 명세 안에 개편 전 값(PAID·TRIAL·INTERNAL)이 남은 응답 예시가
 * 아직 있어서, 화면이 깨지지 않도록 함께 받습니다. 새로 고를 때는 ContractType 만 씁니다.
 */
export type ContractTypeValue = ContractType | 'PAID' | 'TRIAL' | 'INTERNAL'

/** 계정 상태 (서버 enum). INACTIVE = 화면의 "잠김" */
export type AccountStatus = 'ACTIVE' | 'INACTIVE'

/** 역할 (서버 enum) */
export type Role = 'ROLE_ADMIN' | 'ROLE_ORG_ADMIN' | 'ROLE_USER'

/** 화폐 금액(원). 서버는 소수점이 붙은 실수로 내려줍니다. */
export type Won = number

export interface ListResponse<T> {
  items: T[]
}

/** 크레딧 게이지. rate 는 서버가 안 주므로 화면이 계산합니다. (FE 계산) */
export interface CreditUsage {
  used: number
  total: number
  /** 0~100 */
  rate: number
}

/* ─────────────────── T1-1 · 통계 (첫 화면) ─────────────────── */
/* GET /api/admin/stats/overview?period= */

export interface StatsOverview {
  period: Period
  from: string
  to: string
  jobs: {
    total: number
    completed: number
    inProgress: number
    /** FAILED + 취소 */
    failed: number
  }
  /** 처리(성공) 쪽수 */
  pagesProcessed: number
  /** 직전 기간 전체 — "어제 1,020쪽 · +18%" 비교용 */
  prevPagesProcessed: number
  /**
   * today=시간별 / week·month=일별.
   * 2026-08-20 부터 버킷마다 쪽수(pages)와 시작 건수(jobs)를 함께 줍니다.
   * 빈 버킷은 서버가 빼고 주므로 화면이 0을 채웁니다.
   */
  series: Array<{ bucket: string; pages: number; jobs: number }>
  cost: {
    todayKrw: Won
    yesterdayKrw: Won
    thisWeekDailyAvgKrw: Won
    lastWeekDailyAvgKrw: Won
    thisWeekTotalKrw: Won
    thisMonthTotalKrw: Won
    thisMonthPages: number
    krwPerPage: Won
    /** 단가표에 없는 모델이 섞여 원가가 실제보다 작을 수 있음 */
    uncertain: boolean
  }
}

/* ─────────────────── T1-2 · 상세 통계 ─────────────────── */

/** GET /api/admin/stats/workload?unit= */
export interface Workload {
  unit: Bucket
  buckets: Array<{
    bucket: string
    completed: number
    failedOrCanceled: number
    /** 그 버킷의 처리(성공) 쪽수 — 2026-08-20 추가 */
    pages: number
  }>
}

/** GET /api/admin/stats/layout-cost?month=YYYY-MM */
export interface LayoutCostRow {
  layoutType: LayoutType
  pages: number
  sharePct: number
  avgKrwPerPage: Won
  /** 전월 대비 쪽수 증감률(%). 전월 0쪽이면 null */
  pagesDeltaPct: number | null
}

export interface LayoutCostReport {
  month: string
  items: LayoutCostRow[]
}

/** GET /api/admin/stats/profitability?month=YYYY-MM */
export interface ProfitRow {
  orgId: string
  orgName: string
  contractType: ContractTypeValue
  /** 조회 시점 단가표에서 적용된 크레딧 단가 */
  appliedPriceKrw: Won
  creditsUsed: number
  revenueKrw: Won
  costKrw: Won
  /** 차액 = 환산 매출 − 원가 */
  marginKrw: Won
  costUncertain: boolean
}

export interface ProfitReport {
  month: string
  /** 계약 유형별 크레딧 단가 (관리 변수) */
  creditPricesByContract: Partial<Record<ContractTypeValue, Won>>
  items: ProfitRow[]
  totals: {
    creditsUsed: number
    revenueKrw: Won
    costKrw: Won
    marginKrw: Won
  }
}

/* ─────────────────── T1-3 · 실시간 모니터링 ─────────────────── */
/* GET /api/admin/jobs?status=&hours=&size= */

export interface JobSummary {
  jobId: string
  fileName: string
  /** 목록에는 기관만 표시(기획) */
  orgName: string | null
  /** 상세 화면용 */
  loginId: string | null
  mode: ConvertMode | null
  status: JobStatus
  totalPages: number
  /** 변환 중일 때만 — "진행 중 n/m쪽" (Redis 장애 시 null) */
  donePages: number | null
  /** 종료 작업의 실패 쪽수 — "부분 실패 n쪽" */
  failedPages: number | null
  /** 진행 중이면 null (끝나야 확정) */
  costKrw: Won | null
  costUncertain: boolean
  startedAt: string | null
  finishedAt: string | null
}

export interface JobList {
  since: string
  items: JobSummary[]
}

/** 목록 필터. 서버 enum + 화면의 '전체' */
export type JobStatusFilter = JobStatus | 'all'

/* ─────────────────── T1-4 · 작업 상세 ─────────────────── */
/* GET /api/admin/jobs/{jobId} */

/**
 * 쪽 상태 (2026-08-24 실제 응답 확인).
 * COMPLETED 완료 / NEEDS_REVIEW 검토 필요(성공이지만 확인 권장) / BLOCKED 실패
 */
export type JobPageStatus = 'COMPLETED' | 'NEEDS_REVIEW' | 'BLOCKED'

export interface JobPageResult {
  pageNo: number
  /** 위 세 값 외에 새 값이 올 수 있어 문자열로 받습니다. */
  status: JobPageStatus | string
  layoutType: LayoutType | null
  costKrw: Won | null
  /** 실패 쪽은 무차감이라 null */
  credit: number | null
  /** 실패·치명 오류 사유 */
  reasons: string[]
}

export interface JobDetail {
  jobId: string
  fileName: string
  mode: ConvertMode | null
  status: JobStatus
  request: {
    loginId: string
    alias: string | null
    orgName: string
    requestedAt: string
    clientIp: string | null
    /**
     * IP 로 찾은 접속 위치 — "Seoul, South Korea" (2026-08-20 추가).
     * 서버가 조회 시점에 GeoIP(ip-api, 24시간 캐시)로 붙입니다.
     * 조회 실패나 사설 IP 면 null 이고, 그때는 화면이 IP 만 보여줍니다.
     */
    clientLocation: string | null
    clientOs: string | null
    clientBrowser: string | null
    clientUserAgent: string | null
  }
  processing: {
    totalPages: number
    successPages: number
    failedPages: number
    startedAt: string | null
    finishedAt: string | null
    /** 참고값 — 정본은 USD */
    costKrw: Won | null
    llmCostUsd: number | null
    gpuCostUsd: number | null
    costUncertain: boolean
    /** 고객에게서 차감한 크레딧 */
    credits: number
    layoutCounts: Partial<Record<LayoutType, number>>
  }
  pages: JobPageResult[]
}

/* ─────────────────── T1-5 · 변환 결과 미리보기 ─────────────────── */
/* GET /api/admin/jobs/{jobId}/pages/{pageNo} — 사용자 페이지 조회와 같은 구조 */

/**
 * text_list · braille_text_list 항목.
 *
 * 실제 응답(2026-08-24 확인)은 `contents` 가 **문자열 배열**입니다 —
 * `{ id, type, order, contents: ["...\n"], is_blocked, ... }`.
 * 통 문자열로 올 때도 있어 둘 다 받습니다.
 */
export type PageTextItem =
  | string
  | {
      id?: string | number
      contents?: string | string[]
      /** 막힌 블록 표시 */
      is_blocked?: boolean
    }

export interface JobPageView {
  jobId: string
  mode: ConvertMode | null
  status: JobStatus
  totalPages: number
  originalFileName: string
  pageNo: number
  result: {
    text_list?: PageTextItem[]
    braille_text_list?: PageTextItem[]
  }
  original: {
    /** a·c = 'pdf' (presigned URL, 15분) / b = 'text' (줄 배열) */
    type: 'pdf' | 'text' | string
    url: string | null
    lines: string[] | null
  }
}

/* ─────────────────── T1-6 · 기관 · 계정 ─────────────────── */
/* GET /api/admin/orgs?month=YYYY-MM */

export interface AdminAccountRow {
  loginId: string
  alias: string | null
  role: Role
  status: AccountStatus
  lastLoginAt: string | null
  /** 해당 월 사용 크레딧 */
  monthCredits: number
}

export interface AdminOrgRow {
  orgId: string
  name: string
  code: string
  contractType: ContractTypeValue
  accounts: AdminAccountRow[]
  subtotal: {
    accountCount: number
    monthCredits: number
    /** 기관 관리자(ROLE_ORG_ADMIN) 기준 */
    adminLastLoginAt: string | null
  }
}

export interface AdminOrgList {
  month: string
  items: AdminOrgRow[]
}

/** POST /api/admin/orgs */
export interface CreateOrgInput {
  name: string
  /** 소문자 영숫자 2~12자(첫 글자 영문). 비우면 서버가 orgNN 자동 부여 */
  code?: string
  /** yyyy-MM-dd */
  contractExpiresAt?: string
}

export interface CreatedOrg {
  organizationId: string
  name: string
  code: string
}

/** POST /api/admin/accounts */
export interface CreateAccountInput {
  organizationId: string
  /** 1~50 */
  count: number
}

/** 발급·재발급 결과. 비밀번호는 이 응답에서 한 번만 볼 수 있습니다. */
export interface IssuedCredential {
  loginId: string
  password: string
}

/* ─────────────────── T1-7 · 기관 정보 ─────────────────── */
/* GET·PATCH /api/admin/orgs/{orgId} */

export interface OrgDetail {
  orgId: string
  name: string
  /** 변경 불가 — loginId 프리픽스 */
  code: string
  contractType: ContractTypeValue
  contractStartedAt: string | null
  contractExpiresAt: string | null
  creditAllocated: number
  creditUsed: number
  creditRemaining: number
  receiptEmail: string | null
  /**
   * 소속 계정 **ID 만** 옵니다 — 별칭·역할·상태는 목록(GET /api/admin/orgs)에 있습니다.
   * (2026-08-20 실제 응답 확인: accountLoginIds)
   */
  accountLoginIds: string[]
}

export interface UpdateOrgInput {
  name?: string
  contractType?: ContractType
  contractStartedAt?: string
  contractExpiresAt?: string
  /** T2 크레딧 추가 요청 처리 = 이 값 상향 */
  creditAllocated?: number
}

/** 쿠폰 — POST·GET /api/admin/orgs/{orgId}/coupons */
export type CouponStatus = 'SCHEDULED' | 'ACTIVE' | 'EXHAUSTED' | 'ENDED'

export interface Coupon {
  id: string
  name: string
  creditAmount: number
  used: number
  remaining: number
  startsOn: string
  endsOn: string
  displayStatus: CouponStatus
}

export interface IssueCouponInput {
  name: string
  creditAmount: number
  startsOn: string
  endsOn: string
}

/* ─────────────────── 주문 · 수납 (T1-7 · T2) ─────────────────── */

export type InvoiceStatus = 'PENDING' | 'ISSUED'

export interface Order {
  id: string
  organizationId: string
  orgName: string | null
  orderDate: string
  description: string
  amountKrw: Won
  creditAmount: number | null
  /** 입금 확인일. null 이면 미납 */
  paidAt: string | null
  invoiceStatus: InvoiceStatus
  /** 증빙 파일명. null 이면 미첨부 */
  receiptFileName: string | null
  createdAt?: string
}

export interface CreateOrderInput {
  organizationId: string
  orderDate: string
  description: string
  amountKrw: Won
  creditAmount?: number
}

export interface UpdateOrderInput {
  paidAt?: string | null
  invoiceStatus?: InvoiceStatus
}

/** 증빙 내려받기 응답 (presigned 15분 — 저장해 두고 재사용 금지) */
export interface ReceiptLink {
  fileName: string
  url: string
}

/* ─────────────────── T1-9 · 문의 ─────────────────── */

export type InquiryType =
  | 'CREDIT_ADD'
  | 'ACCOUNT_ISSUE'
  | 'ERROR_REPORT'
  | 'ONBOARDING'
  | 'ETC'
  | 'EMAIL'

export type InquiryStatus = 'OPEN' | 'IN_REVIEW' | 'ANSWERED'

/**
 * 메일 문의에 딸린 파일 (V28, 2026-08-24).
 *
 * 상세 응답이 presigned URL(15분)을 **함께** 줍니다 — 따로 내려받기 API 를 부르지 않습니다.
 * 만료되면 상세를 다시 조회해 새 URL 을 받습니다. URL 을 저장해 두고 재사용하지 않습니다.
 */
export interface InquiryFile {
  id: string
  fileName: string
  /** 서버가 대문자로 줄 때가 있습니다(IMAGE/PNG) — 비교할 때 소문자로 맞춥니다. */
  contentType: string
  sizeBytes: number
  url: string
}

/** 목록 항목 — 본문은 preview(100자)뿐이고 첨부는 개수만 옵니다. */
export interface Inquiry {
  id: string
  type: InquiryType
  status: InquiryStatus
  /** 미가입(홈페이지) 문의는 null */
  orgName: string | null
  loginId: string | null
  /** 본문 앞 100자. 메일이면 HTML 원문 조각일 수 있습니다. */
  preview: string
  /** type === 'EMAIL' 일 때만 */
  senderEmail: string | null
  subject: string | null
  createdAt: string
  statusChangedAt: string | null
  /** 인라인 이미지 + 파일 첨부를 합한 개수 */
  attachmentCount: number
}

/** 목록은 2026-08-21 부터 쪽 단위로 옵니다. */
export interface InquiryList {
  items: Inquiry[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

/**
 * 문의 상세 (2026-08-21 신설).
 * 본문 전문과 인라인 이미지·첨부를 여기서만 받습니다.
 */
export interface InquiryDetail {
  id: string
  type: InquiryType
  status: InquiryStatus
  orgName: string | null
  loginId: string | null
  senderEmail: string | null
  subject: string | null
  /** 본문 전문 (최대 10,000자) */
  message: string
  createdAt: string
  statusChangedAt: string | null
  /** 메일 본문에 박힌 이미지 — 본문 아래에 바로 그립니다. */
  inlineImages: InquiryFile[]
  /** 파일 첨부 */
  attachments: InquiryFile[]
}

/* ─────────────────── T1-10 · 공지 ─────────────────── */

export type NoticeStatus = 'SCHEDULED' | 'ACTIVE' | 'ENDED'

export interface Notice {
  id: string
  /** null = 전체 공지 */
  targetOrganizationId: string | null
  targetOrgName: string | null
  title: string
  body: string
  startsOn: string
  endsOn: string
  displayStatus: NoticeStatus
  createdAt: string
}

export interface CreateNoticeInput {
  targetOrganizationId?: string | null
  title: string
  body: string
  startsOn: string
  endsOn: string
}

/* ─────────────────── T2 · 기관 관리 ─────────────────── */
/* GET /api/org/dashboard */

export interface OrgDashboard {
  orgName: string
  orgCode: string
  contractType: ContractTypeValue
  contractStartedAt: string | null
  contractExpiresAt: string | null
  creditAllocated: number
  creditUsed: number
  /** 할당 − 사용. 초과 사용이면 음수 그대로 */
  creditRemaining: number
  /** 최근 6개월(이번 달 포함), 빈 달은 0 */
  monthlyUsage: Array<{ month: string; credits: number }>
}

/** GET /api/org/accounts?month=YYYY-MM */
export interface OrgAccountRow {
  loginId: string
  alias: string | null
  status: AccountStatus
  role: Role
  lastLoginAt: string | null
  monthCredits: number
  /** 본인 행은 제어 버튼 없음(잠금 불가) */
  self: boolean
}

export interface OrgAccountList {
  month: string
  items: OrgAccountRow[]
}

/** GET·POST·DELETE /api/org/requests */
export type OrgRequestType = 'CREDIT_ADD' | 'ACCOUNT_ISSUE'

export interface OrgRequest {
  id: string
  type: OrgRequestType
  status: InquiryStatus
  message: string | null
  createdAt: string | null
}

export interface OrgNotice {
  id: string
  /** ALL 전체 / ORG 우리 기관 */
  scope: 'ALL' | 'ORG'
  title: string
  body: string
  startsOn: string
  endsOn: string
  createdAt: string
}

export interface OrgOrderList {
  receiptEmail: string | null
  items: Order[]
}

/* ─────────────────── T2-2 · 계정 상세 ─────────────────── */
/* GET /api/org/accounts/{loginId}/jobs?from=&to= */

export interface OrgJobRow {
  jobId: string
  fileName: string
  mode: ConvertMode | null
  status: JobStatus
  totalPages: number
  donePages: number | null
  failedPages: number | null
  /** 진행 중이면 null */
  credits: number | null
  startedAt: string | null
  finishedAt: string | null
}

export interface OrgAccountJobs {
  loginId: string
  alias: string | null
  from: string
  to: string
  items: OrgJobRow[]
  totalPages: number
  totalCredits: number
}

/* ─────────────────── 세션 · 로그인 ─────────────────── */

/**
 * 세션.
 *
 * 명세에 세션 조회 API 가 따로 없습니다 — 로그인 응답(accessToken·refreshToken·role)이 전부입니다.
 * 그래서 화면을 새로 고쳐도 로그인이 유지되도록 토큰과 loginId 를 브라우저에 보관하고,
 * 앱이 켜질 때 /api/auth/refresh 로 살아 있는 세션인지 확인합니다. (src/api/http/session.ts)
 */
export interface Session {
  loginId: string
  role: Role
  accessToken: string
  refreshToken: string
}

export interface LoginInput {
  loginId: string
  password: string
}

/**
 * 로그인이 막히는 이유.
 * - AUTH4001 아이디 또는 비밀번호 오류
 * - AUTH4004 비활성화된 계정(status=INACTIVE)
 * - forbiddenRole  이 주소에 들어올 수 없는 역할 (화면 판단 — 서버는 role 만 알려 줍니다)
 */
export type LoginFailureCode = 'AUTH4001' | 'AUTH4004' | 'forbiddenRole' | 'unknown'

export class LoginFailure extends Error {
  constructor(
    readonly code: LoginFailureCode,
    message: string,
  ) {
    super(message)
    this.name = 'LoginFailure'
  }
}
