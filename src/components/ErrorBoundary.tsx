import { Component, type ErrorInfo, type ReactNode } from 'react'

/**
 * 렌더 중 예외를 받아 냅니다.
 *
 * 이게 없으면 React 가 화면을 통째로 비워 **흰 화면**만 남고, 무엇이 잘못됐는지
 * 화면에서는 알 수 없습니다. 서버 응답이 예상과 다를 때 특히 그렇습니다.
 */
interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // 콘솔에도 남겨 둡니다 — 스택이 있어야 원인을 좁힐 수 있습니다.
    console.error('[semojum-admin] 화면을 그리다 멈췄습니다.', error, info.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="window">
        <div className="error-box" role="alert" style={{ alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <strong>화면을 그리지 못했습니다.</strong>
            <span>{error.message}</span>
            <span className="muted" style={{ fontSize: 12 }}>
              서버 응답이 예상과 다를 때 주로 납니다. 이 문구를 그대로 알려 주시면 원인을 좁힐 수 있습니다.
            </span>
          </div>
          <button
            type="button"
            className="btn btn--sm"
            style={{ marginLeft: 'auto' }}
            onClick={() => window.location.reload()}
          >
            새로고침
          </button>
        </div>
      </div>
    )
  }
}
