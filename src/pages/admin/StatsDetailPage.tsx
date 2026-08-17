import { useState } from 'react'
import type { Bucket } from '@/api/types'
import { useJobVolume, useLayoutCost, useOrgProfit } from '@/api/queries'
import { Badge, Card, HBarChart, Query, Segmented, VBarChart } from '@/components/ui'
import { billingTypeLabel, number, signedPercent, signedWon, won } from '@/lib/format'

const BUCKETS = [
  { value: 'daily', label: '일별' },
  { value: 'weekly', label: '주간' },
  { value: 'monthly', label: '월별' },
  { value: 'all', label: '전체' },
] as const satisfies ReadonlyArray<{ value: Bucket; label: string }>

/** 명세가 나오면 서버가 내려주는 목록으로 바꿉니다. */
const MONTHS = ['2026-08', '2026-07', '2026-06']

const monthLabel = (value: string) => {
  const [year, month] = value.split('-')
  return `${year}년 ${Number(month)}월`
}

function MonthSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <select className="select" style={{ width: 'auto' }} value={value} onChange={(e) => onChange(e.target.value)}>
      {MONTHS.map((month) => (
        <option key={month} value={month}>
          {monthLabel(month)}
        </option>
      ))}
    </select>
  )
}

/**
 * T1-2 · 상세 통계 (T1-1 의 [상세 보기])
 *
 * 기획서: 작업량 · 유형별 원가 · 수익성 셋을 봅니다.
 */
export function StatsDetailPage() {
  const [bucket, setBucket] = useState<Bucket>('weekly')
  const [layoutMonth, setLayoutMonth] = useState(MONTHS[0])
  const [profitMonth, setProfitMonth] = useState(MONTHS[0])

  const volume = useJobVolume(bucket)
  const layout = useLayoutCost(layoutMonth)
  const profit = useOrgProfit(profitMonth)

  return (
    <>
      <Card title="작업량" actions={<Segmented value={bucket} options={BUCKETS} onChange={setBucket} />}>
        <Query state={volume} rows={4}>
          {(data) => (
            <>
              <VBarChart
                data={data.items.map((point) => ({
                  label: point.label,
                  primary: point.done,
                  secondary: point.failed,
                  caption: `${number(point.total)}건`,
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
        actions={<MonthSelect value={layoutMonth} onChange={setLayoutMonth} />}
      >
        <Query state={layout} rows={4}>
          {(data) => (
            <div className="grid-2">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <HBarChart
                  data={data.items.map((row) => ({
                    label: row.label,
                    value: row.costPerPage,
                    display: `${number(row.costPerPage)}원/쪽`,
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
                      .sort((a, b) => b.share - a.share)
                      .map((row) => (
                        <tr key={row.type}>
                          <td>{row.label}</td>
                          <td className="table__num">{number(row.pages)}</td>
                          <td className="table__num">{row.share}%</td>
                          <td className="table__num">
                            <Badge
                              tone={row.momChange === 0 ? 'muted' : row.momChange > 0 ? 'danger' : 'ok'}
                            >
                              {signedPercent(row.momChange)}
                            </Badge>
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

      <Card title="기관별 수익성" actions={<MonthSelect value={profitMonth} onChange={setProfitMonth} />}>
        <Query state={profit} rows={4}>
          {(data) => (
            <div className="grid-2">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <HBarChart
                  data={data.rows.map((row) => ({
                    label: row.orgName,
                    value: row.profit,
                    display: signedWon(row.profit),
                    tone: row.profit < 0 ? 'danger' : 'ok',
                    strong: row.profit < 0,
                  }))}
                />
                <p className="card__note">차액 = 환산 매출 − 원가</p>
              </div>

              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>기관</th>
                      <th>구분</th>
                      <th className="table__num">차감 크레딧</th>
                      <th className="table__num">환산 매출</th>
                      <th className="table__num">원가</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row) => (
                      <tr key={row.orgId}>
                        <td>{row.orgName}</td>
                        <td>
                          <Badge tone={row.billingType === 'paid' ? 'ok' : 'warn'}>
                            {billingTypeLabel[row.billingType]}
                          </Badge>
                        </td>
                        <td className="table__num">{number(row.usedCredit)}</td>
                        <td className="table__num">{won(row.revenue)}</td>
                        <td className="table__num">{won(row.cost)}</td>
                      </tr>
                    ))}
                    <tr className="table__total">
                      <td>합계</td>
                      <td className="dash">—</td>
                      <td className="table__num">{number(data.total.usedCredit)}</td>
                      <td className="table__num">{won(data.total.revenue)}</td>
                      <td className="table__num">{won(data.total.cost)}</td>
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
