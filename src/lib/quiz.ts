/**
 * Practice quizzes: reading the questions out of a quiz's Markdown and
 * scoring a set of answers.
 *
 * A quiz brief is written as plain Markdown (so it still reads well as
 * text), in this exact shape:
 *
 *   Intro paragraph(s)…
 *
 *   1. Question text?
 *
 *      α) First option.
 *      β) Second option.
 *
 *   2. Next question?
 *   …
 *
 * The answer key lives in the front matter (`answers: [β, γ, …]`, one
 * letter per question). parseQuiz() is strict on purpose: a line it
 * doesn't understand is an error, so a typo can't silently drop a question.
 */

export const OPTION_LETTERS = ['α', 'β', 'γ', 'δ', 'ε', 'στ'] as const;
export type OptionLetter = (typeof OPTION_LETTERS)[number];

export interface QuizOption {
  letter: OptionLetter;
  text: string;
}

export interface QuizQuestion {
  number: number;
  text: string;
  options: QuizOption[];
}

export interface ParsedQuiz {
  /** Paragraphs before question 1, as plain text. */
  intro: string[];
  questions: QuizQuestion[];
}

const QUESTION = /^(\d+)\.\s+(.+?)\s*$/;
const OPTION = new RegExp(`^\\s+(${OPTION_LETTERS.join('|')})\\)\\s+(.+?)\\s*$`);

export function parseQuiz(markdown: string): ParsedQuiz {
  const intro: string[] = [];
  const questions: QuizQuestion[] = [];
  let paragraph: string[] = [];

  markdown.split(/\r?\n/).forEach((line, i) => {
    const question = QUESTION.exec(line);
    const option = OPTION.exec(line);

    if (question) {
      const number = Number(question[1]);
      if (number !== questions.length + 1) {
        throw new Error(`line ${i + 1}: expected question ${questions.length + 1}, found ${number}`);
      }
      questions.push({ number, text: question[2], options: [] });
    } else if (option) {
      const current = questions.at(-1);
      if (!current) throw new Error(`line ${i + 1}: option before the first question`);
      const letter = option[1] as OptionLetter;
      if (letter !== OPTION_LETTERS[current.options.length]) {
        throw new Error(`line ${i + 1}: question ${current.number} options are out of order at "${letter})"`);
      }
      current.options.push({ letter, text: option[2] });
    } else if (line.trim() === '') {
      if (paragraph.length) intro.push(paragraph.join(' '));
      paragraph = [];
    } else if (questions.length === 0) {
      paragraph.push(line.trim());
    } else {
      throw new Error(`line ${i + 1}: not a question or an option: "${line.trim()}"`);
    }
  });
  if (paragraph.length) intro.push(paragraph.join(' '));

  for (const q of questions) {
    if (q.options.length < 2) throw new Error(`question ${q.number} needs at least two options`);
  }
  return { intro, questions };
}

/**
 * Checks a quiz against its answer key; returns a list of problems (empty
 * when everything matches). Used by the build-time content validation.
 */
export function checkAnswerKey(quiz: ParsedQuiz, answers: readonly string[]): string[] {
  const problems: string[] = [];
  if (answers.length !== quiz.questions.length) {
    problems.push(`has ${quiz.questions.length} questions but ${answers.length} answers`);
  }
  quiz.questions.forEach((q, i) => {
    const answer = answers[i];
    if (answer !== undefined && !q.options.some((o) => o.letter === answer)) {
      problems.push(`question ${q.number} has no option "${answer})"`);
    }
  });
  return problems;
}

export interface QuizResult {
  correct: number;
  total: number;
  unanswered: number;
  /** Per question: right, wrong, or skipped. */
  marks: ('correct' | 'wrong' | 'unanswered')[];
}

/** `chosen[i]` is the letter picked for question i, or undefined if skipped. */
export function scoreQuiz(answers: readonly string[], chosen: readonly (string | undefined)[]): QuizResult {
  const marks = answers.map((answer, i) =>
    chosen[i] === undefined ? 'unanswered' : chosen[i] === answer ? 'correct' : 'wrong',
  ) as QuizResult['marks'];
  return {
    correct: marks.filter((m) => m === 'correct').length,
    total: answers.length,
    unanswered: marks.filter((m) => m === 'unanswered').length,
    marks,
  };
}
