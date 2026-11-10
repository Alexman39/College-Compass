/**
 * Full Minimax on tic-tac-toe, for the practice of CN6005 Week 4
 * (src/scripts/demos/tictactoe.ts). Tested in tictactoe.test.ts.
 *
 * A board is 9 cells, row by row: 'X', 'O' or ' '. X is MAX: a finished game
 * is worth +1 if X wins, −1 if O wins, 0 for a draw.
 */
export type Cell = 'X' | 'O' | ' ';
export type Board = Cell[];

const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];

/** The lesson's position: X X O / O X · / · · O, X to play. */
export const PRACTICE: Board = ['X', 'X', 'O', 'O', 'X', ' ', ' ', ' ', 'O'];

export function winner(b: Board): 'X' | 'O' | null {
  for (const [p, q, r] of LINES) if (b[p] !== ' ' && b[p] === b[q!] && b[p] === b[r!]) return b[p] as 'X' | 'O';
  return null;
}

export const free = (b: Board) => b.flatMap((c, i) => (c === ' ' ? [i] : []));
export const play = (b: Board, i: number, who: 'X' | 'O'): Board => b.map((c, k) => (k === i ? who : c));

/** Value of the position with `who` to move. */
export function minimax(b: Board, who: 'X' | 'O'): number {
  const w = winner(b);
  if (w) return w === 'X' ? 1 : -1;
  const moves = free(b);
  if (!moves.length) return 0;
  const vals = moves.map((i) => minimax(play(b, i, who), who === 'X' ? 'O' : 'X'));
  return who === 'X' ? Math.max(...vals) : Math.min(...vals);
}

export interface Line {
  /** X's move (cell index). */
  move: number;
  /** O's best reply, if the game is not over after X's move. */
  reply?: number;
  /** The rest of the game when both play best, after X's move. */
  moves: { cell: number; who: 'X' | 'O' }[];
  value: number;
}

/** For each X move from `b`: its Minimax value and the game that follows. */
export function lines(b: Board): Line[] {
  return free(b).map((move) => {
    let cur = play(b, move, 'X');
    const value = minimax(cur, 'O');
    const moves: Line['moves'] = [{ cell: move, who: 'X' }];
    let who: 'X' | 'O' = 'O';
    while (!winner(cur) && free(cur).length) {
      const next: 'X' | 'O' = who === 'X' ? 'O' : 'X';
      // the first move that keeps the Minimax value
      const best = free(cur).find((i) => minimax(play(cur, i, who), next) === value)!;
      cur = play(cur, best, who);
      moves.push({ cell: best, who });
      who = next;
    }
    return { move, reply: moves[1]?.cell, moves, value };
  });
}
