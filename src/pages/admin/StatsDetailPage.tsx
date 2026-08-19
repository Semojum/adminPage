import { useMemo, useState } from 'react'
import type { Bucket } from '@/api/types'
import { useLayoutCost, useProfitability, useWorkload } from '@/api/queries'
import { Badge, Card, HBarChart, Query, Segmented, VBarChart } from '@/components/ui'
import {
  bucketLabel,
  contractTypeLabel,
  isPaidContract,
  layoutLongLabel,
  monthLabel,
  number,
  signedPercent,
  signedWon,
  won,
} from '@/lib/format'

const BUCKETS = [
  { value: 'daily', label: '일별' },
  { value: 'weekly', label: '주간' },
  { value: 'monthly', label: '월별' },
  { value: 'all', label: '전체' },
] as const satisfies ReadonlyArray<{ value: Bucket; label: string }>

/** 막대 라벨 단위 — daily·weekly 는 날짜, monthly·all 은 달 (명세 §workload 범위) */
const AXIS_UNIT: Record<Bucket, 'day' | 'month'> = {
  daily: 'day',
  weekly: 'day',
  monthly: 'month',
  all: 'month',
}

/** 최근 여섯 달. 서버에 월 목록 API 가 없어 화면이 만듭니다. */
function recentMonths(count = 6): string[] {
  const now = new Date()
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
  })
}

function MonthSelect({
  months,
  value,
  onChange,
}: {
  months: string[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <select
      className="select"
      style={{ width: 'auto' }}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label="조회할 달"
    >
      {months.map((month) => (
        <option key={month} value={month}>
          {monthLabel(month)}
        </option>
      ))}
    </select>
  )
}

/**
 * AD-T1-2 · 상세 통계 (T1-1 의 [상세 보기])
 *
 * GET /api/admin/stats/workload · /layout-cost · /profitability
 */
export function StatsDetailPage() {
  const months = useMemo(() => recentMonths(), [])
  const [unit, setUnit] = useState<Bucket>('weekly')
  const [layoutMonth, setLayoutMonth] = useState(months[0])
  const [profitMonth, setProfitMonth] = useState(months[0])

  const workload = useWorkload(unit)
  const layout = useLayoutCost(layoutMonth)
  const profit = useProfitability(profitMonth)

  return (
    <>
      <Card title="작업량" actions={<Segmented value={unit} options={BUCKETS} onChange={setUnit} />}>
        <Query state={workload} rows={4}>
          {(data) => (
            <>
              <VBarChart
                data={data.buckets.map((point) => ({
                  label: bucketLabel(point.bucket, AXIS_UNIT[data.unit] ?? 'day'),
                  primary: point.completed,
                  secondary: point.failedOrCanceled,
                  // 막대 위 합계는 화면이 더합니다. (명세 §workload)
                  caption: `${number(point.completed + point.failedOrCanceled)}건`,
                }))}
              />
              <div className="legend">
                <span className="legend__item">
                  <i className="legend__swatch" />
                  완료
                </span>
                <span className="legend__item">
                  <i className="legend__swatch legend__swatch--secondary" />
                  실패·취소
                </span>
                <span className="legend__spacer">막대 위 숫자는 합계입니다</span>
              </div>
            </>
          )}
        </Query>
      </Card>

      <Card
        title="레이아웃 유형별 평균 원가"
        actions={<MonthSelect months={months} value={layoutMonth} onChange={setLayoutMonth} />}
      >
        <Query state={layout} rows={4}>
          {(data) => (
            <div className="grid-2">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* 서버가 비싼 순으로 정렬해 내려줍니다. */}
                <HBarChart
                  data={data.items.map((row) => ({
                    label: layoutLongLabel[row.layoutType],
                    value: row.avgKrwPerPage,
                    display: `${number(Math.round(row.avgKrwPerPage))}원/쪽`,
                  }))}
                />
                <p className="card__note">비싼 순으로 정렬 — 요금 설계의 근거</p>
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
                    {[...data.items]
                      .sort((a, b) => b.sharePct - a.sharePct)
                      .map((row) => (
                        <tr key={row.layoutType}>
                          <td>{layoutLongLabel[row.layoutType]}</td>
                          <td className="table__num">{number(row.pages)}</td>
                          <td className="table__num">{Math.round(row.sharePct)}%</td>
                          <td className="table__num">
                            {/* 전월 0쪽이면 비교 대상이 없습니다. */}
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
          )}
        </Query>
      </Card>

      <Card
        title="기관별 수익성"
        actions={<MonthSelect months={months} value={profitMonth} onChange={setProfitMonth} />}
      >
        <Query state={profit} rows={4}>
          {(data) => (
            <div className="grid-2">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <HBarChart
                  data={data.items.map((row) => ({
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
                    {data.items.map((row) => (
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
                    ))}
                    <tr className="table__total">
                      <td>합계</td>
                      <td className="dash">—</td>
                      <td className="table__num">{number(data.totals.creditsUsed)}</td>
                      <td className="table__num">{won(data.totals.revenueKrw)}</td>
                      <td className="table__num">{won(data.totals.costKrw)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Query>
      </Card>
    </>
  )
}
