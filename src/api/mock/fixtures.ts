/**
 * 목업 값 — Figma `AD-T1-*` · `V3-06` 프레임에 그려진 숫자를 그대로 옮겼습니다.
 *
 * 실제 서버가 붙으면(VITE_API_SOURCE=http) 이 파일과 mockApi.ts 는 쓰이지 않습니다.
 * 화면은 이 파일을 직접 import 하지 않습니다 — 반드시 api 를 통해서만 읽습니다.
 */
import type * as T from '../types'

/* ─────────────── 시간 helper ─────────────── */
/* "오늘 09:12" · "어제" 같은 표기가 목업에서도 살아 있도록 오늘을 기준으로 만듭니다. */

const now = new Date()

const pad = (value: number) => String(value).padStart(2, '0')

/** 로컬 시각을 오프셋 없는 ISO 로 — 서버가 KST 를 그렇게 내려줍니다. */
function iso(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function at(daysAgo: number, hour: number, minute: number, second = 0): string {
  const date = new Date(now)
  date.setDate(date.getDate() - daysAgo)
  date.setHours(hour, minute, second, 0)
  return iso(date)
}

function hoursAgo(hours: number): string {
  return iso(new Date(now.getTime() - hours * 3_600_000))
}

const today = new Date(now)
export const THIS_MONTH = `${today.getFullYear()}-${pad(today.getMonth() + 1)}`

/* ─────────────── 로그인 계정 ─────────────── */

export interface MockAccount {
  loginId: string
  password: string
  role: T.Role
  /** INACTIVE 계정은 AUTH4004 로 막힙니다. */
  status: T.AccountStatus
  /** 로그인 화면 안내에 적을 설명 */
  hint: string
}

export const loginAccounts: MockAccount[] = [
  { loginId: 'admin01', password: 'admin1234', role: 'ROLE_ADMIN', status: 'ACTIVE', hint: '세모점 운영자 · T1 콘솔' },
  { loginId: 'kblib01', password: 'kblib1234', role: 'ROLE_ORG_ADMIN', status: 'ACTIVE', hint: '기관 관리자 · 한국점자도서관 (T2)' },
  { loginId: 'kblib02', password: 'kblib1234', role: 'ROLE_USER', status: 'ACTIVE', hint: '점역사 · T3 사용량(이번 범위 밖)' },
]

/* ─────────────── T1-1 · 통계 ─────────────── */

const HOURLY = [
  [9, 40],
  [11, 95],
  [13, 150],
  [15, 210],
  [17, 120],
  [19, 60],
] as const

export const statsOverview: Record<T.Period, T.StatsOverview> = {
  today: {
    period: 'today',
    from: at(0, 0, 0),
    to: iso(now),
    jobs: { total: 18, completed: 15, inProgress: 2, failed: 1 },
    pagesProcessed: 1204,
    prevPagesProcessed: 1020,
    series: HOURLY.map(([hour, pages]) => ({ bucket: at(0, hour, 0), pages })),
    cost: {
      todayKrw: 38_400,
      yesterdayKrw: 34_100,
      thisWeekDailyAvgKrw: 30_400,
      lastWeekDailyAvgKrw: 27_900,
      thisWeekTotalKrw: 212_600,
      thisMonthTotalKrw: 864_300,
      thisMonthPages: 27_000,
      krwPerPage: 32,
      uncertain: false,
    },
  },
  week: {
    period: 'week',
    from: at(6, 0, 0),
    to: iso(now),
    jobs: { total: 96, completed: 88, inProgress: 2, failed: 6 },
    pagesProcessed: 6_640,
    prevPagesProcessed: 6_090,
    series: [6, 5, 4, 3, 2, 1, 0].map((daysAgo, index) => ({
      bucket: at(daysAgo, 0, 0),
      pages: [820, 1_140, 980, 1_260, 900, 1_100, 440][index],
    })),
    cost: {
      todayKrw: 38_400,
      yesterdayKrw: 34_100,
      thisWeekDailyAvgKrw: 30_400,
      lastWeekDailyAvgKrw: 27_900,
      thisWeekTotalKrw: 212_600,
      thisMonthTotalKrw: 864_300,
      thisMonthPages: 27_000,
      krwPerPage: 32,
      uncertain: false,
    },
  },
  month: {
    period: 'month',
    from: at(29, 0, 0),
    to: iso(now),
    jobs: { total: 412, completed: 386, inProgress: 2, failed: 24 },
    pagesProcessed: 27_000,
    prevPagesProcessed: 24_300,
    series: Array.from({ length: 14 }, (_, index) => ({
      bucket: at(13 - index, 0, 0),
      pages: [780, 910, 1_040, 860, 1_180, 990, 1_240, 1_020, 1_160, 880, 1_300, 1_050, 1_120, 1_204][index],
    })),
    cost: {
      todayKrw: 38_400,
      yesterdayKrw: 34_100,
      thisWeekDailyAvgKrw: 30_400,
      lastWeekDailyAvgKrw: 27_900,
      thisWeekTotalKrw: 212_600,
      thisMonthTotalKrw: 864_300,
      thisMonthPages: 27_000,
      krwPerPage: 32,
      uncertain: false,
    },
  },
}

/* ─────────────── T1-2 · 상세 통계 ─────────────── */

const WEEKLY = [
  [258, 12],
  [288, 12],
  [202, 8],
  [338, 12],
  [373, 12],
  [443, 12],
] as const

export const workload: Record<T.Bucket, T.Workload> = {
  daily: {
    unit: 'daily',
    buckets: Array.from({ length: 14 }, (_, index) => ({
      bucket: at(13 - index, 0, 0),
      completed: [38, 42, 51, 40, 55, 47, 60, 49, 58, 41, 62, 50, 54, 57][index],
      failedOrCanceled: [2, 1, 3, 2, 1, 2, 4, 1, 2, 1, 3, 2, 1, 2][index],
    })),
  },
  weekly: {
    unit: 'weekly',
    buckets: WEEKLY.map(([completed, failedOrCanceled], index) => ({
      bucket: at((5 - index) * 7, 0, 0),
      completed,
      failedOrCanceled,
    })),
  },
  monthly: {
    unit: 'monthly',
    buckets: Array.from({ length: 6 }, (_, index) => {
      const date = new Date(today.getFullYear(), today.getMonth() - (5 - index), 1)
      return {
        bucket: iso(date),
        completed: [880, 940, 1_010, 960, 1_180, 1_240][index],
        failedOrCanceled: [40, 32, 45, 38, 52, 48][index],
      }
    }),
  },
  all: {
    unit: 'all',
    buckets: Array.from({ length: 9 }, (_, index) => {
      const date = new Date(today.getFullYear(), today.getMonth() - (8 - index), 1)
      return {
        bucket: iso(date),
        completed: [420, 610, 780, 880, 940, 1_010, 960, 1_180, 1_240][index],
        failedOrCanceled: [30, 28, 36, 40, 32, 45, 38, 52, 48][index],
      }
    }),
  },
}

export const layoutCost: T.LayoutCostReport = {
  month: THIS_MONTH,
  items: [
    { layoutType: 'PAGE_LAYOUT_VISUAL', pages: 1_600, sharePct: 6, avgKrwPerPage: 94, pagesDeltaPct: 12 },
    { layoutType: 'PAGE_LAYOUT_TABLE', pages: 4_100, sharePct: 15, avgKrwPerPage: 58, pagesDeltaPct: 7 },
    { layoutType: 'PAGE_LAYOUT_FORMULA', pages: 2_900, sharePct: 11, avgKrwPerPage: 46, pagesDeltaPct: 0 },
    { layoutType: 'PAGE_LAYOUT_TEXT', pages: 18_400, sharePct: 68, avgKrwPerPage: 21, pagesDeltaPct: -4 },
  ],
}

export const profitability: T.ProfitReport = {
  month: THIS_MONTH,
  // 실제 단가는 GET /api/admin/pricing 의 creditPricesByContract 가 정본입니다.
  creditPricesByContract: { BASIC: 240, STANDARD: 150, PREMIUM: 120, FREE: 0, COUPON: 0 },
  items: [
    {
      orgId: 'org-kblib',
      orgName: '한국점자도서관',
      contractType: 'BASIC',
      appliedPriceKrw: 240,
      creditsUsed: 4_600,
      revenueKrw: 1_104_000,
      costKrw: 147_200,
      marginKrw: 956_800,
      costUncertain: false,
    },
    {
      orgId: 'org-snsb',
      orgName: '서울맹학교',
      contractType: 'BASIC',
      appliedPriceKrw: 240,
      creditsUsed: 1_870,
      revenueKrw: 448_800,
      costKrw: 108_460,
      marginKrw: 340_340,
      costUncertain: false,
    },
    {
      orgId: 'org-pub',
      orgName: 'OO출판사',
      contractType: 'COUPON',
      appliedPriceKrw: 0,
      creditsUsed: 0,
      revenueKrw: 0,
      costKrw: 77_080,
      marginKrw: -77_080,
      costUncertain: false,
    },
  ],
  totals: { creditsUsed: 6_470, revenueKrw: 1_552_800, costKrw: 332_740, marginKrw: 1_220_060 },
}

/* ─────────────── T1-3 · 실시간 모니터링 ─────────────── */

export const jobs: T.JobSummary[] = [
  {
    jobId: 'job-4001',
    fileName: '모의고사_국어.pdf',
    orgName: '한국점자도서관',
    loginId: 'kblib01',
    mode: 'c',
    status: 'PENDING',
    totalPages: 8,
    donePages: null,
    failedPages: null,
    costKrw: null,
    costUncertain: false,
    startedAt: hoursAgo(0.1),
    finishedAt: null,
  },
  {
    jobId: 'job-4002',
    fileName: '수능특강_지구과학.pdf',
    orgName: '서울맹학교',
    loginId: 'snsb01',
    mode: 'c',
    status: 'IN_PROGRESS',
    totalPages: 22,
    donePages: 12,
    failedPages: null,
    costKrw: null,
    costUncertain: false,
    startedAt: hoursAgo(0.3),
    finishedAt: null,
  },
  {
    jobId: 'job-4003',
    fileName: '수능특강_생명II.pdf',
    orgName: '한국점자도서관',
    loginId: 'kblib02',
    mode: 'c',
    status: 'COMPLETED',
    totalPages: 14,
    donePages: null,
    failedPages: 3,
    costKrw: 448,
    costUncertain: false,
    startedAt: at(0, 10, 22, 14),
    finishedAt: at(0, 10, 24, 25),
  },
  {
    jobId: 'job-4004',
    fileName: '중2_국어_2단원.pdf',
    orgName: '한국점자도서관',
    loginId: 'kblib02',
    mode: 'b',
    status: 'COMPLETED',
    totalPages: 28,
    donePages: null,
    failedPages: null,
    costKrw: 896,
    costUncertain: false,
    startedAt: at(1, 16, 58, 0),
    finishedAt: at(1, 17, 2, 12),
  },
]

/* ─────────────── T1-4 · 작업 상세 ─────────────── */

/** 쪽별 결과는 서버가 쪽 단위로 줍니다. "1~7" 처럼 묶어 보이는 것은 화면이 합친 결과입니다. */
function pageResults(): T.JobPageResult[] {
  const rows: T.JobPageResult[] = []
  const push = (
    pageNo: number,
    layoutType: T.LayoutType,
    costKrw: number,
    failedReason?: string,
  ) => {
    rows.push({
      pageNo,
      status: failedReason ? 'BLOCKED' : 'COMPLETED',
      layoutType,
      costKrw,
      credit: failedReason ? null : 1,
      reasons: failedReason ? [failedReason] : [],
    })
  }

  for (let page = 1; page <= 7; page += 1) push(page, 'PAGE_LAYOUT_TEXT', 20)
  push(8, 'PAGE_LAYOUT_TABLE', 42, '표 구조 인식 60초 초과')
  push(9, 'PAGE_LAYOUT_FORMULA', 46)
  push(10, 'PAGE_LAYOUT_FORMULA', 46)
  push(11, 'PAGE_LAYOUT_VISUAL', 70, '이미지 해상도 부족')
  push(12, 'PAGE_LAYOUT_TABLE', 42)
  push(13, 'PAGE_LAYOUT_TABLE', 42, '표 구조 인식 60초 초과')
  push(14, 'PAGE_LAYOUT_TEXT', 20)
  return rows
}

export const jobDetails: Record<string, T.JobDetail> = {
  'job-4003': {
    jobId: 'job-4003',
    fileName: '수능특강_생명II.pdf',
    mode: 'c',
    status: 'COMPLETED',
    request: {
      loginId: 'kblib02',
      alias: '수학 담당',
      orgName: '한국점자도서관',
      requestedAt: at(0, 10, 22, 14),
      clientIp: '211.198.114.11',
      clientOs: 'Windows 11',
      clientBrowser: 'Chrome 141',
      clientUserAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
    },
    processing: {
      totalPages: 14,
      successPages: 11,
      failedPages: 3,
      startedAt: at(0, 10, 22, 14),
      finishedAt: at(0, 10, 24, 25),
      costKrw: 448,
      llmCostUsd: 0.28,
      gpuCostUsd: 0.04,
      costUncertain: false,
      credits: 11,
      layoutCounts: {
        PAGE_LAYOUT_TEXT: 8,
        PAGE_LAYOUT_TABLE: 3,
        PAGE_LAYOUT_FORMULA: 2,
        PAGE_LAYOUT_VISUAL: 1,
      },
    },
    pages: pageResults(),
  },
}

/* ─────────────── T1-5 · 변환 결과 미리보기 ─────────────── */

const BRAILLE = [
  '⠼⠉⠲⠀⠑⠗⠨⠊⠝⠀⠞⠕⠛⠮⠀⠈⠍⠨⠎⠞',
  '⠿⠛⠶⠶⠶⠶⠶⠶⠶⠶⠶⠶⠶⠶⠶⠛⠿',
  '⠿⠀⠑⠗⠨⠊⠀⠀⠈⠍⠨⠎⠞⠀⠀⠀⠿',
  '⠿⠀⠨⠕⠈⠍⠀⠀⠼⠁⠲⠚⠚⠀⠀⠿',
  '⠿⠀⠑⠥⠀⠀⠀⠼⠁⠲⠉⠉⠀⠀⠿',
  '⠿⠶⠶⠶⠶⠶⠶⠶⠶⠶⠶⠶⠶⠶⠶⠿',
]

const SOURCE_LINES = [
  '3. 매질에 따른 굴절률',
  '',
  '┌────────┬────────┐',
  '│  매질  │ 굴절률 │',
  '├────────┼────────┤',
  '│  공기  │  1.00  │',
  '│   물   │  1.33  │',
  '└────────┴────────┘',
]

/** 목업에는 S3 원본이 없어 원본을 글줄로 대신합니다(실제 a·c 모드는 presigned PDF). */
export const jobPage: T.JobPageView = {
  jobId: 'job-4003',
  mode: 'c',
  status: 'COMPLETED',
  totalPages: 14,
  originalFileName: '수능특강_생명II.pdf',
  pageNo: 8,
  result: {
    braille_text_list: BRAILLE.map((contents, index) => ({ id: index + 1, contents })),
  },
  original: { type: 'text', url: null, lines: SOURCE_LINES },
}

/* ─────────────── T1-6 · 기관 · 계정 ─────────────── */

export const adminOrgs: T.AdminOrgRow[] = [
  {
    orgId: 'org-kblib',
    name: '한국점자도서관',
    code: 'kblib',
    contractType: 'BASIC',
    accounts: [
      {
        loginId: 'kblib01',
        alias: '관리자',
        role: 'ROLE_ORG_ADMIN',
        status: 'ACTIVE',
        lastLoginAt: at(0, 9, 12),
        monthCredits: 820,
      },
      {
        loginId: 'kblib02',
        alias: '수학 담당',
        role: 'ROLE_USER',
        status: 'ACTIVE',
        lastLoginAt: at(1, 14, 5),
        monthCredits: 1_140,
      },
    ],
    subtotal: { accountCount: 2, monthCredits: 1_960, adminLastLoginAt: at(0, 9, 12) },
  },
  {
    orgId: 'org-snsb',
    name: '서울맹학교',
    code: 'snsb',
    contractType: 'STANDARD',
    accounts: [
      {
        loginId: 'snsb01',
        alias: '관리자',
        role: 'ROLE_ORG_ADMIN',
        status: 'ACTIVE',
        lastLoginAt: at(0, 11, 40),
        monthCredits: 1_870,
      },
    ],
    subtotal: { accountCount: 1, monthCredits: 1_870, adminLastLoginAt: at(0, 11, 40) },
  },
  {
    orgId: 'org-pub',
    name: 'OO출판사',
    code: 'oopub',
    contractType: 'COUPON',
    accounts: [
      {
        loginId: 'oopub01',
        alias: null,
        role: 'ROLE_ORG_ADMIN',
        status: 'INACTIVE',
        lastLoginAt: at(28, 15, 10),
        monthCredits: 0,
      },
    ],
    subtotal: { accountCount: 1, monthCredits: 0, adminLastLoginAt: at(28, 15, 10) },
  },
]

/* ─────────────── T1-7 · 기관 정보 ─────────────── */

export const orgDetails: Record<string, T.OrgDetail> = {
  'org-kblib': {
    orgId: 'org-kblib',
    name: '한국점자도서관',
    code: 'kblib',
    contractType: 'BASIC',
    contractStartedAt: '2026-02-24',
    contractExpiresAt: '2026-08-24',
    creditAllocated: 10_000,
    creditUsed: 1_960,
    creditRemaining: 8_040,
    receiptEmail: 'account@kblib.or.kr',
    accounts: [
      { loginId: 'kblib01', alias: '관리자', role: 'ROLE_ORG_ADMIN', status: 'ACTIVE' },
      { loginId: 'kblib02', alias: '수학 담당', role: 'ROLE_USER', status: 'ACTIVE' },
    ],
  },
  'org-snsb': {
    orgId: 'org-snsb',
    name: '서울맹학교',
    code: 'snsb',
    contractType: 'STANDARD',
    contractStartedAt: '2026-03-02',
    contractExpiresAt: '2027-03-01',
    creditAllocated: 6_000,
    creditUsed: 1_870,
    creditRemaining: 4_130,
    receiptEmail: null,
    accounts: [{ loginId: 'snsb01', alias: '관리자', role: 'ROLE_ORG_ADMIN', status: 'ACTIVE' }],
  },
  'org-pub': {
    orgId: 'org-pub',
    name: 'OO출판사',
    code: 'oopub',
    contractType: 'COUPON',
    contractStartedAt: '2026-08-01',
    contractExpiresAt: '2026-08-31',
    creditAllocated: 0,
    creditUsed: 0,
    creditRemaining: 0,
    receiptEmail: null,
    accounts: [{ loginId: 'oopub01', alias: null, role: 'ROLE_ORG_ADMIN', status: 'INACTIVE' }],
  },
}

export const coupons: Record<string, T.Coupon[]> = {
  'org-kblib': [
    {
      id: 'coupon-1',
      name: 'PoC 체험',
      creditAmount: 1_000,
      used: 820,
      remaining: 180,
      startsOn: `${THIS_MONTH}-01`,
      endsOn: `${THIS_MONTH}-31`,
      displayStatus: 'ACTIVE',
    },
  ],
  'org-snsb': [],
  'org-pub': [
    {
      id: 'coupon-2',
      name: '도입 검토용',
      creditAmount: 500,
      used: 500,
      remaining: 0,
      startsOn: `${THIS_MONTH}-01`,
      endsOn: `${THIS_MONTH}-31`,
      displayStatus: 'EXHAUSTED',
    },
  ],
}

export const orders: T.Order[] = [
  {
    id: 'order-1',
    organizationId: 'org-kblib',
    orgName: '한국점자도서관',
    orderDate: '2026-02-24',
    description: '연간 계약 · 10,000 크레딧',
    amountKrw: 2_400_000,
    creditAmount: 10_000,
    paidAt: '2026-03-02',
    invoiceStatus: 'ISSUED',
    receiptFileName: '계산서_2월.pdf',
  },
  {
    id: 'order-2',
    organizationId: 'org-kblib',
    orgName: '한국점자도서관',
    orderDate: '2026-06-02',
    description: '크레딧 추가 · 3,000',
    amountKrw: 780_000,
    creditAmount: 3_000,
    paidAt: null,
    invoiceStatus: 'PENDING',
    receiptFileName: null,
  },
  {
    id: 'order-3',
    organizationId: 'org-snsb',
    orgName: '서울맹학교',
    orderDate: '2026-03-02',
    description: '연간 계약 · 6,000 크레딧',
    amountKrw: 1_440_000,
    creditAmount: 6_000,
    paidAt: '2026-03-05',
    invoiceStatus: 'ISSUED',
    receiptFileName: null,
  },
]

/* ─────────────── T1-9 · 문의 ─────────────── */

export const inquiries: T.Inquiry[] = [
  {
    id: 'inq-1',
    type: 'ERROR_REPORT',
    status: 'OPEN',
    orgName: '서울맹학교',
    loginId: 'snsb01',
    message: '표가 들어간 쪽에서 변환이 자꾸 실패합니다. 확인 부탁드립니다.',
    senderEmail: null,
    subject: null,
    createdAt: hoursAgo(9),
    statusChangedAt: null,
  },
  {
    id: 'inq-2',
    type: 'ONBOARDING',
    status: 'IN_REVIEW',
    orgName: null,
    loginId: null,
    message: '점자 교재 제작 도입을 검토 중입니다. 견적을 받아볼 수 있을까요?',
    senderEmail: 'contact@oopub.co.kr',
    subject: 'OO출판사',
    createdAt: hoursAgo(26),
    statusChangedAt: hoursAgo(20),
  },
  {
    id: 'inq-4',
    type: 'EMAIL',
    status: 'OPEN',
    orgName: null,
    loginId: null,
    // 명세 §문의: 메일은 text/plain 이 없으면 HTML 원문이 그대로 옵니다.
    message:
      '<html><head><style>p{color:#333}</style></head><body><p>안녕하세요, 세모점 담당자님</p>' +
      '<p>지난주에 보낸 교재 파일이 <b>표 부분</b>에서 계속 실패합니다.<br/>확인 부탁드립니다.</p>' +
      '<table><tr><td>파일명</td><td>수능특강_생명II.pdf</td></tr><tr><td>쪽</td><td>8쪽</td></tr></table>' +
      '<p>감사합니다.</p></body></html>',
    senderEmail: 'teacher@snsb.sc.kr',
    subject: '표 변환 실패 문의',
    createdAt: hoursAgo(30),
    statusChangedAt: null,
  },
  {
    id: 'inq-3',
    type: 'CREDIT_ADD',
    status: 'ANSWERED',
    orgName: '한국점자도서관',
    loginId: 'kblib01',
    message: '3,000 크레딧 추가 요청드립니다.',
    senderEmail: null,
    subject: null,
    createdAt: hoursAgo(52),
    statusChangedAt: hoursAgo(48),
  },
]

/* ─────────────── T1-10 · 공지 ─────────────── */

export const notices: T.Notice[] = [
  {
    id: 'notice-1',
    targetOrganizationId: 'org-kblib',
    targetOrgName: '한국점자도서관',
    title: '크레딧 소진 임박 안내',
    body: '이번 달 사용량이 빨라 9월 중순 소진이 예상됩니다. 추가 크레딧이 필요하면 알려 주세요.',
    startsOn: at(1, 0, 0).slice(0, 10),
    endsOn: at(-6, 0, 0).slice(0, 10),
    displayStatus: 'ACTIVE',
    createdAt: at(1, 9, 0),
  },
  {
    id: 'notice-2',
    targetOrganizationId: null,
    targetOrgName: null,
    title: '8/15 새벽 서버 점검',
    body: '02:00~03:00 점검으로 서비스가 잠시 중단됩니다.',
    startsOn: at(2, 0, 0).slice(0, 10),
    endsOn: at(-4, 0, 0).slice(0, 10),
    displayStatus: 'ACTIVE',
    createdAt: at(2, 11, 0),
  },
  {
    id: 'notice-3',
    targetOrganizationId: null,
    targetOrgName: null,
    title: '7월 업데이트 안내',
    body: '표 인식 정확도를 개선했습니다.',
    startsOn: at(30, 0, 0).slice(0, 10),
    endsOn: at(23, 0, 0).slice(0, 10),
    displayStatus: 'ENDED',
    createdAt: at(30, 10, 0),
  },
]

/* ─────────────── T2 · 기관 관리 ─────────────── */

export const orgDashboard: T.OrgDashboard = {
  orgName: '한국점자도서관',
  orgCode: 'kblib',
  contractType: 'BASIC',
  contractStartedAt: '2026-02-24',
  contractExpiresAt: '2026-08-24',
  creditAllocated: 10_000,
  creditUsed: 4_600,
  creditRemaining: 5_400,
  monthlyUsage: Array.from({ length: 6 }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() - (5 - index), 1)
    return {
      month: `${date.getFullYear()}-${pad(date.getMonth() + 1)}`,
      credits: [2_100, 2_600, 3_100, 2_800, 3_900, 4_600][index],
    }
  }),
}

