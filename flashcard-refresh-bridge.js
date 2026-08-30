/* EcE Hub — refresh the in-memory app after the custom flashcard editor writes localStorage. */
(() => {
  'use strict';
  const KEY = 'eceHubDataV3';
  let modalWasOpen = false;
  let before = '';
  let reloading = false;

  function snapshot() {
    try { return localStorage.getItem(KEY) || ''; } catch { return ''; }
  }

  setInterval(() => {
    const open = !!document.getElementById('fc-visibility-modal');
    if (open && !modalWasOpen) before = snapshot();
    if (!open && modalWasOpen && before !== snapshot() && !reloading) {
      reloading = true;
      setTimeout(() => window.location.reload(), 80);
    }
    modalWasOpen = open;
  }, 250);

  console.log('EcE Hub flashcard refresh bridge installed.');
})();
