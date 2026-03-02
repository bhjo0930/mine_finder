export const CLIENT_EVENTS = {
  CREATE_ROOM: 'create-room',
  JOIN_ROOM: 'join-room',
  LEAVE_ROOM: 'leave-room',
  AGREE_RESTART: 'agree-restart',
  START_GAME: 'start-game',
  CLICK_CELL: 'click-cell',
  SET_TOOL: 'set-tool',
  GET_ROOMS: 'get-rooms',
} as const;

export const SERVER_EVENTS = {
  ROOM_CREATED: 'room-created',
  ROOM_JOINED: 'room-joined',
  PLAYER_JOINED: 'player-joined',
  PLAYER_LEFT: 'player-left',
  GAME_STARTED: 'game-started',
  CELL_CLICKED: 'cell-clicked',
  SCORE_UPDATED: 'score-updated',
  PLAYER_FROZEN: 'player-frozen',
  PLAYER_UNFROZEN: 'player-unfrozen',
  GAME_ENDED: 'game-ended',
  RESTART_VOTE_UPDATED: 'restart-vote-updated',
  GAME_RESTARTED: 'game-restarted',
  RESTART_VOTE_EXPIRED: 'restart-vote-expired',
  ROOM_LIST: 'room-list',
  ROOM_CLOSED: 'room-closed',
  ERROR: 'error',
} as const;
