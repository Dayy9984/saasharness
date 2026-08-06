import { describe, expect, it } from 'vitest';
import { createGame, hardDrop, move, rotate } from '../src/react/tetris/engine';

describe('falling-block engine', () => {
  it('moves, rotates, and locks a piece deterministically', () => {
    const start = createGame();
    const moved = move(start, -1, 0);
    expect(moved.piece.x).toBe(start.piece.x - 1);
    const turned = rotate(moved);
    expect(turned.piece.rotation).toBe(1);
    const dropped = hardDrop(turned);
    expect(dropped.score).toBeGreaterThan(0);
    expect(dropped.piece.shapeIndex).toBe(1);
  });
});
