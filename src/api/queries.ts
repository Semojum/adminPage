import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './index'
import type {
  Bucket,
  CreateAccountInput,
  CreateNoticeInput,
  CreateOrgInput,
  InquiryType,
  IssueCouponInput,
  JobStatus,
  Period,
} from './types'

/** 쿼리 키는 한곳에 모아둡니다. 무효화(invalidate) 범위를 실수 없이 잡기 위해서입니다. */
export const qk = {
  session: ['session'] as const,

  statsSummary: (period: Period) => ['admin', 'stats', 'summary', period] as const,
  costSummary: (period: Period) => ['admin', 'stats', 'cost', period] as const,
  jobVolume: (bucket: Bucket) => ['admin', 'stats', 'jobVolume', bucket] as const,
  layoutCost: (month: string) => ['admin', 'stats', 'layoutCost', month] as const,
  orgProfit: (month: string) => ['admin', 'stats', 'orgProfit', month] as const,

  jobs: (status: JobStatus | 'all') => ['admin', 'jobs', status] as const,
  job: (jobId: string) => ['admin', 'job', jobId] as const,
  jobPreview: (jobId: string) => ['admin', 'job', jobId, 'preview'] as const,

  orgs: ['admin', 'orgs'] as const,
  org: (orgId: string) => ['admin', 'org', orgId] as const,
  account: (accountId: string) => ['admin', 'account', accountId] as const,

  inquiries: (type: InquiryType | 'all', unansweredOnly: boolean) =>
    ['admin', 'inquiries', type, unansweredOnly] as const,
  notices: ['admin', 'notices'] as const,

  orgSummary: ['org', 'summary'] as const,
  orgMonthlyUsage: ['org', 'usage', 'monthly'] as const,
  orgNotices: ['org', 'notices'] as const,
  orgAccounts: ['org', 'accounts'] as const,
  orgOrders: ['org', 'orders'] as const,
  orgAccountDetail: (accountId: string) => ['org', 'account', accountId] as const,
}

/* ── T1-1 ── */
export const useStatsSummary = (period: Period) =>
  useQuery({ queryKey: qk.statsSummary(period), queryFn: () => api.admin.getStatsSummary(period) })

export const useCostSummary = (period: Period) =>
  useQuery({ queryKey: qk.costSummary(period), queryFn: () => api.admin.getCostSummary(period) })

/* ── T1-2 ── */
export const useJobVolume = (bucket: Bucket) =>
  useQuery({ queryKey: qk.jobVolume(bucket), queryFn: () => api.admin.getJobVolume(bucket) })

export const useLayoutCost = (month: string) =>
  useQuery({ queryKey: qk.layoutCost(month), queryFn: () => api.admin.getLayoutCost(month) })

export const useOrgProfit = (month: string) =>
  useQuery({ queryKey: qk.orgProfit(month), queryFn: () => api.admin.getOrgProfit(month) })

/* ── T1-3 ── 기획서 §6: 모니터링만 10초마다 갱신합니다. */
export const MONITORING_REFETCH_MS = 10_000

export const useJobs = (status: JobStatus | 'all') =>
  useQuery({
    queryKey: qk.jobs(status),
    queryFn: () => api.admin.getJobs({ status }),
    refetchInterval: MONITORING_REFETCH_MS,
    refetchOnWindowFocus: true,
  })

/* ── T1-4 · T1-5 ── */
export const useJob = (jobId: string) =>
  useQuery({ queryKey: qk.job(jobId), queryFn: () => api.admin.getJob(jobId) })

export const useJobPreview = (jobId: string) =>
  useQuery({ queryKey: qk.jobPreview(jobId), queryFn: () => api.admin.getJobPreview(jobId) })

export const useSendJobToMyPage = () =>
  useMutation({ mutationFn: (jobId: string) => api.admin.sendJobToMyPage(jobId) })

/* ── T1-6 ── */
export const useOrgs = () => useQuery({ queryKey: qk.orgs, queryFn: () => api.admin.getOrgs() })

export const useCreateOrg = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateOrgInput) => api.admin.createOrg(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.orgs }),
  })
}

export const useCreateAccount = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateAccountInput) => api.admin.createAccount(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.orgs }),
  })
}

