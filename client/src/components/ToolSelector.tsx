'use client';
import { Tool } from '@/lib/types';

interface ToolSelectorProps {
  currentTool: Tool;
  onSelectTool: (tool: Tool) => void;
  isFrozen: boolean;
  freezeTimeLeft?: number;
}

export default function ToolSelector({ currentTool, onSelectTool, isFrozen, freezeTimeLeft }: ToolSelectorProps) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '20px 12px', background: '#16213e',
      borderRight: '2px solid #2d4a6e', gap: '16px', minWidth: '80px'
    }}>
      <h3 style={{ fontSize: '0.75rem', color: '#a8a8b3', textTransform: 'uppercase', letterSpacing: '1px' }}>도구</h3>

      <button
        onClick={() => onSelectTool('shovel')}
        disabled={isFrozen}
        title="삽 - 안전한 셀 발굴"
        style={{
          width: '60px', height: '60px', borderRadius: '12px', fontSize: '1.8rem',
          background: currentTool === 'shovel' ? '#e94560' : '#0f3460',
          color: 'white', border: `2px solid ${currentTool === 'shovel' ? '#e94560' : '#2d4a6e'}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: '2px', transition: 'all 0.2s'
        }}
      >
        &#9935;
      </button>
      <span style={{ fontSize: '0.7rem', color: currentTool === 'shovel' ? '#e94560' : '#a8a8b3' }}>삽</span>

      <button
        onClick={() => onSelectTool('bomb')}
        disabled={isFrozen}
        title="폭탄 - 지뢰 표시"
        style={{
          width: '60px', height: '60px', borderRadius: '12px', fontSize: '1.8rem',
          background: currentTool === 'bomb' ? '#e94560' : '#0f3460',
          color: 'white', border: `2px solid ${currentTool === 'bomb' ? '#e94560' : '#2d4a6e'}`,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: '2px', transition: 'all 0.2s'
        }}
      >
        &#128163;
      </button>
      <span style={{ fontSize: '0.7rem', color: currentTool === 'bomb' ? '#e94560' : '#a8a8b3' }}>폭탄</span>

      {isFrozen && freezeTimeLeft !== undefined && (
        <div style={{
          marginTop: '16px', padding: '12px', background: '#0f3460', borderRadius: '10px',
          textAlign: 'center', border: '1px solid #74b9ff'
        }}>
          <div style={{ fontSize: '1.5rem' }}>&#10052;&#65039;</div>
          <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#74b9ff', fontFamily: 'monospace' }}>
            {freezeTimeLeft}s
          </div>
          <div style={{ fontSize: '0.65rem', color: '#a8a8b3' }}>행동불가</div>
        </div>
      )}
    </div>
  );
}
