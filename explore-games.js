/* ============================================================
   EcE Hub — Explore Games
   ============================================================

   Educational game system for the Explore view.

   Current game:
   - Circuit Challenge

   This file intentionally keeps game logic separate from app.js.
   ============================================================ */

(function () {
  'use strict';


  /* ============================================================
     CONFIGURATION
     ============================================================ */

  const CIRCUIT_IMAGE_BASE =
    'https://raw.githubusercontent.com/espaderarios/EcEHub/main/CircuitsImg/';


  /*
   * Add new circuit IDs here as you add:
   *
   * CircuitsQ#.jpeg
   * CircuitsA#.jpeg
   *
   * Example:
   *
   * { id: 8 },
   * { id: 9 },
   *
   * No changes to the game renderer are required.
   */

  const CIRCUIT_CHALLENGES = [

  {
    id: 1,

    /*
     * Image files
     */
    questionImage: 'CircuitsQ1.jpeg',
    answerImage: 'CircuitsA1.jpeg',

    /*
     * Manually written instructions
     */
    instruction:
      'Solve for the current through each specified branch of the circuit.',

    /*
     * Answer fields
     *
     * Add or remove objects depending on the problem.
     */
    answers: [

      {
        id: 'I1',
        label: 'I₁',
        unit: 'A',

        /*
         * Put the correct answer here.
         */
        answer: 5,

        /*
         * Accept answers within this tolerance.
         */
        tolerance: 0.01
      },

      {
        id: 'I2',
        label: 'I₂',
        unit: 'A',
        answer: 2.5,
        tolerance: 0.01
      },

      {
        id: 'I3',
        label: 'I₃',
        unit: 'A',
        answer: 2,
        tolerance: 0.01
      }

    ]
  },


  /*
   * ================================================
   * CIRCUIT 2
   * ================================================
   */

  {
    id: 2,

    questionImage: 'CircuitsQ2.jpeg',
    answerImage: 'CircuitsA2.jpeg',

    instruction:
      'Calculate the current through this circuit.',

    answers: [

      {
        id: 'I1',
        label: 'I₁',
        unit: 'A',
        answer: -3,
        tolerance: 0.1
      },

      {
        id: 'I2',
        label: 'I₂',
        unit: 'A',
        answer: -2,
        tolerance: 0.1
      },
        {
        id: 'I3',
        label: 'I₃',
        unit: 'A',
        answer: 0,
        tolerance: 0.1
      }

    ]
  },


  /*
   * ================================================
   * CIRCUIT 3
   * ================================================
   */

  {
    id: 3,

    questionImage: 'CircuitsQ3.jpeg',
    answerImage: 'CircuitsA3.jpeg',

    instruction:
      'Calculate the current through this circuit.',

    answers: [

      {
        id: 'I1',
        label: 'I₁',
        unit: 'A',
        answer: 7.403,
        tolerance: 0.1
      },
      {
        id: 'I2',
        label: 'I₂',
        unit: 'A',
        answer: 1.26,
        tolerance: 0.1
      },
        {
        id: 'I3',
        label: 'I₃',
        unit: 'A',
        answer: 5.97,
        tolerance: 0.1
      }

    ]
  },


  /*
   * ================================================
   * CIRCUIT 4
   * ================================================
   */

  {
    id: 4,

    questionImage: 'CircuitsQ4.jpeg',
    answerImage: 'CircuitsA4.jpeg',

    instruction:
      'Calculate the current through this circuit.',

    answers: [

      {
        id: 'I1',
        label: 'I₁',
        unit: 'A',
        answer: 3.33,
        tolerance: 0.1
      },
        {
        id: 'I2',
        label: 'I₂',
        unit: 'A',
        answer: 0.3298,
        tolerance: 0.1
      },
        {
        id: 'I3',
        label: 'I₃',
        unit: 'A',
        answer: 1.508,
        tolerance: 0.1
      },
        {
        id: 'I4',
        label: 'I₄',
        unit: 'A',
        answer: 2.497,
        tolerance: 0.1
      }

    ]
  },


  /*
   * ================================================
   * CIRCUIT 5
   * ================================================
   */

  {
    id: 5,

    questionImage: 'CircuitsQ5.jpeg',
    answerImage: 'CircuitsA5.jpeg',

    instruction:
      'Calculate the current through this circuit.',

    answers: [

      {
        id: 'I1',
        label: 'I₁',
        unit: 'A',
        answer: -1.455,
        tolerance: 0.1
      },
      {
        id: 'I2',
        label: 'I₂',
        unit: 'A',
        answer: 0.5455,
        tolerance: 0.1
      }

    ]
  },


  /*
   * ================================================
   * CIRCUIT 6
   * ================================================
   */

  {
    id: 6,

    questionImage: 'CircuitsQ6.jpeg',
    answerImage: 'CircuitsA6.jpeg',

    instruction:
      'Calculate the current through this circuit.',

    answers: [

      {
        id: 'I1',
        label: 'I₁',
        unit: 'A',
        answer: 4.92,
        tolerance: 0.1
      },
        {
        id: 'I2',
        label: 'I₂',
        unit: 'A',
        answer: 0.25,
        tolerance: 0.1
      },
        {
        id: 'I3',
        label: 'I₃',
        unit: 'A',
        answer: 4.25,
        tolerance: 0.1
      }

    ]
  },


  /*
   * ================================================
   * CIRCUIT 7
   * ================================================
   */

  {
    id: 7,

    questionImage: 'CircuitsQ7.jpeg',
    answerImage: 'CircuitsA7.jpeg',

    instruction:
      'Calculate the current through this circuit.',

    answers: [

      {
        id: 'I1',
        label: 'I₁',
        unit: 'A',
        answer: -7.5,
        tolerance: 0.1
      },
      {
        id: 'I2',
        label: 'I₂',
        unit: 'A',
        answer: -2.5,
        tolerance: 0.1
      },
        {
        id: 'I3',
        label: 'I₃',
        unit: 'A',
        answer: 3.93,
        tolerance: 0.1
      },
      {
        id: 'I4',
        label: 'I₄',
        unit: 'A',
        answer: 2.143,
        tolerance: 0.1
      }

    ]
  }

];


  /* ============================================================
     GAME STATE
     ============================================================ */

  let circuitGameState = null;


  /* ============================================================
     HELPERS
     ============================================================ */

  function shuffle(array) {
    const result = [...array];

    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));

      [result[i], result[j]] =
        [result[j], result[i]];
    }

    return result;
  }


