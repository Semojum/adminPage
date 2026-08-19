import type { Role, Session } from '../types'

/**
 * 토큰 보관소.
 *
 * 명세에 세션 조회 API 가 없습니다 — 로그인 응답(accessToken·refreshToken·role)이 전부입니다.
 * 그래서 새로 고침을 견디도록 브라우저에 담아 두고, 앱이 켜질 때 refresh 로 살아 있는지 확인합니다.
 *
 * 액세스 토큰 1시간 · 리프레시 토큰 12시간 (명세 §로그인).
 */
const STORAGE_KEY = 'semojum.admin.session'

let current: Session | null = read()

function read(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Session>
    if (!parsed.accessToken || !parsed.refreshToken || !parsed.role || !parsed.loginId) return null
    return {
      loginId: parsed.loginId,
      role: parsed.role as Role,
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
    }
  } catch {
    // 저장소를 못 쓰는 브라우저(사생활 보호 모드 등)에서는 메모리로만 갑니다.
    return null
  }
}

export const getStoredSession = (): Session | null => current

export function setStoredSession(session: Session | null) {
  current = session
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* 저장 실패는 무시합니다. 이번 탭에서는 메모리 값으로 계속 동작합니다. */
  }
}

/** 토큰 재발급으로 액세스 토큰만 갈아 끼웁니다. */
export function updateAccessToken(accessToken: string) {
  if (!current) return
  setStoredSession({ ...current, accessToken })
}
