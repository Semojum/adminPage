import type { Api } from './AdminApi'
import { httpApi } from './http/httpApi'
import { mockApi } from './mock/mockApi'
import { loginAccounts } from './mock/fixtures'
import type { Role } from './types'

/**
 * ── API 교체 지점 ──
 *
 * .env 의 VITE_API_SOURCE 로 고릅니다.
 *   mock (기본) : src/api/mock  — 기획서 목업 값
 *   http        : src/api/http  — 실제 서버
 *
 * 명세가 나오면 http/httpApi.ts 의 경로만 맞추고 VITE_API_SOURCE=http 로 바꾸면 됩니다.
 * 화면 코드는 이 파일이 내보내는 `api` 하나만 보고 있으므로 손댈 곳이 없습니다.
 */
const source = import.meta.env.VITE_API_SOURCE ?? 'mock'

export const api: Api = source === 'http' ? httpApi : mockApi

export const isMockApi = source !== 'http'

/**
 * 로그인 화면에 띄우는 목업 계정 안내. 실제 인증이 붙으면 빈 배열이 됩니다.
 * 화면이 mock 파일을 직접 들여다보지 않도록 여기서만 꺼내 줍니다.
 */
export const demoLoginAccounts: Array<{
  accountId: string
  password: string
  role: Role
  hint: string
}> = isMockApi
  ? loginAccounts.map((account) => ({
      accountId: account.session.accountId,
      password: account.password,
      role: account.session.role,
      hint: account.hint,
    }))
  : []

export type { Api }
export * from './types'
