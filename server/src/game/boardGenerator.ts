import { Cell } from './types';
import { v4 as uuidv4 } from 'uuid';

export function generateBoard(rows: number, cols: number, mineCount: number): Cell[][] {
  // 빈 보드 생성
  const board: Cell[][] = [];
  for (let r = 0; r < rows; r++) {
    board[r] = [];
    for (let c = 0; c < cols; c++) {
      board[r][c] = {
        id: uuidv4(),
        row: r,
        col: c,
        isMine: false,
        adjacentMines: 0,
        state: 'hidden',
      };
    }
  }

  // 지뢰 랜덤 배치
  let placed = 0;
  while (placed < mineCount) {
    const r = Math.floor(Math.random() * rows);
    const c = Math.floor(Math.random() * cols);
    if (!board[r][c].isMine) {
      board[r][c].isMine = true;
      placed++;
    }
  }

  // 인접 지뢰 수 계산
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!board[r][c].isMine) {
        let count = 0;
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && board[nr][nc].isMine) {
              count++;
            }
          }
        }
        board[r][c].adjacentMines = count;
      }
    }
  }

  return board;
}
