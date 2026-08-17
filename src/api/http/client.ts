/** 서버가 에러 본문을 어떻게 주든 화면에는 이 형태로 올라옵니다. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | null,
    message: string,
    readonly detail?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

let onUnauthorized: (() => void) | null = null

/**
 * 세션이 끊겼을 때(401) 앱이 할 일을 등록합니다. AuthProvider 가 심어 둡니다.
 * 기획서 §6: 잠금은 누르는 즉시 로그인을 끊습니다 — 그때 화면이 로그인으로 돌아가야 합니다.
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

async function toApiError(response: Response): Promise<ApiError> {
  let code: string | null = null
  let message = `${response.status} ${response.statusText}`
  let detail: unknown

  try {
    const body = await response.json()
    detail = body
    // 명세가 나오면 서버 에러 스키마에 맞춰 이 부분만 고칩니다.
    if (typeof body?.message === 'string') message = body.message
    if (typeof body?.code === 'string') code = body.code
  } catch {
    /* 본문이 JSON 이 아니면 상태 코드만 씁니다. */
  }

  return new ApiError(response.status, code, message, detail)
}

async function request<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  path: string,
  options: { query?: Query; body?: unknown } = {},
): Promise<T> {
  const response = await fetch(buildUrl(path, options.query), {
    method,
    credentials: 'include',
    headers: options.body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  })

  if (!response.ok) {
    const error = await toApiError(response)
    if (error.status === 401) onUnauthorized?.()
    throw error
  }
  if (response.status === 204) return undefined as T

  const contentType = response.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) return undefined as T

  return (await response.json()) as T
}

async function requestBlob(path: string, query?: Query): Promise<Blob> {
  const response = await fetch(buildUrl(path, query), { method: 'GET', credentials: 'include' })
  if (!response.ok) throw await toApiError(response)
  return await response.blob()
}

export const http = {
  get: <T>(path: string, query?: Query) => request<T>('GET', path, { query }),
  post: <T>(path: string, body?: unknown, query?: Query) => request<T>('POST', path, { body, query }),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, { body }),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, { body }),
  delete: <T>(path: string) => request<T>('DELETE', path),
  blob: requestBlob,
}