function getCircuitQuestionImage(question) {
  return `${CIRCUIT_IMAGE_BASE}${question.questionImage}`;
}


function getCircuitAnswerImage(question) {
  return `${CIRCUIT_IMAGE_BASE}${question.answerImage}`;
}


  function resetCircuitGame() {
    circuitGameState = {
      questions: shuffle(CIRCUIT_CHALLENGES),

      index: 0,

      score: 0,

      streak: 0,

      answered: false,

      showingSolution: false,

      userAnswer: ''
    };
  }


  function getCircuitGameState() {
    return circuitGameState;
  }


  /* ============================================================
     CIRCUIT CHALLENGE
     ============================================================ */

  function startCircuitChallenge() {
    resetCircuitGame();

    /*
     * app.js owns the application's route.
     * We only request navigation through the existing go()
     * function if it is available.
     */

    if (typeof window.go === 'function') {
      window.go('explore-circuits');
    }

    focusCircuitAnswer();
  }


  function submitCircuitAnswer() {

  if (!circuitGameState) {
    return;
  }

  if (circuitGameState.answered) {
    return;
  }


  const question =
    circuitGameState.questions[
      circuitGameState.index
    ];


  if (!question || !question.answers) {
    return;
  }


  const submittedAnswers = {};

  let allAnswered = true;


  question.answers.forEach(answer => {

    const input =
      document.getElementById(
        `circuitAnswer-${answer.id}`
      );


    if (!input) {
      allAnswered = false;
      return;
    }


    const value =
      input.value.trim();


    if (value === '') {
      allAnswered = false;
      return;
    }


    submittedAnswers[answer.id] =
      Number(value);

  });


  if (!allAnswered) {

    if (typeof window.toast === 'function') {

      window.toast(
        'Please answer all required fields.'
      );

    } else {

      alert(
        'Please answer all required fields.'
      );

    }

    return;
  }


  /*
   * Store every answer individually.
   */

  circuitGameState.userAnswers =
    submittedAnswers;


  /*
   * Grade the answers.
   */

  const grading =
    gradeCircuitQuestion(
      question,
      submittedAnswers
    );


  circuitGameState.grading =
    grading;


  circuitGameState.answered =
    true;


  /*
   * Score is based on the number of correct
   * answers rather than simply submitting.
   */

  circuitGameState.score +=
    grading.points;


  if (grading.correctCount === grading.totalCount) {

    circuitGameState.streak += 1;

  } else {

    circuitGameState.streak = 0;

  }


  rerenderGame();
}

