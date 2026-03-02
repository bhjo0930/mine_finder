export type CellState = 'hidden' | 'revealed' | 'flagged';
export type Tool = 'shovel' | 'bomb';
export type GameStatus = 'waiting' | 'playing' | 'ended';

export interface ClientCell {
  id: string;
  row: number;
  col: number;
  state: CellState;
  adjacentMines: number;
  isMine?: boolean;
  revealedBy?: string;
}

export interface PlayerInfo {
  id: string;
  name: string;
  score: number;
  foundCount: number;
  wrongCount: number;
  isFrozen: boolean;
  frozenUntil?: number;
  color: string;
}

export interface RankedPlayer {
  rank: number;
  name: string;
  gamesPlayed: number;
  totalScore: number;
  totalFound: number;
  totalWrong: number;
}

export interface GameState {
  roomId: string;
  myPlayerId: string;
  myPlayerName: string;
  players: PlayerInfo[];
  waitingDeadline?: number;
  board: ClientCell[][];
  status: GameStatus;
  startTime?: number;
  endTime?: number;
  currentTool: Tool;
  myFreezeEnd?: number;
  winner?: string;
}
