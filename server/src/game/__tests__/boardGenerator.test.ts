import { generateBoard } from '../boardGenerator';

describe('boardGenerator', () => {
  test('보드 크기가 올바르게 생성된다', () => {
    const board = generateBoard(16, 16, 40);
    expect(board.length).toBe(16);
    expect(board[0].length).toBe(16);
  });

  test('지뢰 수가 정확하다', () => {
    const board = generateBoard(16, 16, 40);
    let mineCount = 0;
    board.forEach(row => row.forEach(cell => { if (cell.isMine) mineCount++; }));
    expect(mineCount).toBe(40);
  });

  test('인접 지뢰 수가 올바르게 계산된다', () => {
    const board = generateBoard(5, 5, 0);
    // 지뢰 없는 보드에서는 모든 adjacentMines가 0
    board.forEach(row => row.forEach(cell => {
      expect(cell.adjacentMines).toBe(0);
    }));
  });

  test('모든 셀이 hidden 상태로 시작한다', () => {
    const board = generateBoard(8, 8, 10);
    board.forEach(row => row.forEach(cell => {
      expect(cell.state).toBe('hidden');
    }));
  });

  test('셀 id가 유니크하다', () => {
    const board = generateBoard(8, 8, 10);
    const ids = new Set<string>();
    board.forEach(row => row.forEach(cell => ids.add(cell.id)));
    expect(ids.size).toBe(64);
  });
});
