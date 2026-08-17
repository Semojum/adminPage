/**
 * 도메인 타입 = API 응답 스키마.
 *
 * 실제 API 명세가 나오면 이 파일만 명세에 맞게 고치면 됩니다.
 * 화면(components/pages)은 이 타입에만 의존하고, mock/http 구현은 이 타입을 만족시킵니다.
 */

/* ─────────────────────────── 공통 ─────────────────────────── */

/** 기간 탭 (T1-1 누적 원가 / 전체 작업 현황) */
export type Period = 'today' | 'week' | 'month'

/** 작업량 그래프 구간 (T1-2) */
export type Bucket = 'daily' | 'weekly' | 'monthly' | 'all'

/**
 * 작업 상태. 기획서 §6 "작업 상태" — 넷으로 제한합니다.
 * - uploaded       업로드   : 파일은 올라왔지만 변환이 아직 시작되지 않음
 * - processing     진행 중  : processedPages/pages 로 진척을 함께 표기
 * - done           완료     : 모든 쪽 성공
 * - partialFailed  부분 실패 : 끝났지만 일부(또는 전부) 쪽이 실패
 */
export type JobStatus = 'uploaded' | 'processing' | 'done' | 'partialFailed'

/** 쪽 레이아웃 유형 (T1-2 원가 분석 / T1-4 쪽별 결과) */
export type LayoutType = 'text' | 'table' | 'formula' | 'image'

/** 변환 모드 (T2-2 / T3) */
export type ConvertMode = 'braille' | 'integrated' | 'ocr'

/** 계약 구분 (T1-6 / T1-7) */
export type ContractType = 'paid' | 'trial' | 'internal'

/** 계정 상태 (T1-6 / T2) */
export type AccountStatus = 'active' | 'locked' | 'requested'

/** 크레딧 사용량. 기획서 §6 "사용률 색" — 50% 미만 초록 / 50~80% 주황 / 80% 이상 빨강 */
export interface CreditUsage {
  used: number
  total: number
  /** 0~100. 서버가 계산해 내려줍니다. */
  rate: number
}

/** 화폐 금액(원). 서버는 정수 원 단위로 내려줍니다. */
export type Won = number

export interface ListResponse<T> {
  items: T[]
}

/* ─────────────────── T1-1 · 통계 (첫 화면) ─────────────────── */

export interface StatsSummary {
  /** 작업 건수 */
  jobs: {
    total: number
    done: number
    processing: number
    failed: number
  }
  /** 처리 쪽수 */
  pages: {
    total: number
    /** 비교 대상(어제/지난주/지난달) 값 */
    previous: number
    previousLabel: string
    /** 증감률(%). 양수면 증가. */
    changeRate: number
  }
  /** 시간대별 처리 쪽수 막대 */
  hourly: Array<{ label: string; pages: number }>
}

export interface CostSummary {
  /**
   * 같은 축에 놓고 비교하는 막대들.
   * 기획서 §T1-1: 오늘 · 어제 · 이번 주 평균 · 지난주 평균
   */
  series: Array<{ label: string; amount: Won; emphasis?: boolean }>
  weekTotal: {
    amount: Won
    /** 지난주 대비 증감률(%) */
    changeRate: number
  }
  monthTotal: {
    amount: Won
    pages: number
    costPerPage: Won
  }
}

/* ─────────────────── T1-2 · 상세 통계 ─────────────────── */

export interface JobVolumePoint {
  label: string
  /** 완료 건수 */
  done: number
  /** 실패·취소 건수 */
  failed: number
  /** 막대 위에 적는 합계 */
  total: number
}

export interface LayoutCostRow {
  type: LayoutType
  label: string
  /** 쪽당 평균 원가 */
  costPerPage: Won
  pages: number
  /** 비중(%) */
  share: number
  /** 전월 대비 증감률(%). 0 이면 ±0% 로 표기합니다. */
  momChange: number
}

/**
 * 수익성 표의 "구분" 열. 계약 구분(ContractType)과 다릅니다.
 * 쿠폰으로 쓴 기관은 차감이 0이라 원가만큼 마이너스로 잡힙니다.
 */
export type BillingType = 'paid' | 'coupon' | 'trial' | 'internal'

export interface OrgProfitRow {
  orgId: string
  orgName: string
  billingType: BillingType
  /** 차감 크레딧 */
  usedCredit: number
  /** 환산 매출 = 차감 크레딧 × 계약 단가 */
  revenue: Won
  cost: Won
  /** 차액 = 환산 매출 − 원가 */
  profit: Won
}

export interface OrgProfitReport {
  rows: OrgProfitRow[]
  total: {
    usedCredit: number
    revenue: Won
    cost: Won
  }
}

/* ─────────────────── T1-3 · 실시간 모니터링 ─────────────────── */

