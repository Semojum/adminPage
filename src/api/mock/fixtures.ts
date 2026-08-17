/**
 * 기획서 V11 의 목업 값을 그대로 옮긴 데이터.
 *
 * 실제 API 가 붙으면 이 파일과 mockApi.ts 는 지워도 됩니다.
 * 화면은 이 파일을 직접 import 하지 않습니다 — 반드시 api 를 통해서만 읽습니다.
 */
import type * as T from '../types'

/**
 * 목업 로그인 계정.
 *
 * 실제 인증이 붙으면 이 목록은 사라집니다. 비밀번호는 목업 전용 문자열입니다.
 * 로그인 화면에도 목업 모드일 때만 이 목록을 안내로 띄웁니다.
 */
export interface MockAccount {
  session: T.Session
  password: string
  /** 기획서 §6: 잠긴 계정은 로그인이 막힙니다. */
  locked?: boolean
  /** 로그인 화면 안내에 적을 설명 */
  hint: string
}

export const loginAccounts: MockAccount[] = [
  {
    password: 'admin1234',
    hint: '세모점 운영자',
    session: {
      accountId: 'admin_taemin',
      displayName: 'admin_taemin',
      role: 'ROLE_ADMIN',
      orgId: null,
      orgName: null,
    },
  },
  {
    password: 'kblib1234',
    hint: '기관 관리자 · 한국점자도서관',
    session: {
      accountId: 'org_kblib01',
      displayName: 'org_kblib01',
      role: 'ROLE_ORG_ADMIN',
      orgId: 'org-kblib',
      orgName: '한국점자도서관',
    },
  },
  {
    password: 'kblib1234',
    hint: '점역사 · T3 은 이번 범위 밖',
    session: {
      accountId: 'kblib02',
      displayName: 'kblib02 · 수학 담당',
      role: 'ROLE_USER',
      orgId: 'org-kblib',
      orgName: '한국점자도서관',
    },
  },
  {
    password: 'kblib1234',
    locked: true,
    hint: '잠긴 계정 — 로그인이 막힙니다',
    session: {
      accountId: 'kblib03',
      displayName: 'kblib03',
      role: 'ROLE_USER',
      orgId: 'org-kblib',
      orgName: '한국점자도서관',
    },
  },
]

/* ─────────────── T1-1 ─────────────── */

export const statsSummary: Record<T.Period, T.StatsSummary> = {
  today: {
    jobs: { total: 18, done: 15, processing: 2, failed: 1 },
    pages: { total: 1204, previous: 1020, previousLabel: '어제', changeRate: 18 },
    hourly: [
      { label: '09시', pages: 40 },
      { label: '11시', pages: 95 },
      { label: '13시', pages: 150 },
      { label: '15시', pages: 210 },
      { label: '17시', pages: 120 },
      { label: '19시', pages: 60 },
    ],
  },
  week: {
    jobs: { total: 112, done: 98, processing: 3, failed: 11 },
    pages: { total: 7430, previous: 6820, previousLabel: '지난주', changeRate: 9 },
    hourly: [
      { label: '월', pages: 980 },
      { label: '화', pages: 1240 },
      { label: '수', pages: 1180 },
      { label: '목', pages: 1360 },
      { label: '금', pages: 1520 },
      { label: '토', pages: 720 },
      { label: '일', pages: 430 },
    ],
  },
  month: {
    jobs: { total: 486, done: 441, processing: 4, failed: 41 },
    pages: { total: 27000, previous: 24300, previousLabel: '지난달', changeRate: 11 },
    hourly: [
      { label: '1주', pages: 5900 },
      { label: '2주', pages: 6400 },
      { label: '3주', pages: 6100 },
      { label: '4주', pages: 8600 },
    ],
  },
}

