export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 18;

type Cell = readonly [number, number];

const SHAPES: readonly (readonly Cell[])[] = [
  [[0, 0], [1, 0], [2, 0], [3, 0]],
  [[0, 0], [1, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0], [2, 0], [1, 1]],
  [[0, 0], [0, 1], [1, 1], [2, 1]],
  [[2, 0], [0, 1], [1, 1], [2, 1]],
  [[1, 0], [2, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0], [1, 1], [2, 1]],
] as const;

export interface Piece { shapeIndex: number; rotation: number; x: number; y: number; }
export interface GameState { board: number[][]; piece: Piece; score: number; lines: number; over: boolean; }

function rotateCells(cells: readonly Cell[], rotation: number): Cell[] {
  let result = cells.map(([x, y]) => [x, y] as Cell);
  for (let step = 0; step < rotation % 4; step += 1) {
    result = result.map(([x, y]) => [-y, x] as Cell);
    const minX = Math.min(...result.map(([x]) => x));
    const minY = Math.min(...result.map(([, y]) => y));
    result = result.map(([x, y]) => [x - minX, y - minY] as Cell);
  }
  return result;
}

export function pieceCells(piece: Piece): Cell[] { return rotateCells(SHAPES[piece.shapeIndex % SHAPES.length], piece.rotation); }

function collision(board: number[][], piece: Piece): boolean {
  return pieceCells(piece).some(([dx, dy]) => {
    const x = piece.x + dx;
    const y = piece.y + dy;
    return x < 0 || x >= BOARD_WIDTH || y < 0 || y >= BOARD_HEIGHT || board[y][x] !== 0;
  });
}

function nextPiece(shapeIndex: number): Piece { return { shapeIndex: (shapeIndex + 1) % SHAPES.length, rotation: 0, x: 3, y: 0 }; }

export function createGame(): GameState {
  return { board: Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(0)), piece: { shapeIndex: 0, rotation: 0, x: 3, y: 0 }, score: 0, lines: 0, over: false };
}

function lockPiece(state: GameState): GameState {
  const board = state.board.map((row) => [...row]);
  for (const [dx, dy] of pieceCells(state.piece)) {
    const x = state.piece.x + dx;
    const y = state.piece.y + dy;
    if (y >= 0 && y < BOARD_HEIGHT && x >= 0 && x < BOARD_WIDTH) board[y][x] = state.piece.shapeIndex + 1;
  }
  const remaining = board.filter((row) => row.some((cell) => cell === 0));
  const cleared = BOARD_HEIGHT - remaining.length;
  const nextBoard = [...Array.from({ length: cleared }, () => Array(BOARD_WIDTH).fill(0)), ...remaining];
  const piece = nextPiece(state.piece.shapeIndex);
  const nextState = { board: nextBoard, piece, score: state.score + 10 + cleared * cleared * 100, lines: state.lines + cleared, over: false };
  return collision(nextBoard, piece) ? { ...nextState, over: true } : nextState;
}

export function move(state: GameState, dx: number, dy: number): GameState {
  if (state.over) return state;
  const piece = { ...state.piece, x: state.piece.x + dx, y: state.piece.y + dy };
  if (!collision(state.board, piece)) return { ...state, piece };
  return dy > 0 ? lockPiece(state) : state;
}

export function rotate(state: GameState): GameState {
  if (state.over) return state;
  const piece = { ...state.piece, rotation: (state.piece.rotation + 1) % 4 };
  if (!collision(state.board, piece)) return { ...state, piece };
  for (const nudge of [-1, 1, -2, 2]) {
    const nudged = { ...piece, x: piece.x + nudge };
    if (!collision(state.board, nudged)) return { ...state, piece: nudged };
  }
  return state;
}

export function hardDrop(state: GameState): GameState {
  let current = state;
  while (!current.over) {
    const next = move(current, 0, 1);
    if (next.piece.shapeIndex !== current.piece.shapeIndex || next.piece.y < current.piece.y) return next;
    if (next === current) return current;
    current = next;
  }
  return current;
}

export function visibleBoard(state: GameState): number[][] {
  const board = state.board.map((row) => [...row]);
  if (!state.over) {
    for (const [dx, dy] of pieceCells(state.piece)) {
      const x = state.piece.x + dx;
      const y = state.piece.y + dy;
      if (y >= 0 && y < BOARD_HEIGHT && x >= 0 && x < BOARD_WIDTH) board[y][x] = state.piece.shapeIndex + 8;
    }
  }
  return board;
}
