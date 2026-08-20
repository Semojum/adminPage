import { useMemo, useState } from 'react'
import { useLayoutCostMonths, useProfitabilityMonths } from '@/api/queries'
import { Badge, Card, ErrorBox, HBarChart, Loading, Segmented, VBarChart } from '@/components/ui'
import {
  layoutCostTotal,
  mergeLayoutCost,
  mergeProfit,
  monthlyCost,
  monthsBetween,
  recentMonths,
} from '@/lib/costRange'
import {
  contractTypeLabel,
  isPaidContract,
  layoutLongLabel,
  monthLabel,
  number,
  signedPercent,
  signedWon,
  won,
} from '@/lib/format'

/** 원가를 보는 세 갈래 — 어느 쪽이든 같은 기간을 봅니다. */
type CostView = 'total' | 'layout' | 'org'

const VIEWS = [
  { value: 'total', label: '누적' },
  { value: 'layout', label: '레이아웃 유형별' },
  { value: 'org', label: '기관별 수익성' },
] as const satisfies ReadonlyArray<{ value: CostView; label: string }>

const MONTH_OPTIONS = recentMonths(12)

function MonthSelect({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (value: string) => void
  label: string
}) {
  return (
    <select
      className="select"
      style={{ width: 'auto' }}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label={label}
    >
      {MONTH_OPTIONS.map((month) => (
        <option key={month} value={month}>
          {monthLabel(month)}
        </option>
      ))}
    </select>
  )
}

/**
 * AD-T1-2 · 상세 통계 — 원가
 *
 * 원가 셋(누적 · 레이아웃 유형별 · 기관별 수익성)을 카드 하나로 모으고
 * 기간을 한 번만 고르면 셋 다 그 기간으로 봅니다.
 *
 * 원가 API 는 month=YYYY-MM 로 **한 달씩만** 받습니다(명세).
 * 그래서 고른 달들을 각각 부른 뒤 화면에서 합칩니다 — 쪽수·금액은 더하고,
 * 쪽당 평균 원가는 쪽수로 가중평균을 냅니다. (src/lib/costRange.ts)
 */