export const costSummary: Record<T.Period, T.CostSummary> = {
  today: {
    series: [
      { label: '오늘', amount: 38400, emphasis: true },
      { label: '어제', amount: 34100 },
      { label: '이번 주 평균', amount: 30400 },
      { label: '지난주 평균', amount: 27900 },
    ],
    weekTotal: { amount: 212600, changeRate: 9 },
    monthTotal: { amount: 864300, pages: 27000, costPerPage: 32 },
  },
  week: {
    series: [
      { label: '이번 주', amount: 212600, emphasis: true },
      { label: '지난주', amount: 195300 },
      { label: '이번 달 주평균', amount: 201400 },
      { label: '지난달 주평균', amount: 183700 },
    ],
    weekTotal: { amount: 212600, changeRate: 9 },
    monthTotal: { amount: 864300, pages: 27000, costPerPage: 32 },
  },
  month: {
    series: [
      { label: '이번 달', amount: 864300, emphasis: true },
      { label: '지난달', amount: 778500 },
      { label: '3개월 평균', amount: 802100 },
      { label: '6개월 평균', amount: 741900 },
    ],
    weekTotal: { amount: 212600, changeRate: 9 },
    monthTotal: { amount: 864300, pages: 27000, costPerPage: 32 },
  },
}

/* ─────────────── T1-2 ─────────────── */

export const jobVolume: Record<T.Bucket, T.JobVolumePoint[]> = {
  daily: [
    { label: '08-08', done: 52, failed: 6, total: 58 },
    { label: '08-09', done: 61, failed: 4, total: 65 },
    { label: '08-10', done: 38, failed: 5, total: 43 },
    { label: '08-11', done: 70, failed: 8, total: 78 },
    { label: '08-12', done: 82, failed: 7, total: 89 },
    { label: '08-13', done: 74, failed: 9, total: 83 },
  ],
  weekly: [
    { label: '7월 1주', done: 232, failed: 38, total: 270 },
    { label: '2주', done: 262, failed: 38, total: 300 },
    { label: '3주', done: 186, failed: 24, total: 210 },
    { label: '4주', done: 312, failed: 38, total: 350 },
    { label: '8월 1주', done: 344, failed: 41, total: 385 },
    { label: '2주', done: 408, failed: 47, total: 455 },
  ],
  monthly: [
    { label: '3월', done: 820, failed: 96, total: 916 },
    { label: '4월', done: 910, failed: 104, total: 1014 },
    { label: '5월', done: 1080, failed: 121, total: 1201 },
    { label: '6월', done: 990, failed: 118, total: 1108 },
    { label: '7월', done: 1130, failed: 138, total: 1268 },
    { label: '8월', done: 752, failed: 88, total: 840 },
  ],
  all: [
    { label: '2026 상반기', done: 5140, failed: 612, total: 5752 },
    { label: '2026 하반기', done: 1882, failed: 226, total: 2108 },
  ],
}

export const layoutCost: T.LayoutCostRow[] = [
  { type: 'image', label: '그림·시각', costPerPage: 94, pages: 1600, share: 6, momChange: 12 },
  { type: 'table', label: '표 포함', costPerPage: 58, pages: 4100, share: 15, momChange: 7 },
  { type: 'formula', label: '수식 포함', costPerPage: 46, pages: 2900, share: 11, momChange: 0 },
  { type: 'text', label: '본문 위주', costPerPage: 21, pages: 18400, share: 68, momChange: -4 },
]

export const orgProfit: T.OrgProfitReport = {
  rows: [
    {
      orgId: 'org-kblib',
      orgName: '한국점자도서관',
      billingType: 'paid',
      usedCredit: 4600,
      revenue: 1104000,
      cost: 147200,
      profit: 956800,
    },
    {
      orgId: 'org-snsb',
      orgName: '서울맹학교',
      billingType: 'paid',
      usedCredit: 1870,
      revenue: 448800,
      cost: 108460,
      profit: 340340,
    },
    {
      orgId: 'org-oopub',
      orgName: 'OO출판사',
      billingType: 'coupon',
      usedCredit: 0,
      revenue: 0,
      cost: 77080,
      profit: -77080,
    },
  ],
  total: { usedCredit: 6470, revenue: 1552800, cost: 332740 },
}

/* ─────────────── T1-3 ─────────────── */

