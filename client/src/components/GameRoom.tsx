'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { getSocket } from '@/lib/socket';
import { CLIENT_EVENTS, SERVER_EVENTS } from '@/lib/events';
import { ClientCell, PlayerInfo, RankedPlayer, Tool, GameStatus } from '@/lib/types';
import ScoreBoard from './ScoreBoard';
import ToolSelector from './ToolSelector';
import GameBoard from './GameBoard';

interface GameRoomProps {
  roomId: string;
  myPlayerId: string;
  myPlayerName: string;
  initialPlayers: PlayerInfo[];
  waitingDeadline?: number;
  onRoomClosed: () => void;
}

export default function GameRoom({
  roomId,
  myPlayerId,
  myPlayerName,
  initialPlayers,
  waitingDeadline,
  onRoomClosed,
}: GameRoomProps) {
  const [players, setPlayers] = useState<PlayerInfo[]>(initialPlayers);
  const [board, setBoard] = useState<ClientCell[][]>([]);
  const [gameStatus, setGameStatus] = useState<GameStatus>('waiting');
  const [currentTool, setCurrentTool] = useState<Tool>('shovel');
  const currentToolRef = useRef<Tool>('shovel');
  const [timeLeft, setTimeLeft] = useState(180);
  const [waitingTimeLeft, setWaitingTimeLeft] = useState(() => {
    if (!waitingDeadline) return 0;
    return Math.max(0, Math.ceil((waitingDeadline - Date.now()) / 1000));
  });
  const [myFreezeEnd, setMyFreezeEnd] = useState<number | undefined>();
  const [winner, setWinner] = useState<string | undefined>();
  const [leaderboardTop3, setLeaderboardTop3] = useState<RankedPlayer[]>([]);
  const [myRanking, setMyRanking] = useState<RankedPlayer | null>(null);
  const [restartDeadlineTs, setRestartDeadlineTs] = useState<number | undefined>();
  const [restartTimeLeft, setRestartTimeLeft] = useState(0);
  const [restartVotesCount, setRestartVotesCount] = useState(0);
  const [restartTotalPlayers, setRestartTotalPlayers] = useState(0);
  const [votedPlayerIds, setVotedPlayerIds] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPseudoFullscreen, setIsPseudoFullscreen] = useState(false);

  const isFrozen = myFreezeEnd !== undefined && Date.now() < myFreezeEnd;
  const freezeTimeLeft = myFreezeEnd ? Math.max(0, Math.ceil((myFreezeEnd - Date.now()) / 1000)) : undefined;

  useEffect(() => {
    const socket = getSocket();

    socket.on(SERVER_EVENTS.PLAYER_JOINED, (data: {
      player: PlayerInfo;
      players?: PlayerInfo[];
      waitingDeadline?: number;
    }) => {
      if (data.players) {
        setPlayers(data.players);
      } else {
        setPlayers(prev => [...prev.filter(p => p.id !== data.player.id), data.player]);
      }
      if (data.waitingDeadline) {
        setWaitingTimeLeft(Math.max(0, Math.ceil((data.waitingDeadline - Date.now()) / 1000)));
      }
    });

    socket.on(SERVER_EVENTS.PLAYER_LEFT, (data: { playerId: string; players?: PlayerInfo[] }) => {
      if (data.players) {
        setPlayers(data.players);
        return;
      }
      setPlayers(prev => prev.filter(p => p.id !== data.playerId));
    });

    socket.on(SERVER_EVENTS.GAME_STARTED, (data: { board: ClientCell[][]; players: PlayerInfo[]; endTime: number }) => {
      setBoard(data.board);
      setPlayers(data.players);
      setGameStatus('playing');
      setLeaderboardTop3([]);
      setMyRanking(null);
      setRestartDeadlineTs(undefined);
      setRestartTimeLeft(0);
      setRestartVotesCount(0);
      setRestartTotalPlayers(0);
      setVotedPlayerIds([]);
      const remaining = Math.ceil((data.endTime - Date.now()) / 1000);
      setTimeLeft(Math.max(0, remaining));
    });

    socket.on(SERVER_EVENTS.CELL_CLICKED, (data: { row: number; col: number; isMine: boolean; cell: ClientCell }) => {
      setBoard(prev => {
        const newBoard = prev.map(row => [...row]);
        if (newBoard[data.row]?.[data.col]) {
          newBoard[data.row][data.col] = { ...newBoard[data.row][data.col], ...data.cell };
        }
        return newBoard;
      });
    });

    socket.on(SERVER_EVENTS.SCORE_UPDATED, (data: { players: PlayerInfo[] }) => {
      setPlayers(data.players);
    });

    socket.on(SERVER_EVENTS.PLAYER_FROZEN, (data: { playerId: string; frozenUntil: number }) => {
      if (data.playerId === myPlayerId) {
        setMyFreezeEnd(data.frozenUntil);
      }
      setPlayers(prev => prev.map(p =>
        p.id === data.playerId ? { ...p, isFrozen: true, frozenUntil: data.frozenUntil } : p
      ));
    });

    socket.on(SERVER_EVENTS.PLAYER_UNFROZEN, (data: { playerId: string }) => {
      if (data.playerId === myPlayerId) {
        setMyFreezeEnd(undefined);
      }
      setPlayers(prev => prev.map(p =>
        p.id === data.playerId ? { ...p, isFrozen: false, frozenUntil: undefined } : p
      ));
    });

    socket.on(SERVER_EVENTS.GAME_ENDED, (data: {
      winner: string;
      players: PlayerInfo[];
      leaderboardTop3?: RankedPlayer[];
      myRanking?: RankedPlayer | null;
      restartDeadline?: number;
      votesCount?: number;
      totalPlayers?: number;
      votedPlayerIds?: string[];
    }) => {
      setGameStatus('ended');
      setWinner(data.winner);
      setPlayers(data.players);
      setLeaderboardTop3(data.leaderboardTop3 || []);
      setMyRanking(data.myRanking || null);
      setRestartDeadlineTs(data.restartDeadline);
      setRestartVotesCount(data.votesCount || 0);
      setRestartTotalPlayers(data.totalPlayers || data.players.length);
      setVotedPlayerIds(data.votedPlayerIds || []);
    });

    socket.on(SERVER_EVENTS.RESTART_VOTE_UPDATED, (data: {
      roomId: string;
      restartDeadline?: number;
      votesCount: number;
      totalPlayers: number;
      votedPlayerIds: string[];
    }) => {
      if (data.roomId !== roomId) return;
      setRestartDeadlineTs(data.restartDeadline);
      setRestartVotesCount(data.votesCount);
      setRestartTotalPlayers(data.totalPlayers);
      setVotedPlayerIds(data.votedPlayerIds);
    });

    socket.on(SERVER_EVENTS.GAME_RESTARTED, (data: { board: ClientCell[][]; players: PlayerInfo[]; endTime: number }) => {
      setBoard(data.board);
      setPlayers(data.players);
      setGameStatus('playing');
      setWinner(undefined);
      setLeaderboardTop3([]);
      setMyRanking(null);
      setRestartDeadlineTs(undefined);
      setRestartTimeLeft(0);
      setRestartVotesCount(0);
      setRestartTotalPlayers(0);
      setVotedPlayerIds([]);
      const remaining = Math.ceil((data.endTime - Date.now()) / 1000);
      setTimeLeft(Math.max(0, remaining));
    });

    socket.on(SERVER_EVENTS.RESTART_VOTE_EXPIRED, (data: { roomId: string; restartDeadline?: number }) => {
      if (data.roomId !== roomId) return;
      setRestartDeadlineTs(data.restartDeadline);
      setRestartTimeLeft(0);
    });

    socket.on(SERVER_EVENTS.ROOM_CLOSED, (data: { roomId: string; reason: string }) => {
      if (data.roomId !== roomId) return;
      alert('방이 30초 내에 시작되지 않아 종료되었습니다.');
      onRoomClosed();
    });

    return () => {
      socket.off(SERVER_EVENTS.PLAYER_JOINED);
      socket.off(SERVER_EVENTS.PLAYER_LEFT);
      socket.off(SERVER_EVENTS.GAME_STARTED);
      socket.off(SERVER_EVENTS.CELL_CLICKED);
      socket.off(SERVER_EVENTS.SCORE_UPDATED);
      socket.off(SERVER_EVENTS.PLAYER_FROZEN);
      socket.off(SERVER_EVENTS.PLAYER_UNFROZEN);
      socket.off(SERVER_EVENTS.GAME_ENDED);
      socket.off(SERVER_EVENTS.ROOM_CLOSED);
      socket.off(SERVER_EVENTS.RESTART_VOTE_UPDATED);
      socket.off(SERVER_EVENTS.GAME_RESTARTED);
      socket.off(SERVER_EVENTS.RESTART_VOTE_EXPIRED);
    };
  }, [myPlayerId, onRoomClosed, roomId]);

  useEffect(() => {
    if (gameStatus !== 'waiting') return;
    if (!waitingDeadline) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((waitingDeadline - Date.now()) / 1000));
      setWaitingTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 250);

    return () => clearInterval(interval);
  }, [gameStatus, waitingDeadline]);

  useEffect(() => {
    if (gameStatus !== 'ended') return;
    if (!restartDeadlineTs) return;

    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((restartDeadlineTs - Date.now()) / 1000));
      setRestartTimeLeft(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 250);

    return () => clearInterval(interval);
  }, [gameStatus, restartDeadlineTs]);

  // 타이머
  useEffect(() => {
    if (gameStatus !== 'playing') return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [gameStatus]);

  // freeze 타이머 업데이트
  useEffect(() => {
    if (!myFreezeEnd) return;
    const interval = setInterval(() => {
      if (Date.now() >= myFreezeEnd) {
        setMyFreezeEnd(undefined);
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, [myFreezeEnd]);

  const handleStartGame = () => {
    getSocket().emit(CLIENT_EVENTS.START_GAME);
  };

  const handleAgreeRestart = () => {
    getSocket().emit(CLIENT_EVENTS.AGREE_RESTART);
  };

  const handleLeaveRoom = () => {
    getSocket().emit(CLIENT_EVENTS.LEAVE_ROOM);
    onRoomClosed();
  };

  const handleCellClick = useCallback((row: number, col: number) => {
    if (isFrozen) return;
    getSocket().emit(CLIENT_EVENTS.CLICK_CELL, { row, col, tool: currentToolRef.current });
  }, [isFrozen]);

  const handleToolSelect = (tool: Tool) => {
    currentToolRef.current = tool;
    setCurrentTool(tool);
    getSocket().emit(CLIENT_EVENTS.SET_TOOL, { tool });
  };

  const winnerPlayer = players.find(p => p.id === winner);
  const myVoted = votedPlayerIds.includes(myPlayerId);

  useEffect(() => {
    const updateFullscreen = () => {
      const doc = document as Document & { webkitFullscreenElement?: Element | null };
      const fullscreenElement = doc.fullscreenElement || doc.webkitFullscreenElement || null;
      const iosStandalone =
        typeof window !== 'undefined' &&
        ((window.navigator as Navigator & { standalone?: boolean }).standalone === true);
      setIsFullscreen(Boolean(fullscreenElement) || iosStandalone);
    };

    updateFullscreen();
    document.addEventListener('fullscreenchange', updateFullscreen);
    document.addEventListener('webkitfullscreenchange', updateFullscreen as EventListener);

    return () => {
      document.removeEventListener('fullscreenchange', updateFullscreen);
      document.removeEventListener('webkitfullscreenchange', updateFullscreen as EventListener);
    };
  }, []);

  const handleToggleFullscreen = async () => {
    const doc = document as Document & {
      webkitExitFullscreen?: () => Promise<void> | void;
      webkitFullscreenElement?: Element | null;
    };
    const root = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void> | void;
    };

    const fullscreenElement = doc.fullscreenElement || doc.webkitFullscreenElement || null;
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    try {
      if (isPseudoFullscreen) {
        setIsPseudoFullscreen(false);
        document.body.style.overflow = '';
        return;
      }

      if (fullscreenElement) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (doc.webkitExitFullscreen) {
          await doc.webkitExitFullscreen();
        }
        return;
      }

      if (root.requestFullscreen) {
        await root.requestFullscreen();
      } else if (root.webkitRequestFullscreen) {
        await root.webkitRequestFullscreen();
      } else {
        // iOS Safari fallback: emulate fullscreen in-page.
        setIsPseudoFullscreen(true);
        document.body.style.overflow = 'hidden';
        window.scrollTo(0, 1);
        if (isIOS) {
          alert('iPhone Safari는 브라우저 전체화면이 제한됩니다. 홈 화면에 추가 후 실행하면 진짜 전체화면으로 사용할 수 있습니다.');
        }
      }
    } catch (err) {
      // iOS Safari에서 표준 API 실패 시 fallback
      setIsPseudoFullscreen(true);
      document.body.style.overflow = 'hidden';
      window.scrollTo(0, 1);
      if (isIOS) {
        alert('iPhone Safari는 브라우저 전체화면이 제한됩니다. 홈 화면에 추가 후 실행하면 진짜 전체화면으로 사용할 수 있습니다.');
      }
    }
  };

  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100dvh',
      overflow: 'hidden',
      position: isPseudoFullscreen ? 'fixed' : 'relative',
      inset: isPseudoFullscreen ? 0 : 'auto',
      zIndex: isPseudoFullscreen ? 9999 : 'auto',
      width: '100%',
    }}>
      <ScoreBoard
        players={players}
        myPlayerId={myPlayerId}
        timeLeft={gameStatus === 'waiting' ? waitingTimeLeft : timeLeft}
        isFullscreen={isFullscreen || isPseudoFullscreen}
        onToggleFullscreen={handleToggleFullscreen}
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <ToolSelector
          currentTool={currentTool}
          onSelectTool={handleToolSelect}
          isFrozen={isFrozen}
          freezeTimeLeft={freezeTimeLeft}
        />

        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          {gameStatus === 'waiting' && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', flex: 1, gap: '16px'
            }}>
              <h2>대기 중...</h2>
              <p style={{ color: '#a8a8b3' }}>플레이어: {players.length}명</p>
              <button
                onClick={handleLeaveRoom}
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  background: '#2d4a6e',
                  color: '#eaeaea',
                  border: '1px solid #3d5a7e',
                  fontWeight: 'bold',
                }}
              >
                방 나가기
              </button>
              <p style={{ color: '#ffd166', fontWeight: 'bold' }}>
                시작 제한: {String(Math.floor(waitingTimeLeft / 60)).padStart(2, '0')}:
                {String(waitingTimeLeft % 60).padStart(2, '0')}
              </p>
              {players.map(p => (
                <div key={p.id} style={{ color: p.color }}>
                  {p.name} {p.id === myPlayerId ? '(나)' : ''}
                </div>
              ))}
              {players.length >= 2 && (
                <button onClick={handleStartGame} style={{
                  padding: '14px 32px', background: '#e94560', color: 'white',
                  borderRadius: '10px', fontSize: '1.1rem', fontWeight: 'bold'
                }}>게임 시작!</button>
              )}
            </div>
          )}

          {gameStatus === 'playing' && board.length > 0 && (
            <>
              <div style={{ padding: '12px 16px' }}>
                <button
                  onClick={handleLeaveRoom}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    background: '#2d4a6e',
                    color: '#eaeaea',
                    border: '1px solid #3d5a7e',
                    fontWeight: 'bold',
                  }}
                >
                  방 나가기
                </button>
              </div>
              <GameBoard
                board={board}
                onCellClick={handleCellClick}
                currentTool={currentTool}
                isFrozen={isFrozen}
              />
            </>
          )}

          {gameStatus === 'ended' && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', flex: 1, gap: '20px'
            }}>
              <h2 style={{ fontSize: '2rem', color: '#e94560' }}>게임 종료!</h2>
              <button
                onClick={handleLeaveRoom}
                style={{
                  padding: '10px 18px',
                  borderRadius: '8px',
                  background: '#2d4a6e',
                  color: '#eaeaea',
                  border: '1px solid #3d5a7e',
                  fontWeight: 'bold',
                }}
              >
                로비로 나가기
              </button>
              {winnerPlayer && (
                <div style={{
                  padding: '20px 40px', background: '#0f3460', borderRadius: '16px',
                  border: `2px solid ${winnerPlayer.color}`, textAlign: 'center'
                }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '8px' }}>승자</div>
                  <div style={{ fontSize: '2rem', fontWeight: 'bold', color: winnerPlayer.color }}>
                    {winnerPlayer.name}
                  </div>
                  <div style={{ fontSize: '1.5rem', color: '#eaeaea' }}>
                    {winnerPlayer.score}점 ({winnerPlayer.foundCount}, {winnerPlayer.wrongCount})
                  </div>
                </div>
              )}
              <div style={{
                padding: '14px 18px',
                background: '#16213e',
                borderRadius: '10px',
                border: '1px solid #2d4a6e',
                minWidth: '340px',
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>누적 랭킹 Top 3</div>
                {leaderboardTop3.length === 0 ? (
                  <div style={{ color: '#a8a8b3' }}>랭킹 데이터 없음</div>
                ) : (
                  leaderboardTop3.map((row) => (
                    <div key={`${row.rank}-${row.name}`} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <span>#{row.rank} {row.name}</span>
                      <span>{row.totalScore}점 ({row.totalFound}, {row.totalWrong})</span>
                    </div>
                  ))
                )}
                {myRanking && (
                  <div style={{ marginTop: '12px', color: '#ffd166', fontWeight: 'bold' }}>
                    내 랭킹: #{myRanking.rank} · {myRanking.totalScore}점 ({myRanking.totalFound}, {myRanking.totalWrong})
                  </div>
                )}
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#ffd166', fontWeight: 'bold', marginBottom: '8px' }}>
                  재시작 동의 마감: {String(Math.floor(restartTimeLeft / 60)).padStart(2, '0')}:{String(restartTimeLeft % 60).padStart(2, '0')}
                </div>
                <div style={{ color: '#a8a8b3', marginBottom: '12px' }}>
                  동의 현황: {restartVotesCount}/{restartTotalPlayers}
                </div>
                <button
                  onClick={handleAgreeRestart}
                  disabled={restartTimeLeft <= 0 || myVoted}
                  style={{
                    padding: '10px 18px',
                    borderRadius: '8px',
                    background: myVoted ? '#2d4a6e' : '#27ae60',
                    color: 'white',
                    border: '1px solid #2d4a6e',
                    fontWeight: 'bold',
                  }}
                >
                  {myVoted ? '동의 완료' : '재시작 동의'}
                </button>
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {[...players].sort((a, b) => b.score - a.score).map((p, i) => (
                  <div key={p.id} style={{
                    padding: '12px 20px', background: '#16213e', borderRadius: '10px',
                    border: `1px solid ${p.color}`, textAlign: 'center'
                  }}>
                    <div style={{ color: '#a8a8b3' }}>#{i+1}</div>
                    <div style={{ color: p.color }}>{p.name}</div>
                    <div style={{ fontWeight: 'bold' }}>{p.score}점 ({p.foundCount}, {p.wrongCount})</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
