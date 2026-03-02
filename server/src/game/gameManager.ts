import { v4 as uuidv4 } from 'uuid';
import { GameRoom, Player, Cell, Tool } from './types';
import { generateBoard } from './boardGenerator';
import { DEFAULT_CONFIG, PLAYER_COLORS } from './gameConfig';

export class GameManager {
  private rooms: Map<string, GameRoom> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private waitingRoomTimers: Map<string, NodeJS.Timeout> = new Map();
  private gameEndedListener?: (room: GameRoom) => void;
  private roomClosedListener?: (room: GameRoom, reason: string) => void;

  constructor(gameEndedListener?: (room: GameRoom) => void) {
    this.gameEndedListener = gameEndedListener;
  }

  setGameEndedListener(listener: (room: GameRoom) => void): void {
    this.gameEndedListener = listener;
  }

  setRoomClosedListener(listener: (room: GameRoom, reason: string) => void): void {
    this.roomClosedListener = listener;
  }

  createRoom(maxPlayers: number): GameRoom {
    const room: GameRoom = {
      id: uuidv4(),
      players: new Map(),
      board: [],
      status: 'waiting',
      waitingDeadline: Date.now() + DEFAULT_CONFIG.roomStartTimeout,
      restartVotes: new Set<string>(),
      maxPlayers,
      currentTool: new Map(),
    };
    this.rooms.set(room.id, room);

    const waitingTimer = setTimeout(() => {
      const closedRoom = this.closeRoomIfWaiting(room.id);
      if (closedRoom && this.roomClosedListener) {
        this.roomClosedListener(closedRoom, 'Room closed: not started within 30 seconds');
      }
    }, DEFAULT_CONFIG.roomStartTimeout);
    this.waitingRoomTimers.set(room.id, waitingTimer);

    return room;
  }

  joinRoom(roomId: string, playerId: string, playerName: string): { success: boolean; room?: GameRoom; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Room not found' };
    if (room.status !== 'waiting') return { success: false, error: 'Game already started' };
    if (room.players.size >= room.maxPlayers) return { success: false, error: 'Room is full' };

    const colorIndex = room.players.size;
    const player: Player = {
      id: playerId,
      name: playerName,
      score: 0,
      foundCount: 0,
      wrongCount: 0,
      isFrozen: false,
      color: PLAYER_COLORS[colorIndex],
    };
    room.players.set(playerId, player);
    room.currentTool.set(playerId, 'shovel');
    return { success: true, room };
  }

  startGame(roomId: string): { success: boolean; room?: GameRoom; error?: string } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Room not found' };
    if (room.status === 'playing') return { success: false, error: 'Game already started' };
    if (room.players.size < 2) return { success: false, error: 'Need at least 2 players' };

    room.players.forEach((player) => {
      player.score = 0;
      player.foundCount = 0;
      player.wrongCount = 0;
      player.isFrozen = false;
      player.frozenUntil = undefined;
      room.currentTool.set(player.id, 'shovel');
    });

    room.board = generateBoard(DEFAULT_CONFIG.rows, DEFAULT_CONFIG.cols, DEFAULT_CONFIG.mineCount);
    room.status = 'playing';
    room.waitingDeadline = undefined;
    room.restartDeadline = undefined;
    room.restartVotes.clear();
    room.startTime = Date.now();
    room.endTime = room.startTime + DEFAULT_CONFIG.gameDuration;

    const waitingTimer = this.waitingRoomTimers.get(roomId);
    if (waitingTimer) {
      clearTimeout(waitingTimer);
      this.waitingRoomTimers.delete(roomId);
    }

    const existingTimer = this.timers.get(roomId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      this.timers.delete(roomId);
    }

    const timer = setTimeout(() => {
      const endedRoom = this.endGame(roomId);
      if (endedRoom && this.gameEndedListener) {
        this.gameEndedListener(endedRoom);
      }
    }, DEFAULT_CONFIG.gameDuration);
    this.timers.set(roomId, timer);

