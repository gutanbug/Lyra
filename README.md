# Lyra

**Jira, Confluence, GitHub, GitLab 등 개발 협업 툴을 하나의 데스크톱 앱에서 통합 관리할 수 있는 애플리케이션입니다.**

여러 서비스에 흩어진 이슈, 문서, PR을 탭 전환 없이 한 화면에서 확인하고 관리할 수 있습니다. Split View를 지원하여 두 서비스를 나란히 비교하며 작업할 수 있습니다.

## 주요 기능

- **통합 워크스페이스** - Jira, Confluence, GitHub, GitLab 등 여러 서비스를 하나의 앱에서 관리
- **멀티 계정** - 서비스별 여러 계정을 등록하고 빠르게 전환
- **Split View** - 두 서비스를 나란히 열어 동시 작업
- **크로스 플랫폼** - macOS, Windows, Linux 지원
- **플러그인 아키텍처** - 어댑터 패턴으로 새로운 서비스를 쉽게 추가 가능

## 설치

[Releases](../../releases) 페이지에서 OS에 맞는 설치 파일을 다운로드하세요.

| OS | 파일 |
|---|---|
| macOS | `.dmg` |
| Windows | `.exe` (installer) |
| Linux | `.AppImage`, `.deb` |

### macOS 보안 경고 해결

![img.png](img.png)

코드 서명이 되어있지 않아 macOS에서 앱 실행 시 보안 경고가 발생할 수 있습니다. 아래 명령어로 해결할 수 있습니다:

```bash
sudo xattr -r -d com.apple.quarantine /Applications/Lyra.app
```

## 개발 환경 설정

### 요구사항

- Node.js 20+
- pnpm

### 실행

```bash
pnpm install             # 패키지 설치

pnpm start               # React 개발 서버 (localhost:3000)
pnpm test                # Jest 테스트
pnpm electron:dev        # Electron 개발 모드 (React HMR + Electron)
pnpm electron:build      # 배포용 패키지 생성 (release/ 폴더)
```

## 기술 스택

- **Frontend** - React 17, TypeScript, styled-components
- **Desktop** - Electron 40, electron-builder
- **상태 관리** - Context API + useReducer + Immer
- **라우팅** - React Router v5 (HashRouter)
- **패키지** - pnpm

## 프로젝트 구조

```
src/
├── pages/              # 라우트 페이지 (JiraPage, AccountSettings 등)
├── containers/         # Smart 컴포넌트 (Context 연결, 상태 로직)
├── components/         # Presentational 컴포넌트 (순수 UI)
├── modules/            # 상태 관리 (Context + useReducer + Immer)
├── controllers/        # API fetch 래퍼
├── lib/                # 훅, 스타일 유틸, 아이콘
└── types/              # 타입 정의

electron/
├── main.ts             # Electron 메인 프로세스
├── preload.ts          # Context Isolation preload
├── integrations/       # 서비스 어댑터 (Jira, 추후 GitHub/GitLab 등)
├── ipc/                # IPC 핸들러
├── account/            # 계정 관리
└── settings/           # 앱 설정 (electron-store)
```