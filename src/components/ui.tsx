import type { ReactNode } from 'react'
import { usageTone } from '@/lib/format'

/* ─────────────── Card ─────────────── */

export function Card({
  title,
  note,
  actions,
  children,
  className = '',
}: {
  title?: ReactNode
  note?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="card__head">
          {title && <h2 className="card__title">{title}</h2>}
          {note && <span className="card__note">{note}</span>}
          {actions && <div className="card__actions">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  )
}

/* ─────────────── Badge ─────────────── */

export type Tone = 'ok' | 'warn' | 'danger' | 'info' | 'muted' | 'brand'

export function Badge({ tone = 'muted', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`badge badge--${tone}`}>{children}</span>
}

/* ─────────────── Segmented (기간 탭) ─────────────── */

export function Segmented<V extends string>({
  value,
  options,
  onChange,
}: {
  value: V
  options: ReadonlyArray<{ value: V; label: string }>
  onChange: (value: V) => void
}) {
  return (
    <div className="segmented" role="tablist">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={option.value === value}
          className={`segmented__item ${option.value === value ? 'segmented__item--active' : ''}`}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

/* ─────────────── Meter (크레딧 사용률) ─────────────── */

export function Meter({
  used,
  total,
  rate,
  label,
  caption,
}: {
  used: number
  total: number
  rate: number
  label?: ReactNode
  caption?: ReactNode
}) {
  const tone = usageTone(rate)
  return (
    <div className="meter">
      {label && <div className="card__note">{label}</div>}
      <div className="meter__track">
        <div className={`meter__fill meter__fill--${tone}`} style={{ width: `${Math.min(rate, 100)}%` }} />
      </div>
      <div className="meter__foot">
        <span className="num">
          <strong>{used.toLocaleString('ko-KR')}</strong> / {total.toLocaleString('ko-KR')} 크레딧
        </span>
        <span className="num">{caption ?? `${rate}%`}</span>
      </div>
    </div>
  )
}

/* ─────────────── 세로 막대 그래프 ─────────────── */

export interface VBarDatum {
  label: string
  /** 아래 칸(진한 색) */
  primary: number
  /** 위 칸(연한 색). 없으면 단일 막대 */
  secondary?: number
  /** 막대 위에 적는 문구. 없으면 합계를 씁니다. */
  caption?: string
}

/**
 * 막대 색.
 * - brand  : 그냥 양을 보여주는 막대 (처리 쪽수 · 사용 크레딧)
 * - status : 성패를 나누는 막대 — 완료 초록 / 실패·취소 빨강
 */
export type VBarTone = 'brand' | 'status'

const SEG_CLASS: Record<VBarTone, { primary: string; secondary: string }> = {
  brand: { primary: 'vbar__seg--primary', secondary: 'vbar__seg--secondary' },
  status: { primary: 'vbar__seg--ok', secondary: 'vbar__seg--danger' },
}

export function VBarChart({
  data,
  axisTicks = 3,
  tone = 'brand',
  formatCaption = (total: number) => total.toLocaleString('ko-KR'),
}: {
  data: VBarDatum[]
  axisTicks?: number
  tone?: VBarTone
  formatCaption?: (total: number) => string
}) {
  const seg = SEG_CLASS[tone]
  const totals = data.map((d) => d.primary + (d.secondary ?? 0))
  const max = Math.max(1, ...totals)
  /**
   * 눈금은 최대값을 나눠 잡습니다(Figma 목업도 같은 방식 — 210 / 141 / 69).
   * 다만 값이 작으면 반올림이 뭉개져 "1 1 0" 처럼 겹치거나 0이 생기므로,
   * 0과 중복을 걷어냅니다. 다루는 값이 전부 건수·쪽수·크레딧이라 눈금은 정수로 둡니다.
   */
  const ticks = Array.from({ length: axisTicks }, (_, i) =>
    Math.round((max / axisTicks) * (axisTicks - i)),
  ).filter((tick, index, all) => tick > 0 && all.indexOf(tick) === index)

  // 원점(0)도 적어 둡니다 — 막대가 어디서 시작하는지 보이게.
  const axisLabels = [...ticks, 0]

  return (
    <div className="vbars">
      <div className="vbars__axis" aria-hidden>
        {axisLabels.map((tick) => (
          <span key={tick} className="vbars__tick" style={{ top: `${(1 - tick / max) * 100}%` }}>
            {tick.toLocaleString('ko-KR')}
          </span>
        ))}
      </div>
      <div className="vbars__plot">
        <div className="vbars__grid">
          {ticks.map((tick) => (
            <div key={tick} className="vbars__gridline" style={{ top: `${(1 - tick / max) * 100}%` }} />
          ))}
        </div>
        {data.map((datum, index) => {
          const total = totals[index]
          const heightPercent = (total / max) * 100
          return (
            <div className="vbar" key={`${datum.label}-${index}`}>
              <span className="vbar__caption" style={{ bottom: `calc(${heightPercent}% + 4px)` }}>
                {datum.caption ?? formatCaption(total)}
              </span>
              <div className="vbar__stack" style={{ height: `${heightPercent}%` }}>
                {datum.secondary ? (
                  <div
                    className={`vbar__seg ${seg.secondary}`}
                    style={{ height: `${(datum.secondary / total) * 100}%` }}
                  />
                ) : null}
                <div
                  className={`vbar__seg ${seg.primary}`}
                  style={{ height: `${(datum.primary / total) * 100}%` }}
                />
              </div>
              <span className="vbar__label">{datum.label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ─────────────── 가로 막대 그래프 ─────────────── */

export interface HBarDatum {
  label: string
  value: number
  display: string
  tone?: 'brand' | 'muted' | 'ok' | 'danger'
  strong?: boolean
}

export function HBarChart({ data }: { data: HBarDatum[] }) {
  const max = Math.max(1, ...data.map((d) => Math.abs(d.value)))
  return (
    <div className="hbars">
      {data.map((datum) => (
        <div className="hbar" key={datum.label}>
          <span className={`hbar__label ${datum.strong ? 'hbar__label--strong' : ''}`}>{datum.label}</span>
          <div className="hbar__track">
            <div
              className={`hbar__fill ${datum.tone && datum.tone !== 'brand' ? `hbar__fill--${datum.tone}` : ''}`}
              style={{ width: `${(Math.abs(datum.value) / max) * 100}%` }}
            />
          </div>
          <span className="hbar__value">{datum.display}</span>
        </div>
      ))}
    </div>
  )
}

/* ─────────────── 정의 목록 ─────────────── */

export function Defs({ children }: { children: ReactNode }) {
  return <div className="defs">{children}</div>
}

export function Def({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="def">
      <span className="def__label">{label}</span>
      <span className="def__value">{children}</span>
    </div>
  )
}

/* ─────────────── 상태 표시 ─────────────── */

export function Loading({ rows = 3 }: { rows?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }} aria-busy>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="skeleton" style={{ height: i === 0 ? 44 : 28 }} />
      ))}
    </div>
  )
}

export function ErrorBox({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'
  return (
    <div className="error-box">
      <span>불러오지 못했습니다 — {message}</span>
      {onRetry && (
        <button type="button" className="btn btn--sm" onClick={onRetry} style={{ marginLeft: 'auto' }}>
          다시 시도
        </button>
      )}
    </div>
  )
}

/** 로딩/에러/성공 세 갈래를 한 곳에서 처리합니다. */
export function Query<V>({
  state,
  rows,
  children,
}: {
  state: { data: V | undefined; isPending: boolean; error: unknown; refetch: () => void }
  rows?: number
  children: (data: V) => ReactNode
}) {
  if (state.isPending) return <Loading rows={rows} />
  if (state.error) return <ErrorBox error={state.error} onRetry={state.refetch} />
  if (state.data === undefined) return null
  return <>{children(state.data)}</>
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty__title">{title}</span>
      {children}
    </div>
  )
}
