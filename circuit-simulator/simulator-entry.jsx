import React from "react";
import { createRoot } from "react-dom/client";
import { CircuitLab } from "./circuit-lab/index";
import "./styles.css";

const roots = new WeakMap();
/** Remember host styles so we can restore them when the lab closes. */
const hostSnapshots = new WeakMap();

/** Currently mounted host — used by the in-lab Back button. */
let activeContainer = null;

const FULLSCREEN_HOST_CLASS = "ece-circuit-sim-host";

function promoteToFullscreen(container) {
  if (!container || !(container instanceof HTMLElement)) return;

  hostSnapshots.set(container, {
    position: container.style.position,
    inset: container.style.inset,
    top: container.style.top,
    right: container.style.right,
    bottom: container.style.bottom,
    left: container.style.left,
    width: container.style.width,
    height: container.style.height,
    zIndex: container.style.zIndex,
    margin: container.style.margin,
    padding: container.style.padding,
    overflow: container.style.overflow,
    background: container.style.background,
    hadClass: container.classList.contains(FULLSCREEN_HOST_CLASS),
  });

  container.classList.add(FULLSCREEN_HOST_CLASS);
  container.style.position = "fixed";
  container.style.inset = "0";
  container.style.top = "0";
  container.style.right = "0";
  container.style.bottom = "0";
  container.style.left = "0";
  container.style.width = "100vw";
  container.style.height = "100vh";
  container.style.zIndex = "9999";
  container.style.margin = "0";
  container.style.padding = "0";
  container.style.overflow = "hidden";
  container.style.background = "#07101e";

  if (document.documentElement) {
    document.documentElement.dataset.eceSimOpen = "1";
  }
  if (document.body) {
    document.body.dataset.eceSimOpen = "1";
  }
}

function restoreHost(container) {
  if (!container || !(container instanceof HTMLElement)) return;
  const snap = hostSnapshots.get(container);
  if (!snap) {
    container.classList.remove(FULLSCREEN_HOST_CLASS);
    return;
  }

  container.style.position = snap.position;
  container.style.inset = snap.inset;
  container.style.top = snap.top;
  container.style.right = snap.right;
  container.style.bottom = snap.bottom;
  container.style.left = snap.left;
  container.style.width = snap.width;
  container.style.height = snap.height;
  container.style.zIndex = snap.zIndex;
  container.style.margin = snap.margin;
  container.style.padding = snap.padding;
  container.style.overflow = snap.overflow;
  container.style.background = snap.background;

  if (!snap.hadClass) {
    container.classList.remove(FULLSCREEN_HOST_CLASS);
  }

  hostSnapshots.delete(container);

  delete document.documentElement.dataset.eceSimOpen;
  if (document.body) delete document.body.dataset.eceSimOpen;
}

function mount(container) {
  if (!container) return;
  const existing = roots.get(container);
  if (existing) existing.unmount();

  // Only when the explore view opens the simulator: take over the viewport.
  promoteToFullscreen(container);
  activeContainer = container;

  const root = createRoot(container);
  root.render(React.createElement(CircuitLab));
  roots.set(container, root);
}

function unmount(container) {
  const target = container || activeContainer;
  const root = target && roots.get(target);
  if (root) {
    root.unmount();
    roots.delete(target);
  }
  if (target) restoreHost(target);
  if (target === activeContainer) activeContainer = null;
}

/**
 * Exit fullscreen and tear down the lab.
 * Safe to call from the in-lab Back button before navigating to explore.
 */
function close() {
  unmount(activeContainer);
}

/**
 * Drop fullscreen styling but keep React mounted (if host navigates away itself).
 */
function exitFullscreen() {
  if (activeContainer) {
    restoreHost(activeContainer);
  }
}

window.CircuitSimulator = {
  mount,
  unmount,
  close,
  exitFullscreen,
  getActiveContainer: () => activeContainer,
};