function gradeCircuitQuestion(
  question,
  submittedAnswers
) {

  const results = [];

  let correctCount = 0;


  question.answers.forEach(answer => {

    const submitted =
      submittedAnswers[answer.id];


    const correct =
      Number(answer.answer);


    /*
     * If no answer has been configured yet,
     * don't pretend it is correct.
     */

    if (
      answer.answer === null ||
      answer.answer === undefined
    ) {

      results.push({
        id: answer.id,
        label: answer.label,
        submitted,
        correct: null,
        isCorrect: null
      });

      return;
    }


    const tolerance =
      Number(answer.tolerance ?? 0.01);


    const difference =
      Math.abs(
        submitted - correct
      );


    const isCorrect =
      difference <= tolerance;


    if (isCorrect) {
      correctCount++;
    }


    results.push({
      id: answer.id,
      label: answer.label,
      submitted,
      correct,
      difference,
      tolerance,
      isCorrect
    });

  });


  const totalCount =
    question.answers.length;


  /*
   * Each correctly answered field gets 100 points.
   */

  const points =
    correctCount * 100;


  return {

    results,

    correctCount,

    totalCount,

    points,

    perfect:
      correctCount === totalCount

  };
}


  function showCircuitSolution() {

    if (!circuitGameState) {
      return;
    }

    circuitGameState.showingSolution = true;

    rerenderGame();
  }


  function nextCircuitQuestion() {

    if (!circuitGameState) {
      return;
    }

    circuitGameState.index += 1;

    circuitGameState.answered = false;

    circuitGameState.showingSolution = false;

    circuitGameState.userAnswer = '';


    /*
     * When the player reaches the end, leave the route alone.
     * The renderer will automatically display the results screen.
     */

    rerenderGame();

    focusCircuitAnswer();
  }


  function restartCircuitChallenge() {

    resetCircuitGame();

    rerenderGame();

    focusCircuitAnswer();
  }


  function exitCircuitChallenge() {

    circuitGameState = null;

    if (typeof window.go === 'function') {
      window.go('explore');
    }
  }


  function focusCircuitAnswer() {

    setTimeout(() => {

      const input =
        document.getElementById('circuitAnswer');

      if (input) {
        input.focus();
      }

    }, 0);
  }


  function rerenderGame() {

    /*
     * app.js owns the main render function.
     */

    if (typeof window.render === 'function') {
      window.render();
    }
  }


  /* ============================================================
     CIRCUIT GAME VIEW
     ============================================================ */

  function circuitChallengeView() {

    /*
     * If somebody enters the route without starting the game,
     * initialize it automatically.
     */

    if (!circuitGameState) {
      resetCircuitGame();
    }


    const state =
      circuitGameState;


    /*
     * Results screen
     */

    if (
      state.index >=
      state.questions.length
    ) {
      return circuitGameResults();
    }


    const question =
      state.questions[state.index];


    const questionNumber =
      state.index + 1;


    const total =
      state.questions.length;


    const progress =
      Math.round(
        (questionNumber / total) * 100
      );


    const questionImage =
    getCircuitQuestionImage(question);

    const answerImage =
    getCircuitAnswerImage(question);


    return `

      <section class="circuit-game">


        <!-- ==================================================
             GAME HEADER
             ================================================== -->

        <header class="circuit-game-header">

          <button
            type="button"
            class="btn"
            data-action="exit-circuit-challenge">

            ← Exit

          </button>


          <div class="circuit-game-progress">

            <span>
              Question ${questionNumber} / ${total}
            </span>

            <div class="circuit-progress">

              <i
                style="width:${progress}%">
              </i>

            </div>

          </div>


          <div class="circuit-game-score">

            ${state.score} pts

          </div>

        </header>


        <!-- ==================================================
             QUESTION
             ================================================== -->

        <main class="circuit-question-card">


          <div class="circuit-question-heading">

            <span class="explore-card-category">
              CIRCUIT CHALLENGE
            </span>

            <h1>
              Solve the circuit
            </h1>

            <p>
            ${escapeHtml(question.instruction)}
            </p>

          </div>


          <!-- Circuit image -->

          <div class="circuit-image-container">

            <img
              src="${questionImage}"
              alt="Circuit challenge ${question.id}"
              class="circuit-question-image"
            >

          </div>


          ${
            !state.answered

              ? `

                <!-- ========================================
                     ANSWER FORM
                     ======================================== -->

                <div class="circuit-answer-area">

                <div class="circuit-answer-heading">

                    <h3>
                    Your Answers
                    </h3>

                    <p>
                    Enter the value for each requested quantity.
                    </p>

                </div>


                <div class="circuit-answer-list">

                    ${
                    question.answers.map((answer, answerIndex) => `

                        <div
                        class="circuit-answer-field">

                        <label
                            for="circuitAnswer-${answer.id}">

                            <span class="circuit-answer-label">
                            ${escapeHtml(answer.label)}
                            </span>

                            <span class="circuit-answer-unit">
                            ${escapeHtml(answer.unit || '')}
                            </span>

                        </label>


                        <input
                            id="circuitAnswer-${answer.id}"
                            data-answer-id="${escapeHtml(answer.id)}"
                            type="number"
                            step="any"
                            placeholder="Enter ${escapeHtml(answer.label)}"
                            autocomplete="off"
                        >

                        </div>

                    `).join('')
                    }

                </div>


                <button
                    type="button"
                    class="btn primary circuit-submit-btn"
                    data-action="circuit-submit">

                    Submit Answers

                </button>


                <small>
                    Make sure all required answers are filled in before
                    submitting.
                </small>

                </div>
              `

              : `

                <!-- ========================================
                     ANSWERED STATE
                     ======================================== -->

                <div class="circuit-result-panel">

                <div class="circuit-result-icon">

                    ${
                    state.grading?.perfect
                        ? '✓'
                        : '!'
                    }

                </div>


                <div>

                    <h3>

                    ${
                        state.grading?.perfect
                        ? 'Perfect!'
                        : 'Answers submitted'
                    }

                    </h3>


                    <p>

                    You got

                    <strong>
                        ${state.grading?.correctCount || 0}
                    </strong>

                    out of

                    <strong>
                        ${state.grading?.totalCount || 0}
                    </strong>

                    answers correct.

                    </p>

                </div>

                </div>


                <div class="circuit-grading-list">

                ${
                    (state.grading?.results || [])
                    .map(result => `

                        <div
                        class="circuit-grading-item
                        ${
                            result.isCorrect === true
                            ? 'correct'
                            : result.isCorrect === false
                                ? 'incorrect'
                                : 'ungraded'
                        }">

                        <div class="circuit-grading-label">

                            <strong>
                            ${escapeHtml(result.label)}
                            </strong>

                        </div>


                        <div class="circuit-grading-answer">

                            <span>
                            Your answer:
                            <strong>
                                ${escapeHtml(
                                String(result.submitted ?? '')
                                )}
                            </strong>
                            </span>


                            ${
                            result.correct !== null
                                ? `
                                <span>
                                    Correct:
                                    <strong>
                                    ${result.correct}
                                    </strong>
                                </span>
                                `
                                : `
                                <span>
                                    Not yet graded
                                </span>
                                `
                            }

                        </div>


                        <div class="circuit-grading-status">

                            ${
                            result.isCorrect === true
                                ? '✓ Correct'
                                : result.isCorrect === false
                                ? '✗ Incorrect'
                                : '—'
                            }

                        </div>

                        </div>

                    `)
                    .join('')
                }

                </div>


                  <div>

                    <h3>
                      Answer submitted
                    </h3>

                    <p>

                      Review the solution below
                      before continuing.

                    </p>

                  </div>

                </div>


                ${
                  state.showingSolution

                    ? `

                      <!-- ==================================
                           SOLUTION
                           ================================== -->

                      <div class="circuit-solution">

                        <div
                          class="circuit-solution-header">

                          <h2>
                            Solution
                          </h2>

                          <span>
                            Circuit ${question.id}
                          </span>

                        </div>


                        <img
                          src="${answerImage}"
                          alt="Solution for circuit challenge ${question.id}"
                          class="circuit-answer-image"
                        >

                      </div>

                    `

                    : `

                      <button
                        type="button"
                        class="btn"
                        data-action="circuit-show-solution">

                        Show Solution

                      </button>

                    `
                }


                <div class="circuit-next-area">

                  <button
                    type="button"
                    class="btn primary"
                    data-action="circuit-next">

                    ${
                      questionNumber === total
                        ? 'Finish Challenge'
                        : 'Next Challenge →'
                    }

                  </button>

                </div>

              `
          }

        </main>


        <!-- ==================================================
             GAME STATS
             ================================================== -->

        <div class="circuit-game-stats">

          <div>

            <strong>
              ${state.score}
            </strong>

            <span>
              Score
            </span>

          </div>


          <div>

            <strong>
              ${state.streak}
            </strong>

            <span>
              Streak
            </span>

          </div>


          <div>

            <strong>
              ${total}
            </strong>

            <span>
              Questions
            </span>

          </div>

        </div>

      </section>

    `;
  }


  /* ============================================================
     RESULTS
     ============================================================ */

  function circuitGameResults() {

    const state =
      circuitGameState;


    const total =
      state?.questions?.length || 0;


    const score =
      state?.score || 0;


    /*
     * This percentage is currently based on participation
     * points because automatic answer grading isn't implemented.
     */

    const maxScore =
      total * 100;


    const percentage =
      maxScore
        ? Math.round(
            (score / maxScore) * 100
          )
        : 0;


    return `

      <section class="circuit-game">


        <div class="circuit-results-card">


          <div class="circuit-results-icon">
            🏆
          </div>


          <span class="explore-card-category">

            CHALLENGE COMPLETE

          </span>


          <h1>

            Circuit Challenge Complete!

          </h1>


          <p>

            Nice work. Here's how you performed.

          </p>


          <div class="circuit-final-score">

            <strong>
              ${score}
            </strong>

            <span>
              points
            </span>

          </div>


          <div class="circuit-final-stats">


            <div>

              <strong>
                ${total}
              </strong>

              <span>
                Questions
              </span>

            </div>


            <div>

              <strong>
                ${percentage}%
              </strong>

              <span>
                Score
              </span>

            </div>


            <div>

              <strong>
                ${state?.streak || 0}
              </strong>

              <span>
                Final streak
              </span>

            </div>


          </div>


          <div class="circuit-results-actions">


            <button
              type="button"
              class="btn"
              data-action="exit-circuit-challenge">

              Back to Explore

            </button>


            <button
              type="button"
              class="btn primary"
              data-action="restart-circuit-challenge">

              Play Again

            </button>


          </div>


        </div>

      </section>

    `;
  }


  /* ============================================================
     HTML ESCAPING
     ============================================================ */

  function escapeHtml(value) {

    return String(value)

      .replaceAll('&', '&amp;')

      .replaceAll('<', '&lt;')

      .replaceAll('>', '&gt;')

      .replaceAll('"', '&quot;')

      .replaceAll("'", '&#039;');
  }


  /* ============================================================
     PUBLIC API
     ============================================================ */

  /*
   * Expose only the functions app.js needs.
   *
   * Everything else remains private to this module.
   */

window.ExploreGames =
  window.ExploreGames || {};

Object.assign(window.ExploreGames, {

  circuitChallengeView,

  startCircuitChallenge,

  submitCircuitAnswer,

  showCircuitSolution,

  nextCircuitQuestion,

  restartCircuitChallenge,

  exitCircuitChallenge

});


})();