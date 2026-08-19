import type { Envelope } from '../types'
import { getStoredSession, setStoredSession, updateAccessToken } from './session'

/** 서버가 에러를 어떻게 주든 화면에는 이 형태로 올라옵니다. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    /** 명세의 공통 에러 코드 — COMMON4003 · AUTH4001 · ORG4001 … */
    readonly code: string | null,
    message: string,
    readonly detail?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * 베이스 URL.
 * 경로는 명세 그대로 `/api/...` 를 씁니다. 운영은 https://api.semojum.app,
 * 개발은 빈 값(vite 프록시)으로 두면 됩니다.
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

let onUnauthorized: (() => void) | null = null

/**
 * 세션이 끊겼을 때(재발급 실패) 앱이 할 일을 등록합니다. AuthProvider 가 심어 둡니다.
 * 명세 §계정 상태 변경: INACTIVE 전환은 활성 세션을 즉시 끊습니다 — 그때 로그인 화면으로 돌아가야 합니다.
 */
export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler
}

type Query = Record<string, string | number | boolean | undefined | null>

function buildUrl(path: string, query?: Query): string {
  const url = `${BASE_URL}${path}`
  if (!query) return url
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === '') continue
    search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `${url}?${qs}` : url
}

/** 응답 본문을 한 번만 읽고, 공통 봉투를 벗겨서 result 를 돌려줍니다. */
async function unwrap<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') ?? ''

  if (!contentType.includes('application/json')) {
    // 업로드 100MB 초과처럼 프록시가 먼저 끊으면 JSON 이 아닌 응답이 옵니다. (명세 JOB4009)
    if (!response.ok) {
      throw new ApiError(response.status, null, `${response.status} ${response.statusText}`)
    }
    return undefined as T
  }

  const body = (await response.json()) as Partial<Envelope<T>> & Record<string, unknown>

  if (!response.ok || body.isSuccess === false) {
    const code = typeof body.code === 'string' ? body.code : null
    const message = typeof body.message === 'string' ? body.message : `${response.status} ${response.statusText}`
    throw new ApiError(response.status, code, message, body)
  }

  return body.result as T
}

/**
 * 액세스 토큰 재발급.
 *
 * 여러 요청이 동시에 401 을 받아도 재발급은 한 번만 돌도록 진행 중인 약속을 공유합니다.
 * 재발급 자체는 인증이 필요 없어 request() 를 타지 않습니다(재귀 방지).
 */
let refreshing: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const session = getStoredSession()
  if (!session) return null

  refreshing ??= (async () => {
    try {
      const response = await fetch(buildUrl('/api/auth/refresh'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      })
      const result = await unwrap<{ accessToken: string }>(response)
      updateAccessToken(result.accessToken)
      return result.accessToken
    } catch {
      // AUTH4003(밀려난 세션) · AUTH4004(비활성) — 어느 쪽이든 다시 로그인해야 합니다.
      setStoredSession(null)
      onUnauthorized?.()
      return null
    } finally {
      refreshing = null
    }
  })()

  return refreshing
}

interface Options {
  query?: Query
  body?: unknown
  /** 로그인·로그아웃·재발급은 토큰 없이 부릅니다. */
  anonymous?: boolean
  /** multipart 등 JSON 이 아닌 본문 */
  formData?: FormData
}

async function send(
  method: string,
  path: string,
  options: Options,
  accessToken: string | null,
): Promise<Response> {
  const headers: Record<string, string> = {}
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'

  return fetch(buildUrl(path, options.query), {
    method,
    headers,
    body: options.formData ?? (options.body === undefined ? undefined : JSON.stringify(options.body)),
  })
}

async function request<T>(method: string, path: string, options: Options = {}): Promise<T> {
  const token = options.anonymous ? null : (getStoredSession()?.accessToken ?? null)
  let response = await send(method, path, options, token)

  // 액세스 토큰 만료(401)면 한 번만 재발급하고 그대로 다시 부릅니다.
  if (response.status === 401 && !options.anonymous) {
    const renewed = await refreshAccessToken()
    if (!renewed) {
      throw new ApiError(401, 'COMMON4001', '로그인이 필요합니다.')
    }
    response = await send(method, path, options, renewed)
  }

  return unwrap<T>(response)
}

export const http = {
  get: <T>(path: string, query?: Query) => request<T>('GET', path, { query }),
  post: <T>(path: string, body?: unknown, options?: Omit<Options, 'body'>) =>
    request<T>('POST', path, { ...options, body }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  delete: <T>(path: string) => request<T>('DELETE', path),
}