export const useAdminAccountAction = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (action: { type: 'resetPassword' | 'lock' | 'unlock' | 'delete'; accountId: string }) => {
      switch (action.type) {
        case 'resetPassword':
          return api.admin.resetAccountPassword(action.accountId)
        case 'lock':
          return api.admin.setAccountLocked(action.accountId, true)
        case 'unlock':
          return api.admin.setAccountLocked(action.accountId, false)
        case 'delete':
          return api.admin.deleteAccount(action.accountId)
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.orgs }),
  })
}

export const useAdminOrgAction = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (action: { type: 'resetAdminPassword' | 'delete'; orgId: string }) =>
      action.type === 'delete'
        ? api.admin.deleteOrg(action.orgId)
        : api.admin.resetOrgAdminPassword(action.orgId),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.orgs }),
  })
}

/* ── T1-7 · T1-8 ── */
export const useOrg = (orgId: string) =>
  useQuery({ queryKey: qk.org(orgId), queryFn: () => api.admin.getOrg(orgId) })

export const useRecordOrderPayment = (orgId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { orderId: string; paidAt: string }) =>
      api.admin.recordOrderPayment(orgId, input.orderId, input.paidAt),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.org(orgId) }),
  })
}

export const useIssueCoupon = (orgId: string) => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: IssueCouponInput) => api.admin.issueCoupon(orgId, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.org(orgId) }),
  })
}

export const useAdminAccount = (accountId: string) =>
  useQuery({ queryKey: qk.account(accountId), queryFn: () => api.admin.getAccount(accountId) })

/* ── T1-9 ── */
export const useInquiries = (type: InquiryType | 'all', unansweredOnly: boolean) =>
  useQuery({
    queryKey: qk.inquiries(type, unansweredOnly),
    queryFn: () => api.admin.getInquiries({ type, unansweredOnly }),
  })

/* ── T1-10 ── */
export const useNotices = () =>
  useQuery({ queryKey: qk.notices, queryFn: () => api.admin.getNotices() })

export const useCreateNotice = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: CreateNoticeInput) => api.admin.createNotice(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.notices }),
  })
}

/* ── T2 ── */
export const useOrgSummary = () =>
  useQuery({ queryKey: qk.orgSummary, queryFn: () => api.org.getSummary() })

export const useOrgMonthlyUsage = () =>
  useQuery({ queryKey: qk.orgMonthlyUsage, queryFn: () => api.org.getMonthlyUsage() })

export const useOrgNoticeList = () =>
  useQuery({ queryKey: qk.orgNotices, queryFn: () => api.org.getNotices() })

export const useOrgAccounts = () =>
  useQuery({ queryKey: qk.orgAccounts, queryFn: () => api.org.getAccounts() })

export const useOrgOrders = () =>
  useQuery({ queryKey: qk.orgOrders, queryFn: () => api.org.getOrders() })

export const useOrgAccountAction = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (action:
      | { type: 'lock' | 'unlock'; accountId: string }
      | { type: 'cancelRequest'; accountId: string }
      | { type: 'alias'; accountId: string; alias: string }) => {
      switch (action.type) {
        case 'lock':
          return api.org.setAccountLocked(action.accountId, true)
        case 'unlock':
          return api.org.setAccountLocked(action.accountId, false)
        case 'cancelRequest':
          return api.org.cancelAccountRequest(action.accountId)
        case 'alias':
          return api.org.updateAccountAlias(action.accountId, action.alias)
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.orgAccounts }),
  })
}

export const useRequestCredit = () =>
  useMutation({ mutationFn: (input: { amount?: number; message?: string }) => api.org.requestCredit(input) })

export const useRequestAccount = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { alias?: string }) => api.org.requestAccount(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.orgAccounts }),
  })
}

export const useUpdateBillingEmail = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (email: string) => api.org.updateBillingEmail(email),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.orgOrders }),
  })
}

/* ── T2-2 ── */
export const useOrgAccountDetail = (accountId: string) =>
  useQuery({
    queryKey: qk.orgAccountDetail(accountId),
    queryFn: () => api.org.getAccountDetail(accountId),
  })
