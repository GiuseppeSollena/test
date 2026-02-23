/**
 * Ghost.ts - Gestione dei fantasmi
 * 
 * Classe responsabile per:
 * - Movimento e IA dei fantasmi
 * - Stati: Chase, Scatter, Frightened, Eaten
 * - Rendering con colori diversi per ogni fantasma
 */

import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, GameMap } from './Map';
import { Pacman } from './Pacman';
import { 
  Direction, 
  DIRECTION_VECTORS, 
  TilePosition, 
  GhostConfig, 
  GhostType, 
  GhostState,
  Renderable,
  Positionable
} from './types';

/**
 * Configurazioni per ogni tipo di fantasma
 */
export const GHOST_CONFIGS: Record<GhostType, GhostConfig> = {
  [GhostType.BLINKY]: {
    name: 'Blinky',
    color: '#ff0000', // Rosso - insegue direttamente
    scatterTarget: { x: MAP_WIDTH - 1, y: 0 }
  },
  [GhostType.PINKY]: {
    name: 'Pinky',
    color: '#ffb8ff', // Rosa - mira davanti a Pac-Man
    scatterTarget: { x: 0, y: 0 }
  },
  [GhostType.INKY]: {
    name: 'Inky',
    color: '#00ffff', // Ciano - comportamento complesso
    scatterTarget: { x: MAP_WIDTH - 1, y: MAP_HEIGHT - 1 }
  },
  [GhostType.CLYDE]: {
    name: 'Clyde',
    color: '#ffb852', // Arancione - timido
    scatterTarget: { x: 0, y: MAP_HEIGHT - 1 }
  }
};

/**
 * Classe Ghost - Entità nemica
 */
export class Ghost implements Renderable, Positionable {
  /** Configurazione del fantasma (colore, nome, target) */
  private readonly config: GhostConfig;
  
  /** Posizione iniziale in tile */
  private readonly startTileX: number;
  private readonly startTileY: number;
  
  /** Posizione corrente in pixel */
  public x: number;
  public y: number;
  
  /** Direzione corrente */
  private direction: Direction;
  
  /** Stato corrente del fantasma */
  public state: GhostState;
  
  /** Velocità di movimento */
  private speed: number;
  private readonly normalSpeed: number = 1.5;
  private readonly frightenedSpeed: number = 1;
  private readonly eatenSpeed: number = 3;
  
  /** Timer per cambio stato */
  public stateTimer: number;
  
  /** Animazione */
  private animationFrame: number;
  private animationTimer: number;

  /**
   * @param type - Uno dei tipi in GhostType
   * @param startX - Posizione X iniziale (tile)
   * @param startY - Posizione Y iniziale (tile)
   */
  constructor(type: GhostType, startX: number, startY: number) {
    this.config = GHOST_CONFIGS[type];
    this.startTileX = startX;
    this.startTileY = startY;
    
    this.x = startX * TILE_SIZE;
    this.y = startY * TILE_SIZE;
    this.direction = Direction.UP;
    this.state = GhostState.SCATTER;
    this.speed = this.normalSpeed;
    this.stateTimer = 0;
    this.animationFrame = 0;
    this.animationTimer = 0;
  }

  /**
   * Resetta il fantasma allo stato iniziale
   */
  public reset(): void {
    this.x = this.startTileX * TILE_SIZE;
    this.y = this.startTileY * TILE_SIZE;
    this.direction = Direction.UP;
    this.state = GhostState.SCATTER;
    this.speed = this.normalSpeed;
    this.stateTimer = 0;
    this.animationFrame = 0;
    this.animationTimer = 0;
  }

  /**
   * Ottiene la posizione tile corrente
   */
  public getTilePosition(): TilePosition {
    return {
      x: Math.floor((this.x + TILE_SIZE / 2) / TILE_SIZE),
      y: Math.floor((this.y + TILE_SIZE / 2) / TILE_SIZE)
    };
  }

