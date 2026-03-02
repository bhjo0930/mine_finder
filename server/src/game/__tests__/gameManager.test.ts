import { GameManager } from '../gameManager';

describe('GameManager', () => {
  let manager: GameManager;

  beforeEach(() => {
    manager = new GameManager();
  });

  afterEach(() => {
    manager.getRoomList().forEach((room) => manager.endGame(room.id));
    jest.useRealTimers();
  });

  describe('방 생성 및 참가', () => {
    test('방을 생성할 수 있다', () => {
      const room = manager.createRoom(2);
      expect(room.id).toBeDefined();
      expect(room.status).toBe('waiting');
      expect(room.maxPlayers).toBe(2);
    });

    test('플레이어가 방에 참가할 수 있다', () => {
      const room = manager.createRoom(4);
      const result = manager.joinRoom(room.id, 'player1', 'Alice');
      expect(result.success).toBe(true);
      expect(result.room?.players.get('player1')).toBeDefined();
    });

    test('방이 가득 찼을 때 참가 불가', () => {
      const room = manager.createRoom(2);
      manager.joinRoom(room.id, 'p1', 'Alice');
      manager.joinRoom(room.id, 'p2', 'Bob');
      const result = manager.joinRoom(room.id, 'p3', 'Charlie');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Room is full');
    });

    test('1명일 때 게임 시작 불가', () => {
      const room = manager.createRoom(4);
      manager.joinRoom(room.id, 'p1', 'Alice');
      const result = manager.startGame(room.id);
      expect(result.success).toBe(false);
      manager.endGame(room.id);
    });

    test('방 목록에 참가자 이름 기반 방 이름이 포함된다', () => {
      const room = manager.createRoom(2);
      manager.joinRoom(room.id, 'p1', 'Alice');
      manager.joinRoom(room.id, 'p2', 'Bob');

      const roomList = manager.getRoomList();
      const targetRoom = roomList.find((item) => item.id === room.id);
      expect(targetRoom).toBeDefined();
      expect(targetRoom?.roomName).toContain('Alice');
      expect(targetRoom?.roomName).toContain('Bob');

      manager.endGame(room.id);
    });
  });

  describe('게임 진행', () => {
    let roomId: string;

    beforeEach(() => {
      const room = manager.createRoom(4);
      roomId = room.id;
      manager.joinRoom(roomId, 'p1', 'Alice');
      manager.joinRoom(roomId, 'p2', 'Bob');
      manager.startGame(roomId);
    });

    afterEach(() => {
      manager.endGame(roomId);
    });

    test('게임 시작 시 보드가 생성된다', () => {
      const room = manager.getRoom(roomId);
      expect(room?.board.length).toBe(16);
      expect(room?.status).toBe('playing');
    });

    test('셀 클릭이 동작한다', () => {
      const room = manager.getRoom(roomId);
      if (!room) return;

      // 안전한 셀 찾기
      let safeRow = 0, safeCol = 0;
      outer: for (let r = 0; r < 16; r++) {
        for (let c = 0; c < 16; c++) {
          if (!room.board[r][c].isMine) {
            safeRow = r; safeCol = c;
            break outer;
          }
        }
      }

      const result = manager.clickCell(roomId, 'p1', safeRow, safeCol);
      expect(result.success).toBe(true);
      expect(result.player?.foundCount).toBe(0);
      expect(result.player?.wrongCount).toBe(0);
    });

    test('폭탄 도구로 지뢰 클릭 시 +1점', () => {
      const room = manager.getRoom(roomId);
      if (!room) return;

      manager.setTool(roomId, 'p1', 'bomb');

      // 지뢰 셀 찾기
      let mineRow = -1, mineCol = -1;
      outer: for (let r = 0; r < 16; r++) {
        for (let c = 0; c < 16; c++) {
          if (room.board[r][c].isMine) {
            mineRow = r; mineCol = c;
            break outer;
          }
        }
      }

      if (mineRow === -1) return; // 지뢰 없으면 스킵

      const result = manager.clickCell(roomId, 'p1', mineRow, mineCol);
      expect(result.scoreChange).toBe(1);
      expect(result.player?.score).toBe(1);
    });

    test('폭탄 도구로 안전한 셀 클릭 시 -1점 + freeze', () => {
      const room = manager.getRoom(roomId);
      if (!room) return;

      manager.setTool(roomId, 'p1', 'bomb');

      // 안전한 셀 찾기
      let safeRow = 0, safeCol = 0;
      outer: for (let r = 0; r < 16; r++) {
        for (let c = 0; c < 16; c++) {
          if (!room.board[r][c].isMine) {
            safeRow = r; safeCol = c;
            break outer;
          }
        }
      }

      const result = manager.clickCell(roomId, 'p1', safeRow, safeCol);
      expect(result.scoreChange).toBe(-1);
      expect(result.frozen).toBe(true);
      expect(result.player?.isFrozen).toBe(true);
    });

    test('삽 도구로 지뢰 클릭 시 -1점 + freeze', () => {
      const room = manager.getRoom(roomId);
      if (!room) return;

      let mineRow = -1, mineCol = -1;
      outer: for (let r = 0; r < 16; r++) {
        for (let c = 0; c < 16; c++) {
          if (room.board[r][c].isMine) {
            mineRow = r; mineCol = c;
            break outer;
          }
        }
      }

      if (mineRow === -1) return;

      const result = manager.clickCell(roomId, 'p1', mineRow, mineCol);
      expect(result.scoreChange).toBe(-1);
      expect(result.frozen).toBe(true);
      expect(result.player?.isFrozen).toBe(true);
    });

    test('삽 도구로 안전 셀(주변 지뢰 있음) 클릭 시 freeze가 발생하지 않는다', () => {
      const room = manager.getRoom(roomId);
      if (!room) return;

      let targetRow = -1, targetCol = -1;
      outer: for (let r = 0; r < 16; r++) {
        for (let c = 0; c < 16; c++) {
          const cell = room.board[r][c];
          if (!cell.isMine && cell.adjacentMines > 0) {
            targetRow = r;
            targetCol = c;
            break outer;
          }
        }
      }

      if (targetRow === -1) return;

      const result = manager.clickCell(roomId, 'p1', targetRow, targetCol);
      expect(result.success).toBe(true);
      expect(result.scoreChange).toBe(0);
      expect(result.frozen).toBe(false);
      expect(result.player?.isFrozen).toBe(false);
    });

    test('이미 공개된 셀은 클릭 불가', () => {
      const room = manager.getRoom(roomId);
      if (!room) return;

      let safeRow = 0, safeCol = 0;
      outer: for (let r = 0; r < 16; r++) {
        for (let c = 0; c < 16; c++) {
          if (!room.board[r][c].isMine) {
            safeRow = r; safeCol = c;
            break outer;
          }
        }
      }

      manager.clickCell(roomId, 'p1', safeRow, safeCol);
      const result2 = manager.clickCell(roomId, 'p2', safeRow, safeCol);
      expect(result2.success).toBe(false);
    });

    test('동결된 플레이어는 행동 불가', () => {
      const room = manager.getRoom(roomId);
      if (!room) return;

      manager.setTool(roomId, 'p1', 'bomb');

      // 안전한 셀로 freeze 유발
      let safeRow = 0, safeCol = 0, safeRow2 = 0, safeCol2 = 1;
      for (let r = 0; r < 16; r++) {
        for (let c = 0; c < 16; c++) {
          if (!room.board[r][c].isMine) {
            if (safeRow === 0 && safeCol === 0) { safeRow = r; safeCol = c; }
            else if (safeRow2 === 0 && safeCol2 === 1) { safeRow2 = r; safeCol2 = c; }
          }
        }
      }

      manager.clickCell(roomId, 'p1', safeRow, safeCol); // freeze
      const result = manager.clickCell(roomId, 'p1', safeRow2, safeCol2); // 동결 상태에서 클릭
      expect(result.frozen).toBe(true);
    });

    test('보드 범위를 벗어난 좌표는 클릭 불가', () => {
      const result = manager.clickCell(roomId, 'p1', -1, 0);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid cell position');
    });
  });

  describe('게임 종료', () => {
    test('게임 종료 시 승자가 결정된다', () => {
      const room = manager.createRoom(2);
      const roomId = room.id;
      manager.joinRoom(roomId, 'p1', 'Alice');
      manager.joinRoom(roomId, 'p2', 'Bob');
      manager.startGame(roomId);

      const endedRoom = manager.endGame(roomId);
      expect(endedRoom?.status).toBe('ended');
      expect(endedRoom?.winner).toBeDefined();
    });

    test('시간 만료 시 자동으로 게임이 종료된다', () => {
      jest.useFakeTimers();
      const onEnded = jest.fn();
      const timedManager = new GameManager(onEnded);

      const room = timedManager.createRoom(2);
      timedManager.joinRoom(room.id, 'p1', 'Alice');
      timedManager.joinRoom(room.id, 'p2', 'Bob');

      const started = timedManager.startGame(room.id);
      expect(started.success).toBe(true);
      expect(timedManager.getRoom(room.id)?.status).toBe('playing');

      jest.runAllTimers();

      expect(timedManager.getRoom(room.id)?.status).toBe('ended');
      expect(onEnded).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });

    test('방 생성 후 30초 이내 시작하지 않으면 자동 종료된다', () => {
      jest.useFakeTimers();
      const onRoomClosed = jest.fn();
      const timedManager = new GameManager();
      timedManager.setRoomClosedListener(onRoomClosed);

      const room = timedManager.createRoom(2);
      timedManager.joinRoom(room.id, 'p1', 'Alice');

      expect(timedManager.getRoom(room.id)).toBeDefined();

      jest.advanceTimersByTime(30000);

      expect(timedManager.getRoom(room.id)).toBeUndefined();
      expect(onRoomClosed).toHaveBeenCalledTimes(1);

      jest.useRealTimers();
    });

    test('게임 종료 후 1분 내 모든 플레이어 동의 시 재시작된다', () => {
      jest.useFakeTimers();
      const room = manager.createRoom(2);
      const roomId = room.id;
      manager.joinRoom(roomId, 'p1', 'Alice');
      manager.joinRoom(roomId, 'p2', 'Bob');
      manager.startGame(roomId);
      manager.endGame(roomId);

      const vote1 = manager.voteRestart(roomId, 'p1');
      expect(vote1.success).toBe(true);
      expect(vote1.restarted).toBe(false);

      const vote2 = manager.voteRestart(roomId, 'p2');
      expect(vote2.success).toBe(true);
      expect(vote2.restarted).toBe(true);
      expect(manager.getRoom(roomId)?.status).toBe('playing');

      jest.useRealTimers();
    });
  });
});
