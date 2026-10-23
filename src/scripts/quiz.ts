/**
 * Makes practice quizzes interactive: on "Υποβολή" it scores the chosen
 * answers, shows the score, and marks each question right or wrong with the
 * correct option. "Ξανά από την αρχή" clears everything for another try.
 *
 * Markup it looks for (rendered by Quiz.astro):
 *   form[data-quiz][data-answers="β,γ,…"]
 *     [data-question]                 one fieldset per question
 *       [data-option="β"] > input     the options
 *       [data-feedback]               filled in after submitting
 *     [data-result]                   the score line
 *     [data-quiz-buttons] [data-submit] [data-retry]
 *
 * Nothing is stored: reloading the page starts the quiz fresh.
 */
import { scoreQuiz } from '~/lib/quiz';

function setup(form: HTMLFormElement): void {
  const answers = form.dataset.answers!.split(',');
  const questions = [...form.querySelectorAll<HTMLFieldSetElement>('[data-question]')];
  const result = form.querySelector<HTMLElement>('[data-result]')!;
  const submit = form.querySelector<HTMLButtonElement>('[data-submit]')!;
  const retry = form.querySelector<HTMLButtonElement>('[data-retry]')!;
  const inputs = [...form.querySelectorAll<HTMLInputElement>('input[type=radio]')];

  form.querySelector<HTMLElement>('[data-quiz-buttons]')!.hidden = false;

  const chosen = () =>
    questions.map((q) => q.querySelector<HTMLInputElement>('input:checked')?.value);

  // The text of the right option, e.g. "β) Επιτρέπει μόνο…", for the feedback line.
  const optionText = (q: HTMLElement, letter: string) =>
    q.querySelector<HTMLElement>(`[data-option="${CSS.escape(letter)}"]`)!.textContent!.replace(/\s+/g, ' ').trim();

  form.addEventListener('submit', (event) => {
    event.preventDefault(); // nothing is sent anywhere; scoring happens here
    const picks = chosen();
    const score = scoreQuiz(answers, picks);

    questions.forEach((q, i) => {
      const mark = score.marks[i];
      q.dataset.mark = mark;
      q.querySelector<HTMLElement>(`[data-option="${CSS.escape(answers[i])}"]`)!.dataset.state = 'correct';
      if (mark === 'wrong') {
        q.querySelector<HTMLElement>(`[data-option="${CSS.escape(picks[i]!)}"]`)!.dataset.state = 'wrong';
      }
      const feedback = q.querySelector<HTMLElement>('[data-feedback]')!;
      feedback.textContent =
        mark === 'correct'
          ? '✓ Σωστό.'
          : `${mark === 'wrong' ? '✗ Λάθος.' : '– Δεν απάντησες.'} Σωστή απάντηση: ${optionText(q, answers[i])}`;
      feedback.hidden = false;
    });

    // Lock the answers so the marks keep matching what was picked.
    inputs.forEach((input) => (input.disabled = true));
    form.dataset.submitted = '';

    const percent = Math.round((score.correct / score.total) * 100);
    result.textContent =
      `Σωστές απαντήσεις: ${score.correct} από ${score.total} (${percent}%)` +
      (score.unanswered ? `, ${score.unanswered} χωρίς απάντηση.` : '.');
    result.hidden = false;
    submit.hidden = true;
    retry.hidden = false;
    // The score sits at the end, next to the buttons; move focus there so
    // keyboard and screen-reader users land on it.
    result.focus();
  });

  retry.addEventListener('click', () => {
    form.reset();
    inputs.forEach((input) => (input.disabled = false));
    delete form.dataset.submitted;
    questions.forEach((q) => {
      delete q.dataset.mark;
      q.querySelectorAll<HTMLElement>('[data-state]').forEach((o) => delete o.dataset.state);
      q.querySelector<HTMLElement>('[data-feedback]')!.hidden = true;
    });
    result.hidden = true;
    retry.hidden = true;
    submit.hidden = false;
    questions[0]?.querySelector('input')?.focus();
  });
}

document.querySelectorAll<HTMLFormElement>('form[data-quiz]').forEach(setup);
