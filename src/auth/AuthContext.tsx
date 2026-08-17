import { createContext, useContext, useEffect, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api'
import { setUnauthorizedHandler } from '@/api/http/client'
import type { LoginInput, Session } from '@/api/types'

/** 로그인 진입점. 기획서 §6 권한별 진입 분리에 맞춰 두 갈래로 둡니다. */
export type Entry = 'admin' | 'app'

export const SESSION_QUERY_KEY = ['session'] as const

interface AuthValue {
  session: Session | null
  /** 세션을 아직 확인하는 중 — 이때 라우트 판단을 미룹니다. */
  loading: boolean
  login: (entry: Entry, input: LoginInput) => Promise<Session>
  logout: () => Promise<void>
  loggingIn: boolean
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient()

  const sessionQuery = useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: () => api.auth.getSession(),
    // 세션은 앱이 켜질 때 한 번 확인하고, 로그인·로그아웃에서만 바꿉니다.
    staleTime: Infinity,
    retry: false,
  })

  // 세션이 끊기면(잠금·만료) 캐시를 비웁니다. RequireRole 이 로그인 화면으로 보냅니다.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      qc.setQueryData(SESSION_QUERY_KEY, null)
    })
    return () => setUnauthorizedHandler(null)
  }, [qc])

  const loginMutation = useMutation({
    mutationFn: ({ entry, input }: { entry: Entry; input: LoginInput }) =>
      entry === 'admin' ? api.auth.loginAdmin(input) : api.auth.loginApp(input),
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
    login: (entry, input) => loginMutation.mutateAsync({ entry, input }),
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
