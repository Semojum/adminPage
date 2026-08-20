import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Bucket, Period } from '@/api/types'
import { useStatsOverview, useWorkload } from '@/api/queries'
import { Card, Query, Segmented, VBarChart } from '@/components/ui'
import { bucketLabel, changeRate, number, signedPercent, weekLabels } from '@/lib/format'

/**
 * 전체 작업 현황 탭.
 *
 * 명세가 구간마다 주는 값이 달라 두 API 를 나눠 씁니다.
 *   실시간 : GET /stats/overview?period=today — series 는 **시간별 처리 쪽수** 뿐입니다.
 *   일·주·월: GET /stats/workload?unit=      — **작업 건수**(완료 / 실패·취소), 14일 · 8주 · 6개월.
 *
 * overview 의 jobs 는 기간 합계 한 덩어리라 시계열로 못 씁니다.
 * 그래서 실시간만 쪽수, 나머지는 건수이고 범례에 단위를 그때그때 적습니다.
 */
type View = 'live' | 'daily' | 'weekly' | 'monthly'

/** 막대가 셀 것 — 작업 건수 / 처리 쪽수 */
type Metric = 'jobs' | 'pages'

const VIEWS = [
  { value: 'live', label: '실시간' },
  { value: 'daily', label: '일간' },
  { value: 'weekly', label: '주간' },
  { value: 'monthly', label: '월간' },
] as const satisfies ReadonlyArray<{ value: View; label: string }>

/** 위 KPI 타일이 어느 기간을 보여줄지 */
const KPI_PERIOD: Record<View, Period> = {
  live: 'today',
  daily: 'today',
  weekly: 'week',
  monthly: 'month',
}

/** 건수 막대가 쓸 workload 구간 (실시간은 건수를 못 그려서 자리만 채웁니다) */
const WORKLOAD_UNIT: Record<View, Bucket> = {
  live: 'daily',
  daily: 'daily',
  weekly: 'weekly',
  monthly: 'monthly',
}

const BUCKET_LABEL: Record<View, string> = {
  live: '시간대별',
  daily: '일별',
  weekly: '주차별',
  monthly: '월별',
}

/**
 * 구간마다 고를 수 있는 지표가 다릅니다 — 서버가 주는 값이 달라서입니다.
 *   처리 쪽수 : overview.series 가 today=시간별 / week=일별 까지만 줍니다(주·월 버킷 없음).
 *   작업 건수 : workload 가 일·주·월만 줍니다(시간별 없음).
 */
const CAN_SHOW: Record<View, Record<Metric, boolean>> = {
  live: { pages: true, jobs: false },
  daily: { pages: true, jobs: true },
  weekly: { pages: false, jobs: true },
  monthly: { pages: false, jobs: true },
}

const CANNOT_REASON: Record<Metric, string> = {
  jobs: '시간대별 작업 건수는 서버가 아직 주지 않습니다 (overview.series 에 jobs 없음)',
  pages: '주차·월 단위 처리 쪽수는 서버가 아직 주지 않습니다 (overview.series 는 일별까지)',
}

/** 쪽수 막대를 어느 기간에서 가져올지 — 실시간은 시간별, 일간은 일별 */
const PAGES_PERIOD: Record<View, Period> = {
  live: 'today',
  daily: 'week',
  weekly: 'week',
  monthly: 'month',
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
 * 건수와 쪽수 둘만 두고 나머지는 상세(T1-2)로 넘겼습니다.
 */
export function StatsPage() {
  const [view, setView] = useState<View>('live')
  const [metric, setMetric] = useState<Metric>('pages')

  // 고른 지표를 이 구간에서 못 보여주면 되는 쪽으로 넘어갑니다.
  const shown: Metric = CAN_SHOW[view][metric] ? metric : metric === 'jobs' ? 'pages' : 'jobs'

  const overview = useStatsOverview(KPI_PERIOD[view])
  // 쪽수 막대는 overview 의 시계열을 씁니다. 기간이 같으면 위 조회와 한 번으로 합쳐집니다.
  const pagesSource = useStatsOverview(PAGES_PERIOD[view], shown === 'pages')
  // 건수 막대는 workload 를 씁니다.
  const workload = useWorkload(WORKLOAD_UNIT[view], shown === 'jobs')

  const metricOptions = [
    { value: 'jobs' as Metric, label: '건수', disabled: !CAN_SHOW[view].jobs, reason: CANNOT_REASON.jobs },
    { value: 'pages' as Metric, label: '쪽수', disabled: !CAN_SHOW[view].pages, reason: CANNOT_REASON.pages },
  ]

  return (
    <>
      <Card
        title="전체 작업 현황"
        actions={
          <>
            <Segmented value={view} options={VIEWS} onChange={setView} />
            <Segmented value={shown} options={metricOptions} onChange={setMetric} />
            <Link to="/admin/stats/detail" className="btn">
              상세 보기 ›
            </Link>
          </>
        }
      >
        <Query state={overview} rows={4}>
          {(data) => {
            const delta = changeRate(data.pagesProcessed, data.prevPagesProcessed)
            return (
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
            )
          }}
        </Query>

        {/* 처리 쪽수 — overview 의 시계열 */}
        {shown === 'pages' && (
          <Query state={pagesSource} rows={3}>
            {(data) => (
              <VBarChart
                data={data.series.map((point) => ({
                  label: bucketLabel(point.bucket, view === 'live' ? 'hour' : 'day'),
                  primary: point.pages,
                  caption: `${number(point.pages)}쪽`,
                }))}
              />
            )}
          </Query>
        )}

        {/* 작업 건수 — workload 의 완료 / 실패·취소 */}
        {shown === 'jobs' && (
          <Query state={workload} rows={3}>
            {(data) => {
              const labels =
                data.unit === 'weekly'
                  ? weekLabels(data.buckets.map((point) => point.bucket))
                  : data.buckets.map((point) =>
                      bucketLabel(point.bucket, data.unit === 'monthly' ? 'month' : 'day'),
                    )
              return (
                <VBarChart
                  tone="status"
                  data={data.buckets.map((point, index) => ({
                    label: labels[index],
                    primary: point.completed,
                    secondary: point.failedOrCanceled,
                    caption: `${number(point.completed + point.failedOrCanceled)}건`,
                  }))}
                />
              )
            }}
          </Query>
        )}

        <div className="legend">
          {shown === 'pages' ? (
            <span className="legend__item">
              <i className="legend__swatch" />
              {BUCKET_LABEL[view]} 처리 쪽수
            </span>
          ) : (
            <>
              <span className="legend__item">
                <i className="legend__swatch legend__swatch--ok" />
                완료
              </span>
              <span className="legend__item">
                <i className="legend__swatch legend__swatch--danger" />
                실패·취소
              </span>
              <span className="legend__spacer">{BUCKET_LABEL[view]} 작업 건수</span>
            </>
          )}
        </div>
      </Card>

    </>
  )
}
