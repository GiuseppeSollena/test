import React, { useRef, useEffect } from 'react';

// Simuliamo l'enum se non l'hai ancora definito altrove
export enum GameState {
  START = 'START',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY',
  DYING = 'DYING'
}

interface GameCanvasProps {
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onStateChange: (state: GameState) => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ onScoreChange, onStateChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Stato interno del gioco (non React per performance)
  const pos = useRef({ x: 50, y: 50, speed: 3 });
  const direction = useRef({ x: 0, y: 0 });
  const score = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    // 1. Gestione Input
    const handleKeyDown = (e: KeyboardEvent) => {
      onStateChange(GameState.PLAYING);
      switch (e.key.toLowerCase()) {
        case 'arrowup': case 'w': direction.current = { x: 0, y: -1 }; break;
        case 'arrowdown': case 's': direction.current = { x: 0, y: 1 }; break;
        case 'arrowleft': case 'a': direction.current = { x: -1, y: 0 }; break;
        case 'arrowright': case 'd': direction.current = { x: 1, y: 0 }; break;
        case 'escape': onStateChange(GameState.PAUSED); break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // 2. Game Loop
    const update = () => {
      // Muovi il personaggio
      pos.current.x += direction.current.x * pos.current.speed;
      pos.current.y += direction.current.y * pos.current.speed;

      // Semplice bordo "fisico"
      if (pos.current.x < 0) pos.current.x = canvas.width;
      if (pos.current.x > canvas.width) pos.current.x = 0;
      if (pos.current.y < 0) pos.current.y = canvas.height;
      if (pos.current.y > canvas.height) pos.current.y = 0;

      // Simuliamo un incremento di punteggio ogni tanto
      if (Math.random() < 0.01) {
        score.current += 10;
        onScoreChange(score.current);
      }
    };

    const draw = () => {
      ctx.fillStyle = '#000'; // Sfondo nero
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Disegna Pac-Man
      ctx.beginPath();
      ctx.arc(pos.current.x, pos.current.y, 15, 0.2 * Math.PI, 1.8 * Math.PI);
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

    loop();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onScoreChange, onStateChange]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={400}
      style={{
        border: '4px solid #222',
        boxShadow: '0 0 20px rgba(0,0,255,0.3)',
        borderRadius: '8px',
        backgroundColor: '#000',
        display: 'block',
        margin: '0 auto'
      }}
    />
  );
};

export default GameCanvas;