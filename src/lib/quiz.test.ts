import { describe, expect, it } from 'vitest';
import { checkAnswerKey, parseQuiz, scoreQuiz } from './quiz';
// ?raw makes Vite hand over the file as a plain string.
import lesson1Quiz from '../content/assignments/cn6003/lesson-1-quiz.md?raw';

// Same shape as the real files: two trailing spaces end each option line.
const sample = `Intro line one
continues here.

Second paragraph.

1. First question?

   α) Yes.
   β) No.

2. Second question?

   α) Maybe.
   β) Never.
   γ) Always.
`;

describe('parseQuiz', () => {
  it('reads intro paragraphs, questions and options', () => {
    const quiz = parseQuiz(sample);
    expect(quiz.intro).toEqual(['Intro line one continues here.', 'Second paragraph.']);
    expect(quiz.questions).toHaveLength(2);
    expect(quiz.questions[1]).toEqual({
      number: 2,
      text: 'Second question?',
      options: [
        { letter: 'α', text: 'Maybe.' },
        { letter: 'β', text: 'Never.' },
        { letter: 'γ', text: 'Always.' },
      ],
    });
  });

  it('rejects questions out of order', () => {
    expect(() => parseQuiz('1. A?\n\n   α) x\n   β) y\n\n3. B?\n')).toThrow(/expected question 2/);
  });

  it('rejects skipped option letters', () => {
    expect(() => parseQuiz('1. A?\n\n   α) x\n   γ) y\n')).toThrow(/out of order/);
  });

  it('rejects stray text after the questions start', () => {
    expect(() => parseQuiz('1. A?\n\n   α) x\n   β) y\n\nA stray note.\n')).toThrow(/not a question/);
  });

  it('parses the real Unit 1 quiz', () => {
    const body = lesson1Quiz.split(/^---$/m).slice(2).join('---');
    const quiz = parseQuiz(body);
    expect(quiz.questions).toHaveLength(19);
    expect(quiz.questions.every((q) => q.options.length === 4)).toBe(true);
  });
});

describe('checkAnswerKey', () => {
  const quiz = parseQuiz(sample);

  it('accepts a matching key', () => {
    expect(checkAnswerKey(quiz, ['α', 'γ'])).toEqual([]);
  });

  it('reports a wrong count and a letter that is not an option', () => {
    expect(checkAnswerKey(quiz, ['γ'])).toEqual(['has 2 questions but 1 answers', 'question 1 has no option "γ)"']);
  });
});

describe('scoreQuiz', () => {
  it('counts right, wrong and skipped answers', () => {
    expect(scoreQuiz(['α', 'β', 'γ'], ['α', 'γ', undefined])).toEqual({
      correct: 1,
      total: 3,
      unanswered: 1,
      marks: ['correct', 'wrong', 'unanswered'],
    });
  });
});
