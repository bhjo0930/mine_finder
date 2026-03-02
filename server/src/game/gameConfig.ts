import { GameConfig } from './types';

export const DEFAULT_CONFIG: GameConfig = {
  rows: 16,
  cols: 16,
  mineCount: 40,
  gameDuration: 180000, // 3분
  freezeDuration: 10000, // 10초
  roomStartTimeout: 30000, // 30초
  restartVoteTimeout: 60000, // 1분
};

export const PLAYER_COLORS = [
  '#FF6B6B', // 빨강
  '#4ECDC4', // 청록
  '#45B7D1', // 파랑
  '#96CEB4', // 초록
  '#FFEAA7', // 노랑
];
