/**
 * Map.ts - Definizione del labirinto di Pac-Man
 * 
 * Legenda della mappa:
 * 0 = Pallina (Dot)
 * 1 = Muro
 * 2 = Spazio vuoto (corridoio senza pallina)
 * 3 = Super Pillola (Power-Up)
 * 4 = Porta fantasmi
 */

import { TileType, MapGrid, Renderable } from './types';

// Dimensione di ogni tile in pixel
export const TILE_SIZE = 20;

// Mappa del labirinto classico di Pac-Man (21x21)
export const MAP_LAYOUT: MapGrid = [
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 3, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 3, 1],
  [1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1],
  [1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 0, 1, 1, 1, 1, 2, 1, 2, 1, 1, 1, 1, 0, 1, 1, 1, 1],
  [2, 2, 2, 1, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 1, 2, 2, 2], // Entrata Tunnel Sinistra
  [1, 1, 1, 1, 0, 1, 2, 1, 1, 4, 4, 4, 1, 1, 2, 1, 0, 1, 1, 1, 1],
  [2, 2, 2, 2, 0, 2, 2, 1, 2, 2, 2, 2, 2, 1, 2, 2, 0, 2, 2, 2, 2], // RIGA 10: TUNNEL APERTO
  [1, 1, 1, 1, 0, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2, 1, 0, 1, 1, 1, 1],
  [2, 2, 2, 1, 0, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 1, 0, 1, 2, 2, 2], // Entrata Tunnel Destra
  [1, 1, 1, 1, 0, 1, 2, 1, 1, 1, 1, 1, 1, 1, 2, 1, 0, 1, 1, 1, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1],
  [1, 3, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 3, 1],
  [1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1],
  [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
  [1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1],
  [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

// Dimensioni della mappa
export const MAP_WIDTH: number = MAP_LAYOUT[0].length;
export const MAP_HEIGHT: number = MAP_LAYOUT.length;

// Calcola dimensioni canvas in pixel
export const CANVAS_WIDTH: number = MAP_WIDTH * TILE_SIZE;
export const CANVAS_HEIGHT: number = MAP_HEIGHT * TILE_SIZE;

/**
 * Classe GameMap - Gestisce la logica della mappa di gioco
 * Responsabilità: renderizzare il labirinto e gestire lo stato delle tile
 */
export class GameMap implements Renderable {
  /** Griglia corrente del gioco (può essere modificata) */
  private grid: MapGrid;

  /** Numero totale di palline all'inizio del livello */
  public totalDots: number;

  constructor() {
    // Crea una copia profonda della mappa per evitare mutazioni dell'originale
    this.grid = MAP_LAYOUT.map(row => [...row]);
    this.totalDots = this.countDots();
  }

  /**
   * Conta il numero totale di palline nella mappa
   * @returns Numero di palline e super-pillole
   */
  private countDots(): number {
    let count = 0;
    for (const row of this.grid) {
      for (const cell of row) {
        if (cell === TileType.DOT || cell === TileType.POWER_PELLET) {
          count++;
        }
      }
    }
    return count;
  }

  /**
   * Ottiene il valore di una tile specifica
   * @param x - Coordinata X della tile
   * @param y - Coordinata Y della tile
   * @returns Valore della tile o WALL se fuori dai limiti
   */
  public getTile(x: number, y: number): TileType {
    // Se siamo fuori verticalmente, è un muro
    if (y < 0 || y >= MAP_HEIGHT) return TileType.WALL;

    // Se siamo fuori orizzontalmente (zona tunnel), permettiamo il passaggio
    if (x < 0 || x >= MAP_WIDTH) {
      return TileType.EMPTY; // <--- Cambiato da WALL a EMPTY
    }

    return this.grid[y][x];
  }

  /**
   * Imposta il valore di una tile (usato per rimuovere palline)
   * @param x - Coordinata X della tile
   * @param y - Coordinata Y della tile
   * @param value - Nuovo valore da impostare
   */
  public setTile(x: number, y: number, value: TileType): void {
    if (x >= 0 && x < MAP_WIDTH && y >= 0 && y < MAP_HEIGHT) {
      this.grid[y][x] = value;
    }
  }

  /**
   * Verifica se una tile è percorribile (non è un muro)
   * @param x - Coordinata X della tile
   * @param y - Coordinata Y della tile
   * @returns True se la tile è percorribile
   */
  public isWalkable(x: number, y: number): boolean {
    const tile = this.getTile(x, y);
    return tile !== TileType.WALL; // Tutto tranne i muri è percorribile
  }

  /**
   * Verifica se una posizione pixel è percorribile
   * @param pixelX - Coordinata X in pixel
   * @param pixelY - Coordinata Y in pixel
   * @returns True se percorribile
   */
  public isWalkablePixel(pixelX: number, pixelY: number): boolean {
    const tileX = Math.floor(pixelX / TILE_SIZE);
    const tileY = Math.floor(pixelY / TILE_SIZE);
    return this.isWalkable(tileX, tileY);
  }

  /**
   * Resetta la mappa allo stato iniziale
   */
  public reset(): void {
    this.grid = MAP_LAYOUT.map(row => [...row]);
    this.totalDots = this.countDots();
  }

  /**
   * Renderizza la mappa sul canvas
   * @param ctx - Contesto 2D del canvas
   */
  public render(ctx: CanvasRenderingContext2D): void {
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tile = this.grid[y][x];
        const pixelX = x * TILE_SIZE;
        const pixelY = y * TILE_SIZE;

        switch (tile) {
          case TileType.WALL:
            this.renderWall(ctx, pixelX, pixelY);
            break;
          case TileType.DOT:
            this.renderDot(ctx, pixelX, pixelY);
            break;
          case TileType.POWER_PELLET:
            this.renderPowerPellet(ctx, pixelX, pixelY);
            break;
          case TileType.GHOST_DOOR:
            this.renderGhostDoor(ctx, pixelX, pixelY);
            break;
          // TileType.EMPTY = spazio vuoto, non renderizzare nulla
        }
      }
    }
  }

  /**
   * Renderizza un singolo muro
   */
  private renderWall(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle = '#1a1aff';
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

    // Bordo più scuro per effetto 3D
    ctx.strokeStyle = '#0000aa';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 1, y + 1, TILE_SIZE - 2, TILE_SIZE - 2);
  }

  /**
   * Renderizza una pallina
   */
  private renderDot(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(
      x + TILE_SIZE / 2,
      y + TILE_SIZE / 2,
      3,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  /**
   * Renderizza una super pillola (animata con pulsazione)
   */
  private renderPowerPellet(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const time = Date.now() / 200;
    const scale = 0.8 + Math.sin(time) * 0.2;

    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(
      x + TILE_SIZE / 2,
      y + TILE_SIZE / 2,
      7 * scale,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  /**
   * Renderizza la porta della casa dei fantasmi
   */
  private renderGhostDoor(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle = '#ffaaff';
    ctx.fillRect(x, y + TILE_SIZE / 2 - 2, TILE_SIZE, 4);
  }
}

export default GameMap;