    return { success: true, room };
  }

  clickCell(roomId: string, playerId: string, row: number, col: number): {
    success: boolean;
    scoreChange?: number;
    isMine?: boolean;
    cell?: Cell;
    player?: Player;
    frozen?: boolean;
    error?: string;
  } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Room not found' };
    if (room.status !== 'playing') return { success: false, error: 'Game not playing' };

    const player = room.players.get(playerId);
    if (!player) return { success: false, error: 'Player not found' };

    if (
      row < 0 ||
      col < 0 ||
      row >= room.board.length ||
      col >= (room.board[row]?.length ?? 0)
    ) {
      return { success: false, error: 'Invalid cell position' };
    }

    // 행동 불가 상태 확인
    if (player.isFrozen && player.frozenUntil && Date.now() < player.frozenUntil) {
      return { success: false, error: 'Player is frozen', frozen: true };
    }

    // 행동 불가 해제
    if (player.isFrozen) {
      player.isFrozen = false;
      player.frozenUntil = undefined;
    }

    const cell = room.board[row][col];
    if (cell.state !== 'hidden') return { success: false, error: 'Cell already revealed' };

    const tool = room.currentTool.get(playerId) || 'shovel';

    cell.state = 'revealed';
    cell.revealedBy = playerId;

    let scoreChange = 0;
    let frozen = false;

    if (tool === 'bomb') {
      // 폭탄 도구 사용: 지뢰 맞추면 +1, 틀리면 -1 + freeze
      if (cell.isMine) {
        scoreChange = 1;
        player.score += 1;
        player.foundCount += 1;
      } else {
        scoreChange = -1;
        player.score -= 1;
        player.wrongCount += 1;
        player.isFrozen = true;
        player.frozenUntil = Date.now() + DEFAULT_CONFIG.freezeDuration;
        frozen = true;
      }
    } else {
      // 삽 도구 사용: 안전한 셀 맞추면 0, 지뢰 밟으면 -1 + freeze
      if (cell.isMine) {
        scoreChange = -1;
        player.score -= 1;
        player.wrongCount += 1;
        player.isFrozen = true;
        player.frozenUntil = Date.now() + DEFAULT_CONFIG.freezeDuration;
        frozen = true;
      } else {
        scoreChange = 0;
      }
    }

    return { success: true, scoreChange, isMine: cell.isMine, cell, player, frozen };
  }

  setTool(roomId: string, playerId: string, tool: Tool): boolean {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    room.currentTool.set(playerId, tool);
    return true;
  }

  endGame(roomId: string): GameRoom | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    if (room.status === 'ended') return room;

    room.status = 'ended';
    room.restartDeadline = Date.now() + DEFAULT_CONFIG.restartVoteTimeout;
    room.restartVotes.clear();

    // 승자 결정 (점수 최고)
    let maxScore = -Infinity;
    let winner = '';
    room.players.forEach((player) => {
      if (player.score > maxScore) {
        maxScore = player.score;
        winner = player.id;
      }
    });
    room.winner = winner;

    // 타이머 정리
    const timer = this.timers.get(roomId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(roomId);
    }
    const waitingTimer = this.waitingRoomTimers.get(roomId);
    if (waitingTimer) {
      clearTimeout(waitingTimer);
      this.waitingRoomTimers.delete(roomId);
    }

    return room;
  }

  voteRestart(roomId: string, playerId: string): {
    success: boolean;
    error?: string;
    votesCount?: number;
    totalPlayers?: number;
    restartDeadline?: number;
    restarted?: boolean;
    room?: GameRoom;
  } {
    const room = this.rooms.get(roomId);
    if (!room) return { success: false, error: 'Room not found' };
    if (room.status !== 'ended') return { success: false, error: 'Game is not ended' };
    if (!room.players.has(playerId)) return { success: false, error: 'Player not found' };
    if (!room.restartDeadline || Date.now() > room.restartDeadline) {
      return { success: false, error: 'Restart vote timeout' };
    }

    room.restartVotes.add(playerId);
    const votesCount = room.restartVotes.size;
    const totalPlayers = room.players.size;

    if (votesCount >= totalPlayers && totalPlayers >= 2) {
      const restarted = this.startGame(roomId);
      if (!restarted.success || !restarted.room) {
        return { success: false, error: restarted.error };
      }
      return {
        success: true,
        votesCount,
        totalPlayers,
        restartDeadline: room.restartDeadline,
        restarted: true,
        room: restarted.room,
      };
    }

    return {
      success: true,
      votesCount,
      totalPlayers,
      restartDeadline: room.restartDeadline,
      restarted: false,
      room,
    };
  }

  getRoom(roomId: string): GameRoom | undefined {
    return this.rooms.get(roomId);
  }

  removePlayer(roomId: string, playerId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    room.players.delete(playerId);
    room.currentTool.delete(playerId);
    room.restartVotes.delete(playerId);
    if (room.players.size === 0) {
      const timer = this.timers.get(roomId);
      if (timer) {
        clearTimeout(timer);
        this.timers.delete(roomId);
      }
      const waitingTimer = this.waitingRoomTimers.get(roomId);
      if (waitingTimer) {
        clearTimeout(waitingTimer);
        this.waitingRoomTimers.delete(roomId);
      }
      this.rooms.delete(roomId);
    }
  }

  getRoomList(): Array<{ id: string; roomName: string; playerNames: string[]; playerCount: number; maxPlayers: number; status: string; waitingDeadline?: number }> {
    const list: Array<{ id: string; roomName: string; playerNames: string[]; playerCount: number; maxPlayers: number; status: string; waitingDeadline?: number }> = [];
    this.rooms.forEach((room) => {
      const playerNames = Array.from(room.players.values()).map((player) => player.name);
      const roomName = playerNames.length > 0 ? `${playerNames.join(', ')}의 방` : '대기방';
      list.push({
        id: room.id,
        roomName,
        playerNames,
        playerCount: room.players.size,
        maxPlayers: room.maxPlayers,
        status: room.status,
        waitingDeadline: room.waitingDeadline,
      });
    });
    return list;
  }

  private closeRoomIfWaiting(roomId: string): GameRoom | null {
    const room = this.rooms.get(roomId);
    if (!room) return null;
    if (room.status !== 'waiting') return null;

    const waitingTimer = this.waitingRoomTimers.get(roomId);
    if (waitingTimer) {
      clearTimeout(waitingTimer);
      this.waitingRoomTimers.delete(roomId);
    }

    this.rooms.delete(roomId);
    return room;
  }
}

export const gameManager = new GameManager();