export const orgAccounts: T.OrgAccountRow[] = [
  {
    loginId: 'kblib01',
    alias: '관리자',
    status: 'ACTIVE',
    role: 'ROLE_ORG_ADMIN',
    lastLoginAt: at(0, 9, 12),
    monthCredits: 820,
    self: true,
  },
  {
    loginId: 'kblib02',
    alias: '수학 담당',
    status: 'ACTIVE',
    role: 'ROLE_USER',
    lastLoginAt: at(1, 14, 5),
    monthCredits: 1_140,
    self: false,
  },
  {
    loginId: 'kblib03',
    alias: null,
    status: 'INACTIVE',
    role: 'ROLE_USER',
    lastLoginAt: at(22, 10, 30),
    monthCredits: 0,
    self: false,
  },
]

export const orgRequests: T.OrgRequest[] = [
  {
    id: 'req-1',
    type: 'ACCOUNT_ISSUE',
    status: 'OPEN',
    message: '국어 담당 계정 1개 발급 요청드립니다.',
    createdAt: at(7, 10, 20),
  },
]

export const orgNotices: T.OrgNotice[] = [
  {
    id: 'notice-1',
    scope: 'ORG',
    title: '크레딧 소진 임박 안내',
    body: '이번 달 사용량이 빨라 9월 중순 소진이 예상됩니다. 추가 크레딧이 필요하면 알려 주세요.',
    startsOn: at(1, 0, 0).slice(0, 10),
    endsOn: at(-6, 0, 0).slice(0, 10),
    createdAt: at(1, 9, 0),
  },
  {
    id: 'notice-2',
    scope: 'ALL',
    title: '8/15 새벽 서버 점검',
    body: '02:00~03:00 점검으로 서비스가 잠시 중단됩니다.',
    startsOn: at(2, 0, 0).slice(0, 10),
    endsOn: at(-4, 0, 0).slice(0, 10),
    createdAt: at(2, 11, 0),
  },
]

