import type { JobStatus, LayoutType, Won } from '@/api/types'

const nf = new Intl.NumberFormat('ko-KR')

export const number = (value: number) => nf.format(value)

/** ₩1,104,000 */
export const won = (value: Won) => `₩${nf.format(value)}`

/** 38,400원 — 그래프 라벨처럼 단위를 뒤에 붙일 때 */
export const wonSuffix = (value: Won) => `${nf.format(value)}원`

/** +18% / −4% / ±0% (기획서 표기 그대로) */
export function signedPercent(value: number): string {
  if (value === 0) return '±0%'
  return value > 0 ? `+${value}%` : `−${Math.abs(value)}%`
}

export function signedWon(value: Won): string {
  return value < 0 ? `-${nf.format(Math.abs(value))}원` : `${nf.format(value)}원`
}

/** 131 → "2분 11초" */
export function duration(sec: number | null): string {
  if (sec === null) return '—'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}분 ${s}초` : `${s}초`
}

/** 기획서 §6 "사용률 색": 50% 미만 초록 · 50~80% 주황 · 80% 이상 빨강 */
export function usageTone(rate: number): 'ok' | 'warn' | 'danger' {
  if (rate >= 80) return 'danger'
  if (rate >= 50) return 'warn'
  return 'ok'
}

/** 기획서 §6 "작업 상태": 넷으로 제한합니다. */
export function jobStatusText(job: {
  status: JobStatus
  pages: number
  processedPages?: number
  failedPages?: number
}): string {
  switch (job.status) {
    case 'uploaded':
      return '업로드'
    case 'processing':
      return `진행 중 ${job.processedPages ?? 0}/${job.pages}쪽`
    case 'done':
      return '완료'
    case 'partialFailed':
      return `부분 실패 ${job.failedPages ?? 0}쪽`
  }
}

export function jobStatusTone(status: JobStatus): 'info' | 'warn' | 'ok' | 'danger' {
  switch (status) {
    case 'uploaded':
      return 'info'
    case 'processing':
      return 'warn'
    case 'done':
      return 'ok'
    case 'partialFailed':
      return 'danger'
  }
}

export const layoutLabel: Record<LayoutType, string> = {
  text: '본문',
  table: '표',
  formula: '수식',
  image: '그림',
}

export const contractTypeLabel = {
  paid: '유료',
  trial: '체험',
  internal: '내부',
} as const

export const billingTypeLabel = {
  paid: '유료',
  coupon: '쿠폰',
  trial: '체험',
  internal: '내부',
} as const

export const accountStatusLabel = {
  active: '활성',
  locked: '잠김',
  requested: '요청 중',
} as const

/** 브라우저에 파일 저장을 넘깁니다. CSV 는 서버/목업이 UTF-8 BOM 으로 만들어 줍니다. */
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
