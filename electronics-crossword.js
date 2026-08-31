/* ============================================================
   EcE Hub — Electronics Crossword
   ============================================================

   Educational game for the Explore view.

   This file intentionally keeps crossword logic separate
   from app.js.

   app.js only needs to call:

   - electronicsCrosswordView()
   - startElectronicsCrossword()
   - submitElectronicsCrossword()
   - clearElectronicsCrossword()
   - exitElectronicsCrossword()

   ============================================================ */

(function () {
  'use strict';


  /* ============================================================
     CONFIGURATION
     ============================================================ */

  const CROSSWORD_CHALLENGES = [

    {
      id: 1,

      title: 'Electronics Technicalities',

      instruction:
        'Solve the crossword using the electronics terminology clues below.',

      rows: 15,
      cols: 15,

      entries: [

        {
          number: 1,
          answer: 'RESISTOR',
          clue: 'A component that opposes the flow of electric current.',
          row: 0,
          col: 0,
          direction: 'across'
        },

        {
          number: 2,
          answer: 'DIODE',
          clue: 'A semiconductor device that primarily allows current to flow in one direction.',
          row: 0,
          col: 0,
          direction: 'down'
        },

        {
          number: 3,
          answer: 'CAPACITOR',
          clue: 'A component that stores electrical charge.',
          row: 2,
          col: 2,
          direction: 'across'
        },

        {
          number: 4,
          answer: 'VOLTAGE',
          clue: 'The electrical potential difference between two points.',
          row: 0,
          col: 7,
          direction: 'down'
        },

        {
          number: 5,
          answer: 'CURRENT',
          clue: 'The flow of electric charge through a circuit.',
          row: 4,
          col: 1,
          direction: 'across'
        },

        {
          number: 6,
          answer: 'TRANSISTOR',
          clue: 'A semiconductor device commonly used for switching and amplification.',
          row: 6,
          col: 1,
          direction: 'across'
        },

        {
          number: 7,
          answer: 'OHM',
          clue: 'The SI unit of electrical resistance.',
          row: 8,
          col: 5,
          direction: 'across'
        },

        {
          number: 8,
          answer: 'INDUCTOR',
          clue: 'A component that stores energy in a magnetic field.',
          row: 10,
          col: 2,
          direction: 'across'
        },

        {
          number: 9,
          answer: 'VOLT',
          clue: 'The SI unit of electric potential difference.',
          row: 10,
          col: 9,
          direction: 'down'
        },

        {
          number: 10,
          answer: 'WATT',
          clue: 'The SI unit of electrical power.',
          row: 12,
          col: 4,
          direction: 'across'
        }

      ]
    }

  ];


  /* ============================================================
     GAME STATE
     ============================================================ */

  let crosswordGameState = null;


  /* ============================================================
     HELPERS
     ============================================================ */

  function normalizeAnswer(value) {

    return String(value || '')
      .toUpperCase()
      .replace(/[^A-Z]/g, '');

  }


  function escapeHtml(value) {

    return String(value || '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');

  }


  function cellKey(row, col) {

    return `${row}-${col}`;

  }


  function shuffle(array) {

    const result = [...array];

    for (
      let i = result.length - 1;
      i > 0;
      i--
    ) {

      const j =
        Math.floor(
          Math.random() * (i + 1)
        );

      [
        result[i],
        result[j]
      ] = [
        result[j],
        result[i]
      ];

    }

    return result;

  }


  /* ============================================================
     CREATE BOARD
     ============================================================ */

  function createBoard(challenge) {

    const board =
      Array.from(
        {
          length: challenge.rows
        },
        () =>
          Array.from(
            {
              length: challenge.cols
            },
            () => ({
              active: false,
              number: null,
              entries: []
            })
          )
      );


    challenge.entries.forEach(entry => {

      const answer =
        normalizeAnswer(
          entry.answer
        );


      for (
        let i = 0;
        i < answer.length;
        i++
      ) {

        const row =
          entry.row +
          (
            entry.direction === 'down'
              ? i
              : 0
          );

        const col =
          entry.col +
          (
            entry.direction === 'across'
              ? i
              : 0
          );


        if (
          row < 0 ||
          row >= challenge.rows ||
          col < 0 ||
          col >= challenge.cols
        ) {

          continue;

        }


        const cell =
          board[row][col];


        cell.active = true;


        if (
          !cell.entries.includes(
            entry.number
          )
        ) {

          cell.entries.push(
            entry.number
          );

        }


        if (
          i === 0 &&
          !cell.number
        ) {

          cell.number =
            entry.number;

        }

      }

    });


    return board;

  }


  /* ============================================================
     GET ENTRY CELLS
     ============================================================ */

  function getEntryCells(entry) {

    const cells = [];

    const answer =
      normalizeAnswer(
        entry.answer
      );


    for (
      let i = 0;
      i < answer.length;
      i++
    ) {

      cells.push({

        row:
          entry.row +
          (
            entry.direction === 'down'
              ? i
              : 0
          ),

        col:
          entry.col +
          (
            entry.direction === 'across'
              ? i
              : 0
          )

      });

    }


    return cells;

  }


  /* ============================================================
     RESET GAME
     ============================================================ */

  function resetElectronicsCrossword() {

    const challenges =
      shuffle(
        CROSSWORD_CHALLENGES
      );


    const challenge =
      challenges[0];


    crosswordGameState = {

      challenge,

      board:
        createBoard(challenge),

      answers: {},

      selected: null,

      direction: 'across',

      answered: false,

      correct: 0,

      total: 0

    };

  }


  /* ============================================================
     START GAME
     ============================================================ */

  function startElectronicsCrossword() {

    resetElectronicsCrossword();


    /*
     * app.js owns application navigation.
     */

    if (
      typeof window.go === 'function'
    ) {

      window.go(
        'explore-crossword'
      );

    }

  }


  /* ============================================================
     FIND ENTRY
     ============================================================ */

  function findEntry(
    number,
    direction
  ) {

    return crosswordGameState
      ?.challenge
      ?.entries
      ?.find(
        entry =>
          entry.number === number &&
          entry.direction === direction
      );

  }


  function findEntryAtCell(
    row,
    col,
    direction
  ) {

    if (
      !crosswordGameState
    ) {

      return null;

    }


    return crosswordGameState
      .challenge
      .entries
      .find(entry => {

        if (
          entry.direction !== direction
        ) {

          return false;

        }


        return getEntryCells(entry)
          .some(
            cell =>
              cell.row === row &&
              cell.col === col
          );

      }) || null;

  }


  /* ============================================================
     SELECT CELL
     ============================================================ */

  function selectCell(row, col) {

    if (
      !crosswordGameState
    ) {

      return;

    }


    const cell =
      crosswordGameState
        .board[row]?.[col];


    if (
      !cell ||
      !cell.active
    ) {

      return;

    }


    /*
     * Clicking the same intersection switches
     * Across / Down.
     */

    if (
      crosswordGameState.selected &&
      crosswordGameState.selected.row === row &&
      crosswordGameState.selected.col === col &&
      cell.entries.length > 1
    ) {

      const opposite =
        crosswordGameState.direction === 'across'
          ? 'down'
          : 'across';


      if (
        findEntryAtCell(
          row,
          col,
          opposite
        )
      ) {

        crosswordGameState.direction =
          opposite;

      }

    }


    crosswordGameState.selected = {
      row,
      col
    };


    updateSelection();

  }


  /* ============================================================
     SELECT ENTRY
     ============================================================ */

  function selectEntry(entry) {

    if (
      !entry ||
      !crosswordGameState
    ) {

      return;

    }


    crosswordGameState.direction =
      entry.direction;


    crosswordGameState.selected = {

      row: entry.row,

      col: entry.col

    };


    updateSelection();

  }


  /* ============================================================
     UPDATE SELECTION
     ============================================================ */

  function updateSelection() {

    document
      .querySelectorAll(
        '.electronics-crossword-cell'
      )
      .forEach(cell => {

        cell.classList.remove(
          'selected'
        );

        cell.classList.remove(
          'word-selected'
        );

      });


    document
      .querySelectorAll(
        '.electronics-crossword-clue'
      )
      .forEach(clue => {

        clue.classList.remove(
          'active'
        );

      });


    if (
      !crosswordGameState?.selected
    ) {

      return;

    }


    const {
      row,
      col
    } =
      crosswordGameState.selected;


    const entry =
      findEntryAtCell(
        row,
        col,
        crosswordGameState.direction
      );


    if (entry) {

      getEntryCells(entry)
        .forEach(position => {

          const cell =
            document.querySelector(
              `.electronics-crossword-cell[data-row="${position.row}"][data-col="${position.col}"]`
            );


          if (cell) {

            cell.classList.add(
              'word-selected'
            );

          }

        });


      const clue =
        document.querySelector(
          `.electronics-crossword-clue[data-number="${entry.number}"][data-direction="${entry.direction}"]`
        );


      if (clue) {

        clue.classList.add(
          'active'
        );

      }

    }


    const selected =
      document.querySelector(
        `.electronics-crossword-cell[data-row="${row}"][data-col="${col}"]`
      );


    if (selected) {

      selected.classList.add(
        'selected'
      );

    }

  }


  /* ============================================================
     MOVE THROUGH WORD
     ============================================================ */

  function moveWithinWord(step) {

    if (
      !crosswordGameState?.selected
    ) {

      return;

    }


    const {
      row,
      col
    } =
      crosswordGameState.selected;


    const entry =
      findEntryAtCell(
        row,
        col,
        crosswordGameState.direction
      );


    if (!entry) {

      return;

    }


    const cells =
      getEntryCells(entry);


    const currentIndex =
      cells.findIndex(
        cell =>
          cell.row === row &&
          cell.col === col
      );


    if (
      currentIndex === -1
    ) {

      return;

    }


    let nextIndex =
      currentIndex + step;


    if (
      nextIndex < 0
    ) {

      nextIndex = 0;

    }


    if (
      nextIndex >= cells.length
    ) {

      nextIndex =
        cells.length - 1;

    }


    const next =
      cells[nextIndex];


    crosswordGameState.selected = {

      row: next.row,

      col: next.col

    };


    updateSelection();

  }


  /* ============================================================
     ENTER LETTER
     ============================================================ */

  function enterLetter(letter) {

    if (
      !crosswordGameState
    ) {

      return;

    }


    if (
      !crosswordGameState.selected
    ) {

      const first =
        crosswordGameState
          .challenge
          .entries[0];


      if (first) {

        crosswordGameState.selected = {

          row: first.row,

          col: first.col

        };

      }

    }


    if (
      !crosswordGameState.selected
    ) {

      return;

    }


    const value =
      normalizeAnswer(
        letter
      ).charAt(0);


    if (!value) {

      return;

    }


    const {
      row,
      col
    } =
      crosswordGameState.selected;


    crosswordGameState.answers[
      cellKey(row, col)
    ] = value;


    renderCrosswordBoard();


    moveWithinWord(1);

  }


  /* ============================================================
     DELETE LETTER
     ============================================================ */

  function deleteLetter() {

    if (
      !crosswordGameState?.selected
    ) {

      return;

    }


    const {
      row,
      col
    } =
      crosswordGameState.selected;


    const key =
      cellKey(row, col);


    if (
      crosswordGameState.answers[key]
    ) {

      delete crosswordGameState.answers[key];

      renderCrosswordBoard();

      return;

    }


    moveWithinWord(-1);


    if (
      !crosswordGameState.selected
    ) {

      return;

    }


    const previousKey =
      cellKey(
        crosswordGameState.selected.row,
        crosswordGameState.selected.col
      );


    delete crosswordGameState.answers[
      previousKey
    ];


    renderCrosswordBoard();

  }


  /* ============================================================
     KEYBOARD
     ============================================================ */

  function handleKeyboard(event) {

    if (
      !document.getElementById(
        'electronicsCrosswordBoard'
      )
    ) {

      return;

    }


    if (
      event.target &&
      (
        event.target.tagName === 'INPUT' ||
        event.target.tagName === 'TEXTAREA' ||
        event.target.isContentEditable
      )
    ) {

      return;

    }


    if (
      /^[a-zA-Z]$/.test(
        event.key
      )
    ) {

      event.preventDefault();

      enterLetter(
        event.key
      );

      return;

    }


    if (
      event.key === 'Backspace'
    ) {

      event.preventDefault();

      deleteLetter();

      return;

    }


    if (
      event.key === ' '
    ) {

      event.preventDefault();

      toggleDirection();

      return;

    }


    if (
      event.key === 'ArrowRight'
    ) {

      event.preventDefault();

      moveDirection(
        0,
        1
      );

      return;

    }


    if (
      event.key === 'ArrowLeft'
    ) {

      event.preventDefault();

      moveDirection(
        0,
        -1
      );

      return;

    }


    if (
      event.key === 'ArrowDown'
    ) {

      event.preventDefault();

      moveDirection(
        1,
        0
      );

      return;

    }


    if (
      event.key === 'ArrowUp'
    ) {

      event.preventDefault();

      moveDirection(
        -1,
        0
      );

      return;

    }

  }


  function moveDirection(
    rowChange,
    colChange
  ) {

    if (
      !crosswordGameState?.selected
    ) {

      return;

    }


    let row =
      crosswordGameState.selected.row +
      rowChange;


    let col =
      crosswordGameState.selected.col +
      colChange;


    while (
      row >= 0 &&
      row < crosswordGameState.challenge.rows &&
      col >= 0 &&
      col < crosswordGameState.challenge.cols
    ) {

      const cell =
        crosswordGameState
          .board[row][col];


      if (
        cell?.active
      ) {

        crosswordGameState.selected = {

          row,

          col

        };


        updateSelection();

        return;

      }


      row += rowChange;

      col += colChange;

    }

  }


  function toggleDirection() {

    if (
      !crosswordGameState?.selected
    ) {

      return;

    }


    const opposite =
      crosswordGameState.direction === 'across'
        ? 'down'
        : 'across';


    const {
      row,
      col
    } =
      crosswordGameState.selected;


    if (
      findEntryAtCell(
        row,
        col,
        opposite
      )
    ) {

      crosswordGameState.direction =
        opposite;


      updateSelection();

    }

  }


  /* ============================================================
     RENDER BOARD
     ============================================================ */

  function renderCrosswordBoard() {

    const container =
      document.getElementById(
        'electronicsCrosswordBoard'
      );


    if (
      !container ||
      !crosswordGameState
    ) {

      return;

    }


    const challenge =
      crosswordGameState.challenge;


    container.innerHTML = '';


    container.style.setProperty(
      '--crossword-cols',
      challenge.cols
    );


    container.style.setProperty(
      '--crossword-rows',
      challenge.rows
    );


    for (
      let row = 0;
      row < challenge.rows;
      row++
    ) {

      for (
        let col = 0;
        col < challenge.cols;
        col++
      ) {

        const cell =
          crosswordGameState
            .board[row][col];


        if (!cell.active) {

          const block =
            document.createElement(
              'div'
            );

          block.className =
            'electronics-crossword-block';

          container.appendChild(
            block
          );

          continue;

        }


        const button =
          document.createElement(
            'button'
          );


        button.type =
          'button';


        button.className =
          'electronics-crossword-cell';


        button.dataset.row =
          row;


        button.dataset.col =
          col;


        if (cell.number) {

          const number =
            document.createElement(
              'span'
            );


          number.className =
            'electronics-crossword-number';


          number.textContent =
            cell.number;


          button.appendChild(
            number
          );

        }


        const letter =
          document.createElement(
            'span'
          );


        letter.className =
          'electronics-crossword-letter';


        letter.textContent =
          crosswordGameState.answers[
            cellKey(row, col)
          ] || '';


        button.appendChild(
          letter
        );


        button.addEventListener(
          'click',
          () => {

            selectCell(
              row,
              col
            );

          }
        );


        container.appendChild(
          button
        );

      }

    }


    updateSelection();

  }


  /* ============================================================
     RENDER CLUES
     ============================================================ */

  function renderCrosswordClues() {

    const across =
      document.getElementById(
        'electronicsCrosswordAcross'
      );


    const down =
      document.getElementById(
        'electronicsCrosswordDown'
      );


    if (
      !across ||
      !down ||
      !crosswordGameState
    ) {

      return;

    }


    across.innerHTML = '';

    down.innerHTML = '';


    const entries =
      [
        ...crosswordGameState
          .challenge
          .entries
      ]
      .sort(
        (a, b) =>
          a.number - b.number
      );


    entries.forEach(entry => {

      const button =
        document.createElement(
          'button'
        );


      button.type =
        'button';


      button.className =
        'electronics-crossword-clue';


      button.dataset.number =
        entry.number;


      button.dataset.direction =
        entry.direction;


      button.innerHTML = `

        <span class="electronics-crossword-clue-number">

          ${entry.number}.

        </span>

        <span class="electronics-crossword-clue-text">

          ${escapeHtml(entry.clue)}

        </span>

      `;


      button.addEventListener(
        'click',
        () => {

          selectEntry(entry);

        }
      );


      if (
        entry.direction === 'across'
      ) {

        across.appendChild(
          button
        );

      } else {

        down.appendChild(
          button
        );

      }

    });

  }


  /* ============================================================
     CHECK ANSWERS
     ============================================================ */

  function submitElectronicsCrossword() {

    if (
      !crosswordGameState
    ) {

      return;

    }


    const challenge =
      crosswordGameState.challenge;


    let correct = 0;

    let total = 0;

    let unanswered = 0;


    const checked =
      {};


    challenge.entries.forEach(
      entry => {

        const answer =
          normalizeAnswer(
            entry.answer
          );


        const cells =
          getEntryCells(
            entry
          );


        cells.forEach(
          (position, index) => {

            const key =
              cellKey(
                position.row,
                position.col
              );


            if (
              checked[key]
            ) {

              return;

            }


            checked[key] =
              true;


            total++;


            const submitted =
              crosswordGameState
                .answers[key] || '';


            if (!submitted) {

              unanswered++;

            }


            if (
              submitted === answer[index]
            ) {

              correct++;

            }

          }
        );

      }
    );


    crosswordGameState.correct =
      correct;


    crosswordGameState.total =
      total;


    crosswordGameState.answered =
      true;


    renderCrosswordResults();


    if (
      correct === total &&
      total > 0
    ) {

      if (
        typeof window.toast === 'function'
      ) {

        window.toast(
          '🎉 Crossword complete!'
        );

      }

    } else if (
      typeof window.toast === 'function'
    ) {

      window.toast(
        `${correct} of ${total} letters correct`
      );

    }

  }


  /* ============================================================
     RENDER RESULTS
     ============================================================ */

  function renderCrosswordResults() {

    const challenge =
      crosswordGameState.challenge;


    challenge.entries.forEach(
      entry => {

        const answer =
          normalizeAnswer(
            entry.answer
          );


        getEntryCells(entry)
          .forEach(
            (position, index) => {

              const key =
                cellKey(
                  position.row,
                  position.col
                );


              const cell =
                document.querySelector(
                  `.electronics-crossword-cell[data-row="${position.row}"][data-col="${position.col}"]`
                );


              if (!cell) {

                return;

              }


              cell.classList.remove(
                'correct'
              );


              cell.classList.remove(
                'incorrect'
              );


              const submitted =
                crosswordGameState
                  .answers[key];


              if (!submitted) {

                return;

              }


              if (
                submitted === answer[index]
              ) {

                cell.classList.add(
                  'correct'
                );

              } else {

                cell.classList.add(
                  'incorrect'
                );

              }

            }
          );

      }
    );


    updateCrosswordStatus();

  }


  /* ============================================================
     STATUS
     ============================================================ */

  function updateCrosswordStatus() {

    const status =
      document.getElementById(
        'electronicsCrosswordStatus'
      );


    if (
      !status ||
      !crosswordGameState
    ) {

      return;

    }


    const {
      correct,
      total
    } =
      crosswordGameState;


    if (
      correct === total &&
      total > 0
    ) {

      status.innerHTML = `

        <div class="crossword-success">

          <strong>
            🎉 Crossword Complete!
          </strong>

          <span>
            You solved every electronics term correctly.
          </span>

        </div>

      `;

      return;

    }


    status.innerHTML = `

      <div class="crossword-progress">

        <strong>
          ${correct} / ${total} correct
        </strong>

        <span>
          Review the highlighted squares and try again.
        </span>

      </div>

    `;

  }


  /* ============================================================
     CLEAR
  ============================================================ */

  function clearElectronicsCrossword() {

    if (
      !crosswordGameState
    ) {

      return;

    }


    crosswordGameState.answers =
      {};


    crosswordGameState.answered =
      false;


    crosswordGameState.correct =
      0;


    crosswordGameState.total =
      0;


    renderCrosswordBoard();


    updateCrosswordStatus();

  }


  /* ============================================================
     EXIT
  ============================================================ */

  function exitElectronicsCrossword() {

    crosswordGameState =
      null;


    if (
      typeof window.go === 'function'
    ) {

      window.go(
        'explore'
      );

    }

  }


  /* ============================================================
     VIEW
  ============================================================ */

  function electronicsCrosswordView() {

    if (
      !crosswordGameState
    ) {

      resetElectronicsCrossword();

    }


    const challenge =
      crosswordGameState.challenge;


    return `

      <section class="electronics-crossword-page">


        <!-- ==================================================
             HEADER
             ================================================== -->

        <header class="electronics-crossword-header">

          <button
            type="button"
            class="btn"
            data-action="exit-electronics-crossword">

            ← Exit

          </button>


          <div>

            <span class="explore-eyebrow">
              ELECTRONICS • GAME
            </span>

            <h1>
              ${escapeHtml(challenge.title)}
            </h1>

            <p>
              Test your knowledge of electronics
              technical terminology.
            </p>

          </div>

        </header>


        <!-- ==================================================
             INSTRUCTIONS
             ================================================== -->

        <section class="electronics-crossword-instructions">

          <div class="electronics-crossword-instruction-icon">
            🧩
          </div>

          <div>

            <h2>
              Instructions
            </h2>

            <p>
              ${escapeHtml(challenge.instruction)}
            </p>

            <p>
              Click a square and type a letter.
              Press <strong>Space</strong> to switch
              between Across and Down.
            </p>

          </div>

        </section>


        <!-- ==================================================
             GAME AREA
             ================================================== -->

        <section class="electronics-crossword-game">


          <!-- BOARD -->

          <div class="electronics-crossword-board-wrapper">

            <div
              id="electronicsCrosswordBoard"
              class="electronics-crossword-board">
            </div>


            <div
              id="electronicsCrosswordStatus"
              class="electronics-crossword-status">
            </div>


            <div class="electronics-crossword-actions">

              <button
                type="button"
                class="btn primary"
                data-action="crossword-submit">

                Check Answers

              </button>


              <button
                type="button"
                class="btn"
                data-action="crossword-clear">

                Clear

              </button>

            </div>

          </div>


          <!-- CLUES -->

          <aside class="electronics-crossword-clues">


            <section class="electronics-crossword-clue-section">

              <h2>
                Across
              </h2>


              <div
                id="electronicsCrosswordAcross"
                class="electronics-crossword-clue-list">
              </div>

            </section>


            <section class="electronics-crossword-clue-section">

              <h2>
                Down
              </h2>


              <div
                id="electronicsCrosswordDown"
                class="electronics-crossword-clue-list">
              </div>

            </section>


          </aside>

        </section>


      </section>

    `;

  }


  /* ============================================================
     KEYBOARD LISTENER
     ============================================================ */

  document.addEventListener(
    'keydown',
    handleKeyboard
  );


  /* ============================================================
     PUBLIC API
     ============================================================

     IMPORTANT:

     We DO NOT replace window.ExploreGames.

     Your existing explore-games.js already owns that
     namespace.

     We simply add the crossword functions to it.
     ============================================================ */

  window.ExploreGames =
    window.ExploreGames || {};


  window.ExploreGames.electronicsCrosswordView =
    electronicsCrosswordView;


  window.ExploreGames.startElectronicsCrossword =
    startElectronicsCrossword;


  window.ExploreGames.submitElectronicsCrossword =
    submitElectronicsCrossword;


  window.ExploreGames.clearElectronicsCrossword =
    clearElectronicsCrossword;


  window.ExploreGames.exitElectronicsCrossword =
    exitElectronicsCrossword;


  console.log(
    'EcE Hub Electronics Crossword loaded'
  );

})();