/* ─────────────── T2-2 · 계정 상세 ─────────────── */

export const orgAccountJobs: Record<string, T.OrgAccountJobs> = {
  kblib02: {
    loginId: 'kblib02',
    alias: '수학 담당',
    from: at(43, 0, 0).slice(0, 10),
    to: at(0, 0, 0).slice(0, 10),
    items: [
      {
        jobId: 'job-4003',
        fileName: '수능특강_생명II.pdf',
        mode: 'c',
        status: 'COMPLETED',
        totalPages: 14,
        donePages: null,
        failedPages: 3,
        credits: 11,
        startedAt: at(0, 10, 22, 14),
        finishedAt: at(0, 10, 24, 25),
      },
      {
        jobId: 'job-4004',
        fileName: '중2_국어_2단원.pdf',
        mode: 'b',
        status: 'COMPLETED',
        totalPages: 28,
        donePages: null,
        failedPages: null,
        credits: 28,
        startedAt: at(1, 16, 58),
        finishedAt: at(1, 17, 2, 12),
      },
      {
        jobId: 'job-4005',
        fileName: '모의고사_수학.pdf',
        mode: 'c',
        status: 'IN_PROGRESS',
        totalPages: 36,
        donePages: 20,
        failedPages: null,
        credits: null,
        startedAt: hoursAgo(0.4),
        finishedAt: null,
      },
    ],
    totalPages: 78,
    totalCredits: 39,
  },
}
