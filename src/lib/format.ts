import type {
  AccountStatus,
  ContractTypeValue,
  ConvertMode,
  InquiryStatus,
  InquiryType,
  JobStatus,
  LayoutType,
  NoticeStatus,
  Won,
} from '@/api/types'

const nf = new Intl.NumberFormat('ko-KR')

export const number = (value: number) => nf.format(value)

/** 원가는 원 단위로 반올림해 보여줍니다. 서버는 소수점까지 내려줍니다. */
const krw = (value: Won) => Math.round(value)

/** ₩1,104,000 */
export const won = (value: Won) => `₩${nf.format(krw(value))}`

/** 38,400원 — 그래프 라벨처럼 단위를 뒤에 붙일 때 */
export const wonSuffix = (value: Won) => `${nf.format(krw(value))}원`

export const signedWon = (value: Won) =>
  value < 0 ? `-${nf.format(Math.abs(krw(value)))}원` : `${nf.format(krw(value))}원`

/** +18% / −4% / ±0% (기획서 표기 그대로) */
export function signedPercent(value: number): string {
  const rounded = Math.round(value)
  if (rounded === 0) return '±0%'
  return rounded > 0 ? `+${rounded}%` : `−${Math.abs(rounded)}%`
}

/** 증감률(%) — 직전 값이 0이면 비교할 수 없으므로 null */
export function changeRate(current: number, previous: number): number | null {
  if (!previous) return null
  return ((current - previous) / previous) * 100
}

/** 0~100 사용률. 할당이 0이면 0% 로 둡니다. */
export const usageRate = (used: number, total: number) =>
  total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0

/** 기획서 §6 "사용률 색": 50% 미만 초록 · 50~80% 주황 · 80% 이상 빨강 */
export function usageTone(rate: number): 'ok' | 'warn' | 'danger' {
  if (rate >= 80) return 'danger'
  if (rate >= 50) return 'warn'
  return 'ok'
}

/* ─────────────── 날짜 · 시간 ─────────────── */