export interface JobSummary {
  id: string
  fileName: string
  orgName: string
  pages: number
  /** 진행 중이면 null (기획서 §6: 끝나야 확정) */
  durationSec: number | null
  /** 진행 중이면 null */
  cost: Won | null
  status: JobStatus
  /** status === 'processing' 일 때 처리된 쪽수 */
  processedPages?: number
  /** status === 'partialFailed' 일 때 실패한 쪽수 */
  failedPages?: number
}

/* ─────────────────── T1-4 · 작업 상세 ─────────────────── */

export interface JobPageResult {
  /** "1~7", "8", "11 · 13" 처럼 서버가 묶어서 내려줍니다. */
  range: string
  layout: LayoutType
  layoutLabel: string
  cost: Won
  status: 'done' | 'failed'
  /** 실패 사유. 성공이면 null */
  reason: string | null
}

export interface JobDetail {
  id: string
  fileName: string
  status: JobStatus
  failedPages: number
  /** 요청 정보 */
  request: {
    accountId: string
    accountAlias: string | null
    orgName: string
    requestedAt: string
    ip: string
    location: string
    userAgent: string
  }
  /** 처리 · 비용 */
  processing: {
    pages: number
    successPages: number
    failedPages: number
    durationSec: number
    secPerPage: number
    cost: Won
    costPerPage: Won
    /** 고객에게서 차감한 크레딧 */
    credit: number
    layout: Record<LayoutType, number>
  }
  pageResults: JobPageResult[]
}

/* ─────────────────── T1-5 · 변환 결과 미리보기 ─────────────────── */

export interface JobPreview {
  jobId: string
  source: {
    fileName: string
    pages: number
    /** 현재 쪽 번호 (1-base) */
    page: number
    /** 원본 쪽을 그린 조각. 관리자 화면에서는 확인만 합니다. */
    blocks: PreviewBlock[]
  }
  result: {
    fileName: string
    /** 점역·통합 변환이면 BRF, OCR 변환이면 TXT */
    format: 'BRF' | 'TXT'
    /** BRF 이면 유니코드 점자 문자열, TXT 이면 평문 */
    content: string
  }
}

export type PreviewBlock =
  | { kind: 'heading'; text: string }
  | { kind: 'paragraph'; lines: number }
  | { kind: 'table'; head: string[]; rows: string[][] }

/* ─────────────────── T1-6 · 기관 · 계정 ─────────────────── */

export interface AdminAccountRow {
  id: string
  accountId: string
  alias: string | null
  status: AccountStatus
  /** 마지막 로그인. 서버가 "오늘 09:12" / "어제" 처럼 이미 다듬어 내려줍니다. */
  lastLoginAt: string | null
  /** 이번 달 사용 크레딧 */
  monthUsage: number
}

export interface AdminOrgRow {
  id: string
  name: string
  code: string
  contractType: ContractType
  accounts: AdminAccountRow[]
  /** 기관 단위 소계 */
  subtotal: {
    accountCount: number
    /** 기관 관리자 기준 마지막 로그인 */
    lastLoginAt: string | null
    /** 소속 계정 전체 합 */
    monthUsage: number
  }
}

export interface CreateOrgInput {
  name: string
  code: string
  contractType: ContractType
  contractStart: string
  contractEnd: string
}

export interface CreateAccountInput {
  orgId: string
  alias?: string
}

/* ─────────────────── T1-7 · 기관 정보 ─────────────────── */

export interface OrgOrder {
  id: string
  date: string
  description: string
  amount: Won
  /** 입금일. null 이면 미입금 */
  paidAt: string | null
}

export interface OrgCoupon {
  id: string
  name: string
  credit: number
  startAt: string
  endAt: string
  used: number
}

export interface OrgDetail {
  id: string
  name: string
  /** 변경 불가 */
  code: string
  contractType: ContractType
  contractStart: string
  contractEnd: string
  accountIds: string[]
  credit: CreditUsage & {
    /** "9월 중순" 처럼 서버가 문구로 내려줍니다. */
    expectedDepletion: string | null
  }
  orders: OrgOrder[]
  coupons: OrgCoupon[]
}

export interface IssueCouponInput {
  name: string
  credit: number
  startAt: string
  endAt: string
}

/* ─────────────────── T1-8 · 계정 정보 (조회 전용) ─────────────────── */

export interface AdminAccountDetail {
  id: string
  accountId: string
  alias: string | null
  orgId: string
  orgName: string
  orgCode: string
  /** 기관 전체 사용량 */
  orgCredit: CreditUsage
  /** 이 계정 몫 (분모는 기관 할당량) */
  accountCredit: CreditUsage
}

/* ─────────────────── T1-9 · 문의 ─────────────────── */

export type InquiryType = 'error' | 'sales' | 'creditRequest' | 'accountRequest' | 'etc'
export type InquiryStatus = 'unanswered' | 'checking' | 'answered'

