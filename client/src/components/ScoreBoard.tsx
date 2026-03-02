'use client';
import { PlayerInfo } from '@/lib/types';

interface ScoreBoardProps {
  players: PlayerInfo[];
  myPlayerId: string;
  timeLeft: number;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export default function ScoreBoard({
  players,
  myPlayerId,
  timeLeft,
  isFullscreen,
  onToggleFullscreen,
}: ScoreBoardProps) {
  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 20px', background: '#16213e', borderBottom: '2px solid #2d4a6e',
      flexWrap: 'wrap', gap: '8px'
    }}>
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
        {players.map(player => (
          <div key={player.id} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '8px 16px', borderRadius: '10px',
            background: player.id === myPlayerId ? '#0f3460' : '#1a1a2e',
            border: `2px solid ${player.color}`,
            opacity: player.isFrozen ? 0.6 : 1,
            position: 'relative', minWidth: '80px'
          }}>
            <div style={{
              width: '10px', height: '10px', borderRadius: '50%',
              background: player.color, marginBottom: '4px'
            }} />
            <span style={{ fontSize: '0.85rem', color: '#a8a8b3' }}>{player.name}</span>
            <span style={{
              fontSize: '1.4rem', fontWeight: 'bold', color: player.color
            }}>{player.score}</span>
            {player.isFrozen && (
              <div style={{
                position: 'absolute', top: '-8px', right: '-8px',
                background: '#74b9ff', borderRadius: '50%',
                width: '20px', height: '20px', display: 'flex',
                alignItems: 'center', justifyContent: 'center', fontSize: '12px'
              }}>&#10052;</div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          fontSize: '1.8rem', fontWeight: 'bold', fontFamily: 'monospace',
          color: timeLeft <= 30 ? '#e94560' : '#eaeaea',
          padding: '8px 16px', background: '#0f3460', borderRadius: '10px'
        }}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </div>
        <button
          onClick={onToggleFullscreen}
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            background: '#0f3460',
            color: '#eaeaea',
            border: '1px solid #2d4a6e',
            fontSize: '0.9rem',
            fontWeight: 'bold',
          }}
        >
          {isFullscreen ? '전체화면 해제' : '전체화면'}
        </button>
      </div>
    </div>
  );
}
