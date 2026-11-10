import { describe, expect, it } from 'vitest';
import { lines, minimax, PRACTICE } from './tictactoe';

describe('tic-tac-toe practice', () => {
  it('the three X moves are worth 0, −1, +1 (as in the lesson figure)', () => {
    const ls = lines(PRACTICE);
    // cells: 5 = row 2 col 3, 6 = row 3 col 1, 7 = row 3 col 2
    expect(ls.map((l) => [l.move, l.value])).toEqual([[5, 0], [6, -1], [7, 1]]);
    expect(minimax(PRACTICE, 'X')).toBe(1);
  });

  it('the replies are the ones the lesson describes', () => {
    const [draw, loss, win] = lines(PRACTICE);
    expect(win!.moves).toHaveLength(1); // X wins at once
    expect(draw!.reply).toBe(7); // O must close the middle column
    expect(draw!.moves.at(-1)).toEqual({ cell: 6, who: 'X' }); // X takes the last cell
    expect(loss!.reply).toBe(5); // O completes the third column
  });
});
