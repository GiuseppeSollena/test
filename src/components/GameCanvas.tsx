import React, { useRef, useEffect } from 'react';
import { GameMap, CANVAS_WIDTH, CANVAS_HEIGHT, TILE_SIZE } from '../game/Map';
import { GameState } from '../game/Engine';
import { TileType } from '../game/types';

interface GameCanvasProps {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onStateChange: (state: GameState) => void;
}

type Vec2 = { x: number; y: number };
type GhostMode = 'NORMAL' | 'FRIGHTENED' | 'EYES';
type Ghost = {
  x: number;
  y: number;
  speed: number;
  dir: Vec2;
  requestedDir: Vec2;
  color: string;
  normalColor: string;
  mode: GhostMode;
  baseX: number;
  baseY: number;
  released: boolean;
  releaseAt: number;
  lastDecisionTileX: number;
  lastDecisionTileY: number;
};

const DIRECTIONS: Vec2[] = [
  { x: 0, y: -1 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
  { x: 1, y: 0 }
];

const POWER_UP_DURATION_MS = 8000;
const POWER_UP_BLINK_MS = 2000;

const isOpposite = (a: Vec2, b: Vec2) => a.x === -b.x && a.y === -b.y;

const GameCanvas: React.FC<GameCanvasProps> = ({ onScoreChange, onLivesChange, onStateChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameMap = useRef(new GameMap());

  const gameStateRef = useRef<GameState>(GameState.START);
  const pausedRef = useRef(false);
  const gameOverRef = useRef(false);

  const pos = useRef({
    x: 1 * TILE_SIZE + TILE_SIZE / 2,
    y: 1 * TILE_SIZE + TILE_SIZE / 2,
    speed: 2
  });

  const currentDirection = useRef({ x: 0, y: 0 });
  const requestedDirection = useRef({ x: 0, y: 0 });
  const scoreRef = useRef(0);

  const lastTickRef = useRef<number>(performance.now());
  const powerUpUntilRef = useRef<number>(0);
  const ghostsEatenInPowerUpRef = useRef<number>(0);

  const ghostsRef = useRef<Ghost[]>([
    {
      x: 10 * TILE_SIZE + TILE_SIZE / 2,
      y: 9 * TILE_SIZE + TILE_SIZE / 2,
      speed: 1.5,
      dir: { x: -1, y: 0 },
      requestedDir: { x: -1, y: 0 },
      color: '#ff0000',
      normalColor: '#ff0000',
      mode: 'NORMAL',
      baseX: 10 * TILE_SIZE + TILE_SIZE / 2,
      baseY: 9 * TILE_SIZE + TILE_SIZE / 2,
      released: true,
      releaseAt: 0,
      lastDecisionTileX: -1,
      lastDecisionTileY: -1
    },
    {
      x: 9 * TILE_SIZE + TILE_SIZE / 2,
      y: 10 * TILE_SIZE + TILE_SIZE / 2,
      speed: 1.4,
      dir: { x: 1, y: 0 },
      requestedDir: { x: 1, y: 0 },
      color: '#ffb8ff',
      normalColor: '#ffb8ff',
      mode: 'NORMAL',
      baseX: 9 * TILE_SIZE + TILE_SIZE / 2,
      baseY: 10 * TILE_SIZE + TILE_SIZE / 2,
      released: false,
      releaseAt: 0,
      lastDecisionTileX: -1,
      lastDecisionTileY: -1
    },
    {
      x: 10 * TILE_SIZE + TILE_SIZE / 2,
      y: 10 * TILE_SIZE + TILE_SIZE / 2,
      speed: 1.3,
      dir: { x: 0, y: -1 },
      requestedDir: { x: 0, y: -1 },
      color: '#00ffff',
      normalColor: '#00ffff',
      mode: 'NORMAL',
      baseX: 10 * TILE_SIZE + TILE_SIZE / 2,
      baseY: 10 * TILE_SIZE + TILE_SIZE / 2,
      released: false,
      releaseAt: 0,
      lastDecisionTileX: -1,
      lastDecisionTileY: -1
    },
    {
      x: 11 * TILE_SIZE + TILE_SIZE / 2,
      y: 10 * TILE_SIZE + TILE_SIZE / 2,
      speed: 1.2,
      dir: { x: 0, y: 1 },
      requestedDir: { x: 0, y: 1 },
      color: '#ffb852',
      normalColor: '#ffb852',
      mode: 'NORMAL',
      baseX: 11 * TILE_SIZE + TILE_SIZE / 2,
      baseY: 10 * TILE_SIZE + TILE_SIZE / 2,
      released: false,
      releaseAt: 0,
      lastDecisionTileX: -1,
      lastDecisionTileY: -1
    }
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const setState = (s: GameState) => {
      gameStateRef.current = s;
      onStateChange(s);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameOverRef.current) return;

      switch (e.key.toLowerCase()) {
        case 'arrowup':
        case 'w':
          requestedDirection.current = { x: 0, y: -1 };
          break;
        case 'arrowdown':
        case 's':
          requestedDirection.current = { x: 0, y: 1 };
          break;
        case 'arrowleft':
        case 'a':
          requestedDirection.current = { x: -1, y: 0 };
          break;
        case 'arrowright':
        case 'd':
          requestedDirection.current = { x: 1, y: 0 };
          break;
        case 'escape': {
          pausedRef.current = !pausedRef.current;
          setState(pausedRef.current ? GameState.PAUSED : GameState.PLAYING);
          return;
        }
      }

      if (!pausedRef.current && gameStateRef.current !== GameState.PLAYING) {
        setState(GameState.PLAYING);
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

    const isAtTileCenter = (x: number, y: number) => {
      const targetX = Math.floor(x / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
      const targetY = Math.floor(y / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
      return Math.abs(x - targetX) < 1.2 && Math.abs(y - targetY) < 1.2;
    };

    const snapToTileCenter = (x: number, y: number) => {
      const cx = Math.floor(x / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
      const cy = Math.floor(y / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
      return { x: cx, y: cy };
    };

    const isPowerUpActive = (now: number) => powerUpUntilRef.current > 0 && now < powerUpUntilRef.current;

    const distanceSqTiles = (ax: number, ay: number, bx: number, by: number) => {
      const dx = ax - bx;
      const dy = ay - by;
      return dx * dx + dy * dy;
    };

    const canGhostMoveInDir = (ghost: Ghost, dir: Vec2) => {
      if (dir.x === 0 && dir.y === 0) return false;
      const radius = TILE_SIZE / 2 - 2;
      const nextX = ghost.x + dir.x * ghost.speed;
      const nextY = ghost.y + dir.y * ghost.speed;

      if (nextX < 0 || nextX > CANVAS_WIDTH) {
        return true;
      }

      if (dir.x > 0) return gameMap.current.isWalkablePixel(nextX + radius, nextY);
      if (dir.x < 0) return gameMap.current.isWalkablePixel(nextX - radius, nextY);
      if (dir.y > 0) return gameMap.current.isWalkablePixel(nextX, nextY + radius);
      if (dir.y < 0) return gameMap.current.isWalkablePixel(nextX, nextY - radius);
      return false;
    };

    const chooseGhostDirection = (ghost: Ghost) => {
      const atCenter = isAtTileCenter(ghost.x, ghost.y);
      if (!atCenter) return;
      const ghostTileX = Math.floor(ghost.x / TILE_SIZE);
      const ghostTileY = Math.floor(ghost.y / TILE_SIZE);

      if (ghostTileX === ghost.lastDecisionTileX && ghostTileY === ghost.lastDecisionTileY) {
        return;
      }
      ghost.lastDecisionTileX = ghostTileX;
      ghost.lastDecisionTileY = ghostTileY;

      if (!ghost.released) {
        const exitTileX = 10;
        const exitTileY = 9;
        const usable = DIRECTIONS.filter((d) => canGhostMoveInDir(ghost, d));
        if (usable.length === 0) return;

        let bestDirs: Vec2[] = [];
        let best = Infinity;
        for (const d of usable) {
          const nx = ghostTileX + d.x;
          const ny = ghostTileY + d.y;
          const score = distanceSqTiles(nx, ny, exitTileX, exitTileY);
          if (score < best) {
            best = score;
            bestDirs = [d];
          } else if (score === best) {
            bestDirs.push(d);
          }
        }

        ghost.requestedDir = bestDirs[Math.floor(Math.random() * bestDirs.length)];
        return;
      }

      if (ghost.mode === 'EYES') {
        const baseTileX = Math.floor(ghost.baseX / TILE_SIZE);
        const baseTileY = Math.floor(ghost.baseY / TILE_SIZE);

        const usable = DIRECTIONS.filter((d) => canGhostMoveInDir(ghost, d));
        if (usable.length === 0) return;

        let bestDirs: Vec2[] = [];
        let best = Infinity;
        for (const d of usable) {
          const nx = ghostTileX + d.x;
          const ny = ghostTileY + d.y;
          const score = distanceSqTiles(nx, ny, baseTileX, baseTileY);
          if (score < best) {
            best = score;
            bestDirs = [d];
          } else if (score === best) {
            bestDirs.push(d);
          }
        }

        ghost.requestedDir = bestDirs[Math.floor(Math.random() * bestDirs.length)];
        return;
      }

      const nonReverse = DIRECTIONS.filter((d) => {
        if (ghost.dir.x !== 0 || ghost.dir.y !== 0) {
          if (isOpposite(d, ghost.dir)) return false;
        }
        return canGhostMoveInDir(ghost, d);
      });

      const usable = nonReverse.length > 0 ? nonReverse : DIRECTIONS.filter((d) => canGhostMoveInDir(ghost, d));
      if (usable.length === 0) return;

      const chosen = usable[Math.floor(Math.random() * usable.length)];
      ghost.requestedDir = chosen;
    };

    const pickAnyValidGhostDir = (ghost: Ghost) => {
      const usable = DIRECTIONS.filter((d) => canGhostMoveInDir(ghost, d));
      if (usable.length === 0) return;

      const chosen = usable[Math.floor(Math.random() * usable.length)];
      ghost.requestedDir = chosen;
      ghost.dir = chosen;
    };

    const applyGhostDirection = (ghost: Ghost) => {
      if (!isAtTileCenter(ghost.x, ghost.y)) return;
      if (canGhostMoveInDir(ghost, ghost.requestedDir)) {
        if (ghost.requestedDir.x !== 0 && ghost.dir.x === 0) {
          ghost.y = Math.floor(ghost.y / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
        }
        if (ghost.requestedDir.y !== 0 && ghost.dir.y === 0) {
          ghost.x = Math.floor(ghost.x / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
        }
        ghost.dir = ghost.requestedDir;
      }
    };

    const updateGhosts = (now: number) => {
      for (const ghost of ghostsRef.current) {
        if (ghost.mode === 'FRIGHTENED' && !isPowerUpActive(now)) {
          ghost.mode = 'NORMAL';
          ghost.color = ghost.normalColor;
        }

        const blocked = !canGhostMoveInDir(ghost, ghost.dir);
        if (blocked) {
          const snapped = snapToTileCenter(ghost.x, ghost.y);
          ghost.x = snapped.x;
          ghost.y = snapped.y;
          pickAnyValidGhostDir(ghost);
        }

        chooseGhostDirection(ghost);
        applyGhostDirection(ghost);

        if (canGhostMoveInDir(ghost, ghost.dir)) {
          const speed = ghost.mode === 'EYES' ? ghost.speed * 1.8 : ghost.mode === 'FRIGHTENED' ? ghost.speed * 0.85 : ghost.speed;
          ghost.x += ghost.dir.x * speed;
          ghost.y += ghost.dir.y * speed;

          if (ghost.x < 0) {
            ghost.x = CANVAS_WIDTH;
          } else if (ghost.x > CANVAS_WIDTH) {
            ghost.x = 0;
          }
        }

        if (ghost.mode === 'EYES') {
          const snapped = snapToTileCenter(ghost.x, ghost.y);
          const baseSnapped = snapToTileCenter(ghost.baseX, ghost.baseY);
          if (Math.abs(snapped.x - baseSnapped.x) < 0.1 && Math.abs(snapped.y - baseSnapped.y) < 0.1) {
            ghost.mode = isPowerUpActive(now) ? 'FRIGHTENED' : 'NORMAL';
            ghost.color = ghost.mode === 'FRIGHTENED' ? '#1e4cff' : ghost.normalColor;
            ghost.lastDecisionTileX = -1;
            ghost.lastDecisionTileY = -1;
            pickAnyValidGhostDir(ghost);
          }
        }
      }
    };

    const checkGhostCollision = () => {
      const r = TILE_SIZE / 2 - 2;
      const rr = (r * 0.9) * (r * 0.9);
      for (const ghost of ghostsRef.current) {
        const dx = ghost.x - pos.current.x;
        const dy = ghost.y - pos.current.y;
        if (dx * dx + dy * dy <= rr) {
          if (ghost.mode === 'EYES') {
            continue;
          }

          const now = performance.now();
          if (now <= powerUpUntilRef.current && ghost.mode === 'FRIGHTENED') {
            ghost.mode = 'EYES';
            ghost.color = ghost.normalColor;
            ghost.lastDecisionTileX = -1;
            ghost.lastDecisionTileY = -1;

            ghostsEatenInPowerUpRef.current += 1;
            const ghostScore = 200 * Math.pow(2, ghostsEatenInPowerUpRef.current - 1);
            scoreRef.current += ghostScore;
            onScoreChange(scoreRef.current);
            pickAnyValidGhostDir(ghost);
            continue;
          }

          gameOverRef.current = true;
          pausedRef.current = false;
          onLivesChange(0);
          setState(GameState.GAME_OVER);
          cancelAnimationFrame(animationFrameId);
          return;
        }
      }
    };

    const update = () => {
      if (gameOverRef.current) return;
      if (pausedRef.current) return;

      const now = performance.now();
      const dt = Math.min(50, now - lastTickRef.current);
      lastTickRef.current = now;
      void dt;

      if (powerUpUntilRef.current > 0 && now >= powerUpUntilRef.current) {
        powerUpUntilRef.current = 0;
        for (const g of ghostsRef.current) {
          if (g.mode === 'FRIGHTENED') {
            g.mode = 'NORMAL';
            g.color = g.normalColor;
          }
        }
      }

      for (const g of ghostsRef.current) {
        if (!g.released && now >= g.releaseAt) {
          g.released = true;
          g.lastDecisionTileX = -1;
          g.lastDecisionTileY = -1;
        }
      }

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
        if (pos.current.x < 0) {
          // Se il centro supera lo 0 a sinistra, riappare a destra
          pos.current.x = CANVAS_WIDTH;
        }
        else if (pos.current.x > CANVAS_WIDTH) {
          // Se il centro supera il bordo destro, riappare a sinistra
          pos.current.x = 0;
        }

        // Mangia palline (solo se dentro il canvas)
        if (pos.current.x >= 0 && pos.current.x < CANVAS_WIDTH) {
          const tileX = Math.floor(pos.current.x / TILE_SIZE);
          const tileY = Math.floor(pos.current.y / TILE_SIZE);
          const currentTile = gameMap.current.getTile(tileX, tileY);

          if (currentTile === TileType.DOT || currentTile === TileType.POWER_PELLET) {
            gameMap.current.setTile(tileX, tileY, TileType.EMPTY);
            if (currentTile === TileType.DOT) {
              scoreRef.current += 10;
              onScoreChange(scoreRef.current);
            } else {
              scoreRef.current += 50;
              onScoreChange(scoreRef.current);
              powerUpUntilRef.current = now + POWER_UP_DURATION_MS;
              ghostsEatenInPowerUpRef.current = 0;
              for (const g of ghostsRef.current) {
                if (g.mode !== 'EYES') {
                  g.mode = 'FRIGHTENED';
                }
              }
            }
          }
        }
      }

      for (const g of ghostsRef.current) {
        if (g.mode === 'FRIGHTENED') {
          if (isPowerUpActive(now) && powerUpUntilRef.current - now <= POWER_UP_BLINK_MS) {
            const phase = Math.floor(now / 200) % 2;
            g.color = phase === 0 ? '#1e4cff' : '#ffffff';
          } else {
            g.color = '#1e4cff';
          }
        } else if (g.mode === 'NORMAL') {
          g.color = g.normalColor;
        }
      }

      updateGhosts(now);
      checkGhostCollision();
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

      for (const ghost of ghostsRef.current) {
        if (ghost.mode !== 'EYES') {
          ctx.beginPath();
          ctx.fillStyle = ghost.color;
          ctx.arc(ghost.x, ghost.y, TILE_SIZE / 2 - 2, Math.PI, 0, false);
          ctx.lineTo(ghost.x + TILE_SIZE / 2 - 2, ghost.y + TILE_SIZE / 2 - 2);
          ctx.lineTo(ghost.x - TILE_SIZE / 2 + 2, ghost.y + TILE_SIZE / 2 - 2);
          ctx.closePath();
          ctx.fill();

          if (ghost.mode === 'FRIGHTENED') {
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(ghost.x - 4, ghost.y - 2, 3, 0, Math.PI * 2);
            ctx.arc(ghost.x + 4, ghost.y - 2, 3, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(ghost.x - 4, ghost.y + 4, 1.1, 0, Math.PI * 2);
            ctx.arc(ghost.x + 4, ghost.y + 4, 1.1, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(ghost.x - 4, ghost.y - 2, 3, 0, Math.PI * 2);
            ctx.arc(ghost.x + 4, ghost.y - 2, 3, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#000';
            ctx.beginPath();
            ctx.arc(ghost.x - 4, ghost.y - 2, 1.3, 0, Math.PI * 2);
            ctx.arc(ghost.x + 4, ghost.y - 2, 1.3, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(ghost.x - 4, ghost.y - 2, 3.2, 0, Math.PI * 2);
          ctx.arc(ghost.x + 4, ghost.y - 2, 3.2, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#0077ff';
          ctx.beginPath();
          ctx.arc(ghost.x - 4, ghost.y - 2, 1.6, 0, Math.PI * 2);
          ctx.arc(ghost.x + 4, ghost.y - 2, 1.6, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (pausedRef.current) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('PAUSA', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      }

      if (gameOverRef.current) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 28px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
      }
    };

    const loop = () => {
      update();
      draw();
      if (!gameOverRef.current) {
        animationFrameId = requestAnimationFrame(loop);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    onLivesChange(3);
    setState(GameState.START);
    lastTickRef.current = performance.now();
    const startNow = performance.now();
    ghostsRef.current[0].released = true;
    ghostsRef.current[0].releaseAt = startNow;
    ghostsRef.current[1].released = false;
    ghostsRef.current[1].releaseAt = startNow + 1000;
    ghostsRef.current[2].released = false;
    ghostsRef.current[2].releaseAt = startNow + 3000;
    ghostsRef.current[3].released = false;
    ghostsRef.current[3].releaseAt = startNow + 5000;
    animationFrameId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      cancelAnimationFrame(animationFrameId);
    };
  }, [onLivesChange, onScoreChange, onStateChange]);

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