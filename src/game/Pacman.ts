/**
 * Pacman.ts - Gestione del personaggio Pac-Man
 * 
 * Classe responsabile per:
 * - Posizione e movimento del personaggio
 * - Animazione della bocca
 * - Gestione delle direzioni
 * - Rendering del personaggio
 */

import { TILE_SIZE, MAP_WIDTH, GameMap } from './Map';
import {
  Direction,
  DIRECTION_VECTORS,
  TilePosition,
  Renderable,
  Positionable
} from './types';

/**
 * Classe Pacman - Entità principale controllata dal giocatore
 */
export class Pacman implements Renderable, Positionable {
  // Posizione iniziale (centro-basso della mappa)
  private readonly startX: number = 10 * TILE_SIZE;
  private readonly startY: number = 16 * TILE_SIZE;

  // Posizione corrente in pixel
  public x: number;
  public y: number;

  // Direzione corrente e prossima
  private direction: Direction;
  private nextDirection: Direction;

  // Velocità di movimento (pixel per frame)
  private speed: number;

  // Animazione bocca
  private mouthAngle: number;
  private mouthSpeed: number;
  private mouthOpening: boolean;

  // Stato power-up
  public isPoweredUp: boolean;
  public powerUpTimer: number;

  constructor() {
    this.x = this.startX;
    this.y = this.startY;
    this.direction = Direction.NONE;
    this.nextDirection = Direction.NONE;
    this.speed = 2;
    this.mouthAngle = 0.2;
    this.mouthSpeed = 0.15;
    this.mouthOpening = true;
    this.isPoweredUp = false;
    this.powerUpTimer = 0;
  }

  /**
   * Resetta Pac-Man alla posizione iniziale
   */
  public reset(): void {
    this.x = this.startX;
    this.y = this.startY;
    this.direction = Direction.NONE;
    this.nextDirection = Direction.NONE;
    this.speed = 2;
    this.mouthAngle = 0.2;
    this.mouthSpeed = 0.15;
    this.mouthOpening = true;
    this.isPoweredUp = false;
    this.powerUpTimer = 0;
  }

  /**
   * Imposta la prossima direzione desiderata
   * @param direction - Direzione dal enum Direction
   */
  public setNextDirection(direction: Direction): void {
    this.nextDirection = direction;
  }

  /**
   * Ottiene la direzione corrente
   */
  public getDirection(): Direction {
    return this.direction;
  }

  /**
   * Ottiene la posizione tile corrente
   * @returns Coordinate tile
   */
  public getTilePosition(): TilePosition {
    return {
      x: Math.floor((this.x + TILE_SIZE / 2) / TILE_SIZE),
      y: Math.floor((this.y + TILE_SIZE / 2) / TILE_SIZE)
    };
  }

