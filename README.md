# 온라인 멀티 지뢰찾기

실시간 멀티플레이어 지뢰찾기 게임

## 게임 규칙
- 2-5명이 동시에 플레이
- 게임 시간: 3분
- 폭탄 도구로 지뢰 발견: +1점
- 잘못 클릭: -1점 + 10초 행동 불가
- 가장 높은 점수를 가진 플레이어가 승리

## 도구
- 삽: 안전한 셀을 파내는 도구 (지뢰를 밟으면 패널티)
- 폭탄: 지뢰 위치를 표시하는 도구 (맞추면 +1점, 틀리면 패널티)

## 설치 및 실행

### 서버 실행
```bash
cd server
npm install
npm run dev
```

### 클라이언트 실행
```bash
cd client
npm install
npm run dev
```

### 테스트 실행
```bash
cd server
npm test
npm run test:coverage
```

## 기술 스택
- 프론트엔드: Next.js 14, React 18, TypeScript
- 백엔드: Node.js, Express, Socket.io
- 테스트: Jest, ts-jest
