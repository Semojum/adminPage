import type { ReactNode } from 'react'

/**
 * 새 창 전용 껍데기.
 *
 * 기획서 §6 "화면 공통": 작업 상세·결과 미리보기·기관 정보·계정 정보는 새 창으로 엽니다.
 * 목록을 잃지 않고 여러 건을 비교하기 위해서입니다. 그래서 탭 내비게이션이 없습니다.
 */
export function WindowShell({
  title,
  badge,
  actions,
  children,
}: {
  title: ReactNode
  badge?: ReactNode
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="window">
      <header className="window__bar">
        <h1 className="window__title">{title}</h1>
        {badge}
        <div className="window__actions">
          {actions}
          <button type="button" className="btn" onClick={() => window.close()}>
            닫기
          </button>
        </div>
      </header>
      {children}
    </div>
  )
}
