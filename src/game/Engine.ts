/**
 * Engine.ts - Motore di gioco principale
 * 
 * Responsabilità:
 * - Game loop con requestAnimationFrame
 * - Gestione delle collisioni
 * - Sistema di punteggio e vite
 * - Stati di gioco (Start, Playing, GameOver, Victory)
 */

import { GameMap, TILE_SIZE, CANVAS_WIDTH, CANVAS_HEIGHT } from './Map';
import { Pacman } from './Pacman';
import { Ghost } from './Ghost';
import { 
  GameState, 
  GhostState, 
  GhostType, 
  Direction, 
  TileType,
  SCORE_VALUES,
  GameCallbacks 
} from './types';

// Re-export per uso esterno
export { GameState } from './types';

// Durata power-up in ms
const POWER_UP_DURATION = 10000;

/**
 * Classe GameEngine - Orchestratore principale del gioco
 */
export class GameEngine {
  /** Mappa di gioco */
  private map: GameMap;
  
  /** Istanza di Pac-Man */
  private pacman: Pacman;
  
  /** Array dei fantasmi */
  private ghosts: Ghost[];
  
  /** Stato corrente del gioco */
  public state: GameState;
  
  /** Punteggio corrente */
  public score: number;
  
  /** Vite rimanenti */
  public lives: number;
  
  /** Palline mangiate */
  private dotsEaten: number;
  
  /** Timing */
  private lastFrameTime: number;
  private animationFrameId: number | null;
  
  /** Callbacks per React */
  private onScoreChange: ((score: number) => void) | null;
  private onLivesChange: ((lives: number) => void) | null;
  private onStateChange: ((state: GameState) => void) | null;
  
  /** Timer per animazione morte */
  private deathTimer: number;
  
  /** Contatore fantasmi mangiati nel power-up corrente */
  private ghostsEatenInPowerUp: number;

  constructor() {
    this.map = new GameMap();
    this.pacman = new Pacman();
    this.ghosts = this.createGhosts();
    this.state = GameState.START;
    this.score = 0;
    this.lives = 3;
    this.dotsEaten = 0;
    this.lastFrameTime = 0;
    this.animationFrameId = null;
    this.onScoreChange = null;
    this.onLivesChange = null;
    this.onStateChange = null;
    this.deathTimer = 0;
    this.ghostsEatenInPowerUp = 0;
  }

  /**
   * Crea i quattro fantasmi nelle loro posizioni iniziali
   */
  private createGhosts(): Ghost[] {
    return [
      new Ghost(GhostType.BLINKY, 10, 9),  // Rosso - sopra la casa
      new Ghost(GhostType.PINKY, 9, 10),   // Rosa - nella casa
      new Ghost(GhostType.INKY, 10, 10),   // Ciano - nella casa
      new Ghost(GhostType.CLYDE, 11, 10)   // Arancione - nella casa
    ];
  }

