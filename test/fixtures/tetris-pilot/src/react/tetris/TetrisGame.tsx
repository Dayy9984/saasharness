import { useEffect, useState } from 'react';
import { createGame, hardDrop, move, rotate, visibleBoard } from './engine';
import './tetris.css';

export function TetrisGame() {
  const [game, setGame] = useState(createGame);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') setGame((current) => move(current, -1, 0));
      if (event.key === 'ArrowRight') setGame((current) => move(current, 1, 0));
      if (event.key === 'ArrowDown') setGame((current) => move(current, 0, 1));
      if (event.key === 'ArrowUp') setGame((current) => rotate(current));
      if (event.key === ' ') {
        event.preventDefault();
        setGame((current) => hardDrop(current));
      }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, []);

  const board = visibleBoard(game);
  return (
    <main className="tetris-app">
      <header className="tetris-header">
        <div>
          <p>Falling Blocks · harness pilot</p>
          <h1>Focused kinetic play</h1>
        </div>
        <a href="/__ux">Open design workflow</a>
      </header>
      <section className="tetris-layout">
        <div className="tetris-board" role="grid" aria-label="Falling block board" data-active-x={game.piece.x} data-active-y={game.piece.y} data-score={game.score} data-lines={game.lines}>
          {board.flatMap((row, y) => row.map((cell, x) => (
            <span key={`${x}-${y}`} role="gridcell" data-filled={cell > 0} data-cell={cell} />
          )))}
        </div>
        <aside className="tetris-panel">
          <div className="tetris-stats">
            <p><span>Score</span><strong>{game.score}</strong></p>
            <p><span>Lines</span><strong>{game.lines}</strong></p>
            <p><span>Status</span><strong>{game.over ? 'Game over' : 'Playing'}</strong></p>
          </div>
          <div className="tetris-controls" aria-label="Game controls">
            <button type="button" onClick={() => setGame((current) => move(current, -1, 0))}>Move left</button>
            <button type="button" onClick={() => setGame((current) => rotate(current))}>Rotate</button>
            <button type="button" onClick={() => setGame((current) => move(current, 1, 0))}>Move right</button>
            <button type="button" onClick={() => setGame((current) => move(current, 0, 1))}>Soft drop</button>
            <button type="button" onClick={() => setGame((current) => hardDrop(current))}>Hard drop</button>
            <button type="button" onClick={() => setGame(createGame())}>Restart</button>
          </div>
          <p className="tetris-help">Keyboard: arrows to move/rotate, Space to hard drop.</p>
        </aside>
      </section>
    </main>
  );
}