  /**
   * Verifica se Pac-Man è centrato in una tile
   * @returns True se centrato
   */
  private isCenteredInTile(): boolean {
    const centerX = this.x + TILE_SIZE / 2;
    const centerY = this.y + TILE_SIZE / 2;

    const tileX = Math.floor(centerX / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
    const tileY = Math.floor(centerY / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;

    const threshold = this.speed;

    return Math.abs(centerX - tileX) <= threshold &&
      Math.abs(centerY - tileY) <= threshold;
  }

  /**
   * Centra Pac-Man nella tile corrente
   */
  private centerInTile(): void {
    const pos = this.getTilePosition();
    this.x = pos.x * TILE_SIZE;
    this.y = pos.y * TILE_SIZE;
  }

  /**
   * Verifica se può muoversi in una direzione
   * @param direction - Direzione da verificare
   * @param gameMap - Istanza della mappa di gioco
   * @returns True se può muoversi
   */
  private canMove(direction: Direction, gameMap: GameMap): boolean {
    if (direction === Direction.NONE) return false;

    const vector = DIRECTION_VECTORS[direction];
    const pos = this.getTilePosition();
    const nextTileX = pos.x + vector.x;
    const nextTileY = pos.y + vector.y;

    return gameMap.isWalkable(nextTileX, nextTileY);
  }

  /**
   * Aggiorna lo stato di Pac-Man
   * @param gameMap - Istanza della mappa di gioco
   * @param deltaTime - Tempo trascorso in ms
   */
  public update(gameMap: GameMap, deltaTime: number): void {
    // Aggiorna timer power-up
    if (this.isPoweredUp) {
      this.powerUpTimer -= deltaTime;
      if (this.powerUpTimer <= 0) {
        this.isPoweredUp = false;
        this.powerUpTimer = 0;
      }
    }

    // Prova a cambiare direzione se richiesto e centrato
    if (this.nextDirection !== Direction.NONE && this.isCenteredInTile()) {
      if (this.canMove(this.nextDirection, gameMap)) {
        this.direction = this.nextDirection;
        this.centerInTile();
      }
    }

    // Muovi nella direzione corrente
    if (this.direction !== Direction.NONE) {
      const vector = DIRECTION_VECTORS[this.direction];
      const newX = this.x + vector.x * this.speed;
      const newY = this.y + vector.y * this.speed;

      // Verifica collisione con i muri
      if (this.canMoveToPosition(newX, newY, gameMap)) {
        this.x = newX;
        this.y = newY;
      } else {
        // Se bloccato, centra nella tile corrente per permettere cambio direzione
        this.centerInTile();
        // NON resettare direction - mantieni per permettere il cambio direzione
      }

      // Gestione tunnel (wrap around)
      this.handleTunnelWrap();
    }

    // Aggiorna animazione bocca
    this.updateMouthAnimation();
  }

  /**
   * Verifica se può muoversi a una posizione specifica
   */
  private canMoveToPosition(newX: number, newY: number, gameMap: GameMap): boolean {
    // Controlla i quattro angoli della hitbox
    const padding = 2;
    const size = TILE_SIZE - padding * 2;

    return (
      gameMap.isWalkablePixel(newX + padding, newY + padding) &&
      gameMap.isWalkablePixel(newX + size, newY + padding) &&
      gameMap.isWalkablePixel(newX + padding, newY + size) &&
      gameMap.isWalkablePixel(newX + size, newY + size)
    );
  }

  /**
   * Gestisce il passaggio attraverso il tunnel
   */
  private handleTunnelWrap(): void {
    const mapPixelWidth = MAP_WIDTH * TILE_SIZE;

    if (this.x < -TILE_SIZE) {
      this.x = mapPixelWidth;
    } else if (this.x > mapPixelWidth) {
      this.x = -TILE_SIZE;
    }
  }

  /**
   * Aggiorna l'animazione della bocca
   */
  private updateMouthAnimation(): void {
    if (this.direction === Direction.NONE) {
      // Bocca semiaperta quando fermo
      this.mouthAngle = 0.2;
      return;
    }

    if (this.mouthOpening) {
      this.mouthAngle += this.mouthSpeed;
      if (this.mouthAngle >= 0.4) {
        this.mouthOpening = false;
      }
    } else {
      this.mouthAngle -= this.mouthSpeed;
      if (this.mouthAngle <= 0.05) {
        this.mouthOpening = true;
      }
    }
  }

  /**
   * Attiva lo stato power-up
   * @param duration - Durata in millisecondi
   */
  public activatePowerUp(duration: number = 10000): void {
    this.isPoweredUp = true;
    this.powerUpTimer = duration;
  }

  /**
   * Ottiene la rotazione in base alla direzione
   * @returns Angolo in radianti
   */
  private getRotation(): number {
    switch (this.direction) {
      case Direction.UP: return -Math.PI / 2;
      case Direction.DOWN: return Math.PI / 2;
      case Direction.LEFT: return Math.PI;
      case Direction.RIGHT:
      default: return 0;
    }
  }

  /**
   * Renderizza Pac-Man sul canvas
   * @param ctx - Contesto 2D del canvas
   */
  public render(ctx: CanvasRenderingContext2D): void {
    const centerX = this.x + TILE_SIZE / 2;
    const centerY = this.y + TILE_SIZE / 2;
    const radius = TILE_SIZE / 2 - 1;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(this.getRotation());

    // Corpo di Pac-Man
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(0, 0, radius, this.mouthAngle * Math.PI, -this.mouthAngle * Math.PI, false);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();

    // Occhio
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(2, -radius / 2, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Effetto glow se power-up attivo
    if (this.isPoweredUp) {
      ctx.save();
      ctx.globalAlpha = 0.3 + Math.sin(Date.now() / 100) * 0.2;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius + 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

export default Pacman;
