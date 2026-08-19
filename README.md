# 세모점 관리자 페이지

Figma **Semojum** 파일의 `AD-T1-0` ~ `AD-T1-11` (**T1 운영자 콘솔**)과 `V3-06` (**T2 기관 관리**) 화면입니다.
API 는 Notion **[V3] API 명세서**(2026-08-19 판)의 `/api/admin/**` · `/api/org/**` 구간에 맞춰 붙였습니다.
T3 사용량(점역사 화면)은 이번 범위에서 제외했습니다.

기본값은 **목업 데이터**입니다. `.env` 한 줄만 바꾸면 실제 서버로 붙습니다.

## 실행

```bash
npm install
npm run dev        # http://localhost:5173
npm run build
npm run typecheck
```

`.env.example` 을 `.env` 로 복사해 동작을 바꿉니다.

| 변수 | 값 |
| --- | --- |
| `VITE_API_SOURCE` | `mock`(기본) · `http` |
| `VITE_API_BASE_URL` | `http` 일 때 붙을 호스트. 운영 `https://api.semojum.app`, 로컬은 비우고 vite 프록시 사용 |
| `VITE_MOCK_LATENCY` | 목업 응답 지연(ms) |

경로는 명세 그대로 `/api/...` 를 씁니다. `VITE_API_BASE_URL` 에는 **호스트만** 적습니다.

## 화면

| 경로 | 화면 | 주 API |
| --- | --- | --- |
| `/login` | AD-T1-0 로그인 (ROLE_ADMIN 전용) | `POST /api/auth/login` |
| `/org/login` | 서비스 앱 로그인 | 같은 API |
| `/admin/stats` | AD-T1-1 통계 | `GET /api/admin/stats/overview` |
| `/admin/stats/detail` | AD-T1-2 상세 통계 | `stats/workload` · `layout-cost` · `profitability` |
| `/admin/monitoring` | AD-T1-3 실시간 모니터링 | `GET /api/admin/jobs` (10초 폴링) |
| `/admin/jobs/:jobId` | AD-T1-4 작업 상세 · **새 창** | `GET /api/admin/jobs/{jobId}` |
| `/admin/jobs/:jobId/preview` | AD-T1-5 변환 결과 미리보기 · **새 창** | `jobs/{id}/pages/{pageNo}` · `send-to-mypage` |
| `/admin/orgs` | AD-T1-6 기관 · 계정 | `GET /api/admin/orgs` |
| `/admin/orgs/:orgId` | AD-T1-7 기관 정보 · **새 창** | `orgs/{id}` · `orders` · `coupons` |
| `/admin/accounts/:loginId` | AD-T1-8 계정 정보 · **새 창** · 조회 전용 | 전용 API 없음 (아래 참고) |
| `/admin/inquiries` | AD-T1-9 문의 | `GET·PATCH /api/admin/inquiries` |
| `/admin/notices` | AD-T1-10 공지 | `GET·POST /api/admin/notices` |
| `/admin/analysis` | AD-T1-11 ANALYSIS | 빈 화면 |
| `/org` | T2 기관 관리 | `org/dashboard` · `accounts` · `requests` · `notices` · `orders` |
| `/org/accounts/:loginId` | T2-2 계정 상세 · **새 창** | `org/accounts/{loginId}/jobs` |

작업 상세·결과 미리보기·기관 정보·계정 정보는 `window.open` 으로 새 창에 띄웁니다.
목록을 잃지 않고 여러 건을 비교하기 위해서입니다.

실제 배포에서는 T1 을 `admin.semo-jum.com`, T2 를 서비스 앱(`semo-jum.com`)에 둡니다.
지금은 한 저장소에 함께 있어서 **목업 모드일 때만** 헤더에 서로 건너가는 버튼을 둡니다
(`src/components/MockRoleSwitch.tsx`). `VITE_API_SOURCE=http` 이면 나오지 않습니다.

## 로그인과 권한

명세 §로그인: **로그인 API 는 하나**(`POST /api/auth/login`)이고, **응답 `role` 로 화면이 갈립니다.**

| 진입점 | 로그인 화면 | 들이는 역할 | 로그인 뒤 |
| --- | --- | --- | --- |
| `admin.semo-jum.com` | `/login` | `ROLE_ADMIN` | T1-1 통계 |
| `semo-jum.com` | `/org/login` | `ROLE_ORG_ADMIN` | T2 기관 관리 |
| | | `ROLE_USER` | T3 사용량 — 이번 범위에 없어 안내만 |

- 다른 역할이 들어오면 화면이 안내하고 막습니다. **화면 차단은 편의일 뿐, 서버도 같이 막습니다** —
  `/api/admin/**` 는 무토큰 401 · 비ADMIN 토큰 403(`COMMON4003`). `X-Admin-Key` 는 2026-08-19 폐기.
- 오류 문구는 명세 코드로 고릅니다 — `AUTH4001` 아이디/비밀번호, `AUTH4004` 비활성 계정.
  아이디가 없는 건지 비밀번호가 틀린 건지는 구분해 알려주지 않습니다.
- **세션 조회 API 가 없습니다.** 로그인 응답(액세스 1시간 · 리프레시 12시간)을 `localStorage` 에 두고,
  앱이 켜질 때 `POST /api/auth/refresh` 로 살아 있는지 확인해 세션을 복구합니다 (`src/api/http/session.ts`).
- 401 을 받으면 재발급을 **한 번만** 시도하고 그대로 재요청합니다. 재발급도 실패하면 세션을 비우고
  로그인 화면으로 되돌립니다 (`setUnauthorizedHandler`). 잠금(`INACTIVE`)은 활성 세션을 즉시 끊습니다.

## 구조

