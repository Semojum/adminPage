import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './index'
import type {
  AccountStatus,
  Bucket,
  CreateAccountInput,
  CreateNoticeInput,
  CreateOrderInput,
  CreateOrgInput,
  InquiryStatus,
  InquiryType,
  IssueCouponInput,
  IssuedCredential,
  JobStatusFilter,
  OrgRequestType,
  Period,
  UpdateOrderInput,
  UpdateOrgInput,
} from './types'

/** 쿼리 키는 한곳에 모아둡니다. 무효화(invalidate) 범위를 실수 없이 잡기 위해서입니다. */
export const qk = {
  session: ['session'] as const,

  statsOverview: (period: Period) => ['admin', 'stats', 'overview', period] as const,
  workload: (unit: Bucket) => ['admin', 'stats', 'workload', unit] as const,
  layoutCost: (month: string) => ['admin', 'stats', 'layoutCost', month] as const,
  profitability: (month: string) => ['admin', 'stats', 'profitability', month] as const,

  jobs: (status: JobStatusFilter) => ['admin', 'jobs', status] as const,
  job: (jobId: string) => ['admin', 'job', jobId] as const,
  jobPage: (jobId: string, pageNo: number) => ['admin', 'job', jobId, 'page', pageNo] as const,

  orgs: (month: string | undefined) => ['admin', 'orgs', month ?? 'current'] as const,
  orgsAll: ['admin', 'orgs'] as const,
  org: (orgId: string) => ['admin', 'org', orgId] as const,
  coupons: (orgId: string) => ['admin', 'org', orgId, 'coupons'] as const,
  orders: (orgId: string | undefined) => ['admin', 'orders', orgId ?? 'all'] as const,

  inquiries: (status: InquiryStatus | 'all', type: InquiryType | 'all') =>
    ['admin', 'inquiries', status, type] as const,
  notices: ['admin', 'notices'] as const,

  orgDashboard: ['org', 'dashboard'] as const,
  orgAccounts: ['org', 'accounts'] as const,
  orgRequests: ['org', 'requests'] as const,
  orgNotices: ['org', 'notices'] as const,
  orgOrders: ['org', 'orders'] as const,
  orgAccountJobs: (loginId: string) => ['org', 'account', loginId, 'jobs'] as const,
}

/* ── T1-1 ── */
export const useStatsOverview = (period: Period) =>
  useQuery({ queryKey: qk.statsOverview(period), queryFn: () => api.admin.getStatsOverview(period) })

/* ── T1-2 ── */
export const useWorkload = (unit: Bucket) =>
  useQuery({ queryKey: qk.workload(unit), queryFn: () => api.admin.getWorkload(unit) })

export const useLayoutCost = (month: string) =>
  useQuery({ queryKey: qk.layoutCost(month), queryFn: () => api.admin.getLayoutCost(month) })

export const useProfitability = (month: string) =>
  useQuery({ queryKey: qk.profitability(month), queryFn: () => api.admin.getProfitability(month) })

/* ── T1-3 ── 명세 §T1-3: 10초마다 폴링합니다. */
export const MONITORING_REFETCH_MS = 10_000

export const useJobs = (status: JobStatusFilter) =>
  useQuery({
    queryKey: qk.jobs(status),
    queryFn: () => api.admin.getJobs({ status }),
    refetchInterval: MONITORING_REFETCH_MS,
    refetchOnWindowFocus: true,
  })

/* ── T1-4 · T1-5 ── */
export const useJob = (jobId: string) =>
  useQuery({ queryKey: qk.job(jobId), queryFn: () => api.admin.getJob(jobId) })

export const useJobPage = (jobId: string, pageNo: number) =>
  useQuery({
    queryKey: qk.jobPage(jobId, pageNo),
    queryFn: () => api.admin.getJobPage(jobId, pageNo),
    // presigned URL 은 15분이면 만료됩니다. 캐시에 오래 두지 않습니다.
    staleTime: 0,
    gcTime: 60_000,
  })

export const useSendJobToMyPage = () =>
  useMutation({
    mutationFn: (input: { jobId: string; targetLoginId?: string }) =>
      api.admin.sendJobToMyPage(input.jobId, input.targetLoginId),
  })

/* ── T1-6 ── */
export const useOrgs = (month?: string) =>
  useQuery({ queryKey: qk.orgs(month), queryFn: () => api.admin.getOrgs(month) })

export const useCreateOrg = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateOrgInput) => api.admin.createOrg(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.orgsAll }),
  })
}

export const useCreateAccounts = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateAccountInput) => api.admin.createAccounts(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.orgsAll }),
  })
}

/** 계정 제어 — 비밀번호 재발급·잠금·삭제 */
export type AdminAccountAction =
  | { type: 'reissuePassword'; loginId: string }
  | { type: 'status'; loginId: string; status: AccountStatus }
  | { type: 'delete'; loginId: string }

