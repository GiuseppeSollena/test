/**
 * App.tsx - Componente principale dell'applicazione Pac-Man
 * 
 * Gestisce:
 * - Layout dell'interfaccia utente
 * - Stato del punteggio e delle vite
 * - Visualizzazione dello stato di gioco
 */

import { useState, useCallback } from 'react';
import GameCanvas from './components/GameCanvas';
import { GameState } from './game/Engine';
import './App.css';

/**
 * Componente principale App
 * Contiene l'UI del gioco con punteggio, vite e canvas
 */
function App() {
  // Stato UI
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameState, setGameState] = useState(GameState.START);

  // Callbacks per aggiornare lo stato dall'engine
  const handleScoreChange = useCallback((newScore: number) => {
    setScore(newScore);
  }, []);

  const handleLivesChange = useCallback((newLives: number) => {
    setLives(newLives);
  }, []);

  const handleStateChange = useCallback((newState: GameState) => {
    setGameState(newState);
  }, []);

  // Genera le icone delle vite
  const renderLives = () => {
    const lifeIcons = [];
    for (let i = 0; i < lives; i++) {
      lifeIcons.push(
        <span key={i} className="life-icon" aria-label="vita">
          🟡
        </span>
      );
    }
    return lifeIcons;
  };

  // Testo dello stato di gioco
  const getStateText = () => {
    switch (gameState) {
      case GameState.START:
        return 'Premi un tasto per iniziare';
      case GameState.PLAYING:
        return 'In gioco';
      case GameState.PAUSED:
        return 'In pausa';
      case GameState.GAME_OVER:
        return 'Game Over';
      case GameState.VICTORY:
        return 'Vittoria!';
      case GameState.DYING:
        return 'Ouch!';
      default:
        return '';
    }
  };

  return (
    <div className="app">
      {/* Header con titolo */}
      <header className="game-header">
        <h1 className="game-title">PAC-MAN</h1>
        <p className="game-subtitle">React + Canvas Edition</p>
      </header>

      {/* Pannello info gioco */}
      <div className="game-info">
        <div className="info-panel score-panel">
          <span className="info-label">Punteggio</span>
          <span className="info-value">{score.toLocaleString()}</span>
        </div>
        
        <div className="info-panel state-panel">
          <span className="info-label">Stato</span>
          <span className={`info-value state-${gameState.toLowerCase()}`}>
            {getStateText()}
          </span>
        </div>
        
        <div className="info-panel lives-panel">
          <span className="info-label">Vite</span>
          <span className="info-value lives-icons">
            {renderLives()}
          </span>
        </div>
      </div>

      {/* Canvas di gioco */}
      <main className="game-container">
        <GameCanvas
          onScoreChange={handleScoreChange}
          onLivesChange={handleLivesChange}
          onStateChange={handleStateChange}
        />
      </main>

      {/* Footer con controlli */}
      <footer className="game-footer">
        <div className="controls-info">
          <div className="control-item">
            <kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd>
            <span>o</span>
            <kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>
            <span>per muoverti</span>
          </div>
          <div className="control-item">
            <kbd>ESC</kbd>
            <span>per pausa</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
