/**
 * types.ts - Definizioni TypeScript per il gioco Pac-Man
 * 
 * Contiene tutte le interfacce, tipi e enum utilizzati nel gioco
 */

// ============================================
// TIPI BASE
// ============================================

/**
 * Posizione in coordinate tile (griglia)
 */
export interface TilePosition {
  x: number;
  y: number;
}

/**
 * Posizione in coordinate pixel
 */
export interface PixelPosition {
  x: number;
  y: number;
}

/**
 * Vettore di direzione
 */
export interface DirectionVector {
  x: number;
  y: number;
}

// ============================================
// DIREZIONI
// ============================================

/**
 * Enum delle direzioni possibili
 */
export enum Direction {
  NONE = 'NONE',
  UP = 'UP',
  DOWN = 'DOWN',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT'
}

/**
 * Mappa direzione -> vettore di movimento
 */
export const DIRECTION_VECTORS: Record<Direction, DirectionVector> = {
  [Direction.NONE]: { x: 0, y: 0 },
  [Direction.UP]: { x: 0, y: -1 },
  [Direction.DOWN]: { x: 0, y: 1 },
  [Direction.LEFT]: { x: -1, y: 0 },
  [Direction.RIGHT]: { x: 1, y: 0 }
};

// ============================================
// MAPPA
// ============================================

/**
 * Valori possibili per le celle della mappa
 */
export enum TileType {
  DOT = 0,           // Pallina
  WALL = 1,          // Muro
  EMPTY = 2,         // Spazio vuoto
  POWER_PELLET = 3,  // Super pillola
  GHOST_DOOR = 4     // Porta fantasmi
}

/**
 * Tipo per la matrice della mappa
 */
export type MapGrid = TileType[][];

// ============================================
// FANTASMI
// ============================================

/**
 * Configurazione di un tipo di fantasma
 */
export interface GhostConfig {
  name: string;
  color: string;
  scatterTarget: TilePosition;
}

/**
 * Tipi di fantasmi disponibili
 */
export enum GhostType {
  BLINKY = 'BLINKY',
  PINKY = 'PINKY',
  INKY = 'INKY',
  CLYDE = 'CLYDE'
}

/**
 * Stati possibili del fantasma
 */
export enum GhostState {
  CHASE = 'CHASE',
  SCATTER = 'SCATTER',
  FRIGHTENED = 'FRIGHTENED',
  EATEN = 'EATEN'
}

// ============================================
// STATO DEL GIOCO
// ============================================

/**
 * Stati possibili del gioco
 */
export enum GameState {
  START = 'START',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY',
  DYING = 'DYING'
}

/**
 * Configurazione punteggi
 */
export const SCORE_VALUES = {
  DOT: 10,
  POWER_PELLET: 50,
  GHOST: 200
} as const;

// ============================================
// CALLBACK TYPES
// ============================================

/**
 * Callbacks per comunicare con React
 */
export interface GameCallbacks {
  onScoreChange?: (score: number) => void;
  onLivesChange?: (lives: number) => void;
  onStateChange?: (state: GameState) => void;
}

// ============================================
// INTERFACCE ENTITÀ
// ============================================

/**
 * Interfaccia base per entità renderabili
 */
export interface Renderable {
  render(ctx: CanvasRenderingContext2D): void;
}

/**
 * Interfaccia base per entità aggiornabili
 */
export interface Updatable {
  update(deltaTime: number): void;
}

/**
 * Interfaccia per entità con posizione
 */
export interface Positionable {
  x: number;
  y: number;
  getTilePosition(): TilePosition;
}