export interface Inquiry {
  id: string
  createdAt: string
  sender: {
    orgName: string
    accountId: string | null
    /** 미가입 문의 표시 */
    unregistered: boolean
  }
  type: InquiryType
  typeLabel: string
  status: InquiryStatus
  /**
   * 경과. 기획서 §T1-9: 2일 안에 답한다는 약속을 지키는지 보는 열.
   * - answered  : "4시간 만에" (답변까지 걸린 시간)
   * - 그 외      : "9시간" (접수 후 흐른 시간)
   */
  elapsed: {
    text: string
    /** 약속(2일)을 넘겼거나 임박해 강조가 필요하면 true */
    overdue: boolean
  }
}

export interface InquiryDetail extends Inquiry {
  title: string
  body: string
  replies: Array<{ id: string; createdAt: string; author: string; body: string }>
}

/* ─────────────────── T1-10 · 공지 ─────────────────── */

export type NoticeScope = 'all' | 'org'
export type NoticeState = 'live' | 'scheduled' | 'ended'

export interface Notice {
  id: string
  createdAt: string
  scope: NoticeScope
  /** scope === 'org' 일 때 대상 기관 */
  orgId: string | null
  orgName: string | null
  title: string
  body: string
  startAt: string
  endAt: string
  state: NoticeState
}

export interface CreateNoticeInput {
  scope: NoticeScope
  orgId?: string
  startAt: string
  endAt: string
  title: string
  body: string
}

/* ─────────────────── T2 · 기관 관리 (기관 관리자) ─────────────────── */

export interface OrgSummary {
  orgId: string
  orgName: string
  credit: CreditUsage & {
    remaining: number
    expectedDepletion: string | null
  }
  contract: {
    startAt: string
    endAt: string
    daysLeft: number
  }
}

export interface OrgMonthlyUsage {
  points: Array<{ label: string; credit: number }>
  /** 6개월 평균 */
  average: number
}

export interface OrgNotice {
  id: string
  receivedAt: string
  scope: NoticeScope
  title: string
  body: string
}

export interface OrgAccountRow {
  id: string
  /** 발급 요청 중이면 아직 ID가 없습니다. */
  accountId: string | null
  alias: string | null
  status: AccountStatus
  lastLoginAt: string | null
  usage: number | null
  /** status === 'requested' 일 때 "08-12 요청" */
  requestedAt: string | null
  /** 본인 계정이면 true (제어 버튼을 숨깁니다) */
  self: boolean
  /** 기관 관리자 계정이면 true */
  orgAdmin: boolean
}

export interface OrgAccountList {
  items: OrgAccountRow[]
  /** 처리 중인 발급 요청 수 */
  pendingRequestCount: number
}

export type PaymentState = 'paid' | 'unpaid'
export type InvoiceState = 'issued' | 'pending'

export interface OrgOrderRow {
  id: string
  date: string
  description: string
  amount: Won
  payment: PaymentState
  invoice: InvoiceState
  /** 증빙 다운로드 URL. 없으면 null */
  receiptUrl: string | null
}

export interface OrgOrderList {
  items: OrgOrderRow[]
  billingEmail: string
}

export interface OrgJobRow {
  id: string
  fileName: string
  status: JobStatus
  processedPages?: number
  failedPages?: number
  pages: number
  /** 진행 중이면 null */
  credit: number | null
  /** 진행 중이면 null */
  completedAt: string | null
}

export interface OrgAccountDetail {
  id: string
  accountId: string
  alias: string | null
  orgName: string
  /** 기관 할당 대비 이 계정 */
  credit: CreditUsage
  range: { from: string; to: string }
  jobs: OrgJobRow[]
  total: { pages: number; credit: number }
}

/* ─────────────────── 세션 · 로그인 ─────────────────── */

/**
 * 기획서 화면 흐름의 세 갈래입니다.
 * - ROLE_ADMIN     세모점 운영자 — 별도 관리자 페이지(admin.semo-jum.com)
 * - ROLE_ORG_ADMIN 기관 관리자   — 서비스 앱의 [기관 관리] 탭 (T2)
 * - ROLE_USER      점역사        — 서비스 앱의 [사용량] (T3, 이번 범위 밖)
 */
export type Role = 'ROLE_ADMIN' | 'ROLE_ORG_ADMIN' | 'ROLE_USER'

export interface Session {
  accountId: string
  displayName: string
  role: Role
  orgId: string | null
  orgName: string | null
}

export interface LoginInput {
  accountId: string
  password: string
}

/**
 * 로그인이 막히는 이유. 서버가 이 코드를 내려주면 화면이 문구를 고릅니다.
 * - invalidCredentials 아이디나 비밀번호가 틀림
 * - locked            잠긴 계정 (기획서 §6: 잠금은 즉시 로그인을 끊습니다)
 * - forbiddenRole     이 주소에 들어올 수 없는 역할 (§6 권한별 진입 분리)
 */
export type LoginFailureCode = 'invalidCredentials' | 'locked' | 'forbiddenRole'

export class LoginFailure extends Error {
  constructor(
    readonly code: LoginFailureCode,
    message: string,
  ) {
    super(message)
    this.name = 'LoginFailure'
  }
}