export const jobs: T.JobSummary[] = [
  {
    id: 'job-1041',
    fileName: '모의고사_국어.pdf',
    orgName: '한국점자도서관',
    pages: 8,
    durationSec: null,
    cost: null,
    status: 'uploaded',
  },
  {
    id: 'job-1042',
    fileName: '수능특강_지구과학.pdf',
    orgName: '서울맹학교',
    pages: 22,
    durationSec: null,
    cost: null,
    status: 'processing',
    processedPages: 12,
  },
  {
    id: 'job-1043',
    fileName: '수능특강_생명II.pdf',
    orgName: '한국점자도서관',
    pages: 14,
    durationSec: 131,
    cost: 448,
    status: 'partialFailed',
    failedPages: 3,
  },
  {
    id: 'job-1044',
    fileName: '중2_국어_2단원.pdf',
    orgName: '한국점자도서관',
    pages: 28,
    durationSec: 252,
    cost: 896,
    status: 'done',
  },
]

/* ─────────────── T1-4 ─────────────── */

export const jobDetails: Record<string, T.JobDetail> = {
  'job-1043': {
    id: 'job-1043',
    fileName: '수능특강_생명II.pdf',
    status: 'partialFailed',
    failedPages: 3,
    request: {
      accountId: 'kblib02',
      accountAlias: '수학 담당',
      orgName: '한국점자도서관',
      requestedAt: '2026-08-13 10:22:14',
      ip: '210.94.xxx.118',
      location: '서울',
      userAgent: 'Windows 11 · Chrome 141',
    },
    processing: {
      pages: 14,
      successPages: 11,
      failedPages: 3,
      durationSec: 131,
      secPerPage: 9.4,
      cost: 448,
      costPerPage: 32,
      credit: 11,
      layout: { text: 8, table: 3, formula: 2, image: 1 },
    },
    pageResults: [
      { range: '1~7', layout: 'text', layoutLabel: '본문', cost: 154, status: 'done', reason: null },
      {
        range: '8',
        layout: 'table',
        layoutLabel: '표',
        cost: 58,
        status: 'failed',
        reason: '표 구조 인식 60초 초과',
      },
      { range: '9~10', layout: 'formula', layoutLabel: '수식', cost: 92, status: 'done', reason: null },
      {
        range: '11 · 13',
        layout: 'image',
        layoutLabel: '그림',
        cost: 144,
        status: 'failed',
        reason: '이미지 해상도 부족',
      },
    ],
  },
  'job-1044': {
    id: 'job-1044',
    fileName: '중2_국어_2단원.pdf',
    status: 'done',
    failedPages: 0,
    request: {
      accountId: 'kblib02',
      accountAlias: '수학 담당',
      orgName: '한국점자도서관',
      requestedAt: '2026-08-12 16:41:02',
      ip: '210.94.xxx.118',
      location: '서울',
      userAgent: 'Windows 11 · Chrome 141',
    },
    processing: {
      pages: 28,
      successPages: 28,
      failedPages: 0,
      durationSec: 252,
      secPerPage: 9.0,
      cost: 896,
      costPerPage: 32,
      credit: 28,
      layout: { text: 24, table: 2, formula: 0, image: 2 },
    },
    pageResults: [
      { range: '1~24', layout: 'text', layoutLabel: '본문', cost: 528, status: 'done', reason: null },
      { range: '25~26', layout: 'table', layoutLabel: '표', cost: 116, status: 'done', reason: null },
      { range: '27~28', layout: 'image', layoutLabel: '그림', cost: 252, status: 'done', reason: null },
    ],
  },
}

/* ─────────────── T1-5 ─────────────── */

export const jobPreviews: Record<string, T.JobPreview> = {
  'job-1043': {
    jobId: 'job-1043',
    source: {
      fileName: '수능특강_생명II.pdf',
      pages: 14,
      page: 8,
      blocks: [
        { kind: 'heading', text: '3. 매질에 따른 굴절률' },
        { kind: 'paragraph', lines: 2 },
        {
          kind: 'table',
          head: ['매질', '굴절률'],
          rows: [
            ['공기', '1.00'],
            ['물', '1.33'],
          ],
        },
        { kind: 'paragraph', lines: 1 },
      ],
    },
    result: {
      fileName: '수능특강_생명II.brf',
      format: 'BRF',
      content: [
        '⠼⠉⠲⠀⠑⠗⠨⠊⠝⠀⠞⠕⠛⠮⠀⠈⠍⠨⠎⠞',
        '⠿⠛⠶⠶⠶⠶⠶⠶⠶⠶⠶⠶⠶⠶⠶⠛⠿',
        '⠿⠀⠑⠗⠨⠊⠀⠀⠈⠍⠨⠎⠞⠀⠀⠀⠿',
        '⠿⠀⠨⠕⠈⠍⠀⠀⠼⠁⠲⠚⠚⠀⠀⠿',
        '⠿⠀⠑⠥⠀⠀⠀⠼⠁⠲⠉⠉⠀⠀⠿',
        '⠿⠶⠶⠶⠶⠶⠶⠶⠶⠶⠶⠶⠶⠶⠶⠿',
      ].join('\n'),
    },
  },
}

