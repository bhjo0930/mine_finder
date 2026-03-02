# 💣 온라인 멀티 지뢰찾기

실시간 멀티플레이어 지뢰찾기 게임입니다. 2~5명이 동시에 접속하여 같은 보드에서 경쟁합니다.

---

## 스크린샷

> 로비에서 방을 만들거나 참가하고, 게임이 시작되면 다른 플레이어와 실시간으로 지뢰를 찾습니다.

---

## 게임 방법

### 기본 규칙

- **2~5명**이 동일한 보드(16×16, 지뢰 40개)에서 동시에 플레이
- 제한 시간은 **3분**, 시간이 끝나거나 모든 지뢰가 처리되면 게임 종료
- **가장 높은 점수**를 가진 플레이어가 승리

### 도구

| 도구 | 설명 | 성공 | 실패 |
|------|------|------|------|
| 🪓 삽 | 안전한 셀을 클릭하여 열기 | 점수 없음 | **-1점** + 10초 행동 불가 |
| 💣 폭탄 | 지뢰 위치를 맞추기 | **+1점** | **-1점** + 10초 행동 불가 |

### 점수 시스템

- 폭탄 도구로 지뢰를 정확히 맞추면 **+1점**
- 잘못된 클릭(삽으로 지뢰 밟기, 폭탄으로 빈 셀 클릭)은 **-1점** + **10초 동결**
- 동결 중에는 아무 행동도 불가

### 재시작 투표

게임 종료 후 1분 내에 모든 플레이어가 동의하면 같은 방에서 재시작할 수 있습니다.

---

## 기술 스택

### 프론트엔드
- **Next.js 14** (App Router)
- **React 18** + TypeScript
- **Socket.IO Client 4.7**

### 백엔드
- **Node.js** + **Express 4**
- **Socket.IO 4.7** (실시간 통신)
- **SQLite3** (랭킹 데이터 저장)
- **TypeScript** + **Jest** (테스트)

---

## 프로젝트 구조

```
mine_finder/
├── client/                  # Next.js 프론트엔드
│   └── src/
│       ├── app/             # 페이지 및 레이아웃
│       ├── components/      # UI 컴포넌트
│       │   ├── Lobby.tsx        # 로비 (방 목록, 생성, 참가)
│       │   ├── GameRoom.tsx     # 게임 룸 (메인 게임 화면)
│       │   ├── GameBoard.tsx    # 지뢰찾기 보드
│       │   ├── ScoreBoard.tsx   # 점수판
│       │   └── ToolSelector.tsx # 도구 선택
│       └── lib/
│           ├── socket.ts        # Socket.IO 클라이언트 설정
│           ├── events.ts        # 이벤트 상수
│           └── types.ts         # 타입 정의
│
└── server/                  # Node.js 백엔드
    └── src/
        ├── index.ts             # 서버 진입점
        ├── game/
        │   ├── gameManager.ts   # 게임 방/상태 관리
        │   ├── boardGenerator.ts# 보드 생성 로직
        │   ├── gameConfig.ts    # 게임 설정값
        │   └── types.ts         # 타입 정의
        ├── socket/
        │   └── socketHandler.ts # Socket.IO 이벤트 핸들러
        └── db/
            └── rankingRepository.ts # 랭킹 DB 처리
```

---

## 설치 및 실행

### 사전 요구사항

- Node.js 18 이상
- npm

### 서버 실행

```bash
cd server
npm install
npm run dev        # 개발 모드 (nodemon)
```

서버는 기본적으로 `http://localhost:4000`에서 실행됩니다.

### 클라이언트 실행

```bash
cd client
npm install
npm run dev        # 개발 모드 (Next.js)
```

클라이언트는 기본적으로 `http://localhost:3000`에서 실행됩니다.

### 테스트 실행

```bash
cd server
npm test               # 테스트 실행
npm run test:coverage  # 커버리지 포함 실행
```

---

## 게임 설정값

| 항목 | 기본값 |
|------|--------|
| 보드 크기 | 16 × 16 |
| 지뢰 수 | 40개 |
| 게임 시간 | 3분 (180초) |
| 동결 시간 | 10초 |
| 방 대기 시간 | 30초 |
| 재시작 투표 시간 | 1분 |
| 최대 인원 | 5명 |

---

## Socket.IO 이벤트

### 클라이언트 → 서버

| 이벤트 | 설명 |
|--------|------|
| `create-room` | 새 방 생성 |
| `join-room` | 방 참가 |
| `leave-room` | 방 나가기 |
| `start-game` | 게임 시작 |
| `click-cell` | 셀 클릭 |
| `set-tool` | 도구 변경 |
| `agree-restart` | 재시작 동의 |
| `get-rooms` | 방 목록 요청 |

### 서버 → 클라이언트

| 이벤트 | 설명 |
|--------|------|
| `room-created` | 방 생성 완료 |
| `room-joined` | 방 참가 완료 |
| `player-joined` | 다른 플레이어 입장 |
| `player-left` | 플레이어 퇴장 |
| `game-started` | 게임 시작 |
| `cell-clicked` | 셀 클릭 결과 |
| `score-updated` | 점수 업데이트 |
| `player-frozen` | 플레이어 동결 |
| `player-unfrozen` | 동결 해제 |
| `game-ended` | 게임 종료 |
| `restart-vote-updated` | 재시작 투표 현황 |
| `game-restarted` | 게임 재시작 |
| `room-list` | 방 목록 |
| `room-closed` | 방 닫힘 |
