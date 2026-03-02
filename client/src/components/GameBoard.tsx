'use client';
import { ClientCell, Tool } from '@/lib/types';

interface GameBoardProps {
  board: ClientCell[][];
  onCellClick: (row: number, col: number) => void;
  currentTool: Tool;
  isFrozen: boolean;
}

const MINE_COLORS: Record<number, string> = {
  1: '#3498db', 2: '#27ae60', 3: '#e74c3c', 4: '#8e44ad',
  5: '#c0392b', 6: '#1abc9c', 7: '#2c3e50', 8: '#95a5a6',
};

export default function GameBoard({ board, onCellClick, currentTool, isFrozen }: GameBoardProps) {
  const cols = board[0]?.length || 16;
  const cellSize = typeof window !== 'undefined'
    ? Math.min(32, Math.floor((window.innerWidth - 200) / cols))
    : 32;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '2px',
      padding: '16px', overflow: 'auto',
      opacity: isFrozen ? 0.7 : 1,
      cursor: isFrozen ? 'not-allowed' : 'default',
      transition: 'opacity 0.3s'
    }}>
      {board.map((row, r) => (
        <div key={r} style={{ display: 'flex', gap: '2px' }}>
          {row.map((cell, c) => (
            <button
              key={cell.id}
              onClick={() => !isFrozen && onCellClick(r, c)}
              disabled={isFrozen || cell.state === 'revealed'}
              style={{
                width: `${cellSize}px`, height: `${cellSize}px`,
                borderRadius: '4px', fontSize: `${cellSize * 0.5}px`,
                fontWeight: 'bold', transition: 'all 0.1s',
                background: cell.state === 'revealed'
                  ? (cell.isMine ? '#e94560' : '#1a3550')
                  : '#2d4a6e',
                color: cell.state === 'revealed' && !cell.isMine && cell.adjacentMines > 0
                  ? MINE_COLORS[cell.adjacentMines] || 'white'
                  : 'white',
                border: cell.state === 'hidden'
                  ? '2px solid #3d5a7e'
                  : '2px solid #1a3550',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: cell.state === 'revealed' || isFrozen ? 'default' : 'pointer',
              }}
            >
              {cell.state === 'revealed'
                ? (cell.isMine ? '\u{1F4A3}' : (cell.adjacentMines > 0 ? cell.adjacentMines : ''))
                : ''}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
