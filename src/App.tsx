import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ToastProvider } from '@/components/Toast'
import { AuthProvider } from '@/auth/AuthContext'
import { RequireRole } from '@/auth/RequireRole'
import { AdminLayout } from '@/layouts/AdminLayout'
import { OrgLayout } from '@/layouts/OrgLayout'

import { AdminLoginPage } from '@/pages/auth/AdminLoginPage'
import { AppLoginPage } from '@/pages/auth/AppLoginPage'

import { StatsPage } from '@/pages/admin/StatsPage'
import { StatsDetailPage } from '@/pages/admin/StatsDetailPage'
import { MonitoringPage } from '@/pages/admin/MonitoringPage'
import { JobDetailWindow } from '@/pages/admin/JobDetailWindow'
import { JobPreviewWindow } from '@/pages/admin/JobPreviewWindow'
import { OrgAccountPage } from '@/pages/admin/OrgAccountPage'
import { OrgInfoWindow } from '@/pages/admin/OrgInfoWindow'
import { AccountInfoWindow } from '@/pages/admin/AccountInfoWindow'
import { InquiryPage } from '@/pages/admin/InquiryPage'
import { NoticePage } from '@/pages/admin/NoticePage'
import { AnalysisPage } from '@/pages/admin/AnalysisPage'

import { OrgManagePage } from '@/pages/org/OrgManagePage'
import { OrgAccountDetailWindow } from '@/pages/org/OrgAccountDetailWindow'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 기획서 §6: 모니터링만 10초마다 갱신하고, 나머지는 들어올 때 한 번 불러옵니다.
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      retry: 1,
    },
  },
})

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <Routes>
              <Route path="/" element={<Navigate to="/admin/stats" replace />} />

              {/* 로그인 — 진입점마다 하나씩. 기획서 §6 권한별 진입 분리 */}
              <Route path="/login" element={<AdminLoginPage />} />
              <Route path="/org/login" element={<AppLoginPage />} />

              {/* T1 · 운영자 콘솔 — 실제로는 admin.semo-jum.com 로 분리해 띄웁니다. */}
              <Route element={<RequireRole roles={['ROLE_ADMIN']} loginPath="/login" />}>
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<Navigate to="/admin/stats" replace />} />
                  <Route path="stats" element={<StatsPage />} />
                  <Route path="stats/detail" element={<StatsDetailPage />} />
                  <Route path="monitoring" element={<MonitoringPage />} />
                  <Route path="orgs" element={<OrgAccountPage />} />
                  <Route path="inquiries" element={<InquiryPage />} />
                  <Route path="notices" element={<NoticePage />} />
                  <Route path="analysis" element={<AnalysisPage />} />
                </Route>

                {/* 새 창 — 탭 내비게이션 없이 단독으로 뜹니다. */}
                <Route path="/admin/jobs/:jobId" element={<JobDetailWindow />} />
                <Route path="/admin/jobs/:jobId/preview" element={<JobPreviewWindow />} />
                <Route path="/admin/orgs/:orgId" element={<OrgInfoWindow />} />
                <Route path="/admin/accounts/:loginId" element={<AccountInfoWindow />} />
              </Route>

              {/* T2 · 기관 관리 — 실제로는 서비스 앱(semo-jum.com) 안의 탭입니다. */}
              <Route element={<RequireRole roles={['ROLE_ORG_ADMIN']} loginPath="/org/login" />}>
                <Route path="/org" element={<OrgLayout />}>
                  <Route index element={<OrgManagePage />} />
                </Route>
                <Route path="/org/accounts/:loginId" element={<OrgAccountDetailWindow />} />
              </Route>

              <Route path="*" element={<Navigate to="/admin/stats" replace />} />
            </Routes>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
