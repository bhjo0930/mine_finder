export type CellState = 'hidden' | 'revealed' | 'flagged';
export type Tool = 'shovel' | 'bomb';

export interface Cell {
  id: string;
  row: number;
  col: number;
  isMine: boolean;
  adjacentMines: number;
  state: CellState;
  revealedBy?: string; // player id
}

export interface Player {
  id: string;
  name: string;
  score: number;
  foundCount: number;
  wrongCount: number;
  isFrozen: boolean;
  frozenUntil?: number; // timestamp
  color: string;
}

export interface GameRoom {
  id: string;
  players: Map<string, Player>;
  board: Cell[][];
  status: 'waiting' | 'playing' | 'ended';
  waitingDeadline?: number;
  restartDeadline?: number;
  restartVotes: Set<string>;
  startTime?: number;
  endTime?: number;
  maxPlayers: number;
  currentTool: Map<string, Tool>; // playerid -> tool
  winner?: string;
}

export interface GameConfig {
  rows: number;
  cols: number;
  mineCount: number;
  gameDuration: number; // 180000ms = 3 minutes
  freezeDuration: number; // 10000ms = 10 seconds
  roomStartTimeout: number; // 30000ms = 30 seconds
  restartVoteTimeout: number; // 60000ms = 1 minute
}