화면은 `src/api/index.ts` 가 내보내는 `api` 객체 **하나만** 봅니다.

```
src/api/
├── types.ts        도메인 타입 = V3 명세 응답 스키마 (서버 enum 값을 그대로 씁니다)
├── AdminApi.ts     앱이 서버에 요구하는 것 전부 — 메서드마다 실제 경로를 주석에 적어둠
├── index.ts        ← 교체 지점. env 로 mock/http 를 고릅니다
├── queries.ts      TanStack Query 훅 + 쿼리 키
├── http/
│   ├── session.ts  토큰 보관소 (localStorage)
│   ├── client.ts   fetch 래퍼 · 공통 봉투 해제 · Bearer · 401 재발급 · ApiError
│   └── httpApi.ts  V3 명세 구현
└── mock/
    ├── fixtures.ts Figma 목업 값 + 목업 로그인 계정
    └── mockApi.ts  목업 구현 (메모리 상태 · 지연 흉내)
```

명세가 바뀌면 `types.ts` → `http/httpApi.ts` 순으로 고칩니다.
화면 코드(`src/pages`, `src/components`)는 손대지 않습니다.

**서버 enum 을 그대로 들고 다닙니다** — `COMPLETED` · `PAGE_LAYOUT_TEXT` · `ROLE_ADMIN` · `BASIC`.
한국어 문구와 색은 `src/lib/format.ts` 가 붙입니다. 매핑을 한 겹으로 줄이려는 것입니다.

## 서버가 안 주는 값 — 화면이 계산합니다

명세에 "FE 계산"으로 못박힌 것들입니다. 전부 `src/lib/format.ts` 에 모여 있습니다.

| 값 | 계산 |
| --- | --- |
| 작업 소요 | `finishedAt − startedAt` (안 끝났으면 `—`) |
| 막대 위 합계(T1-2) | `completed + failedOrCanceled` |
| 처리 쪽수 증감률 | `pagesProcessed` vs `prevPagesProcessed` |
| 이번 주 원가 증감률 | `thisWeekTotalKrw` vs `lastWeekDailyAvgKrw × 7` |
| 문의 경과(2일 SLA) | `createdAt` 기준. 답변 완료면 `statusChangedAt` 까지 걸린 시간 |
| 크레딧 사용률 · 색 | `used / allocated` · 50% 미만 초록 · 50~80% 주황 · 80% 이상 빨강 |
| 계약 D-day · 소진 예상 | 만료일 − 오늘 · 최근 석 달 평균 사용량으로 어림 |
| "오늘 09:12" · "어제" | `lastLoginAt` 을 오늘 기준으로 다듬음 |
| 쪽별 결과 묶음 "1~7", "11 · 13" | 서버는 쪽 단위로 줍니다. 같은 유형·같은 사유끼리 묶어 표기 |
| CSV | 화면에 걸린 필터 그대로, UTF-8 BOM (`src/lib/csv.ts`) — **BE 엔드포인트 없음** |

## 명세와 어긋나 손질한 곳

- **계정 정보(T1-8)** — 계정 하나만 주는 API 가 없습니다. `GET /api/admin/orgs` 의 계정 줄과
  `GET /api/admin/orgs/{orgId}` 의 기관 할당·사용량을 합쳐 보여줍니다.
- **문의 답변** — 답변 본문을 저장하는 API 가 없습니다. 상태 전환(`OPEN → IN_REVIEW → ANSWERED`)만 하고,
  회신은 기존 경로로 한다고 화면에 적어 두었습니다.
- **작업 상세의 위치** — 서버는 IP 만 줍니다(명세: T1 웹이 GeoIP 로 "서울"을 붙임). GeoIP 연동 전까지 IP 만 표시합니다.
- **계약 유형** — V24 개편(BASIC/STANDARD/PREMIUM/FREE/COUPON)을 기준으로 고르되,
  명세에 개편 전 값(PAID/TRIAL/INTERNAL)이 남은 응답 예시가 있어 읽을 때는 그 값도 받습니다.
- **T1-7 기관 상세 응답** — 명세에 필드가 열거돼 있지 않아 `org/dashboard` 와 같은 모양으로 잡았습니다.
  실제 응답이 다르면 `types.ts` 의 `OrgDetail` 과 `httpApi.getOrg` 만 고칩니다.
- **미리보기 원본** — a·c 모드는 presigned PDF(15분)입니다. 캐시하지 않고 쪽을 넘길 때마다 새로 받습니다.

## 기획에서 그대로 지킨 규칙

- **크레딧과 원가는 다른 값입니다.** 고객 화면(T2)에는 크레딧만, 운영자 화면(T1)에는 둘 다.
- **진행 중인 작업의 소요·원가·크레딧은 `—`** — 끝나야 확정됩니다.
- **작업 상태 표기는 넷** — 업로드 · 진행 중 n/m쪽 · 완료 · 부분 실패 n쪽 (+ 실패).
- **모니터링 목록에 재시도 버튼 없음** — BE 에도 재시도 API 가 없습니다.
- **실시간 갱신은 모니터링만** 10초. 나머지는 들어올 때 한 번.
- **발급 비밀번호는 한 번만 보입니다** — 서버가 해시만 보관합니다. 발급·재발급 결과를 모달로 띄웁니다.
- **T2 의 크레딧 추가·계정 발급 요청은 T1-9 문의 목록으로** 들어가고, 기관 화면에 처리 상태가 남습니다.
- **쿠폰부터 차감**하고, 쿠폰 차감은 계약 잔여를 건드리지 않습니다.

## 스택

React 18 · TypeScript · Vite · React Router · TanStack Query.
차트는 Figma 목업 모양에 맞춰 CSS 로 직접 그렸습니다(차트 라이브러리 없음).
