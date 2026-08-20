import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Bucket, Period } from '@/api/types'
import { useStatsOverview, useWorkload } from '@/api/queries'
import { Card, Query, Segmented, VBarChart } from '@/components/ui'
import { bucketLabel, changeRate, number, signedPercent, weekLabels } from '@/lib/format'

/**
 * 전체 작업 현황 탭.
 *
 * 구간마다 쓰는 API 가 다릅니다.
 *   실시간 : GET /stats/overview?period=today — 시간별 버킷
 *   일·주·월: GET /stats/workload?unit=       — 14일 · 8주 · 6개월 버킷
 *
 * 2026-08-20 부터 두 API 모두 버킷마다 **쪽수와 건수를 함께** 주므로
 * 어느 구간에서든 두 지표를 볼 수 있습니다.
 *
 * 다만 건수의 뜻이 다릅니다 — overview 는 그 시간에 **시작된** 건수,
 * workload 는 **완료 / 실패·취소** 로 나뉜 건수입니다. 범례에 그대로 적습니다.
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

const METRIC_OPTIONS = [
  { value: 'jobs' as Metric, label: '건수' },
  { value: 'pages' as Metric, label: '쪽수' },
]

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

  const overview = useStatsOverview(KPI_PERIOD[view])
  // 실시간은 overview 의 시간별 버킷, 나머지는 workload 버킷을 씁니다.
  const workload = useWorkload(WORKLOAD_UNIT[view], view !== 'live')

  return (
    <>
      <Card
        title="전체 작업 현황"
        actions={
          <>
            <Segmented value={view} options={VIEWS} onChange={setView} />
            <Segmented value={metric} options={METRIC_OPTIONS} onChange={setMetric} />
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

        {/* 실시간 — overview 의 시간별 버킷 */}
        {view === 'live' && (
          <Query state={overview} rows={3}>
            {(data) => (
              <VBarChart
                data={data.series.map((point) => ({
                  label: bucketLabel(point.bucket, 'hour'),
                  primary: metric === 'pages' ? point.pages : point.jobs,
                  caption:
                    metric === 'pages' ? `${number(point.pages)}쪽` : `${number(point.jobs)}건`,
                }))}
              />
            )}
          </Query>
        )}

        {/* 일간 · 주간 · 월간 — workload 버킷 */}
        {view !== 'live' && (
          <Query state={workload} rows={3}>
            {(data) => {
              const labels =
                data.unit === 'weekly'
                  ? weekLabels(data.buckets.map((point) => point.bucket))
                  : data.buckets.map((point) =>
                      bucketLabel(point.bucket, data.unit === 'monthly' ? 'month' : 'day'),
                    )
              return metric === 'pages' ? (
                <VBarChart
                  data={data.buckets.map((point, index) => ({
                    label: labels[index],
                    primary: point.pages,
                    caption: `${number(point.pages)}쪽`,
                  }))}
                />
              ) : (
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
          {metric === 'pages' ? (
            <span className="legend__item">
              <i className="legend__swatch" />
              {BUCKET_LABEL[view]} 처리 쪽수
            </span>
          ) : view === 'live' ? (
            /* overview 의 건수는 그 시간에 "시작된" 작업 수입니다 — 완료/실패로 나뉘지 않습니다. */
            <span className="legend__item">
              <i className="legend__swatch" />
              시간대별 시작 건수
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
