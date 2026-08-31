/* EcE Hub — Electronics Crossword runtime bridge
 *
 * The real crossword implementation is kept at a known-good commit.
 * We load that runtime through jsDelivr instead of raw.githubusercontent.com.
 * raw.githubusercontent.com was failing in the deployed app, which left
 * window.ExploreGames.startElectronicsCrossword undefined.
 */
(function () {
  'use strict';

  const RUNTIME = 'https://cdn.jsdelivr.net/gh/espaderarios/EcEHub@7c8d09d5b34671844c3fe19dab39b25f9d42d1b0/electronics-crossword.js';
  const FLAG = '__eceCrosswordRuntimeBridgeInstalled';
  const API_METHODS = [
    'electronicsCrosswordView',
    'startElectronicsCrossword',
    'submitElectronicsCrossword',
    'clearElectronicsCrossword',
    'exitElectronicsCrossword'
  ];

  if (window[FLAG]) return;
  window[FLAG] = true;

  let backing = window.ExploreGames && typeof window.ExploreGames === 'object'
    ? window.ExploreGames
    : {};
  const crosswordApi = {};
  const pending = [];
  let loading = false;
  let ready = false;

  const proxies = {};

  function captureRuntimeApi() {
    const current = backing;
    if (!current || typeof current !== 'object') return;

    API_METHODS.forEach(name => {
      const fn = current[name];
      if (typeof fn === 'function' && fn !== proxies[name]) {
        crosswordApi[name] = fn;
      }
    });
  }

  function merge(next) {
    const value = next && typeof next === 'object' ? next : {};
    backing = Object.assign({}, value, crosswordApi, proxies);
  }

  function flushPending() {
    if (!ready) return;

    while (pending.length) {
      const job = pending.shift();
      const fn = crosswordApi[job.name];
      if (typeof fn !== 'function') continue;

      try {
        fn.apply(backing, job.args);
      } catch (error) {
        console.error(`EcE Hub crossword ${job.name} failed:`, error);
      }
    }
  }

  function loadRuntime() {
    if (ready || loading || document.querySelector('script[data-ece-crossword-runtime]')) return;
    loading = true;

    const script = document.createElement('script');
    script.src = `${RUNTIME}?v=runtime-bridge-4`;
    script.async = false;
    script.dataset.eceCrosswordRuntime = 'true';

    script.addEventListener('load', () => {
      loading = false;
      captureRuntimeApi();
      ready = typeof crosswordApi.startElectronicsCrossword === 'function';
      merge(backing);

      if (!ready) {
        console.error('EcE Hub crossword runtime loaded, but startElectronicsCrossword was not exported.');
        return;
      }

      console.info('EcE Hub Electronics Crossword runtime loaded successfully.');
      flushPending();
    }, { once: true });

    script.addEventListener('error', () => {
      loading = false;
      console.error('EcE Hub could not load the crossword runtime:', RUNTIME);
      console.error('The crossword runtime is pinned to commit 7c8d09d5b34671844c3fe19dab39b25f9d42d1b0.');

      /* Allow a later retry instead of permanently blocking the runtime. */
      script.remove();
    }, { once: true });

    document.head.appendChild(script);
  }

  API_METHODS.forEach(name => {
    proxies[name] = function (...args) {
      const fn = crosswordApi[name];

      if (typeof fn === 'function') {
        try {
          return fn.apply(backing, args);
        } catch (error) {
          console.error(`EcE Hub crossword ${name} failed:`, error);
          throw error;
        }
      }

      pending.push({ name, args });
      loadRuntime();
      return undefined;
    };
  });

  /* Install the bridge before app.js can call ExploreGames.startElectronicsCrossword. */
  try {
    Object.defineProperty(window, 'ExploreGames', {
      configurable: true,
      enumerable: true,
      get() {
        return backing;
      },
      set(next) {
        merge(next);
      }
    });
  } catch (error) {
    console.warn('EcE Hub crossword API bridge could not redefine ExploreGames:', error);
  }

  merge(backing);
  loadRuntime();

  console.info('EcE Hub crossword runtime bridge installed.');
})();