  /**
   * Inizializza o resetta il gioco
   */
  public reset(): void {
    this.map = new GameMap();
    this.pacman = new Pacman();
    this.ghosts = this.createGhosts();
    this.state = GameState.START;
    this.score = 0;
    this.lives = 3;
    this.dotsEaten = 0;
    this.lastFrameTime = 0;
    this.deathTimer = 0;
    this.ghostsEatenInPowerUp = 0;
    
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Imposta i callback per l'UI
   */
  public setCallbacks(callbacks: GameCallbacks): void {
    this.onScoreChange = callbacks.onScoreChange ?? null;
    this.onLivesChange = callbacks.onLivesChange ?? null;
    this.onStateChange = callbacks.onStateChange ?? null;
  }

  /**
   * Avvia il gioco
   */
  public start(): void {
  if (this.state === GameState.START || this.state === GameState.GAME_OVER || this.state === GameState.VICTORY) {
    this.reset();
  }
  this.state = GameState.PLAYING;
  this.notifyStateChange();
  this.lastFrameTime = performance.now(); 
  
  // Evitiamo loop duplicati
  if (this.animationFrameId === null) {
    this.gameLoop();
  }
}

  /**
   * Mette in pausa il gioco
   */
  public pause(): void {
    if (this.state === GameState.PLAYING) {
      this.state = GameState.PAUSED;
      this.notifyStateChange();
      if (this.animationFrameId !== null) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
    }
  }

  /**
   * Riprende il gioco dalla pausa
   */
  public resume(): void {
    if (this.state === GameState.PAUSED) {
      this.state = GameState.PLAYING;
      this.notifyStateChange();
      this.lastFrameTime = performance.now();
      this.gameLoop();
    }
  }

  /**
   * Toggle pausa
   */
  public togglePause(): void {
    if (this.state === GameState.PLAYING) {
      this.pause();
    } else if (this.state === GameState.PAUSED) {
      this.resume();
    }
  }

  /**
   * Gestisce l'input della tastiera
   */
  public handleKeyDown(key: string): void {
    // Avvia il gioco con qualsiasi tasto se nella schermata iniziale
    if (this.state === GameState.START) {
      this.start();
      return;
    }

    // Riavvia dopo game over o vittoria
    if (this.state === GameState.GAME_OVER || this.state === GameState.VICTORY) {
      if (key === 'Enter' || key === ' ') {
        this.start();
      }
      return;
    }

    // Gestione pausa
    if (key === 'Escape' || key === 'p' || key === 'P') {
      this.togglePause();
      return;
    }

    // Movimento solo se il gioco è in corso
    if (this.state !== GameState.PLAYING) return;

    // Mappa tasti alle direzioni
    switch (key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        this.pacman.setNextDirection(Direction.UP);
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        this.pacman.setNextDirection(Direction.DOWN);
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        this.pacman.setNextDirection(Direction.LEFT);
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        this.pacman.setNextDirection(Direction.RIGHT);
        break;
    }
  }

  /**
   * Loop principale del gioco
   */
  private gameLoop(currentTime: number = performance.now()): void {
    // Calcola delta time
    const deltaTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;
    
    // Limita deltaTime per evitare salti enormi
    const clampedDelta = Math.min(deltaTime, 50);

    if (this.state === GameState.PLAYING) {
      this.update(clampedDelta);
    } else if (this.state === GameState.DYING) {
      this.updateDying(clampedDelta);
    }

    // Continua il loop se il gioco non è terminato
    if (this.state === GameState.PLAYING || this.state === GameState.DYING) {
      this.animationFrameId = requestAnimationFrame((time) => this.gameLoop(time));
    }
  }

  /**
   * Aggiorna lo stato del gioco
   */
  private update(deltaTime: number): void {
    // Aggiorna Pac-Man
    this.pacman.update(this.map, deltaTime);
    
    // Aggiorna fantasmi
    for (const ghost of this.ghosts) {
      ghost.update(this.map, this.pacman, deltaTime);
    }

    // Controlla collisioni con palline
    this.checkDotCollision();
    
    // Controlla collisioni con fantasmi
    this.checkGhostCollision();
    
    // Verifica vittoria
    if (this.dotsEaten >= this.map.totalDots) {
      this.victory();
    }
  }

  /**
   * Aggiorna l'animazione di morte
   */
  private updateDying(deltaTime: number): void {
    this.deathTimer += deltaTime;
    
    if (this.deathTimer >= 1500) {
      this.deathTimer = 0;
      this.respawn();
    }
  }

  /**
   * Controlla la collisione con le palline
   */
  private checkDotCollision(): void {
    const pos = this.pacman.getTilePosition();
    const tile = this.map.getTile(pos.x, pos.y);
    
    if (tile === TileType.DOT) {
      // Pallina normale
      this.map.setTile(pos.x, pos.y, TileType.EMPTY);
      this.addScore(SCORE_VALUES.DOT);
      this.dotsEaten++;
    } else if (tile === TileType.POWER_PELLET) {
      // Super pillola
      this.map.setTile(pos.x, pos.y, TileType.EMPTY);
      this.addScore(SCORE_VALUES.POWER_PELLET);
      this.dotsEaten++;
      this.activatePowerUp();
    }
  }

  /**
   * Attiva il power-up
   */
  private activatePowerUp(): void {
    this.pacman.activatePowerUp(POWER_UP_DURATION);
    this.ghostsEatenInPowerUp = 0;
    
    for (const ghost of this.ghosts) {
      ghost.setFrightened(POWER_UP_DURATION);
    }
  }

  /**
   * Controlla la collisione con i fantasmi
   */
  private checkGhostCollision(): void {
    for (const ghost of this.ghosts) {
      if (ghost.checkCollision(this.pacman)) {
        if (ghost.state === GhostState.FRIGHTENED) {
          // Pac-Man mangia il fantasma
          ghost.setEaten();
          this.ghostsEatenInPowerUp++;
          // Punteggio progressivo: 200, 400, 800, 1600
          const ghostScore = SCORE_VALUES.GHOST * Math.pow(2, this.ghostsEatenInPowerUp - 1);
          this.addScore(ghostScore);
        } else if (ghost.state !== GhostState.EATEN) {
          // Pac-Man viene catturato
          this.die();
          return;
        }
      }
    }
  }

  /**
   * Aggiunge punti al punteggio
   */
  private addScore(points: number): void {
    this.score += points;
    this.onScoreChange?.(this.score);
  }

  /**
   * Pac-Man muore
   */
  private die(): void {
    this.lives--;
    this.onLivesChange?.(this.lives);
    
    if (this.lives <= 0) {
      this.gameOver();
    } else {
      this.state = GameState.DYING;
      this.deathTimer = 0;
    }
  }

  /**
   * Respawn dopo la morte
   */
  private respawn(): void {
    this.pacman.reset();
    this.ghosts = this.createGhosts();
    this.state = GameState.PLAYING;
    this.notifyStateChange();
  }

  /**
   * Game Over
   */
  private gameOver(): void {
    this.state = GameState.GAME_OVER;
    this.notifyStateChange();
    
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Vittoria
   */
  private victory(): void {
    this.state = GameState.VICTORY;
    this.notifyStateChange();
    
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  /**
   * Notifica cambio stato
   */
  private notifyStateChange(): void {
    this.onStateChange?.(this.state);
  }

  /**
   * Renderizza tutto sul canvas
   */
  public render(ctx: CanvasRenderingContext2D): void {
    // Pulisci il canvas
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    // Renderizza la mappa
    this.map.render(ctx);
    
    // Renderizza Pac-Man (solo se non in stato dying avanzato)
    if (this.state !== GameState.DYING || this.deathTimer < 1000) {
      if (this.state === GameState.DYING) {
        this.renderDyingPacman(ctx);
      } else {
        this.pacman.render(ctx);
      }
    }
    
    // Renderizza fantasmi
    for (const ghost of this.ghosts) {
      ghost.render(ctx);
    }
    
    // Overlay per stati speciali
    this.renderOverlay(ctx);
  }

  /**
   * Renderizza Pac-Man mentre muore
   */
  private renderDyingPacman(ctx: CanvasRenderingContext2D): void {
    const centerX = this.pacman.x + TILE_SIZE / 2;
    const centerY = this.pacman.y + TILE_SIZE / 2;
    const radius = TILE_SIZE / 2 - 1;
    
    // Animazione di "scomparsa"
    const progress = this.deathTimer / 1000;
    const angle = progress * Math.PI;
    
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, angle, Math.PI * 2 - angle, false);
    ctx.lineTo(centerX, centerY);
    ctx.closePath();
    ctx.fill();
  }

  /**
   * Renderizza overlay per stati di gioco
   */
  private renderOverlay(ctx: CanvasRenderingContext2D): void {
    if (this.state === GameState.START) {
      this.renderStartScreen(ctx);
    } else if (this.state === GameState.PAUSED) {
      this.renderPausedScreen(ctx);
    } else if (this.state === GameState.GAME_OVER) {
      this.renderGameOverScreen(ctx);
    } else if (this.state === GameState.VICTORY) {
      this.renderVictoryScreen(ctx);
    }
  }

  /**
   * Schermata iniziale
   */
  private renderStartScreen(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    ctx.fillStyle = '#ffff00';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('PAC-MAN', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 40);
    
    ctx.fillStyle = '#fff';
    ctx.font = '16px Arial';
    ctx.fillText('Premi un tasto per iniziare', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10);
    
    ctx.font = '12px Arial';
    ctx.fillStyle = '#aaa';
    ctx.fillText('Frecce o WASD per muoverti', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);
    ctx.fillText('ESC per pausa', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60);
  }

  /**
   * Schermata di pausa
   */
  private renderPausedScreen(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSA', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
    
    ctx.font = '14px Arial';
    ctx.fillText('Premi ESC per continuare', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 30);
  }

  /**
   * Schermata Game Over
   */
  private renderGameOverScreen(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    ctx.fillStyle = '#ff0000';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
    
    ctx.fillStyle = '#fff';
    ctx.font = '18px Arial';
    ctx.fillText(`Punteggio: ${this.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
    
    ctx.font = '14px Arial';
    ctx.fillText('Premi INVIO per riprovare', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50);
  }

  /**
   * Schermata di vittoria
   */
  private renderVictoryScreen(ctx: CanvasRenderingContext2D): void {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    
    ctx.fillStyle = '#00ff00';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('VITTORIA!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
    
    ctx.fillStyle = '#fff';
    ctx.font = '18px Arial';
    ctx.fillText(`Punteggio: ${this.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
    
    ctx.font = '14px Arial';
    ctx.fillText('Premi INVIO per giocare ancora', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 50);
  }

  /**
   * Ferma il gioco e pulisce
   */
  public destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}

export default GameEngine;