export const useAdminAccountAction = () => {
  const qc = useQueryClient()
  // 비밀번호 재발급만 결과(새 비밀번호)를 돌려줍니다.
  return useMutation<IssuedCredential | void, Error, AdminAccountAction>({
    mutationFn: (action) => {
      switch (action.type) {
        case 'reissuePassword':
          return api.admin.reissuePassword(action.loginId)
        case 'status':
          return api.admin.setAccountStatus(action.loginId, action.status)
        case 'delete':
          return api.admin.deleteAccount(action.loginId)
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.orgsAll }),
  })
}

export const useDeleteOrg = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (orgId: string) => api.admin.deleteOrg(orgId),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.orgsAll }),
  })
}

/* ── T1-7 ── */
export const useOrg = (orgId: string) =>
  useQuery({ queryKey: qk.org(orgId), queryFn: () => api.admin.getOrg(orgId), enabled: Boolean(orgId) })

export const useUpdateOrg = (orgId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: UpdateOrgInput) => api.admin.updateOrg(orgId, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.org(orgId) })
      qc.invalidateQueries({ queryKey: qk.orgsAll })
    },
  })
}

export const useCoupons = (orgId: string) =>
  useQuery({ queryKey: qk.coupons(orgId), queryFn: () => api.admin.getCoupons(orgId) })

export const useIssueCoupon = (orgId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: IssueCouponInput) => api.admin.issueCoupon(orgId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.coupons(orgId) }),
  })
}

export const useAdminOrders = (organizationId?: string) =>
  useQuery({
    queryKey: qk.orders(organizationId),
    queryFn: () => api.admin.getOrders(organizationId),
  })

export const useCreateOrder = (organizationId?: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateOrderInput) => api.admin.createOrder(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.orders(organizationId) }),
  })
}

export const useUpdateOrder = (organizationId?: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { orderId: string } & UpdateOrderInput) =>
      api.admin.updateOrder(input.orderId, { paidAt: input.paidAt, invoiceStatus: input.invoiceStatus }),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.orders(organizationId) }),
  })
}

/* ── T1-9 ── */
export const useInquiries = (status: InquiryStatus | 'all', type: InquiryType | 'all') =>
  useQuery({
    queryKey: qk.inquiries(status, type),
    queryFn: () =>
      api.admin.getInquiries({
        status: status === 'all' ? undefined : status,
        type: type === 'all' ? undefined : type,
      }),
  })

export const useSetInquiryStatus = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { inquiryId: string; status: InquiryStatus }) =>
      api.admin.setInquiryStatus(input.inquiryId, input.status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'inquiries'] }),
  })
}

/* ── T1-10 ── */
export const useNotices = () => useQuery({ queryKey: qk.notices, queryFn: () => api.admin.getNotices() })

export const useCreateNotice = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateNoticeInput) => api.admin.createNotice(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.notices }),
  })
}

/* ── T2 ── */
export const useOrgDashboard = () =>
  useQuery({ queryKey: qk.orgDashboard, queryFn: () => api.org.getDashboard() })

export const useOrgAccounts = () =>
  useQuery({ queryKey: qk.orgAccounts, queryFn: () => api.org.getAccounts() })

export const useOrgRequests = () =>
  useQuery({ queryKey: qk.orgRequests, queryFn: () => api.org.getRequests() })

export const useOrgNotices = () =>
  useQuery({ queryKey: qk.orgNotices, queryFn: () => api.org.getNotices() })

export const useOrgOrders = () =>
  useQuery({ queryKey: qk.orgOrders, queryFn: () => api.org.getOrders() })

export type OrgAccountAction =
  | { type: 'lock'; loginId: string; locked: boolean }
  | { type: 'alias'; loginId: string; alias: string | null }

export const useOrgAccountAction = () => {
  const qc = useQueryClient()
  // 잠금만 결과(중단된 변환 수)를 돌려줍니다.
  return useMutation<{ canceledJobs: number } | void, Error, OrgAccountAction>({
    mutationFn: (action) =>
      action.type === 'lock'
        ? api.org.setAccountLocked(action.loginId, action.locked)
        : api.org.setAccountAlias(action.loginId, action.alias),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.orgAccounts }),
  })
}

export const useCreateOrgRequest = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { type: OrgRequestType; message?: string }) => api.org.createRequest(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.orgRequests }),
  })
}

export const useCancelOrgRequest = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (requestId: string) => api.org.cancelRequest(requestId),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.orgRequests }),
  })
}

export const useUpdateReceiptEmail = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (email: string | null) => api.org.updateReceiptEmail(email),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.orgOrders }),
  })
}

/* ── T2-2 ── */
export const useOrgAccountJobs = (loginId: string) =>
  useQuery({ queryKey: qk.orgAccountJobs(loginId), queryFn: () => api.org.getAccountJobs(loginId) })
