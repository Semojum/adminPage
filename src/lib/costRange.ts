import type { LayoutCostReport, ProfitReport, ProfitRow } from '@/api/types'
import { COST_LAYOUTS, fillLayoutCost, type LayoutCostLike } from '@/lib/format'

/**
 * 원가를 기간으로 보기.
 *
 * 원가 API 는 month=YYYY-MM 로 **한 달씩만** 받습니다(명세 §layout-cost · §profitability).
 * 그래서 고른 달들을 각각 부른 뒤 여기서 합칩니다. 합치는 규칙은 값마다 다릅니다 —
 * 쪽수·크레딧·금액은 더하고, 쪽당 평균 원가는 쪽수로 가중평균을 냅니다.
 */

/** '2026-06' ~ '2026-08' → ['2026-06','2026-07','2026-08'] (최대 24개월) */
export function monthsBetween(from: string, to: string, limit = 24): string[] {
  const start = toIndex(from)
  const end = toIndex(to)
  if (start === null || end === null || end < start) return []
  const months: string[] = []
  for (let index = start; index <= end && months.length < limit; index += 1) {
    months.push(fromIndex(index))
  }
  return months
}

function toIndex(month: string): number | null {
  const [year, mm] = month.split('-').map(Number)
  if (!year || !mm) return null
  return year * 12 + (mm - 1)
}

function fromIndex(index: number): string {
  const year = Math.floor(index / 12)
  const month = (index % 12) + 1
  return `${year}-${String(month).padStart(2, '0')}`
}

/** 최근 count 개월 (이번 달 포함), 최신이 앞 */
export function recentMonths(count = 12): string[] {
  const now = new Date()
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  })
}

/* ─────────── 레이아웃 유형별 ─────────── */

export function mergeLayoutCost(reports: LayoutCostReport[]): LayoutCostLike[] {
  const pages = new Map<string, number>()
  // 쪽당 평균은 그냥 더하면 안 됩니다 — 쪽수로 가중해 합칩니다.
  const cost = new Map<string, number>()

  for (const report of reports) {
    for (const item of report.items) {
      pages.set(item.layoutType, (pages.get(item.layoutType) ?? 0) + item.pages)
      cost.set(item.layoutType, (cost.get(item.layoutType) ?? 0) + item.pages * item.avgKrwPerPage)
    }
  }

  const totalPages = [...pages.values()].reduce((sum, value) => sum + value, 0)

  const merged: LayoutCostLike[] = COST_LAYOUTS.map((layoutType) => {
    const layoutPages = pages.get(layoutType) ?? 0
    return {
      layoutType,
      pages: layoutPages,
      sharePct: totalPages > 0 ? (layoutPages / totalPages) * 100 : 0,
      avgKrwPerPage: layoutPages > 0 ? (cost.get(layoutType) ?? 0) / layoutPages : 0,
      // 전월 대비는 한 달만 봤을 때만 뜻이 있습니다 — 기간 합계에서는 비웁니다.
      pagesDeltaPct: reports.length === 1 ? (reports[0].items.find((i) => i.layoutType === layoutType)?.pagesDeltaPct ?? null) : null,
    }
  })

  return fillLayoutCost(merged)
}

/** 기간 전체 원가 합 = Σ(쪽수 × 쪽당 평균) */
export const layoutCostTotal = (items: LayoutCostLike[]) =>
  items.reduce((sum, item) => sum + item.pages * item.avgKrwPerPage, 0)

/* ─────────── 기관별 수익성 ─────────── */

export interface MergedProfit {
  items: ProfitRow[]
  totals: { creditsUsed: number; revenueKrw: number; costKrw: number; marginKrw: number }
}

export function mergeProfit(reports: ProfitReport[]): MergedProfit {
  const byOrg = new Map<string, ProfitRow>()

  for (const report of reports) {
    for (const row of report.items) {
      const found = byOrg.get(row.orgId)
      if (!found) {
        byOrg.set(row.orgId, { ...row })
        continue
      }
      found.creditsUsed += row.creditsUsed
      found.revenueKrw += row.revenueKrw
      found.costKrw += row.costKrw
      found.marginKrw += row.marginKrw
      found.costUncertain = found.costUncertain || row.costUncertain
      // 계약 유형이 기간 중 바뀌었으면 마지막 달 값을 씁니다.
      found.contractType = row.contractType
    }
  }

  const items = [...byOrg.values()].sort((a, b) => b.marginKrw - a.marginKrw)
  return {
    items,
    totals: {
      creditsUsed: items.reduce((sum, row) => sum + row.creditsUsed, 0),
      revenueKrw: items.reduce((sum, row) => sum + row.revenueKrw, 0),
      costKrw: items.reduce((sum, row) => sum + row.costKrw, 0),
      marginKrw: items.reduce((sum, row) => sum + row.marginKrw, 0),
    },
  }
}

/** 달마다의 원가 총액 — 누적 원가 막대에 씁니다. */
export function monthlyCost(months: string[], reports: (ProfitReport | undefined)[]) {
  return months.map((month, index) => ({
    month,
    costKrw: reports[index]?.totals.costKrw ?? 0,
    revenueKrw: reports[index]?.totals.revenueKrw ?? 0,
    marginKrw: reports[index]?.totals.marginKrw ?? 0,
  }))
}