/* ─────────────── T1-6 ─────────────── */

export const adminOrgs: T.AdminOrgRow[] = [
  {
    id: 'org-kblib',
    name: '한국점자도서관',
    code: 'kblib',
    contractType: 'paid',
    accounts: [
      {
        id: 'acc-kblib01',
        accountId: 'kblib01',
        alias: null,
        status: 'active',
        lastLoginAt: '오늘 09:12',
        monthUsage: 820,
      },
      {
        id: 'acc-kblib02',
        accountId: 'kblib02',
        alias: '수학 담당',
        status: 'active',
        lastLoginAt: '어제',
        monthUsage: 1140,
      },
    ],
    subtotal: { accountCount: 2, lastLoginAt: '오늘 09:12', monthUsage: 1960 },
  },
  {
    id: 'org-snsb',
    name: '서울맹학교',
    code: 'snsb',
    contractType: 'paid',
    accounts: [
      {
        id: 'acc-snsb01',
        accountId: 'snsb01',
        alias: null,
        status: 'active',
        lastLoginAt: '오늘 11:40',
        monthUsage: 1870,
      },
    ],
    subtotal: { accountCount: 1, lastLoginAt: '오늘 11:40', monthUsage: 1870 },
  },
]

/* ─────────────── T1-7 ─────────────── */

export const orgDetails: Record<string, T.OrgDetail> = {
  'org-kblib': {
    id: 'org-kblib',
    name: '한국점자도서관',
    code: 'kblib',
    contractType: 'paid',
    contractStart: '2026-02-24',
    contractEnd: '2026-08-24',
    accountIds: ['kblib01', 'kblib02'],
    credit: { used: 1960, total: 10000, rate: 20, expectedDepletion: '9월 중순' },
    orders: [
      { id: 'ord-1', date: '02-24', description: '연간 10,000', amount: 2400000, paidAt: '03-02' },
      { id: 'ord-2', date: '06-02', description: '추가 3,000', amount: 780000, paidAt: null },
    ],
    coupons: [
      { id: 'cpn-1', name: 'PoC 체험', credit: 1000, startAt: '08-01', endAt: '31', used: 820 },
    ],
  },
  'org-snsb': {
    id: 'org-snsb',
    name: '서울맹학교',
    code: 'snsb',
    contractType: 'paid',
    contractStart: '2026-03-02',
    contractEnd: '2027-03-01',
    accountIds: ['snsb01'],
    credit: { used: 1870, total: 6000, rate: 31, expectedDepletion: '11월 초' },
    orders: [
      { id: 'ord-3', date: '03-02', description: '연간 6,000', amount: 1440000, paidAt: '03-09' },
    ],
    coupons: [],
  },
}

/* ─────────────── T1-8 ─────────────── */

export const adminAccountDetails: Record<string, T.AdminAccountDetail> = {
  'acc-kblib02': {
    id: 'acc-kblib02',
    accountId: 'kblib02',
    alias: '수학 담당',
    orgId: 'org-kblib',
    orgName: '한국점자도서관',
    orgCode: 'kblib',
    orgCredit: { used: 1960, total: 10000, rate: 20 },
    accountCredit: { used: 1140, total: 10000, rate: 11 },
  },
  'acc-kblib01': {
    id: 'acc-kblib01',
    accountId: 'kblib01',
    alias: null,
    orgId: 'org-kblib',
    orgName: '한국점자도서관',
    orgCode: 'kblib',
    orgCredit: { used: 1960, total: 10000, rate: 20 },
    accountCredit: { used: 820, total: 10000, rate: 8 },
  },
  'acc-snsb01': {
    id: 'acc-snsb01',
    accountId: 'snsb01',
    alias: null,
    orgId: 'org-snsb',
    orgName: '서울맹학교',
    orgCode: 'snsb',
    orgCredit: { used: 1870, total: 6000, rate: 31 },
    accountCredit: { used: 1870, total: 6000, rate: 31 },
  },
}

