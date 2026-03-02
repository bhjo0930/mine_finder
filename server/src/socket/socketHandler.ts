import { Server, Socket } from 'socket.io';
import { gameManager } from '../game';
import { CLIENT_EVENTS, SERVER_EVENTS } from './events';
import { Tool } from '../game/types';
import { DEFAULT_CONFIG } from '../game/gameConfig';
import { rankingRepository } from '../db/rankingRepository';

interface PlayerSession {
  roomId?: string;
  playerName: string;
}

const playerSessions = new Map<string, PlayerSession>();

function serializeBoard(board: Array<Array<{ id: string; row: number; col: number; state: string; adjacentMines: number }>>): Array<Array<{ id: string; row: number; col: number; state: string; adjacentMines: number }>> {
  return board.map((row) =>
    row.map((cell) => ({
      id: cell.id,
      row: cell.row,
      col: cell.col,
      state: cell.state,
      adjacentMines: cell.adjacentMines,
    }))
  );
}

export function setupSocketHandlers(io: Server): void {
  const restartVoteTimers = new Map<string, NodeJS.Timeout>();

  const emitRoomList = () => {
    io.emit(SERVER_EVENTS.ROOM_LIST, { rooms: gameManager.getRoomList() });
  };

  const clearRestartVoteTimer = (roomId: string) => {
    const timer = restartVoteTimers.get(roomId);
    if (!timer) return;
    clearTimeout(timer);
    restartVoteTimers.delete(roomId);
  };

  const scheduleRestartVoteExpire = (roomId: string, restartDeadline?: number) => {
    clearRestartVoteTimer(roomId);
    if (!restartDeadline) return;
    const delay = Math.max(0, restartDeadline - Date.now());
    const timer = setTimeout(() => {
      const room = gameManager.getRoom(roomId);
      if (!room || room.status !== 'ended') return;
      io.to(roomId).emit(SERVER_EVENTS.RESTART_VOTE_EXPIRED, {
        roomId,
        restartDeadline: room.restartDeadline,
      });
      restartVoteTimers.delete(roomId);
    }, delay);
    restartVoteTimers.set(roomId, timer);
  };

  const emitGameEndedWithRanking = async (roomId: string) => {
    const room = gameManager.getRoom(roomId);
    if (!room || room.status !== 'ended') return;

    const players = Array.from(room.players.values());
    try {
      await rankingRepository.saveGameResult(players);
      const top3 = await rankingRepository.getTop3();
      const votedPlayerIds = Array.from(room.restartVotes);
      const votesCount = room.restartVotes.size;
      const totalPlayers = room.players.size;

      for (const player of players) {
        const myRanking = await rankingRepository.getRankByName(player.name);
        io.to(player.id).emit(SERVER_EVENTS.GAME_ENDED, {
          winner: room.winner,
          players,
          leaderboardTop3: top3,
          myRanking,
          restartDeadline: room.restartDeadline,
          votesCount,
          totalPlayers,
          votedPlayerIds,
        });
      }
    } catch (err) {
      io.to(roomId).emit(SERVER_EVENTS.GAME_ENDED, {
        winner: room.winner,
        players,
        restartDeadline: room.restartDeadline,
        votesCount: room.restartVotes.size,
        totalPlayers: room.players.size,
        votedPlayerIds: Array.from(room.restartVotes),
      });
    }

    scheduleRestartVoteExpire(roomId, room.restartDeadline);
  };

  gameManager.setGameEndedListener((room) => {
    void emitGameEndedWithRanking(room.id);
  });

  gameManager.setRoomClosedListener((room, reason) => {
    clearRestartVoteTimer(room.id);
    io.to(room.id).emit(SERVER_EVENTS.ROOM_CLOSED, { roomId: room.id, reason });
    io.in(room.id).socketsLeave(room.id);

    playerSessions.forEach((session) => {
      if (session.roomId === room.id) {
        session.roomId = undefined;
      }
    });

    emitRoomList();
  });

  io.engine.on('connection', (rawSocket: any) => {
    if (typeof rawSocket?.setNoDelay === 'function') {
      rawSocket.setNoDelay(true);
      return;
    }
    if (typeof rawSocket?.socket?.setNoDelay === 'function') {
      rawSocket.socket.setNoDelay(true);
    }
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);
    playerSessions.set(socket.id, { playerName: `Player_${socket.id.slice(0, 6)}` });

    socket.on(CLIENT_EVENTS.GET_ROOMS, () => {
      socket.emit(SERVER_EVENTS.ROOM_LIST, { rooms: gameManager.getRoomList() });
    });

    socket.on(CLIENT_EVENTS.CREATE_ROOM, (data: { playerName: string; maxPlayers: number }) => {
      try {
        const { playerName, maxPlayers } = data;
        if (maxPlayers < 2 || maxPlayers > 5) {
          socket.emit(SERVER_EVENTS.ERROR, { message: 'maxPlayers must be 2-5' });
          return;
        }

        const session = playerSessions.get(socket.id);
        if (session) session.playerName = playerName;

        const room = gameManager.createRoom(maxPlayers);
        const joinResult = gameManager.joinRoom(room.id, socket.id, playerName);
        if (!joinResult.success) {
          socket.emit(SERVER_EVENTS.ERROR, { message: joinResult.error });
          return;
        }

        socket.join(room.id);
        if (session) session.roomId = room.id;

        socket.emit(SERVER_EVENTS.ROOM_CREATED, {
          roomId: room.id,
          playerId: socket.id,
          player: joinResult.room?.players.get(socket.id),
          players: joinResult.room ? Array.from(joinResult.room.players.values()) : [],
          waitingDeadline: joinResult.room?.waitingDeadline,
        });
        emitRoomList();
      } catch (err) {
        socket.emit(SERVER_EVENTS.ERROR, { message: 'Failed to create room' });
      }
    });

    socket.on(CLIENT_EVENTS.JOIN_ROOM, (data: { roomId: string; playerName: string }) => {
      try {
        const { roomId, playerName } = data;
        const session = playerSessions.get(socket.id);
        if (session) session.playerName = playerName;

        const result = gameManager.joinRoom(roomId, socket.id, playerName);
        if (!result.success) {
          socket.emit(SERVER_EVENTS.ERROR, { message: result.error });
          return;
        }

        socket.join(roomId);
        if (session) session.roomId = roomId;

        const player = result.room?.players.get(socket.id);
        socket.emit(SERVER_EVENTS.ROOM_JOINED, {
          roomId,
          playerId: socket.id,
          player,
          players: result.room ? Array.from(result.room.players.values()) : [],
          waitingDeadline: result.room?.waitingDeadline,
        });

        socket.to(roomId).emit(SERVER_EVENTS.PLAYER_JOINED, {
          player,
          playerCount: result.room?.players.size,
          players: result.room ? Array.from(result.room.players.values()) : [],
          waitingDeadline: result.room?.waitingDeadline,
        });
        emitRoomList();
      } catch (err) {
        socket.emit(SERVER_EVENTS.ERROR, { message: 'Failed to join room' });
      }
    });

    socket.on(CLIENT_EVENTS.LEAVE_ROOM, () => {
      const session = playerSessions.get(socket.id);
      if (!session?.roomId) return;

      const roomId = session.roomId;
      gameManager.removePlayer(roomId, socket.id);
      socket.leave(roomId);
      session.roomId = undefined;

      const room = gameManager.getRoom(roomId);
      io.to(roomId).emit(SERVER_EVENTS.PLAYER_LEFT, {
        playerId: socket.id,
        players: room ? Array.from(room.players.values()) : [],
      });

      if (!room) {
        clearRestartVoteTimer(roomId);
      } else if (room.status === 'ended') {
        io.to(roomId).emit(SERVER_EVENTS.RESTART_VOTE_UPDATED, {
          roomId,
          restartDeadline: room.restartDeadline,
          votesCount: room.restartVotes.size,
          totalPlayers: room.players.size,
          votedPlayerIds: Array.from(room.restartVotes),
        });
      }

      emitRoomList();
    });

    socket.on(CLIENT_EVENTS.START_GAME, () => {
      try {
        const session = playerSessions.get(socket.id);
        if (!session?.roomId) {
          socket.emit(SERVER_EVENTS.ERROR, { message: 'Not in a room' });
          return;
        }

        const result = gameManager.startGame(session.roomId);
        if (!result.success) {
          socket.emit(SERVER_EVENTS.ERROR, { message: result.error });
          return;
        }

        clearRestartVoteTimer(session.roomId);
        const room = result.room!;
        io.to(session.roomId).emit(SERVER_EVENTS.GAME_STARTED, {
          board: serializeBoard(room.board as any),
          players: Array.from(room.players.values()),
          startTime: room.startTime,
          endTime: room.endTime,
        });
        emitRoomList();
      } catch (err) {
        socket.emit(SERVER_EVENTS.ERROR, { message: 'Failed to start game' });
      }
    });

    socket.on(CLIENT_EVENTS.AGREE_RESTART, () => {
      const session = playerSessions.get(socket.id);
      if (!session?.roomId) return;

      const roomId = session.roomId;
      const voteResult = gameManager.voteRestart(roomId, socket.id);
      if (!voteResult.success) {
        if (voteResult.error === 'Restart vote timeout') {
          io.to(roomId).emit(SERVER_EVENTS.RESTART_VOTE_EXPIRED, {
            roomId,
            restartDeadline: voteResult.restartDeadline,
          });
          clearRestartVoteTimer(roomId);
          return;
        }
        socket.emit(SERVER_EVENTS.ERROR, { message: voteResult.error });
        return;
      }

      const room = voteResult.room ?? gameManager.getRoom(roomId);
      if (!room) return;

      if (voteResult.restarted) {
        clearRestartVoteTimer(roomId);
        io.to(roomId).emit(SERVER_EVENTS.GAME_RESTARTED, {
          board: serializeBoard(room.board as any),
          players: Array.from(room.players.values()),
          startTime: room.startTime,
          endTime: room.endTime,
        });
        emitRoomList();
        return;
      }

      io.to(roomId).emit(SERVER_EVENTS.RESTART_VOTE_UPDATED, {
        roomId,
        restartDeadline: room.restartDeadline,
        votesCount: room.restartVotes.size,
        totalPlayers: room.players.size,
        votedPlayerIds: Array.from(room.restartVotes),
      });
    });

    socket.on(CLIENT_EVENTS.CLICK_CELL, (data: { row: number; col: number; tool?: Tool }) => {
      try {
        const session = playerSessions.get(socket.id);
        if (!session?.roomId) return;

        if (data.tool) {
          gameManager.setTool(session.roomId, socket.id, data.tool);
        }

        const result = gameManager.clickCell(session.roomId, socket.id, data.row, data.col);
        if (!result.success) {
          socket.emit(SERVER_EVENTS.ERROR, { message: result.error, frozen: result.frozen });
          return;
        }

        const room = gameManager.getRoom(session.roomId);
        if (!room) return;

        io.to(session.roomId).emit(SERVER_EVENTS.CELL_CLICKED, {
          playerId: socket.id,
          row: data.row,
          col: data.col,
          isMine: result.isMine,
          scoreChange: result.scoreChange,
          player: result.player,
          cell: {
            ...result.cell,
            isMine: result.isMine,
          },
        });

        io.to(session.roomId).emit(SERVER_EVENTS.SCORE_UPDATED, {
          players: Array.from(room.players.values()).map((p) => ({
            id: p.id,
            name: p.name,
            score: p.score,
            foundCount: p.foundCount,
            wrongCount: p.wrongCount,
            isFrozen: p.isFrozen,
            color: p.color,
          })),
        });

        if (result.frozen) {
          io.to(session.roomId).emit(SERVER_EVENTS.PLAYER_FROZEN, {
            playerId: socket.id,
            frozenUntil: result.player?.frozenUntil,
          });

          const roomId = session.roomId;
          setTimeout(() => {
            io.to(roomId).emit(SERVER_EVENTS.PLAYER_UNFROZEN, {
              playerId: socket.id,
            });
          }, DEFAULT_CONFIG.freezeDuration);
        }

        if (room.status === 'ended') {
          void emitGameEndedWithRanking(session.roomId);
        }
      } catch (err) {
        socket.emit(SERVER_EVENTS.ERROR, { message: 'Failed to click cell' });
      }
    });

    socket.on(CLIENT_EVENTS.SET_TOOL, (data: { tool: Tool }) => {
      const session = playerSessions.get(socket.id);
      if (!session?.roomId) return;
      gameManager.setTool(session.roomId, socket.id, data.tool);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);
      const session = playerSessions.get(socket.id);
      if (session?.roomId) {
        const roomId = session.roomId;
        gameManager.removePlayer(roomId, socket.id);
        const room = gameManager.getRoom(roomId);
        socket.to(roomId).emit(SERVER_EVENTS.PLAYER_LEFT, {
          playerId: socket.id,
          players: room ? Array.from(room.players.values()) : [],
        });

        if (!room) {
          clearRestartVoteTimer(roomId);
        } else if (room.status === 'ended') {
          io.to(roomId).emit(SERVER_EVENTS.RESTART_VOTE_UPDATED, {
            roomId,
            restartDeadline: room.restartDeadline,
            votesCount: room.restartVotes.size,
            totalPlayers: room.players.size,
            votedPlayerIds: Array.from(room.restartVotes),
          });
        }
        emitRoomList();
      }

      playerSessions.delete(socket.id);
    });
  });
}