const parse = (value: string | null | undefined): Date | null => {
  if (!value) return null
  // 서버는 "2026-08-13T10:22:14"(KST, 오프셋 없음)과 "...Z"(UTC)를 섞어 씁니다.
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const pad = (value: number) => String(value).padStart(2, '0')

/** 2026-08-13T10:22:14 → "2026-08-13 10:22:14" */
export function dateTime(value: string | null | undefined): string {
  const date = parse(value)
  if (!date) return '—'
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

/** "08-13 09:40" (목록용) */
export function shortDateTime(value: string | null | undefined): string {
  const date = parse(value)
  if (!date) return '—'
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** "2026-08-13" */
export function date(value: string | null | undefined): string {
  const parsed = parse(value)
  if (!parsed) return '—'
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`
}

/** "08-13" */
export function shortDate(value: string | null | undefined): string {
  const parsed = parse(value)
  if (!parsed) return '—'
  return `${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`
}

/**
 * 마지막 로그인 — "오늘 09:12" / "어제" / "07-22".
 * 서버가 ISO 로 주므로 화면이 다듬습니다. (FE 계산)
 */
export function lastLogin(value: string | null | undefined, now = new Date()): string {
  const parsed = parse(value)
  if (!parsed) return '—'
  const days = dayDiff(parsed, now)
  if (days === 0) return `오늘 ${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`
  if (days === 1) return '어제'
  return shortDate(value)
}

function dayDiff(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime()
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime()
  return Math.round((b - a) / 86_400_000)
}

/** 131 → "2분 11초" */
export function duration(sec: number | null): string {
  if (sec === null) return '—'
  const m = Math.floor(sec / 60)
  const s = Math.round(sec % 60)
  return m > 0 ? `${m}분 ${s}초` : `${s}초`
}

/** 소요 = finishedAt − startedAt. 아직 안 끝났으면 null. (FE 계산 — 명세 §T1-3) */
export function elapsedSec(
  startedAt: string | null | undefined,
  finishedAt: string | null | undefined,
): number | null {
  const from = parse(startedAt)
  const to = parse(finishedAt)
  if (!from || !to) return null
  return Math.max(0, Math.round((to.getTime() - from.getTime()) / 1000))
}

/** "9시간" / "1일 2시간" — 접수 후 흐른 시간 */
export function humanGap(sec: number): string {
  const days = Math.floor(sec / 86_400)
  const hours = Math.floor((sec % 86_400) / 3_600)
  if (days > 0) return hours > 0 ? `${days}일 ${hours}시간` : `${days}일`
  if (hours > 0) return `${hours}시간`
  return `${Math.max(1, Math.floor(sec / 60))}분`
}

/** 문의 SLA — 2일 (기획서 §T1-9 "2일 안 답변" 약속) */
export const INQUIRY_SLA_SEC = 2 * 86_400

/**
 * 문의 경과 열. (FE 계산 — 명세: "경과는 FE가 createdAt으로 계산")
 * 답변 완료면 답변까지 걸린 시간("4시간 만에"), 그 외에는 접수 후 흐른 시간.
 */
export function inquiryElapsed(
  inquiry: { status: InquiryStatus; createdAt: string; statusChangedAt: string | null },
  now = new Date(),
): { text: string; overdue: boolean } {
  const created = parse(inquiry.createdAt)
  if (!created) return { text: '—', overdue: false }

  if (inquiry.status === 'ANSWERED') {
    const answered = parse(inquiry.statusChangedAt) ?? now
    const sec = Math.max(0, (answered.getTime() - created.getTime()) / 1000)
    return { text: `${humanGap(sec)} 만에`, overdue: sec > INQUIRY_SLA_SEC }
  }

  const sec = Math.max(0, (now.getTime() - created.getTime()) / 1000)
  // 임박(약속의 3/4 경과)부터 빨간색으로 알립니다.
  return { text: humanGap(sec), overdue: sec > INQUIRY_SLA_SEC * 0.75 }
}

/** 그래프 축 라벨 — today=시간별 "09시" / 그 외=날짜 "08-13" */
export function bucketLabel(value: string, period: 'hour' | 'day' | 'month'): string {
  const parsed = parse(value)
  if (!parsed) return value
  if (period === 'hour') return `${pad(parsed.getHours())}시`
  if (period === 'month') return `${parsed.getMonth() + 1}월`
  return `${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`
}

/**
 * 주간 막대 축 라벨 — "7월 1주 · 2주 · 3주 · 4주 · 8월 1주 · 2주".
 *
 * 달이 바뀌는 자리에만 달을 적습니다(Figma AD-T1-2 표기).
 * 한 칸씩 볼 수 없어 구간 전체를 받아 한 번에 만듭니다.
 */
export function weekLabels(buckets: string[]): string[] {
  let lastMonth: number | null = null
  return buckets.map((bucket) => {
    const parsed = parse(bucket)
    if (!parsed) return bucket
    const month = parsed.getMonth() + 1
    // 1~7일 = 1주, 8~14일 = 2주 …
    const week = Math.floor((parsed.getDate() - 1) / 7) + 1
    const label = month === lastMonth ? `${week}주` : `${month}월 ${week}주`
    lastMonth = month
    return label
  })
}

/** "2026-08" → "2026년 8월" */
export function monthLabel(month: string): string {
  const [year, mm] = month.split('-')
  return `${year}년 ${Number(mm)}월`
}

/* ─────────────── 상태 · 라벨 ─────────────── */

/**
 * 기획서 §6 "작업 상태": 목록에는 넷만 보입니다.
 * COMPLETED 인데 실패 쪽이 있으면 "부분 실패 n쪽" 입니다.
 */
export function jobStatusText(job: {
  status: JobStatus
  totalPages: number
  donePages?: number | null
  failedPages?: number | null
}): string {
  switch (job.status) {
    case 'PENDING':
      return '업로드'
    case 'IN_PROGRESS':
      // Redis 장애로 진척을 못 받으면 쪽수 없이 "변환 중" 으로만 적습니다.
      return job.donePages === null || job.donePages === undefined
        ? '변환 중'
        : `진행 중 ${job.donePages}/${job.totalPages}쪽`
    case 'COMPLETED':
      return job.failedPages ? `부분 실패 ${job.failedPages}쪽` : '완료'
    case 'FAILED':
      return '실패'
  }
}

export function jobStatusTone(job: {
  status: JobStatus
  failedPages?: number | null
}): 'info' | 'warn' | 'ok' | 'danger' {
  switch (job.status) {
    case 'PENDING':
      return 'info'
    case 'IN_PROGRESS':
      return 'warn'
    case 'COMPLETED':
      return job.failedPages ? 'danger' : 'ok'
    case 'FAILED':
      return 'danger'
  }
}

export const layoutLabel: Record<LayoutType, string> = {
  PAGE_LAYOUT_TEXT: '본문',
  PAGE_LAYOUT_TABLE: '표',
  PAGE_LAYOUT_FORMULA: '수식',
  PAGE_LAYOUT_VISUAL: '그림',
  PAGE_LAYOUT_UNSPECIFIED: '미분류',
}

/**
 * 레이아웃 원가에서 항상 자리를 지키는 네 유형.
 * 서버는 **성공 쪽만 집계**해서(명세 §layout-cost) 그 달에 안 나온 유형은 응답에서 빠집니다.
 * 그대로 그리면 달마다 줄 수가 달라져 비교가 안 되므로 빠진 유형은 0으로 채웁니다.
 */
export const COST_LAYOUTS: LayoutType[] = [
  'PAGE_LAYOUT_VISUAL',
  'PAGE_LAYOUT_TABLE',
  'PAGE_LAYOUT_FORMULA',
  'PAGE_LAYOUT_TEXT',
]

export interface LayoutCostLike {
  layoutType: LayoutType
  pages: number
  sharePct: number
  avgKrwPerPage: number
  pagesDeltaPct: number | null
}

/** 빠진 유형을 0으로 채우고 비싼 순으로 세웁니다(명세: 평균 원가 비싼 순). */
export function fillLayoutCost<T extends LayoutCostLike>(items: T[]): LayoutCostLike[] {
  const byType = new Map(items.map((item) => [item.layoutType, item as LayoutCostLike]))

  const filled: LayoutCostLike[] = COST_LAYOUTS.map(
    (layoutType) =>
      byType.get(layoutType) ?? {
        layoutType,
        pages: 0,
        sharePct: 0,
        avgKrwPerPage: 0,
        pagesDeltaPct: null,
      },
  )

  // 서버가 미분류(UNSPECIFIED) 같은 다른 유형을 주면 뒤에 붙입니다.
  const extras = items.filter((item) => !COST_LAYOUTS.includes(item.layoutType))

  return [...filled, ...extras].sort((a, b) => b.avgKrwPerPage - a.avgKrwPerPage)
}

/** T1-2 막대는 "그림·시각"처럼 조금 더 길게 적습니다. */
export const layoutLongLabel: Record<LayoutType, string> = {
  PAGE_LAYOUT_TEXT: '본문 위주',
  PAGE_LAYOUT_TABLE: '표 포함',
  PAGE_LAYOUT_FORMULA: '수식 포함',
  PAGE_LAYOUT_VISUAL: '그림·시각',
  PAGE_LAYOUT_UNSPECIFIED: '미분류',
}

/**
 * 계약 유형 (V24 개편 2026-08-18).
 * 개편 전 값(PAID·TRIAL·INTERNAL)이 아직 섞여 내려오므로 함께 적어 둡니다.
 */
export const contractTypeLabel: Record<ContractTypeValue, string> = {
  BASIC: '유료 BASIC',
  STANDARD: '유료 STANDARD',
  PREMIUM: '유료 PREMIUM',
  FREE: '무료 FREE',
  COUPON: 'COUPON',
  PAID: '유료',
  TRIAL: '체험',
  INTERNAL: '내부',
}

/** 새로 고를 때 쓰는 값 — 개편된 다섯 가지만 둡니다. */
export const CONTRACT_TYPES = ['BASIC', 'STANDARD', 'PREMIUM', 'FREE', 'COUPON'] as const

/** 유료 계약이면 초록, 무료·쿠폰이면 주황으로 구분합니다. */
export const isPaidContract = (type: ContractTypeValue) =>
  type === 'BASIC' || type === 'STANDARD' || type === 'PREMIUM' || type === 'PAID'

export const accountStatusLabel: Record<AccountStatus, string> = {
  ACTIVE: '활성',
  INACTIVE: '잠김',
}

export const inquiryTypeLabel: Record<InquiryType, string> = {
  CREDIT_ADD: '크레딧 추가',
  ACCOUNT_ISSUE: '계정 발급',
  ERROR_REPORT: '오류 신고',
  ONBOARDING: '도입 문의',
  ETC: '기타',
  EMAIL: '메일 문의',
}

export const inquiryStatusLabel: Record<InquiryStatus, string> = {
  OPEN: '미답변',
  IN_REVIEW: '확인 중',
  ANSWERED: '답변 완료',
}

export const inquiryStatusTone: Record<InquiryStatus, 'danger' | 'warn' | 'ok'> = {
  OPEN: 'danger',
  IN_REVIEW: 'warn',
  ANSWERED: 'ok',
}

export const noticeStatusLabel: Record<NoticeStatus, string> = {
  SCHEDULED: '예약',
  ACTIVE: '노출 중',
  ENDED: '종료',
}

export const noticeStatusTone: Record<NoticeStatus, 'info' | 'ok' | 'muted'> = {
  SCHEDULED: 'info',
  ACTIVE: 'ok',
  ENDED: 'muted',
}

export const modeLabel: Record<ConvertMode, string> = {
  a: 'OCR 변환',
  b: '점역 변환',
  c: '통합 변환',
}

/** 결과 파일 형식 — 명세 §결과 다운로드: mode a = .txt, b·c = .brf */
export const resultFormat = (mode: ConvertMode | null): 'BRF' | 'TXT' => (mode === 'a' ? 'TXT' : 'BRF')

/** 184320 → "180 KB" */
export function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** 브라우저에 파일 저장을 넘깁니다. */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
