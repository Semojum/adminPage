import { Empty } from '@/components/ui'

/**
 * T1-11 · ANALYSIS (탭)
 *
 * 기획서: 이번에는 메뉴와 빈 화면만 만듭니다.
 * 화면은 비워 두되 무엇을 모을지는 지금 정합니다 — 수집을 시작해야 나중에 볼 데이터가 남습니다.
 */
export function AnalysisPage() {
  return (
    <Empty title="ANALYSIS">
      <p>이번에는 메뉴와 빈 화면만 만듭니다.</p>
      <p>모을 것: 화면별 체류 시간 · 버튼 클릭 수 · API별 수행 시간</p>
    </Empty>
  )
}