  /**
   * Verifica se il fantasma è centrato in una tile
   */
  private isCenteredInTile(): boolean {
    const centerX = this.x + TILE_SIZE / 2;
    const centerY = this.y + TILE_SIZE / 2;
    
    const tileX = Math.floor(centerX / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
    const tileY = Math.floor(centerY / TILE_SIZE) * TILE_SIZE + TILE_SIZE / 2;
    const threshold = this.speed + 1;
    return Math.abs(centerX - tileX) <= threshold && 
         Math.abs(centerY - tileY) <= threshold;
  }

  /**
   * Centra il fantasma nella tile
   */
  private centerInTile(): void {
    const pos = this.getTilePosition();
    this.x = pos.x * TILE_SIZE;
    this.y = pos.y * TILE_SIZE;
  }

  /**
   * Imposta lo stato frightened (quando Pac-Man mangia power-up)
   */
  public setFrightened(duration: number): void {
    if (this.state !== GhostState.EATEN) {
      this.state = GhostState.FRIGHTENED;
      this.stateTimer = duration;
      this.speed = this.frightenedSpeed;
      // Inverte la direzione
      this.direction = this.getOppositeDirection(this.direction);
    }
  }

  /**
   * Quando il fantasma viene mangiato
   */
  public setEaten(): void {
    this.state = GhostState.EATEN;
    this.speed = this.eatenSpeed;
  }

  /**
   * Ottiene la direzione opposta
   */
  private getOppositeDirection(dir: Direction): Direction {
    switch (dir) {
      case Direction.UP: return Direction.DOWN;
      case Direction.DOWN: return Direction.UP;
      case Direction.LEFT: return Direction.RIGHT;
      case Direction.RIGHT: return Direction.LEFT;
      default: return dir;
    }
  }

  /**
   * Calcola il target in base allo stato e tipo
   * @param pacman - Istanza di Pac-Man
   */
  private getTargetTile(pacman: Pacman): TilePosition {
    const pacmanTile = pacman.getTilePosition();
    
    switch (this.state) {
      case GhostState.SCATTER:
        return this.config.scatterTarget;
        
      case GhostState.CHASE:
        return this.calculateChaseTarget(pacman);
        
      case GhostState.FRIGHTENED:
        // Movimento casuale
        return {
          x: Math.floor(Math.random() * MAP_WIDTH),
          y: Math.floor(Math.random() * MAP_HEIGHT)
        };
        
      case GhostState.EATEN:
        // Torna alla casa dei fantasmi
        return { x: 10, y: 10 };
        
      default:
        return pacmanTile;
    }
  }

  /**
   * Calcola il target durante il chase (diverso per ogni fantasma)
   */
  private calculateChaseTarget(pacman: Pacman): TilePosition {
    const pacmanTile = pacman.getTilePosition();
    const pacmanDir = DIRECTION_VECTORS[pacman.getDirection()];
    
    switch (this.config.name) {
      case 'Blinky':
        // Insegue direttamente Pac-Man
        return pacmanTile;
        
      case 'Pinky':
        // Mira 4 tile davanti a Pac-Man
        return {
          x: pacmanTile.x + pacmanDir.x * 4,
          y: pacmanTile.y + pacmanDir.y * 4
        };
        
      case 'Inky':
        // Mira 2 tile davanti (semplificato)
        return {
          x: pacmanTile.x + pacmanDir.x * 2,
          y: pacmanTile.y + pacmanDir.y * 2
        };
        
      case 'Clyde':
        // Insegue se lontano, scappa se vicino
        const distance = this.getDistanceToTile(pacmanTile);
        if (distance > 8) {
          return pacmanTile;
        }
        return this.config.scatterTarget;
        
      default:
        return pacmanTile;
    }
  }

  /**
   * Calcola la distanza a una tile
   */
  private getDistanceToTile(tile: TilePosition): number {
    const pos = this.getTilePosition();
    return Math.sqrt(
      Math.pow(tile.x - pos.x, 2) + 
      Math.pow(tile.y - pos.y, 2)
    );
  }

  /**
   * Ottiene le direzioni disponibili (non muri, non inversione)
   */
  private getAvailableDirections(gameMap: GameMap): Direction[] {
    const directions: Direction[] = [Direction.UP, Direction.DOWN, Direction.LEFT, Direction.RIGHT];
    const opposite = this.getOppositeDirection(this.direction);
    const pos = this.getTilePosition();
    
    // Verifica se il fantasma è nella ghost house (riga 10 o più bassa, e colonne 9-11)
    const isInGhostHouse = pos.y >= 10 && pos.x >= 9 && pos.x <= 11;
    
    return directions.filter(dir => {
      // Non può tornare indietro (tranne se frightened)
      if (dir === opposite && this.state !== GhostState.FRIGHTENED) {
        return false;
      }
      
      const vector = DIRECTION_VECTORS[dir];
      const nextX = pos.x + vector.x;
      const nextY = pos.y + vector.y;
      
      // Verifica che non sia un muro
      const tile = gameMap.getTile(nextX, nextY);
      
      // Gestione porta fantasmi (tile 4):
      // - Può attraversare se è nella ghost house (per uscire)
      // - Può attraversare se stato EATEN (per rientrare)
      // - Non può attraversare se è già fuori dalla ghost house
      if (tile === 4) {
        if (this.state === GhostState.EATEN || isInGhostHouse) {
          return true; // Può attraversare la porta
        }
        return false; // Non può rientrare nella ghost house
      }
      
      return tile !== 1;
    });
  }

  /**
   * Sceglie la direzione migliore verso il target
   */
  private chooseBestDirection(gameMap: GameMap, targetTile: TilePosition): Direction {
    const available = this.getAvailableDirections(gameMap);
    
    if (available.length === 0) {
      return this.direction;
    }
    
    if (available.length === 1) {
      return available[0];
    }
    
    // Sceglie la direzione che avvicina di più al target
    let bestDir = available[0];
    let bestDistance = Infinity;
    
    const pos = this.getTilePosition();
    
    for (const dir of available) {
      const vector = DIRECTION_VECTORS[dir];
      const nextX = pos.x + vector.x;
      const nextY = pos.y + vector.y;
      
      const distance = Math.pow(targetTile.x - nextX, 2) + 
                       Math.pow(targetTile.y - nextY, 2);
      
      // Per frightened, scegli casualmente se le distanze sono simili
      if (this.state === GhostState.FRIGHTENED && Math.random() < 0.3) {
        bestDistance = distance;
        bestDir = dir;
      } else if (distance < bestDistance) {
        bestDistance = distance;
        bestDir = dir;
      }
    }
    
    return bestDir;
  }

  /**
   * Aggiorna lo stato del fantasma
   */
  public update(gameMap: GameMap, pacman: Pacman, deltaTime: number): void {
    // Aggiorna timer di stato
    this.stateTimer -= deltaTime;
    
    // Gestione cambio stato
    if (this.state === GhostState.FRIGHTENED && this.stateTimer <= 0) {
      this.state = GhostState.CHASE;
      this.speed = this.normalSpeed;
    }
    
    if (this.state === GhostState.EATEN) {
      const pos = this.getTilePosition();
      // Tornato alla base
      if (pos.x === 10 && pos.y === 10) {
        this.state = GhostState.CHASE;
        this.speed = this.normalSpeed;
      }
    }
    
    // Aggiorna animazione
    this.animationTimer += deltaTime;
    if (this.animationTimer > 200) {
      this.animationFrame = (this.animationFrame + 1) % 2;
      this.animationTimer = 0;
    }

    // Movimento
    if (this.isCenteredInTile()) {
      this.centerInTile();
      const target = this.getTargetTile(pacman);
      this.direction = this.chooseBestDirection(gameMap, target);
    }

    // Applica movimento
    const vector = DIRECTION_VECTORS[this.direction];
    if (vector) {
      const newX = this.x + vector.x * this.speed;
      const newY = this.y + vector.y * this.speed;
      
      // Verifica collisione semplificata
      const nextTileX = Math.floor((newX + TILE_SIZE / 2) / TILE_SIZE);
      const nextTileY = Math.floor((newY + TILE_SIZE / 2) / TILE_SIZE);
      
      if (gameMap.isWalkable(nextTileX, nextTileY) || gameMap.getTile(nextTileX, nextTileY) === 4) {
        this.x = newX;
        this.y = newY;
      }
    }

    // Gestione tunnel
    this.handleTunnelWrap();
  }

  /**
   * Gestisce il wrap del tunnel
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
   * Verifica collisione con Pac-Man
   */
  public checkCollision(pacman: Pacman): boolean {
    const ghostPos = this.getTilePosition();
    const pacmanPos = pacman.getTilePosition();
    
    return ghostPos.x === pacmanPos.x && ghostPos.y === pacmanPos.y;
  }

  /**
   * Renderizza il fantasma
   */
  public render(ctx: CanvasRenderingContext2D): void {
    const centerX = this.x + TILE_SIZE / 2;
    const centerY = this.y + TILE_SIZE / 2;
    const radius = TILE_SIZE / 2 - 1;
    
    if (this.state === GhostState.EATEN) {
      // Solo occhi quando mangiato
      this.renderEyes(ctx, centerX, centerY, radius);
      return;
    }
    
    // Colore in base allo stato
    let color = this.config.color;
    if (this.state === GhostState.FRIGHTENED) {
      // Lampeggia quando sta per finire
      if (this.stateTimer < 2000) {
        color = this.stateTimer % 400 < 200 ? '#2121ff' : '#ffffff';
      } else {
        color = '#2121ff';
      }
    }
    
    // Corpo del fantasma
    ctx.fillStyle = color;
    ctx.beginPath();
    
    // Parte superiore (semicerchio)
    ctx.arc(centerX, centerY - 2, radius, Math.PI, 0, false);
    
    // Parte inferiore ondulata
    const waveHeight = 3;
    const bottom = centerY + radius - 2;
    
    ctx.lineTo(centerX + radius, bottom);
    
    // Onde nella parte inferiore
    const waveCount = 3;
    const waveWidth = (radius * 2) / waveCount;
    
    for (let i = waveCount; i > 0; i--) {
      const waveX = centerX + radius - (waveCount - i + 1) * waveWidth;
      const offset = this.animationFrame === 0 ? 0 : waveHeight / 2;
      
      ctx.quadraticCurveTo(
        waveX + waveWidth / 2, 
        bottom + waveHeight - offset,
        waveX, 
        bottom
      );
    }
    
    ctx.closePath();
    ctx.fill();
    
    // Occhi
    this.renderEyes(ctx, centerX, centerY, radius);
  }

  /**
   * Renderizza gli occhi del fantasma
   */
  private renderEyes(
    ctx: CanvasRenderingContext2D, 
    centerX: number, 
    centerY: number, 
    radius: number
  ): void {
    const eyeOffsetX = radius * 0.35;
    const eyeOffsetY = -radius * 0.1;
    const eyeRadius = radius * 0.3;
    const pupilRadius = radius * 0.15;
    
    // Direzione degli occhi
    const lookVector = DIRECTION_VECTORS[this.direction] || { x: 0, y: 0 };
    const pupilOffset = pupilRadius * 0.5;
    
    // Occhio sinistro
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(centerX - eyeOffsetX, centerY + eyeOffsetY, eyeRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Pupilla sinistra
    ctx.fillStyle = '#00f';
    ctx.beginPath();
    ctx.arc(
      centerX - eyeOffsetX + lookVector.x * pupilOffset,
      centerY + eyeOffsetY + lookVector.y * pupilOffset,
      pupilRadius, 0, Math.PI * 2
    );
    ctx.fill();
    
    // Occhio destro
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(centerX + eyeOffsetX, centerY + eyeOffsetY, eyeRadius, 0, Math.PI * 2);
    ctx.fill();
    
    // Pupilla destra
    ctx.fillStyle = '#00f';
    ctx.beginPath();
    ctx.arc(
      centerX + eyeOffsetX + lookVector.x * pupilOffset,
      centerY + eyeOffsetY + lookVector.y * pupilOffset,
      pupilRadius, 0, Math.PI * 2
    );
    ctx.fill();
  }
}

export default Ghost;
