# 세모점 관리자 페이지

기획서 **[서비스 기획] 관리자 페이지 V11** 의 **T1 운영자 콘솔**과 **T2 기관 관리** 화면입니다.
T3 사용량은 이번 범위에서 제외했습니다.

아직 API 명세가 없어 **목업 데이터**로 돌아갑니다. 명세가 나오면 화면을 건드리지 않고 API 구현만 갈아끼웁니다.

## 실행

```bash
npm install
npm run dev        # http://localhost:5173
npm run build
npm run typecheck
```

`.env.example` 을 `.env` 로 복사하면 동작을 바꿀 수 있습니다.

## 화면

| 경로 | 화면 | 비고 |
| --- | --- | --- |
| `/login` | 운영자 콘솔 로그인 | ROLE_ADMIN 만 |
| `/org/login` | 서비스 앱 로그인 | ROLE_ORG_ADMIN · ROLE_USER |
| `/admin/stats` | T1-1 통계 | 첫 화면 |
| `/admin/stats/detail` | T1-2 상세 통계 | 작업량 · 유형별 원가 · 수익성 |
| `/admin/monitoring` | T1-3 실시간 모니터링 | 10초마다 자동 갱신 |
| `/admin/jobs/:jobId` | T1-4 작업 상세 | **새 창** |
| `/admin/jobs/:jobId/preview` | T1-5 변환 결과 미리보기 | **새 창** |
| `/admin/orgs` | T1-6 기관 · 계정 | |
| `/admin/orgs/:orgId` | T1-7 기관 정보 | **새 창** |
| `/admin/accounts/:accountId` | T1-8 계정 정보 | **새 창** · 조회 전용 |
| `/admin/inquiries` | T1-9 문의 | |
| `/admin/notices` | T1-10 공지 | |
| `/admin/analysis` | T1-11 ANALYSIS | 빈 화면 |
| `/org` | T2 기관 관리 | 기관 관리자 화면 |
| `/org/accounts/:accountId` | T2-2 계정 상세 | **새 창** |

기획서 §6 "화면 공통"대로 작업 상세·결과 미리보기·기관 정보·계정 정보는 `window.open` 으로 새 창에 띄웁니다.
목록을 잃지 않고 여러 건을 비교하기 위해서입니다.

실제 배포에서는 T1 을 `admin.semo-jum.com`, T2 를 서비스 앱(`semo-jum.com`)에 둡니다.

지금은 한 저장소에 함께 있어서, **목업 모드일 때만** 헤더에 서로 건너가는 버튼을 둡니다
(T1 헤더의 `T2 기관 관리 화면`, T2 헤더의 `T1 운영자 콘솔`).
누르면 해당 역할의 목업 계정으로 다시 로그인해 그 화면으로 갑니다 — 검토할 때 계정을 다시 입력하지 않으려는 용도이고,
`VITE_API_SOURCE=http` 이면 버튼 자체가 나오지 않습니다. `src/components/MockRoleSwitch.tsx`.

## 로그인과 권한

기획서 §6 "권한별 진입 분리"대로 **주소를 나누고, 진입점마다 받는 역할을 다르게** 했습니다.

| 진입점 | 로그인 화면 | 받는 역할 | 로그인 뒤 |
| --- | --- | --- | --- |
| `admin.semo-jum.com` | `/login` | `ROLE_ADMIN` | T1-1 통계 |
| `semo-jum.com` | `/org/login` | `ROLE_ORG_ADMIN` | T2 기관 관리 |
| | | `ROLE_USER` | T3 사용량 — 이번 범위에 없어 안내만 띄웁니다 |

- 로그인하지 않고 화면에 들어가면 그 진입점의 로그인 화면으로 보내고, 로그인 뒤 원래 보려던 화면으로 되돌립니다.
- 다른 진입점의 계정으로 들어오면 막습니다. **화면에서 막는 것은 편의일 뿐이고, 서버에서도 같이 막아야 합니다.**
- 잠긴 계정은 로그인이 막힙니다 — 기획서 §6 "잠금은 누르는 즉시 로그인을 끊습니다".
- 아이디가 없는 건지 비밀번호가 틀린 건지는 구분해 알려주지 않습니다. 계정 존재 여부가 새기 때문입니다.
- API 가 401 을 돌려주면 세션을 비우고 로그인 화면으로 되돌립니다 (`setUnauthorizedHandler`).

로그인 관련 API 는 `Api['auth']` 에 모아 두었습니다 — `getSession` · `loginAdmin` · `loginApp` · `logout`.
목업은 세션을 `sessionStorage` 에 두어 새로고침해도 유지되고, 로그인 화면 아래에 쓸 수 있는 계정을 띄웁니다.
실제 인증은 **쿠키 세션**을 전제로 잡아 두었습니다(`credentials: 'include'`). 토큰 방식이면 `http/client.ts` 만 고칩니다.

