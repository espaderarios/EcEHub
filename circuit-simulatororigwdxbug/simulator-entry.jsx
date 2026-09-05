import React from "react";
import { createRoot } from "react-dom/client";
import { CircuitLab } from "./circuit-lab/index";
import "./styles.css";

const roots = new WeakMap();

function mount(container) {
  if (!container) return;
  const existing = roots.get(container);
  if (existing) existing.unmount();
  const root = createRoot(container);
  root.render(React.createElement(CircuitLab));
  roots.set(container, root);
}

function unmount(container) {
  const root = container && roots.get(container);
  if (root) {
    root.unmount();
    roots.delete(container);
  }
}

window.CircuitSimulator = { mount, unmount };
