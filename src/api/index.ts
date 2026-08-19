import type { Api } from './AdminApi'
import { httpApi } from './http/httpApi'
import { mockApi } from './mock/mockApi'
import { loginAccounts } from './mock/fixtures'
import type { Role } from './types'

/**
 * ── API 교체 지점 ──
 *
 * .env 의 VITE_API_SOURCE 로 고릅니다.
 *   mock (기본) : src/api/mock  — Figma 목업 값
 *   http        : src/api/http  — V3 API 명세의 실제 엔드포인트
 *
 * 화면은 이 파일이 내보내는 `api` 하나만 보고 있으므로, 서버가 바뀌어도 화면은 손대지 않습니다.
 */
const source = import.meta.env.VITE_API_SOURCE ?? 'mock'

export const api: Api = source === 'http' ? httpApi : mockApi

export const isMockApi = source !== 'http'

/**
 * 로그인 화면에 띄우는 목업 계정 안내. 실제 서버를 쓰면 빈 배열이 됩니다.
 * 화면이 mock 파일을 직접 들여다보지 않도록 여기서만 꺼내 줍니다.
 */
export const demoLoginAccounts: Array<{
  loginId: string
  password: string
  role: Role
  hint: string
}> = isMockApi
  ? loginAccounts.map(({ loginId, password, role, hint }) => ({ loginId, password, role, hint }))
  : []

export type { Api }
export * from './types'
