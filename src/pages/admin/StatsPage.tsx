import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Period } from '@/api/types'
import { useStatsOverview } from '@/api/queries'
import { Card, HBarChart, Query, Segmented, VBarChart } from '@/components/ui'
import { bucketLabel, changeRate, number, signedPercent, won, wonSuffix } from '@/lib/format'

const PERIODS = [
  { value: 'today', label: '오늘' },
  { value: 'week', label: '주간' },
  { value: 'month', label: '월별' },
] as const satisfies ReadonlyArray<{ value: Period; label: string }>

/**
 * 상세 통계(T1-2)로 넘길 때 보던 기간을 그대로 이어 줍니다.
 * T1-1 은 오늘/주간/월별, T1-2 작업량은 일별/주간/월별/전체라 "오늘"은 "일별"로 받습니다.
 */
const DETAIL_UNIT: Record<Period, string> = {
  today: 'daily',
  week: 'weekly',
  month: 'monthly',
}

/** 직전 기간을 뭐라고 부를지 — 명세 prevPagesProcessed 는 "직전 기간 전체" 입니다. */
const PREVIOUS_LABEL: Record<Period, string> = {
  today: '어제',
  week: '지난주',
  month: '지난달',
}

/**
 * AD-T1-1 · 통계 (탭 · 로그인 후 첫 화면)
 *
 * GET /api/admin/stats/overview?period=today|week|month
 * 건수와 쪽수 둘만 두고 나머지는 상세(T1-2)로 넘겼습니다.
 */
export function StatsPage() {
  const [period, setPeriod] = useState<Period>('today')
  /** 누적 원가는 기간과 무관하게 같은 구성으로 내려옵니다(명세) — 탭은 강조할 막대를 고릅니다. */
  const [costPeriod, setCostPeriod] = useState<Period>('today')

  const overview = useStatsOverview(period)

  return (
    <>
      <Card
        title="전체 작업 현황"
        actions={
          <>
            <Segmented value={period} options={PERIODS} onChange={setPeriod} />
            <Link to={`/admin/stats/detail?unit=${DETAIL_UNIT[period]}`} className="btn">
              상세 보기 ›
            </Link>
          </>
        }
      >
        <Query state={overview} rows={4}>
          {(data) => {
            const delta = changeRate(data.pagesProcessed, data.prevPagesProcessed)
            return (
              <>
                <div className="grid-2">
                  <div className="stat">
                    <span className="stat__label">작업 건수</span>
                    <span className="stat__value num">
                      {number(data.jobs.total)}
                      <span className="stat__unit">건</span>
                    </span>
                    <span className="stat__sub">
                      완료 {data.jobs.completed} · 진행 {data.jobs.inProgress} · 실패 {data.jobs.failed}
                    </span>
                  </div>
                  <div className="stat">
                    <span className="stat__label">처리 쪽수</span>
                    <span className="stat__value num">
                      {number(data.pagesProcessed)}
                      <span className="stat__unit">쪽</span>
                    </span>
                    <span className="stat__sub">
                      {PREVIOUS_LABEL[data.period]} {number(data.prevPagesProcessed)}쪽
                      {delta === null ? '' : ` · ${signedPercent(delta)}`}
                    </span>
                  </div>
                </div>

                <VBarChart
                  data={data.series.map((point) => ({
                    label: bucketLabel(point.bucket, data.period === 'today' ? 'hour' : 'day'),
                    primary: point.pages,
                    caption: `${number(point.pages)}쪽`,
                  }))}
                />

                <div className="legend">
                  <span className="legend__item">
                    <i className="legend__swatch" />
                    {data.period === 'today' ? '시간대별' : '일별'} 처리 쪽수
                  </span>
                </div>
              </>
            )
          }}
        </Query>
      </Card>

      <Card
        title="누적 원가"
        note="AI 서버 비용만 · 인건비·고정비 제외"
        actions={<Segmented value={costPeriod} options={PERIODS} onChange={setCostPeriod} />}
      >
        <Query state={overview} rows={4}>
          {(data) => {
            const cost = data.cost
            // 지난주 누적은 일 평균 × 7 로 되돌려 비교합니다. (FE 계산)
            const weekDelta = changeRate(cost.thisWeekTotalKrw, cost.lastWeekDailyAvgKrw * 7)
            const bars = [
              { key: 'today', label: '오늘', amount: cost.todayKrw },
              { key: 'yesterday', label: '어제', amount: cost.yesterdayKrw },
              { key: 'week', label: '이번 주 평균', amount: cost.thisWeekDailyAvgKrw },
              { key: 'lastWeek', label: '지난주 평균', amount: cost.lastWeekDailyAvgKrw },
            ]
            const emphasized = costPeriod === 'today' ? 'today' : costPeriod === 'week' ? 'week' : null

            return (
              <div className="grid-2">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <HBarChart
                    data={bars.map((bar) => ({
                      label: bar.label,
                      value: bar.amount,
                      display: wonSuffix(bar.amount),
                      tone: bar.key === emphasized ? 'brand' : 'muted',
                      strong: bar.key === emphasized,
                    }))}
                  />
                  <p className="card__note">같은 축에 두어 크기를 바로 비교합니다</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div className="stat">
                    <span className="stat__label">이번 주 누적</span>
                    <span className="stat__value num">{won(cost.thisWeekTotalKrw)}</span>
                    <span className="stat__sub">
                      지난주 대비 {weekDelta === null ? '—' : signedPercent(weekDelta)}
                    </span>
                  </div>
                  <div className="stat">
                    <span className="stat__label">이번 달 누적</span>
                    <span className="stat__value num">{won(cost.thisMonthTotalKrw)}</span>
                    <span className="stat__sub">
                      처리 {number(cost.thisMonthPages)}쪽 · 쪽당 {won(cost.krwPerPage)}
                    </span>
                  </div>
                  {/* 명세 §overview: uncertain=단가표에 없는 모델이 섞였다는 뜻입니다. */}
                  {cost.uncertain && (
                    <p className="card__note">
                      단가표에 없는 모델이 포함돼 실제 원가보다 작게 잡혔을 수 있습니다.
                    </p>
                  )}
                </div>
              </div>
            )
          }}
        </Query>
      </Card>
    </>
  )
}