/* ─────────────── T1-9 ─────────────── */

export const inquiries: T.Inquiry[] = [
  {
    id: 'inq-1',
    createdAt: '08-13 09:40',
    sender: { orgName: '서울맹학교', accountId: 'snsb01', unregistered: false },
    type: 'error',
    typeLabel: '오류 신고',
    status: 'unanswered',
    elapsed: { text: '9시간', overdue: true },
  },
  {
    id: 'inq-2',
    createdAt: '08-12 16:02',
    sender: { orgName: 'OO출판사', accountId: null, unregistered: true },
    type: 'sales',
    typeLabel: '도입 문의',
    status: 'checking',
    elapsed: { text: '1일 2시간', overdue: false },
  },
  {
    id: 'inq-3',
    createdAt: '08-11 11:15',
    sender: { orgName: '한국점자도서관', accountId: 'kblib01', unregistered: false },
    type: 'creditRequest',
    typeLabel: '크레딧 추가',
    status: 'answered',
    elapsed: { text: '4시간 만에', overdue: false },
  },
]

export const inquiryBodies: Record<string, { title: string; body: string }> = {
  'inq-1': {
    title: '표가 포함된 쪽에서 변환이 멈춥니다',
    body: '수능특강 지구과학 22쪽 파일을 올렸는데 12쪽에서 더 진행되지 않습니다. 확인 부탁드립니다.',
  },
  'inq-2': {
    title: '도입 절차와 견적을 알고 싶습니다',
    body: '출판사에서 점자 도서 제작을 검토 중입니다. 계약 단가와 체험 가능 여부를 알려주세요.',
  },
  'inq-3': {
    title: '크레딧 3,000 추가 요청',
    body: '하반기 물량이 늘어 크레딧 추가가 필요합니다. 견적서 발행 부탁드립니다.',
  },
}

/* ─────────────── T1-10 ─────────────── */

export const notices: T.Notice[] = [
  {
    id: 'ntc-1',
    createdAt: '08-13',
    scope: 'org',
    orgId: 'org-kblib',
    orgName: '한국점자도서관',
    title: '크레딧 소진 임박 안내',
    body: '할당 크레딧의 80%를 사용했습니다. 추가 계약이 필요하면 문의로 알려주세요.',
    startAt: '08-13',
    endAt: '08-31',
    state: 'live',
  },
  {
    id: 'ntc-2',
    createdAt: '08-12',
    scope: 'all',
    orgId: null,
    orgName: null,
    title: '8/15 새벽 서버 점검',
    body: '8월 15일 02:00~05:00 서버 점검이 있습니다. 해당 시간에는 변환이 중단됩니다.',
    startAt: '08-12',
    endAt: '08-16',
    state: 'live',
  },
  {
    id: 'ntc-3',
    createdAt: '07-30',
    scope: 'all',
    orgId: null,
    orgName: null,
    title: '7월 업데이트 안내',
    body: '표 인식 정확도가 개선되었습니다.',
    startAt: '07-30',
    endAt: '08-06',
    state: 'ended',
  },
]

/* ─────────────── T2 ─────────────── */

export const orgSummary: T.OrgSummary = {
  orgId: 'org-kblib',
  orgName: '한국점자도서관',
  credit: { used: 4600, total: 10000, rate: 46, remaining: 5400, expectedDepletion: '9월 중순' },
  contract: { startAt: '2026-02-24', endAt: '2026-08-24', daysLeft: 11 },
}

export const orgMonthlyUsage: T.OrgMonthlyUsage = {
  points: [
    { label: '3월', credit: 2100 },
    { label: '4월', credit: 2600 },
    { label: '5월', credit: 3100 },
    { label: '6월', credit: 2800 },
    { label: '7월', credit: 3900 },
    { label: '8월', credit: 4600 },
  ],
  average: 3183,
}

