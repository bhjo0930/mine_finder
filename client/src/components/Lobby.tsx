'use client';
import { useState, useEffect } from 'react';
import { connectSocket, getSocket } from '@/lib/socket';
import { CLIENT_EVENTS, SERVER_EVENTS } from '@/lib/events';
import { PlayerInfo } from '@/lib/types';

interface RoomInfo {
  id: string;
  roomName: string;
  playerNames: string[];
  playerCount: number;
  maxPlayers: number;
  status: string;
  waitingDeadline?: number;
}

interface LobbyProps {
  onEnterRoom: (
    roomId: string,
    playerId: string,
    playerName: string,
    players: PlayerInfo[],
    waitingDeadline?: number
  ) => void;
}

export default function Lobby({ onEnterRoom }: LobbyProps) {
  const [nameInput, setNameInput] = useState('');
  const [savedPlayerName, setSavedPlayerName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [error, setError] = useState('');
  const effectivePlayerName = nameInput.trim() || savedPlayerName.trim();
  const hasUsableName = effectivePlayerName.length > 0;

  useEffect(() => {
    const storedName = localStorage.getItem('mine_finder_player_name') || '';
    if (storedName) {
      setSavedPlayerName(storedName);
      setNameInput(storedName);
    }
  }, []);

  useEffect(() => {
    const socket = connectSocket();
    socket.emit(CLIENT_EVENTS.GET_ROOMS);
    const roomPollInterval = setInterval(() => {
      socket.emit(CLIENT_EVENTS.GET_ROOMS);
    }, 3000);

    socket.on(SERVER_EVENTS.ROOM_LIST, (data: { rooms: RoomInfo[] }) => {
      setRooms(data.rooms);
    });

    socket.on(SERVER_EVENTS.ROOM_CREATED, (data: {
      roomId: string;
      playerId: string;
      players: PlayerInfo[];
      waitingDeadline?: number;
    }) => {
      onEnterRoom(data.roomId, data.playerId, effectivePlayerName, data.players || [], data.waitingDeadline);
    });

    socket.on(SERVER_EVENTS.ROOM_JOINED, (data: {
      roomId: string;
      playerId: string;
      players: PlayerInfo[];
      waitingDeadline?: number;
    }) => {
      onEnterRoom(data.roomId, data.playerId, effectivePlayerName, data.players || [], data.waitingDeadline);
    });

    socket.on(SERVER_EVENTS.ERROR, (data: { message: string }) => {
      setError(data.message);
    });

    return () => {
      clearInterval(roomPollInterval);
      socket.off(SERVER_EVENTS.ROOM_LIST);
      socket.off(SERVER_EVENTS.ROOM_CREATED);
      socket.off(SERVER_EVENTS.ROOM_JOINED);
      socket.off(SERVER_EVENTS.ERROR);
    };
  }, [effectivePlayerName, onEnterRoom]);

  const persistPlayerName = (name: string) => {
    localStorage.setItem('mine_finder_player_name', name);
    setSavedPlayerName(name);
  };

  const handleSaveName = () => {
    const trimmed = nameInput.trim();
    if (!trimmed) {
      setError('이름을 입력하세요');
      return;
    }
    persistPlayerName(trimmed);
    setError('');
  };

  const handleCreateRoom = () => {
    if (!hasUsableName) { setError('이름을 입력하세요'); return; }
    persistPlayerName(effectivePlayerName);
    const socket = getSocket();
    socket.emit(CLIENT_EVENTS.CREATE_ROOM, { playerName: effectivePlayerName, maxPlayers });
    setError('');
  };

  const handleJoinRoom = (roomId: string) => {
    if (!hasUsableName) { setError('이름을 입력하세요'); return; }
    persistPlayerName(effectivePlayerName);
    const socket = getSocket();
    socket.emit(CLIENT_EVENTS.JOIN_ROOM, { roomId, playerName: effectivePlayerName });
    setError('');
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh', padding: '20px', gap: '24px'
    }}>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#e94560' }}>온라인 지뢰찾기</h1>
      <p style={{ color: '#a8a8b3' }}>실시간 멀티플레이어 지뢰찾기 게임</p>

      {error && (
        <div style={{ background: '#e94560', padding: '10px 20px', borderRadius: '8px', color: 'white' }}>
          {error}
        </div>
      )}

      <div style={{
        background: '#16213e', padding: '32px', borderRadius: '16px',
        width: '100%', maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '16px'
      }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>1) 사용자 이름 설정</h2>
        <p style={{ color: '#a8a8b3', fontSize: '0.9rem' }}>
          한 번 저장하면 다음 접속에도 같은 이름을 사용합니다.
        </p>
        <input
          type="text" placeholder="닉네임 입력" value={nameInput}
          onChange={e => setNameInput(e.target.value)}
          style={{
            padding: '12px 16px', borderRadius: '8px', border: '1px solid #2d4a6e',
            background: '#0f3460', color: 'white', fontSize: '1rem', width: '100%'
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
          <span style={{ color: '#a8a8b3', fontSize: '0.9rem' }}>
            현재 이름: <strong style={{ color: '#eaeaea' }}>{savedPlayerName ? savedPlayerName : '미설정'}</strong>
          </span>
          <button onClick={handleSaveName} style={{
            padding: '10px 16px', borderRadius: '8px', background: '#2d8cff',
            color: 'white', fontSize: '0.9rem', fontWeight: 'bold'
          }}>
            이름 저장
          </button>
        </div>
      </div>

      <div style={{
        background: '#16213e', padding: '32px', borderRadius: '16px',
        width: '100%', maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '16px',
        opacity: hasUsableName ? 1 : 0.8
      }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>2) 새 게임 만들기</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ color: '#a8a8b3' }}>인원 수:</label>
          {[2,3,4,5].map(n => (
            <button key={n} onClick={() => setMaxPlayers(n)} style={{
              padding: '8px 16px', borderRadius: '8px', fontSize: '1rem',
              background: maxPlayers === n ? '#e94560' : '#0f3460',
              color: 'white', border: '1px solid #2d4a6e',
              transition: 'background 0.2s'
            }}>{n}인</button>
          ))}
        </div>
        <button onClick={handleCreateRoom} style={{
          padding: '14px', borderRadius: '8px', background: '#e94560',
          color: 'white', fontSize: '1rem', fontWeight: 'bold',
          transition: 'background 0.2s'
        }} disabled={!hasUsableName}>방 만들기</button>
      </div>

      <div style={{
        background: '#16213e', padding: '32px', borderRadius: '16px',
        width: '100%', maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '16px',
        opacity: hasUsableName ? 1 : 0.8
      }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '8px' }}>3) 방 참가하기</h2>
        {rooms.filter(r => r.status === 'waiting').length === 0 ? (
          <p style={{ color: '#a8a8b3', textAlign: 'center' }}>대기 중인 방이 없습니다</p>
        ) : (
          rooms.filter(r => r.status === 'waiting').map(room => (
            <div key={room.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 16px', background: '#0f3460', borderRadius: '8px'
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontWeight: 'bold' }}>{room.roomName}</span>
                <span style={{ color: '#a8a8b3', fontSize: '0.8rem' }}>
                  {room.playerCount}/{room.maxPlayers}인 · {room.id.slice(0, 8)}...
                </span>
              </div>
              <button onClick={() => handleJoinRoom(room.id)} style={{
                padding: '8px 16px', borderRadius: '6px', background: '#e94560',
                color: 'white', fontSize: '0.9rem'
              }} disabled={!hasUsableName}>참가</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
