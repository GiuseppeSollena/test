import React, { useRef, useEffect } from 'react';
import { GameMap, CANVAS_WIDTH, CANVAS_HEIGHT, TILE_SIZE } from '../game/Map';
import { GameState } from '../game/Engine';
import { TileType } from '../game/types';

interface GameCanvasProps {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onStateChange: (state: GameState) => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ onScoreChange, onStateChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameMap = useRef(new GameMap());

  const pos = useRef({
    x: 1 * TILE_SIZE + TILE_SIZE / 2,
    y: 1 * TILE_SIZE + TILE_SIZE / 2,
    speed: 2
  });

  const currentDirection = useRef({ x: 0, y: 0 });
  const requestedDirection = useRef({ x: 0, y: 0 });
  const scoreRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const handleKeyDown = (e: KeyboardEvent) => {
      onStateChange(GameState.PLAYING);
      switch (e.key.toLowerCase()) {
        case 'arrowup': case 'w': requestedDirection.current = { x: 0, y: -1 }; break;
        case 'arrowdown': case 's': requestedDirection.current = { x: 0, y: 1 }; break;
        case 'arrowleft': case 'a': requestedDirection.current = { x: -1, y: 0 }; break;
        case 'arrowright': case 'd': requestedDirection.current = { x: 1, y: 0 }; break;
        case 'escape': onStateChange(GameState.PAUSED); break;
      }
    };

    const canMoveInDir = (dir: { x: number, y: number }) => {
      if (dir.x === 0 && dir.y === 0) return false;

      const radius = TILE_SIZE / 2 - 1;
      const nextX = pos.current.x + dir.x * pos.current.speed;
      const nextY = pos.current.y + dir.y * pos.current.speed;

      // --- MODIFICA TUNNEL ---
      // Se Pac-Man è oltre i bordi orizzontali del canvas, lascialo muovere sempre 
      // (così può rientrare dall'altra parte)
      if (nextX < 0 || nextX > CANVAS_WIDTH) {
        return true;
      }

      // Controllo collisioni standard
      if (dir.x > 0) return gameMap.current.isWalkablePixel(nextX + radius, nextY);
      if (dir.x < 0) return gameMap.current.isWalkablePixel(nextX - radius, nextY);
      if (dir.y > 0) return gameMap.current.isWalkablePixel(nextX, nextY + radius);
      if (dir.y < 0) return gameMap.current.isWalkablePixel(nextX, nextY - radius);
      return false;
    };

    const update = () => {
      // 1. TENTATIVO DI SVOLTA
      if (canMoveInDir(requestedDirection.current)) {
        if (requestedDirection.current.x !== 0 && currentDirection.current.x === 0) {
          pos.current.y = Math.floor(pos.current.y / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
        }
        if (requestedDirection.current.y !== 0 && currentDirection.current.y === 0) {
          pos.current.x = Math.floor(pos.current.x / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
        }
        currentDirection.current = requestedDirection.current;
      }

      // 2. MOVIMENTO EFFETTIVO
      if (canMoveInDir(currentDirection.current)) {
        pos.current.x += currentDirection.current.x * pos.current.speed;
        pos.current.y += currentDirection.current.y * pos.current.speed;

        // --- LOGICA SCREEN WRAP (TUNNEL) ---
        // Se esce completamente a sinistra, riappare a destra
        console.log('Posizione prima del tunnel:', pos.current.x);
        console.log(`canvas_width: ${CANVAS_WIDTH}, tile_size: ${TILE_SIZE}`);
        console.log('Controllo tunnel:', pos.current.x < -TILE_SIZE, pos.current.x > CANVAS_WIDTH + TILE_SIZE);
        if (pos.current.x < -TILE_SIZE) {
          console.log('Tunnel: da sinistra a destra');
          pos.current.x = CANVAS_WIDTH;
        }
        // Se esce completamente a destra, riappare a sinistra
        else if (pos.current.x > CANVAS_WIDTH + TILE_SIZE) {
          console.log('Tunnel: da destra a sinistra');
          pos.current.x = 0;
        }

        // Mangia palline (solo se dentro il canvas)
        if (pos.current.x >= 0 && pos.current.x < CANVAS_WIDTH) {
          const tileX = Math.floor(pos.current.x / TILE_SIZE);
          const tileY = Math.floor(pos.current.y / TILE_SIZE);
          const currentTile = gameMap.current.getTile(tileX, tileY);

          if (currentTile === TileType.DOT || currentTile === TileType.POWER_PELLET) {
            gameMap.current.setTile(tileX, tileY, TileType.EMPTY);
            scoreRef.current += (currentTile === TileType.DOT ? 10 : 50);
            onScoreChange(scoreRef.current);
          }
        }
      }
    };

    const draw = () => {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      gameMap.current.render(ctx);

      // Disegno Pac-Man
      ctx.beginPath();
      ctx.arc(pos.current.x, pos.current.y, TILE_SIZE / 2 - 2, 0.2 * Math.PI, 1.8 * Math.PI);
      ctx.lineTo(pos.current.x, pos.current.y);
      ctx.fillStyle = 'yellow';
      ctx.fill();
      ctx.closePath();
    };

    const loop = () => {
      update();
      draw();
      animationFrameId = requestAnimationFrame(loop);
    };

    window.addEventListener('keydown', handleKeyDown);
    animationFrameId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      cancelAnimationFrame(animationFrameId);
    };
  }, [onScoreChange, onStateChange]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      style={{ display: 'block', margin: '0 auto', border: '2px solid #333' }}
    />
  );
};

export default GameCanvas;