## API 갈아끼우기

화면은 `src/api/index.ts` 가 내보내는 `api` 객체 **하나만** 봅니다.

```
src/api/
├── types.ts        도메인 타입 = API 응답 스키마 · 세션 · 로그인 실패 코드
├── AdminApi.ts     앱이 서버에 요구하는 것 전부 (인터페이스)
├── index.ts        ← 교체 지점. env 로 mock/http 를 고릅니다
├── queries.ts      TanStack Query 훅 + 쿼리 키
├── http/
│   ├── client.ts   fetch 래퍼 · ApiError
│   └── httpApi.ts  실제 서버 구현 (경로는 임시)
└── mock/
    ├── fixtures.ts 기획서 V11 목업 값 + 목업 로그인 계정
    └── mockApi.ts  목업 구현 (메모리 상태 · 지연 흉내)

src/auth/
├── AuthContext.tsx 세션 조회 · 로그인 · 로그아웃
└── RequireRole.tsx 라우트 가드
```

명세가 나오면 순서는 이렇습니다.

1. `types.ts` 를 명세의 응답 스키마에 맞춥니다.
2. `http/httpApi.ts` 의 경로·쿼리·바디를 맞춥니다. 응답 모양이 `types.ts` 와 다르면 여기서 매핑합니다.
3. `.env` 에 `VITE_API_SOURCE=http`, `VITE_API_BASE_URL=...` 를 넣습니다.

화면 코드(`src/pages`, `src/components`)는 이 과정에서 손대지 않습니다.

목업으로 되돌리려면 `VITE_API_SOURCE=mock` 으로 바꾸면 됩니다. 목업 모드에서는 헤더에 `MOCK` 배지가 뜹니다.

### 현재 잡아둔 엔드포인트

`http/httpApi.ts` 에 임시로 적어둔 경로입니다. 명세와 다르면 그 파일만 고칩니다.

- `GET /session`, `POST /admin/login`, `POST /login`, `POST /logout`
- `GET /admin/stats/summary|cost|job-volume|layout-cost|org-profit`
- `GET /admin/jobs`, `GET /admin/jobs/{id}`, `GET /admin/jobs/{id}/preview`, `POST /admin/jobs/{id}/send-to-mypage`
- `GET|POST|DELETE /admin/orgs`, `GET|PATCH /admin/orgs/{id}`, `POST /admin/orgs/{id}/coupons`
- `POST|DELETE /admin/accounts`, `POST /admin/accounts/{id}/lock|password/reset`
- `GET /admin/inquiries`, `POST /admin/inquiries/{id}/replies`
- `GET|POST /admin/notices`
- `GET /org/summary|usage/monthly|notices|accounts|orders`
- `POST /org/credit-requests`, `POST /org/account-requests`

## 기획서에서 그대로 지킨 규칙

- **크레딧과 원가는 다른 값입니다.** 고객 화면(T2)에는 크레딧만, 운영자 화면(T1)에는 둘 다 나옵니다.
- **진행 중인 작업의 소요·원가는 `—`** 로 둡니다. 끝나야 확정됩니다.
- **작업 상태는 넷**뿐입니다 — 업로드 · 진행 중 n/m쪽 · 완료 · 부분 실패 n쪽.
- **사용률 색** — 50% 미만 초록 · 50~80% 주황 · 80% 이상 빨강.
- **실시간 갱신은 모니터링만** 10초. 나머지는 들어올 때 한 번 불러옵니다.
- **CSV 는 화면에 걸린 필터 그대로**, 엑셀에서 한글이 깨지지 않게 UTF-8 BOM 으로 씁니다.
- **T2 의 크레딧 추가·계정 발급 요청은 T1-9 문의 목록으로** 들어가고, 기관 화면에 처리 상태가 남습니다.

## 백엔드에 아직 없는 값

기획서 §7 기준으로, 목업이 채우고 있지만 서버가 새로 만들어야 하는 것들입니다.

- 작업별·쪽별 원가와 레이아웃 유형, 실패 사유 (AI 서버 응답에 실어야 함)
- 원가 환산 단가표 (토큰 단가 · GPU 시간당 단가 · 환율)
- 크레딧 환산 규칙, 계약 단가 — 정해져야 수익성 표가 계산됩니다
- 쿠폰 발급·차감, 결제·수납 기록
- 접속 IP · 위치 · 기기
- 공지 수신 대상, 문의·요청 접수, 계정 별칭 · 발급 요청

## 스택

React 18 · TypeScript · Vite · React Router · TanStack Query.
차트는 기획서 목업 모양에 맞춰 CSS 로 직접 그렸습니다(별도 차트 라이브러리 없음).