export function StatsDetailPage() {
  const [view, setView] = useState<CostView>('total')
  const [from, setFrom] = useState(MONTH_OPTIONS[2] ?? MONTH_OPTIONS[0])
  const [to, setTo] = useState(MONTH_OPTIONS[0])

  const months = useMemo(() => monthsBetween(from, to), [from, to])

  // 보고 있는 갈래에 필요한 것만 부릅니다.
  const layoutQueries = useLayoutCostMonths(view === 'layout' ? months : [])
  const profitQueries = useProfitabilityMonths(view === 'layout' ? [] : months)
  const queries = view === 'layout' ? layoutQueries : profitQueries

  const pending = queries.some((query) => query.isPending)
  const failed = queries.find((query) => query.error)
  const paused = queries.some((query) => query.fetchStatus === 'paused')

  const layoutItems = useMemo(
    () => mergeLayoutCost(layoutQueries.map((query) => query.data).filter((data) => data !== undefined)),
    [layoutQueries],
  )
  const profit = useMemo(
    () => mergeProfit(profitQueries.map((query) => query.data).filter((data) => data !== undefined)),
    [profitQueries],
  )
  const monthly = useMemo(
    () => monthlyCost(months, profitQueries.map((query) => query.data)),
    [months, profitQueries],
  )

  const rangeNote =
    months.length === 0
      ? '시작 달이 종료 달보다 뒤입니다.'
      : months.length === 1
        ? monthLabel(months[0])
        : `${monthLabel(months[0])} ~ ${monthLabel(months[months.length - 1])} · ${months.length}개월`

  return (
    <Card
      title="원가"
      note="AI 서버 비용만 · 인건비·고정비 제외"
      actions={
        <>
          <MonthSelect value={from} onChange={setFrom} label="시작 달" />
          <span className="muted">~</span>
          <MonthSelect value={to} onChange={setTo} label="종료 달" />
          <Segmented value={view} options={VIEWS} onChange={setView} />
        </>
      }
    >
      <p className="card__note">{rangeNote}</p>

      {months.length === 0 ? null : failed ? (
        <ErrorBox error={failed.error} onRetry={() => queries.forEach((query) => query.refetch())} />
      ) : paused ? (
        <ErrorBox
          error={new Error('네트워크 연결이 끊겨 요청이 멈췄습니다.')}
          onRetry={() => queries.forEach((query) => query.refetch())}
        />
      ) : pending ? (
        <Loading rows={4} />
      ) : view === 'total' ? (
        <div className="grid-2">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <VBarChart
              data={monthly.map((point) => ({
                label: `${Number(point.month.split('-')[1])}월`,
                primary: Math.round(point.costKrw),
                caption: won(point.costKrw),
              }))}
            />
            <div className="legend">
              <span className="legend__item">
                <i className="legend__swatch" />월 원가
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="stat">
              <span className="stat__label">기간 원가</span>
              <span className="stat__value num">{won(profit.totals.costKrw)}</span>
              <span className="stat__sub">차감 크레딧 {number(profit.totals.creditsUsed)}</span>
            </div>
            <div className="stat">
              <span className="stat__label">환산 매출 − 원가</span>
              <span className="stat__value num">{signedWon(profit.totals.marginKrw)}</span>
              <span className="stat__sub">환산 매출 {won(profit.totals.revenueKrw)}</span>
            </div>
          </div>
        </div>
      ) : view === 'layout' ? (
        <div className="grid-2">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <HBarChart
              data={layoutItems.map((row) => ({
                label: layoutLongLabel[row.layoutType],
                value: row.avgKrwPerPage,
                display: row.pages === 0 ? '처리 없음' : `${number(Math.round(row.avgKrwPerPage))}원/쪽`,
              }))}
            />
            <p className="card__note">
              비싼 순으로 정렬 — 요금 설계의 근거 · 기간 원가 {won(layoutCostTotal(layoutItems))}
            </p>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>유형</th>
                  <th className="table__num">처리 쪽수</th>
                  <th className="table__num">비중</th>
                  <th className="table__num">전월 대비</th>
                </tr>
              </thead>
              <tbody>
                {/* 표는 비중이 큰 순으로 봅니다. 막대는 비싼 순이라 정렬 기준이 다릅니다. */}
                {[...layoutItems]
                  .sort((a, b) => b.sharePct - a.sharePct)
                  .map((row) => (
                    <tr key={row.layoutType}>
                      <td>{layoutLongLabel[row.layoutType]}</td>
                      <td className="table__num">{number(row.pages)}</td>
                      <td className="table__num">{Math.round(row.sharePct)}%</td>
                      <td className="table__num">
                        {/* 여러 달을 합치면 "전월 대비"는 뜻이 없어 비웁니다. */}
                        {row.pagesDeltaPct === null ? (
                          <span className="dash">—</span>
                        ) : (
                          <Badge
                            tone={
                              Math.round(row.pagesDeltaPct) === 0
                                ? 'muted'
                                : row.pagesDeltaPct > 0
                                  ? 'danger'
                                  : 'ok'
                            }
                          >
                            {signedPercent(row.pagesDeltaPct)}
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid-2">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <HBarChart
              data={profit.items.map((row) => ({
                label: row.orgName,
                value: row.marginKrw,
                display: signedWon(row.marginKrw),
                tone: row.marginKrw < 0 ? 'danger' : 'ok',
                strong: row.marginKrw < 0,
              }))}
            />
            <p className="card__note">차액 = 환산 매출 − 원가</p>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>기관</th>
                  <th>계약 유형</th>
                  <th className="table__num">차감 크레딧</th>
                  <th className="table__num">환산 매출</th>
                  <th className="table__num">원가</th>
                </tr>
              </thead>
              <tbody>
                {profit.items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="muted">
                      이 기간에 집계된 기관이 없습니다.
                    </td>
                  </tr>
                ) : (
                  profit.items.map((row) => (
                    <tr key={row.orgId}>
                      <td>{row.orgName}</td>
                      <td>
                        <Badge tone={isPaidContract(row.contractType) ? 'ok' : 'warn'}>
                          {contractTypeLabel[row.contractType]}
                        </Badge>
                      </td>
                      <td className="table__num">{number(row.creditsUsed)}</td>
                      <td className="table__num">{won(row.revenueKrw)}</td>
                      <td className="table__num">
                        {won(row.costKrw)}
                        {row.costUncertain && <span className="muted"> *</span>}
                      </td>
                    </tr>
                  ))
                )}
                <tr className="table__total">
                  <td>합계</td>
                  <td className="dash">—</td>
                  <td className="table__num">{number(profit.totals.creditsUsed)}</td>
                  <td className="table__num">{won(profit.totals.revenueKrw)}</td>
                  <td className="table__num">{won(profit.totals.costKrw)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  )
}
