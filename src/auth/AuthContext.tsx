import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api'
import { setUnauthorizedHandler } from '@/api/http/client'
import type { LoginInput, Session } from '@/api/types'

export const SESSION_QUERY_KEY = ['session'] as const

interface AuthValue {
  session: Session | null
  /** 세션을 아직 확인하는 중 — 이때 라우트 판단을 미룹니다. */
  loading: boolean
  login: (input: LoginInput) => Promise<Session>
  logout: () => Promise<void>
  loggingIn: boolean
}

const AuthContext = createContext<AuthValue | null>(null)

/**
 * 세션.
 *
 * V3 명세의 로그인은 하나입니다 — POST /api/auth/login.
 * 운영자 콘솔이냐 앱이냐는 **응답 role 로 화면이 갈라집니다**(명세 §로그인).
 * 서버도 /api/admin/** 에서 비ADMIN 토큰을 COMMON4003 으로 막습니다.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()

  const sessionQuery = useQuery({
    queryKey: SESSION_QUERY_KEY,
    // 저장해 둔 리프레시 토큰이 아직 살아 있는지 확인해 세션을 복구합니다.
    queryFn: () => api.auth.getSession(),
    staleTime: Infinity,
    retry: false,
  })

  // 재발급까지 실패하면(만료·잠금) 캐시를 비웁니다. RequireRole 이 로그인 화면으로 보냅니다.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      qc.setQueryData(SESSION_QUERY_KEY, null)
    })
    return () => setUnauthorizedHandler(null)
  }, [qc])

  const loginMutation = useMutation({
    mutationFn: (input: LoginInput) => api.auth.login(input),
    onSuccess: (session) => {
      // 이전 사용자의 데이터가 새 사용자 화면에 남지 않게 전부 비우고 세션만 심습니다.
      qc.clear()
      qc.setQueryData(SESSION_QUERY_KEY, session)
    },
  })

  const logoutMutation = useMutation({
    mutationFn: () => api.auth.logout(),
    onSuccess: () => {
      qc.clear()
      qc.setQueryData(SESSION_QUERY_KEY, null)
    },
  })

  const value: AuthValue = {
    session: sessionQuery.data ?? null,
    loading: sessionQuery.isPending,
    login: (input) => loginMutation.mutateAsync(input),
    logout: () => logoutMutation.mutateAsync(),
    loggingIn: loginMutation.isPending,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth 는 AuthProvider 안에서만 쓸 수 있습니다.')
  return value
}