export const orgNotices: T.OrgNotice[] = [
  {
    id: 'ntc-1',
    receivedAt: '08-13',
    scope: 'org',
    title: '크레딧 소진 임박 안내',
    body: '할당 크레딧의 80%를 사용했습니다. 추가 계약이 필요하면 문의로 알려주세요.',
  },
  {
    id: 'ntc-2',
    receivedAt: '08-12',
    scope: 'all',
    title: '8/15 새벽 서버 점검',
    body: '8월 15일 02:00~05:00 서버 점검이 있습니다. 해당 시간에는 변환이 중단됩니다.',
  },
]

export const orgAccounts: T.OrgAccountRow[] = [
  {
    id: 'acc-kblib01',
    accountId: 'kblib01',
    alias: '관리자',
    status: 'active',
    lastLoginAt: '오늘 09:12',
    usage: 820,
    requestedAt: null,
    self: true,
    orgAdmin: true,
  },
  {
    id: 'acc-kblib02',
    accountId: 'kblib02',
    alias: '수학 담당',
    status: 'active',
    lastLoginAt: '어제',
    usage: 1140,
    requestedAt: null,
    self: false,
    orgAdmin: false,
  },
  {
    id: 'acc-kblib03',
    accountId: 'kblib03',
    alias: null,
    status: 'locked',
    lastLoginAt: '07-22',
    usage: 0,
    requestedAt: null,
    self: false,
    orgAdmin: false,
  },
  {
    id: 'req-1',
    accountId: null,
    alias: '국어 담당',
    status: 'requested',
    lastLoginAt: null,
    usage: null,
    requestedAt: '08-12 요청',
    self: false,
    orgAdmin: false,
  },
]

export const orgOrders: T.OrgOrderList = {
  items: [
    {
      id: 'ord-1',
      date: '2026-02-24',
      description: '연간 계약 · 10,000 크레딧',
      amount: 2400000,
      payment: 'paid',
      invoice: 'issued',
      receiptUrl: '#',
    },
    {
      id: 'ord-2',
      date: '2026-06-02',
      description: '크레딧 추가 · 3,000',
      amount: 780000,
      payment: 'unpaid',
      invoice: 'pending',
      receiptUrl: null,
    },
  ],
  billingEmail: 'account@kblib.or.kr',
}

/* ─────────────── T2-2 ─────────────── */

export const orgAccountDetails: Record<string, T.OrgAccountDetail> = {
  'acc-kblib02': {
    id: 'acc-kblib02',
    accountId: 'kblib02',
    alias: '수학 담당',
    orgName: '한국점자도서관',
    credit: { used: 1140, total: 10000, rate: 11 },
    range: { from: '2026-07-01', to: '2026-08-13' },
    jobs: [
      {
        id: 'job-1043',
        fileName: '수능특강_생명II.pdf',
        status: 'partialFailed',
        failedPages: 3,
        pages: 14,
        credit: 11,
        completedAt: '08-13',
      },
      {
        id: 'job-1044',
        fileName: '중2_국어_2단원.pdf',
        status: 'done',
        pages: 28,
        credit: 28,
        completedAt: '08-12',
      },
      {
        id: 'job-1045',
        fileName: '모의고사_수학.pdf',
        status: 'processing',
        processedPages: 20,
        pages: 36,
        credit: null,
        completedAt: null,
      },
    ],
    total: { pages: 78, credit: 39 },
  },
  'acc-kblib01': {
    id: 'acc-kblib01',
    accountId: 'kblib01',
    alias: '관리자',
    orgName: '한국점자도서관',
    credit: { used: 820, total: 10000, rate: 8 },
    range: { from: '2026-07-01', to: '2026-08-13' },
    jobs: [
      {
        id: 'job-1041',
        fileName: '모의고사_국어.pdf',
        status: 'uploaded',
        pages: 8,
        credit: null,
        completedAt: null,
      },
    ],
    total: { pages: 8, credit: 0 },
  },
  'acc-kblib03': {
    id: 'acc-kblib03',
    accountId: 'kblib03',
    alias: null,
    orgName: '한국점자도서관',
    credit: { used: 0, total: 10000, rate: 0 },
    range: { from: '2026-07-01', to: '2026-08-13' },
    jobs: [],
    total: { pages: 0, credit: 0 },
  },
}
