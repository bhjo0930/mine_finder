'use client';
import { useState } from 'react';
import Lobby from '@/components/Lobby';
import GameRoom from '@/components/GameRoom';
import { PlayerInfo } from '@/lib/types';

export default function Home() {
  const [gameState, setGameState] = useState<{
    roomId: string;
    playerId: string;
    playerName: string;
    players: PlayerInfo[];
    waitingDeadline?: number;
  } | null>(null);

  const handleEnterRoom = (
    roomId: string,
    playerId: string,
    playerName: string,
    players: PlayerInfo[],
    waitingDeadline?: number
  ) => {
    setGameState({ roomId, playerId, playerName, players, waitingDeadline });
  };

  const handleRoomClosed = () => {
    setGameState(null);
  };

  if (!gameState) {
    return <Lobby onEnterRoom={handleEnterRoom} />;
  }

  return (
    <GameRoom
      roomId={gameState.roomId}
      myPlayerId={gameState.playerId}
      myPlayerName={gameState.playerName}
      initialPlayers={gameState.players}
      waitingDeadline={gameState.waitingDeadline}
      onRoomClosed={handleRoomClosed}
    />
  );
}
