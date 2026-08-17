import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Period } from '@/api/types'
import { useCostSummary, useStatsSummary } from '@/api/queries'
import { Card, HBarChart, Query, Segmented, VBarChart } from '@/components/ui'
import { number, signedPercent, won, wonSuffix } from '@/lib/format'

const PERIODS = [
  { value: 'today', label: '오늘' },
  { value: 'week', label: '주간' },
  { value: 'month', label: '월별' },
] as const satisfies ReadonlyArray<{ value: Period; label: string }>

/**
 * T1-1 · 통계 (탭 · 첫 화면)
 *
 * 기획서: 화면을 열자마자 보는 값입니다. 건수와 쪽수 둘만 두고 나머지는 상세로 넘겼습니다.
 */
export function StatsPage() {
  const [summaryPeriod, setSummaryPeriod] = useState<Period>('today')
  const [costPeriod, setCostPeriod] = useState<Period>('today')

  const summary = useStatsSummary(summaryPeriod)
  const cost = useCostSummary(costPeriod)

  return (
    <>
      <Card
        title="전체 작업 현황"
        actions={
          <>
            <Segmented value={summaryPeriod} options={PERIODS} onChange={setSummaryPeriod} />
            <Link to="/admin/stats/detail" className="btn">
              상세 보기 ›
            </Link>
          </>
        }
      >
        <Query state={summary} rows={4}>
          {(data) => (
            <>
              <div className="grid-2">
                <div className="stat">
                  <span className="stat__label">작업 건수</span>
                  <span className="stat__value num">
                    {number(data.jobs.total)}
                    <span className="stat__unit">건</span>
                  </span>
                  <span className="stat__sub">
                    완료 {data.jobs.done} · 진행 {data.jobs.processing} · 실패 {data.jobs.failed}
                  </span>
                </div>
                <div className="stat">
                  <span className="stat__label">처리 쪽수</span>
                  <span className="stat__value num">
                    {number(data.pages.total)}
                    <span className="stat__unit">쪽</span>
                  </span>
                  <span className="stat__sub">
                    {data.pages.previousLabel} {number(data.pages.previous)}쪽 ·{' '}
                    {signedPercent(data.pages.changeRate)}
                  </span>
                </div>
              </div>

              <VBarChart
                data={data.hourly.map((point) => ({
                  label: point.label,
                  primary: point.pages,
                  caption: `${number(point.pages)}쪽`,
                }))}
              />

              <div className="legend">
                <span className="legend__item">
                  <i className="legend__swatch" />
                  시간대별 처리 쪽수
                </span>
              </div>
            </>
          )}
        </Query>
      </Card>

      <Card
        title="누적 원가"
        note="AI 서버 비용만 · 인건비·고정비 제외"
        actions={<Segmented value={costPeriod} options={PERIODS} onChange={setCostPeriod} />}
      >
        <Query state={cost} rows={4}>
          {(data) => (
            <div className="grid-2">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <HBarChart
                  data={data.series.map((point) => ({
                    label: point.label,
                    value: point.amount,
                    display: wonSuffix(point.amount),
                    tone: point.emphasis ? 'brand' : 'muted',
                    strong: point.emphasis,
                  }))}
                />
                <p className="card__note">같은 축에 두어 크기를 바로 비교합니다</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="stat">
                  <span className="stat__label">이번 주 누적</span>
                  <span className="stat__value num">{won(data.weekTotal.amount)}</span>
                  <span className="stat__sub">지난주 대비 {signedPercent(data.weekTotal.changeRate)}</span>
                </div>
                <div className="stat">
                  <span className="stat__label">이번 달 누적</span>
                  <span className="stat__value num">{won(data.monthTotal.amount)}</span>
                  <span className="stat__sub">
                    처리 {number(data.monthTotal.pages)}쪽 · 쪽당 {won(data.monthTotal.costPerPage)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </Query>
      </Card>
    </>
  )
}
