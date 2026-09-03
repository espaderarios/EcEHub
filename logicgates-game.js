// ============================================================================
// LOGIC CIRCUIT CHALLENGE - HARDWARE BREADBOARD & SYSTEM ANALYZER LAB
// ============================================================================

// Global Application State
const appState = {
  currentView: 'LEVEL_SELECT', // 'EXPLORE' | 'LEVEL_SELECT' | 'GAME'
  currentLevelIndex: 0,
  levelProgress: { lg_01: false, lg_02: false },
  nodes: [],
  connections: [],
  isDragging: false,
  draggedNode: null,
  wiringStart: null,
  clockState: true,
  busHexValue: '0x00'
};

// Level Blueprint Definitions
const LOGIC_GATES_LEVELS = [
  {
    id: 'lg_01',
    title: 'LEVEL 1: THE ACCUMULATOR / INVERTER',
    difficulty: 'Beginner',
    description: 'Load Input A with 0x01, invert signal through a NOT gate, and store in Target LED.',
    availableGates: ['NOT', 'AND', 'OR'],
    inputs: [{ id: 'in_1', label: 'Input A [0x01]', defaultState: false }],
    outputs: [{ id: 'out_1', label: 'Target LED' }],
    truthTable: [
      { inputStates: { in_1: false }, expectedOutput: { out_1: true } },
      { inputStates: { in_1: true },  expectedOutput: { out_1: false } }
    ]
  },
  {
    id: 'lg_02',
    title: 'LEVEL 2: DUAL SWITCH LOGIC',
    difficulty: 'Intermediate',
    description: 'Ensure output activates ONLY when both Input A and Input B are HIGH.',
    availableGates: ['AND', 'OR', 'NOT', 'NAND', 'XOR'],
    inputs: [
      { id: 'in_1', label: 'Switch A', defaultState: false },
      { id: 'in_2', label: 'Switch B', defaultState: false }
    ],
    outputs: [{ id: 'out_1', label: 'Main Bus OUT' }],
    truthTable: [
      { inputStates: { in_1: false, in_2: false }, expectedOutput: { out_1: false } },
      { inputStates: { in_1: true,  in_2: false }, expectedOutput: { out_1: false } },
      { inputStates: { in_1: false, in_2: true  }, expectedOutput: { out_1: false } },
      { inputStates: { in_1: true,  in_2: true  }, expectedOutput: { out_1: true } }
    ]
  }
];

const GATE_TYPES = {
  AND:  { id: 'AND',  inputs: 2, fn: (a, b) => a && b,  symbol: '&' },
  OR:   { id: 'OR',   inputs: 2, fn: (a, b) => a || b,  symbol: '≥1' },
  NOT:  { id: 'NOT',  inputs: 1, fn: (a) => !a,         symbol: '1' },
  NAND: { id: 'NAND', inputs: 2, fn: (a, b) => !(a&&b), symbol: '&̄' },
  NOR:  { id: 'NOR',  inputs: 2, fn: (a, b) => !(a||b), symbol: '≥1̄' },
  XOR:  { id: 'XOR',  inputs: 2, fn: (a, b) => a !== b, symbol: '=1' }
};

// Main Entry Point
function mountLogicGatesLab(containerId) {
  injectLogicGatesStyles();
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = `<div id="lg-app-root" class="lg-workspace"></div>`;
  renderCurrentView();
}

// Router Controller
function renderCurrentView() {
  const root = document.getElementById('lg-app-root');
  if (!root) return;

  root.className = 'lg-workspace lg-fade-in';

  switch (appState.currentView) {
    case 'EXPLORE':
      renderExploreScreen(root);
      break;
    case 'LEVEL_SELECT':
      renderLevelSelectScreen(root);
      break;
    case 'GAME':
      renderGameCanvasScreen(root);
      break;
  }
}

// 1. EXPLORE SCREEN
function renderExploreScreen(container) {
  container.innerHTML = `
    <div class="lg-hero-screen">
      <div class="lg-circuit-bg-glow"></div>
      <div class="lg-hero-content">
        <span class="lg-badge">HARDWARE CIRCUIT SIMULATOR</span>
        <h1 class="lg-hero-title">LOGIC CIRCUIT CHALLENGE</h1>
        <p class="lg-hero-subtitle">Construct digital logic circuits, perform bus wiring on breadboard canvases, and inspect signals with live timing analyzers.</p>
        <button class="lg-btn lg-btn-hero" onclick="navigateTo('LEVEL_SELECT')">
          <span>ENTER LAB WORKBENCH</span>
        </button>
      </div>
    </div>
  `;
}

// 2. LEVEL SELECT SCREEN
function renderLevelSelectScreen(container) {
  const levelCardsHtml = LOGIC_GATES_LEVELS.map((lvl, idx) => {
    const isCompleted = appState.levelProgress[lvl.id];
    return `
      <div class="lg-level-card lg-card-anim">
        <div class="lg-card-header">
          <span class="lg-difficulty-tag">${lvl.difficulty}</span>
          ${isCompleted ? '<span class="lg-status-pill success">✓ CLEARED</span>' : ''}
        </div>
        <h3 class="lg-card-title">${lvl.title}</h3>
        <p class="lg-card-desc">${lvl.description}</p>
        <button class="lg-btn lg-btn-primary lg-btn-full" onclick="startLevel(${idx})">
          ${isCompleted ? 'REPLAY CHALLENGE' : 'INITIALIZE CIRCUIT'}
        </button>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="lg-menu-screen">
      <div class="lg-menu-navbar">
        <button class="lg-btn lg-btn-secondary" onclick="navigateTo('EXPLORE')">← MAIN MENU</button>
        <h2>CHOOSE BREADBOARD CHALLENGE</h2>
        <div></div>
      </div>
      <div class="lg-levels-grid">
        ${levelCardsHtml}
      </div>
      <div class="lg-how-to-play">
        <strong>HOW TO PLAY</strong>
        <span>1. Choose a challenge</span>
        <span>2. Drag a gate onto the breadboard</span>
        <span>3. Connect pins from left to right, then run VERIFY</span>
      </div>
    </div>
  `;
}

// 3. GAME CANVAS SCREEN
function renderGameCanvasScreen(container) {
  container.innerHTML = `
    <!-- Top System Titlebar -->
    <div class="lg-navbar">
      <div class="lg-title-group">
        <button class="lg-btn lg-btn-secondary lg-btn-sm" onclick="navigateTo('LEVEL_SELECT')">← LEVELS</button>
        <h2 id="lg-level-title">LOGIC CIRCUIT CHALLENGE</h2>
      </div>
      <div class="lg-controls">
        <button class="lg-btn lg-btn-secondary" onclick="resetCircuitCanvas()">RESET</button>
        <button class="lg-btn lg-btn-primary" onclick="verifyLogicSolution()">RUN &amp; VERIFY</button>
      </div>
    </div>

    <!-- Main Workbench Area -->
    <div class="lg-workbench">
      
      <!-- Left Drawer: Components & Logic ICs -->
      <aside class="lg-sidebar">
        <div class="lg-sidebar-section">
          <div class="lg-sidebar-title">COMPONENTS</div>
          <div class="lg-help-text">Drag a gate into the center board.</div>
          <div class="lg-how-to-play lg-how-to-play-compact">
            <strong>BUILD THE PATH</strong>
            <span>1. Drag a gate here</span>
            <span>2. Output pin to input pin</span>
            <span>3. Run VERIFY</span>
          </div>
          
          <div class="lg-category-label">LOGIC GATES</div>
          <div class="lg-toolbox-grid" id="lg-toolbox-gates"></div>

          <div class="lg-category-label" style="margin-top:10px;">CPU &amp; INPUTS</div>
          <div class="lg-toolbox-grid" id="lg-toolbox-inputs"></div>
        </div>

        <div class="lg-level-info">
          <div class="lg-category-label">OBJECTIVE</div>
          <p id="lg-level-desc" style="font-size:10px; color:#a0acba;">Loading...</p>
          <div id="lg-completion-status" class="status-tag pending">STATUS: PENDING</div>
        </div>
      </aside>

      <!-- Center Canvas: Dotted Breadboard Viewport -->
      <main class="lg-canvas-viewport" id="lg-viewport">
        <!-- Main Glowing Bus Tube Background -->
        <div class="lg-bus-pipe-overlay">
          <div class="lg-bus-value-tag" id="lg-bus-val">[0x00]</div>
        </div>

        <!-- SVG Signal Wire Connector Layer -->
        <svg class="lg-svg-wire-layer" id="lg-wire-layer">
          <defs>
            <filter id="wire-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
        </svg>

        <!-- Node / IC Layer -->
        <div class="lg-node-layer" id="lg-node-layer"></div>
      </main>

      <!-- Right Drawer: System Analyzer & Waveforms -->
      <aside class="lg-analyzer-panel">
        <div class="lg-sidebar-title">SYSTEM ANALYZER &amp; STATUS</div>

        <div style="font-size:10px; color:#6e7c91; font-weight:bold; margin-top:4px;">CLOCK CONTROLS</div>
        <div class="lg-clock-box">
          <div>
            <div style="font-size:8px; color:#6e7c91;">FREQ</div>
            <div style="font-weight:bold; font-size:11px;">1Hz</div>
          </div>
          <div>
            <div style="font-size:8px; color:#6e7c91;">STATE</div>
            <div class="lg-state-badge" id="lg-clock-indicator">HIGH</div>
          </div>
          <button class="lg-btn lg-btn-sm" id="lg-clock-step-btn" onclick="toggleClockStep()">STEP 👆</button>
        </div>

        <div style="font-size:10px; color:#6e7c91; font-weight:bold;">STATUS (Live Values)</div>
        <div class="lg-status-table">
          <div class="lg-status-row">BUS: <span id="stat-bus">[0x00]</span></div>
          <div class="lg-status-row">Reg A: <span id="stat-rega">[0x01]</span></div>
          <div class="lg-status-row">Reg B: <span id="stat-regb">[0x00]</span></div>
          <div class="lg-status-row">OUT: <span id="stat-out">[0x00]</span></div>
        </div>

        <!-- Logic Timing Analyzer Canvas -->
        <div class="lg-timing-container">
          <div style="font-size:10px; font-weight:bold; color:#fff; margin-bottom:4px;">LOGIC ANALYZER (Timing Diagram)</div>
          <div class="lg-analyzer-steps"><span>1</span><span>2</span><span>3</span><span>4</span><span>5</span></div>

          <div class="lg-wave-row">
            <span class="lg-wave-label">CLOCK</span>
            <canvas class="lg-wave-canvas" id="clk-canvas"></canvas>
          </div>
          <div class="lg-wave-row">
            <span class="lg-wave-label">BUS</span>
            <canvas class="lg-wave-canvas" id="bus-canvas"></canvas>
          </div>
          <div class="lg-wave-row">
            <span class="lg-wave-label">IN_A</span>
            <canvas class="lg-wave-canvas" id="ina-canvas"></canvas>
          </div>
          <div class="lg-wave-row">
            <span class="lg-wave-label">OUT</span>
            <canvas class="lg-wave-canvas" id="out-canvas"></canvas>
          </div>
        </div>
      </aside>

    </div>
  `;

  loadLogicGatesLevel(appState.currentLevelIndex);
}

// Navigation Helper
function navigateTo(view) {
  appState.currentView = view;
  renderCurrentView();
}

function startLevel(index) {
  appState.currentLevelIndex = index;
  navigateTo('GAME');
}

// Level Canvas Initialization
function loadLogicGatesLevel(levelIdx) {
  const level = LOGIC_GATES_LEVELS[levelIdx];
  if (!level) return;

  appState.nodes = [];
  appState.connections = [];

  document.getElementById('lg-level-title').textContent = level.title;
  document.getElementById('lg-level-desc').textContent = level.description;
  const statusEl = document.getElementById('lg-completion-status');
  if (statusEl) {
    statusEl.textContent = 'STATUS: PENDING';
    statusEl.className = 'status-tag pending';
  }

  // Render Gate Toolbox
  const gateToolbox = document.getElementById('lg-toolbox-gates');
  if (gateToolbox) {
    gateToolbox.innerHTML = '';
    level.availableGates.forEach(gateType => {
      const item = document.createElement('div');
      item.className = 'lg-ic-chip-item';
      item.setAttribute('draggable', 'true');
      item.innerHTML = `<div class="lg-ic-symbol">${GATE_TYPES[gateType].symbol}</div><div class="lg-ic-name">${gateType}</div>`;

      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('gateType', gateType);
      });
      gateToolbox.appendChild(item);
    });
  }

  // Render Inputs/Clock Toolbox
  const inputToolbox = document.getElementById('lg-toolbox-inputs');
  if (inputToolbox) {
    inputToolbox.innerHTML = `
      <div class="lg-ic-chip-item"><div class="lg-ic-symbol">CLK</div><div class="lg-ic-name">Clock IC</div></div>
      <div class="lg-ic-chip-item"><div class="lg-ic-symbol">HEX</div><div class="lg-ic-name">Manual Val</div></div>
    `;
  }

  // Spawn Level Inputs
  level.inputs.forEach((inSpec, idx) => {
    createNodeOnCanvas({
      id: inSpec.id,
      type: 'INPUT',
      label: inSpec.label,
      x: 40,
      y: 60 + idx * 110,
      outputState: inSpec.defaultState,
      inputPins: [],
      outputPins: [0]
    });
  });

  // Spawn Level Outputs
  level.outputs.forEach((outSpec, idx) => {
    createNodeOnCanvas({
      id: outSpec.id,
      type: 'OUTPUT',
      label: outSpec.label,
      x: 520,
      y: 60 + idx * 110,
      outputState: false,
      inputPins: [0],
      outputPins: []
    });
  });

  const viewport = document.getElementById('lg-viewport');
  viewport.ondragover = (e) => e.preventDefault();
  viewport.ondrop = (e) => {
    e.preventDefault();
    const gateType = e.dataTransfer.getData('gateType');
    if (!gateType || !GATE_TYPES[gateType]) return;

    const rect = viewport.getBoundingClientRect();
    const x = e.clientX - rect.left - 45;
    const y = e.clientY - rect.top - 30;

    createNodeOnCanvas({
      id: `gate_${Date.now()}`,
      type: gateType,
      label: GATE_TYPES[gateType].id,
      x: Math.max(10, x),
      y: Math.max(10, y),
      outputState: false,
      inputPins: Array.from({ length: GATE_TYPES[gateType].inputs }, (_, i) => i),
      outputPins: [0]
    });
  };

  evaluateCircuit();
}

function createNodeOnCanvas(spec) {
  appState.nodes.push(spec);
  renderNodeDOM(spec);
}

function renderNodeDOM(node) {
  const layer = document.getElementById('lg-node-layer');
  if (!layer) return;

  const nodeEl = document.createElement('div');
  nodeEl.className = `lg-ic-node lg-node-${node.type.toLowerCase()} lg-pop-in`;
  nodeEl.id = `node-${node.id}`;
  nodeEl.style.left = `${node.x}px`;
  nodeEl.style.top = `${node.y}px`;

  const symbol = GATE_TYPES[node.type] ? GATE_TYPES[node.type].symbol : node.label;

  nodeEl.innerHTML = `
    <div class="lg-ic-header">
      <span>${node.label}</span>
      <span class="lg-val-badge" id="val-${node.id}">${node.outputState ? 'HIGH' : 'LOW'}</span>
    </div>
    <div class="lg-ic-body">
      <div class="lg-ic-pins-left">
        ${node.inputPins.map((pinIdx) => `<div class="lg-pin lg-pin-input" data-node="${node.id}" data-pin="${pinIdx}" title="Input ${pinIdx}"></div>`).join('')}
      </div>
      <div class="lg-ic-center-core">${symbol}</div>
      <div class="lg-ic-pins-right">
        ${node.outputPins.map((pinIdx) => `<div class="lg-pin lg-pin-output" data-node="${node.id}" data-pin="${pinIdx}" title="Output ${pinIdx}"></div>`).join('')}
      </div>
    </div>
  `;

  if (node.type === 'INPUT') {
    nodeEl.classList.add('clickable');
    nodeEl.addEventListener('click', (e) => {
      if (e.target.classList.contains('lg-pin')) return;
      node.outputState = !node.outputState;
      evaluateCircuit();
    });
  }

  // Dragging Implementation
  nodeEl.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('lg-pin')) return;
    appState.isDragging = true;
    appState.draggedNode = node;
    let shiftX = e.clientX - node.x;
    let shiftY = e.clientY - node.y;

    function onMouseMove(e) {
      if (appState.isDragging) {
        node.x = e.clientX - shiftX;
        node.y = e.clientY - shiftY;
        nodeEl.style.left = `${node.x}px`;
        nodeEl.style.top = `${node.y}px`;
        renderWires();
      }
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', () => {
      appState.isDragging = false;
      document.removeEventListener('mousemove', onMouseMove);
    }, { once: true });
  });

  // Pin Connection Listeners
  nodeEl.querySelectorAll('.lg-pin-output').forEach(pinEl => {
    pinEl.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      appState.wiringStart = { nodeId: node.id, pinIdx: parseInt(pinEl.dataset.pin, 10), isOutput: true };
    });
  });

  nodeEl.querySelectorAll('.lg-pin-input').forEach(pinEl => {
    pinEl.addEventListener('mouseup', (e) => {
      e.stopPropagation();
      if (appState.wiringStart && appState.wiringStart.isOutput) {
        addWireConnection(appState.wiringStart.nodeId, appState.wiringStart.pinIdx, node.id, parseInt(pinEl.dataset.pin, 10));
        appState.wiringStart = null;
      }
    });
  });

  layer.appendChild(nodeEl);
}

function addWireConnection(fromId, fromPin, toId, toPin) {
  appState.connections = appState.connections.filter(c => !(c.toNodeId === toId && c.toPin === toPin));
  appState.connections.push({ id: `wire_${Date.now()}`, fromNodeId: fromId, fromPin, toNodeId: toId, toPin });
  renderWires();
  evaluateCircuit();
}

function renderWires() {
  const svgLayer = document.getElementById('lg-wire-layer');
  if (!svgLayer) return;

  // Clear existing paths, keep defs
  const defs = svgLayer.querySelector('defs');
  svgLayer.innerHTML = '';
  if (defs) svgLayer.appendChild(defs);

  appState.connections.forEach(conn => {
    const fromNode = appState.nodes.find(n => n.id === conn.fromNodeId);
    const toNode = appState.nodes.find(n => n.id === conn.toNodeId);
    if (!fromNode || !toNode) return;

    const x1 = fromNode.x + 110;
    const y1 = fromNode.y + 30 + (conn.fromPin * 14);
    const x2 = toNode.x;
    const y2 = toNode.y + 30 + (conn.toPin * 14);
    const dx = Math.max(30, Math.abs(x2 - x1) * 0.5);

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`);
    path.setAttribute('class', `lg-wire ${fromNode.outputState ? 'active' : ''}`);
    path.setAttribute('filter', fromNode.outputState ? 'url(#wire-glow)' : 'none');
    svgLayer.appendChild(path);
  });
}

function evaluateCircuit() {
  let changed = true;
  let iterations = 0;

  while (changed && iterations < 50) {
    changed = false;
    iterations++;

    appState.nodes.forEach(node => {
      if (node.type === 'INPUT') return;

      const inputValues = node.inputPins.map((_, index) => {
        const conn = appState.connections.find(c => c.toNodeId === node.id && c.toPin === index);
        if (!conn) return false;
        const src = appState.nodes.find(n => n.id === conn.fromNodeId);
        return src ? src.outputState : false;
      });

      let newState = false;
      if (node.type === 'OUTPUT') newState = inputValues[0] || false;
      else if (GATE_TYPES[node.type]) newState = GATE_TYPES[node.type].fn(...inputValues);

      if (node.outputState !== newState) {
        node.outputState = newState;
        changed = true;
      }
    });
  }

  // Update Node DOM Badges
  appState.nodes.forEach(node => {
    const badge = document.getElementById(`val-${node.id}`);
    const nodeEl = document.getElementById(`node-${node.id}`);
    if (badge) badge.textContent = node.outputState ? 'HIGH' : 'LOW';
    if (nodeEl) nodeEl.classList.toggle('state-high', node.outputState);
  });

  // Calculate System Bus Hex Display
  const targetOut = appState.nodes.find(n => n.type === 'OUTPUT');
  const busValHex = targetOut && targetOut.outputState ? '0x2A' : '0x00';
  appState.busHexValue = busValHex;

  const busTag = document.getElementById('lg-bus-val');
  if (busTag) busTag.textContent = `[${busValHex}]`;

  const statBus = document.getElementById('stat-bus');
  const statOut = document.getElementById('stat-out');
  if (statBus) statBus.textContent = `[${busValHex}]`;
  if (statOut) statOut.textContent = `[${busValHex}]`;

  renderWires();
  renderAnalyzerWaveforms();
}

function toggleClockStep() {
  appState.clockState = !appState.clockState;
  const indicator = document.getElementById('lg-clock-indicator');
  if (indicator) {
    indicator.textContent = appState.clockState ? 'HIGH' : 'LOW';
    indicator.style.borderColor = appState.clockState ? '#00ff66' : '#6e7c91';
    indicator.style.color = appState.clockState ? '#00ff66' : '#6e7c91';
  }
  renderAnalyzerWaveforms();
}

// Logic Analyzer Waveform Renderers
function drawSquareWave(canvasId, values) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = (canvas.width = canvas.clientWidth);
  const h = (canvas.height = canvas.clientHeight);

  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = '#00ff66';
  ctx.lineWidth = 1.5;
  ctx.beginPath();

  const step = w / values.length;
  values.forEach((v, i) => {
    const x = i * step;
    const y = v ? 3 : h - 4;
    if (i === 0) ctx.moveTo(x, y);
    else {
      ctx.lineTo(x, v ? h - 4 : 3);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(x + step, y);
  });
  ctx.stroke();
}

function drawBusWave(canvasId, hexLabels) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const w = (canvas.width = canvas.clientWidth);
  const h = (canvas.height = canvas.clientHeight);

  ctx.clearRect(0, 0, w, h);
  const step = w / hexLabels.length;

  hexLabels.forEach((label, i) => {
    const x = i * step;
    ctx.fillStyle = '#1c2430';
    ctx.strokeStyle = '#00ff66';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(x + 2, h / 2);
    ctx.lineTo(x + 5, 2);
    ctx.lineTo(x + step - 5, 2);
    ctx.lineTo(x + step - 2, h / 2);
    ctx.lineTo(x + step - 5, h - 2);
    ctx.lineTo(x + 5, h - 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#00ff66';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, x + step / 2, h / 2 + 3);
  });
}

function renderAnalyzerWaveforms() {
  const inA = appState.nodes.find(n => n.id === 'in_1');
  const out1 = appState.nodes.find(n => n.type === 'OUTPUT');

  const clkWave = appState.clockState ? [1, 0, 1, 0, 1, 0] : [0, 1, 0, 1, 0, 1];
  const inVal = inA && inA.outputState ? 1 : 0;
  const outVal = out1 && out1.outputState ? 1 : 0;

  drawSquareWave('clk-canvas', clkWave);
  drawBusWave('bus-canvas', [appState.busHexValue, appState.busHexValue, appState.busHexValue, appState.busHexValue]);
  drawSquareWave('ina-canvas', [inVal, inVal, inVal, inVal]);
  drawSquareWave('out-canvas', [outVal, outVal, outVal, outVal]);
}

function verifyLogicSolution() {
  const level = LOGIC_GATES_LEVELS[appState.currentLevelIndex];
  if (!level) return;

  let isComplete = true;

  for (const testCase of level.truthTable) {
    Object.keys(testCase.inputStates).forEach(inId => {
      const node = appState.nodes.find(n => n.id === inId);
      if (node) node.outputState = testCase.inputStates[inId];
    });

    evaluateCircuit();

    Object.keys(testCase.expectedOutput).forEach(outId => {
      const node = appState.nodes.find(n => n.id === outId);
      if (!node || node.outputState !== testCase.expectedOutput[outId]) {
        isComplete = false;
      }
    });
  }

  const statusEl = document.getElementById('lg-completion-status');
  if (isComplete) {
    appState.levelProgress[level.id] = true;
    if (statusEl) {
      statusEl.textContent = '✓ CIRCUIT VERIFIED!';
      statusEl.className = 'status-tag success lg-pop-in';
    }
  } else if (statusEl) {
    statusEl.textContent = '❌ VERIFICATION FAILED';
    statusEl.className = 'status-tag pending';
  }
}

function resetCircuitCanvas() {
  loadLogicGatesLevel(appState.currentLevelIndex);
}

function logicGatesLabView() {
  injectLogicGatesStyles();

  return `
    <section class="explore-game-page" style="width:100%;padding:0;">
      <div id="logic-gates-root">
        <div id="lg-app-root" class="lg-workspace lg-fade-in">
          <div class="lg-menu-screen">
            <div class="lg-menu-navbar">
              <button class="lg-btn lg-btn-secondary" onclick="exitLogicGatesLab()">← MAIN MENU</button>
              <h2>CHOOSE BREADBOARD CHALLENGE</h2>
              <div></div>
            </div>
            <div class="lg-levels-grid" aria-label="Logic circuit levels">
              ${LOGIC_GATES_LEVELS.map((level, index) => `
                <div class="lg-level-card lg-card-anim">
                  <div class="lg-card-header">
                    <span class="lg-difficulty-tag">${level.difficulty}</span>
                  </div>
                  <h3 class="lg-card-title">${level.title}</h3>
                  <p class="lg-card-desc">${level.description}</p>
                  <button class="lg-btn lg-btn-primary lg-btn-full" onclick="startLevel(${index})">INITIALIZE CIRCUIT</button>
                </div>
              `).join('')}
            </div>
            <div class="lg-how-to-play">
              <strong>HOW TO PLAY</strong>
              <span>1. Choose a challenge</span>
              <span>2. Drag a gate onto the breadboard</span>
              <span>3. Connect pins from left to right, then run VERIFY</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function startLogicGatesLab() {
  if (typeof window.go === 'function') {
    window.go('explore-logic-gates');
  }
}

function exitLogicGatesLab() {
  if (typeof window.go === 'function') {
    window.go('explore');
  }
}

window.ExploreGames = window.ExploreGames || {};
Object.assign(window.ExploreGames, {
  logicGatesLabView,
  startLogicGatesLab,
  exitLogicGatesLab,
  mountLogicGatesLab,
  renderCurrentView,
  navigateTo,
  startLevel,
  resetCircuitCanvas,
  verifyLogicSolution,
  loadLogicGatesLevel,
  toggleClockStep
});

// Injection of Application Styles & Animations (Dark Circuit Theme)
function injectLogicGatesStyles() {
  const styleId = 'logic-gates-hardware-styles';
  if (document.getElementById(styleId)) return;

  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    @keyframes lgFadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
    @keyframes lgPopIn { 0% { transform: scale(0.85); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }

    .lg-fade-in { animation: lgFadeIn 0.25s ease-out forwards; }
    .lg-pop-in { animation: lgPopIn 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }

    .lg-workspace {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 640px;
      background: #0f1115;
      color: #d0d7e2;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #2a313d;
      position: relative;
      font-size: 11px;
      user-select: none;
    }

    /* Hero & Menu Screens */
    .lg-hero-screen {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      text-align: center;
      padding: 40px;
      position: relative;
      background: radial-gradient(circle at center, #181c23 0%, #0f1115 100%);
    }
    .lg-circuit-bg-glow {
      position: absolute;
      width: 280px;
      height: 280px;
      background: #00ff66;
      filter: blur(140px);
      opacity: 0.15;
      border-radius: 50%;
      pointer-events: none;
    }
    .lg-hero-content { z-index: 1; max-width: 520px; }
    .lg-hero-title { font-size: 28px; font-weight: 800; margin: 14px 0; color: #ffffff; letter-spacing: 1px; }
    .lg-hero-subtitle { font-size: 13px; color: #6e7c91; line-height: 1.5; margin-bottom: 24px; }
    .lg-btn-hero {
      padding: 12px 28px;
      font-size: 13px;
      background: #00ff66;
      color: #000000;
      border-radius: 4px;
      border: none;
      font-weight: bold;
      cursor: pointer;
      transition: box-shadow 0.2s, transform 0.1s;
    }
    .lg-btn-hero:hover { box-shadow: 0 0 12px rgba(0,255,102,0.4); transform: translateY(-1px); }

    .lg-menu-screen { padding: 20px; display: flex; flex-direction: column; gap: 20px; height: 100%; }
    .lg-menu-navbar { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #2a313d; padding-bottom: 10px; }
    .lg-levels-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; }
    .lg-level-card {
      background: #181c23;
      border: 1px solid #2a313d;
      border-radius: 6px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .lg-level-card:hover { border-color: #00ff66; }
    .lg-card-header { display: flex; justify-content: space-between; align-items: center; }
    .lg-difficulty-tag { font-size: 10px; color: #00ff66; font-weight: bold; }
    .lg-status-pill.success { font-size: 10px; color: #00ff66; font-weight: bold; }
    .lg-card-title { margin: 0; font-size: 14px; color: #fff; }
    .lg-card-desc { margin: 0; font-size: 11px; color: #6e7c91; flex: 1; }
    .lg-how-to-play {
      display: flex;
      flex-wrap: wrap;
      gap: 8px 18px;
      align-items: center;
      padding: 10px 12px;
      background: #12151b;
      border: 1px solid #2a313d;
      border-radius: 4px;
      color: #a0acba;
      font-size: 10px;
    }
    .lg-how-to-play strong { color: #00ff66; font-size: 9px; }
    .lg-how-to-play-compact { display: grid; gap: 4px; padding: 7px; margin-bottom: 10px; font-size: 9px; }

    /* Workbench UI Layout */
    .lg-navbar { display: flex; justify-content: space-between; align-items: center; padding: 8px 14px; background: #181c23; border-bottom: 1px solid #2a313d; }
    .lg-title-group { display: flex; align-items: center; gap: 10px; }
    .lg-title-group h2 { font-size: 12px; font-weight: bold; color: #fff; letter-spacing: 0.5px; }
    .lg-controls { display: flex; gap: 6px; }
    .lg-workbench { display: grid; grid-template-columns: 200px 1fr 280px; flex: 1; overflow: hidden; }

    /* Left Sidebar */
    .lg-sidebar { background: #181c23; border-right: 1px solid #2a313d; padding: 10px; display: flex; flex-direction: column; justify-content: space-between; }
    .lg-sidebar-title { color: #fff; font-size: 11px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #2a313d; padding-bottom: 4px; margin-bottom: 8px; }
    .lg-help-text { font-size: 9px; color: #6e7c91; margin-bottom: 8px; }
    .lg-category-label { font-size: 9px; font-weight: bold; color: #fff; margin-bottom: 6px; }
    .lg-toolbox-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
    .lg-ic-chip-item {
      background: #232933;
      border: 1px solid #364152;
      border-radius: 4px;
      padding: 6px 2px;
      text-align: center;
      cursor: grab;
    }
    .lg-ic-chip-item:hover { border-color: #00ff66; }
    .lg-ic-symbol { font-weight: bold; color: #00ff66; font-size: 11px; }
    .lg-ic-name { font-size: 8px; color: #d0d7e2; }

    /* Center Breadboard Canvas */
    .lg-canvas-viewport {
      position: relative;
      background-color: #171c24;
      background-image: radial-gradient(#2d3645 1.5px, transparent 1.5px);
      background-size: 14px 14px;
      overflow: hidden;
    }
    .lg-bus-pipe-overlay {
      position: absolute;
      top: 50%;
      left: 10%;
      right: 10%;
      height: 12px;
      background: rgba(0, 255, 102, 0.15);
      border: 1px solid rgba(0, 255, 102, 0.4);
      border-radius: 6px;
      pointer-events: none;
      transform: translateY(-50%);
    }
    .lg-bus-value-tag {
      position: absolute;
      right: 10px;
      top: -10px;
      background: #0d1217;
      border: 1px solid #00ff66;
      color: #00ff66;
      font-weight: bold;
      font-size: 10px;
      padding: 1px 6px;
      border-radius: 3px;
      box-shadow: 0 0 8px rgba(0,255,102,0.3);
    }
    .lg-svg-wire-layer { position: absolute; width: 100%; height: 100%; pointer-events: none; }
    .lg-wire { stroke: #3c4759; stroke-width: 2.5; fill: none; transition: stroke 0.15s; }
    .lg-wire.active { stroke: #00ff66; }

    /* Nodes / Hardware Chips */
    .lg-node-layer { position: absolute; width: 100%; height: 100%; }
    .lg-ic-node {
      position: absolute;
      width: 110px;
      background: #1d222b;
      border: 1px solid #3c4759;
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
      cursor: move;
    }
    .lg-ic-node.state-high { border-color: #00ff66; box-shadow: 0 0 10px rgba(0,255,102,0.2); }
    .lg-ic-header {
      background: #12151b;
      padding: 4px 6px;
      font-size: 9px;
      font-weight: bold;
      color: #8c9ba8;
      display: flex;
      justify-content: space-between;
      border-bottom: 1px solid #2a313d;
    }
    .lg-val-badge { color: #00ff66; font-size: 8px; }
    .lg-ic-body { display: flex; justify-content: space-between; align-items: center; padding: 8px 4px; }
    .lg-ic-center-core { font-size: 14px; font-weight: bold; color: #00ff66; font-family: monospace; }
    .lg-ic-pins-left, .lg-ic-pins-right { display: flex; flex-direction: column; gap: 6px; }
    .lg-pin { width: 9px; height: 9px; border-radius: 2px; background: #48566b; cursor: pointer; }
    .lg-pin:hover { background: #00ff66; }

    /* Right Analyzer Panel */
    .lg-analyzer-panel { background: #181c23; border-left: 1px solid #2a313d; padding: 10px; display: flex; flex-direction: column; gap: 10px; }
    .lg-clock-box { display: flex; justify-content: space-between; align-items: center; background: #12151b; padding: 6px; border: 1px solid #2a313d; border-radius: 4px; }
    .lg-state-badge { background: rgba(0,255,102,0.15); color: #00ff66; border: 1px solid #00ff66; padding: 1px 5px; border-radius: 2px; font-weight: bold; font-size: 9px; }
    .lg-status-table { background: #12151b; border: 1px solid #2a313d; border-radius: 4px; padding: 6px; display: grid; grid-template-columns: 1fr 1fr; gap: 4px; font-family: monospace; }
    .lg-status-row { color: #6e7c91; font-size: 10px; }
    .lg-status-row span { color: #00ff66; font-weight: bold; }

    .lg-timing-container { background: #12151b; border: 1px solid #2a313d; border-radius: 4px; padding: 6px; flex: 1; display: flex; flex-direction: column; }
    .lg-analyzer-steps { display: flex; justify-content: space-between; padding-left: 45px; color: #6e7c91; font-size: 8px; margin-bottom: 2px; }
    .lg-wave-row { display: flex; align-items: center; height: 20px; border-bottom: 1px solid #1a2029; }
    .lg-wave-label { width: 45px; font-size: 8px; color: #6e7c91; }
    .lg-wave-canvas { flex: 1; height: 100%; }

    /* Buttons & Badges */
    .lg-badge { background: rgba(0,255,102,0.15); color: #00ff66; border: 1px solid #00ff66; font-size: 9px; font-weight: bold; padding: 2px 6px; border-radius: 3px; }
    .lg-btn { background: #252d3a; border: 1px solid #3c485c; color: #d0d7e2; padding: 5px 12px; border-radius: 3px; font-size: 10px; font-weight: bold; cursor: pointer; }
    .lg-btn:hover { background: #323d4e; border-color: #00ff66; }
    .lg-btn-primary { background: #00ff66; color: #000; border-color: #00ff66; }
    .lg-btn-primary:hover { background: #00cc52; }
    .lg-btn-secondary { background: #1a2029; color: #a0acba; }
    .lg-btn-full { width: 100%; }
    .lg-btn-sm { padding: 3px 8px; font-size: 9px; }
    .status-tag { margin-top: 6px; padding: 4px; font-size: 10px; border-radius: 3px; text-align: center; font-weight: bold; }
    .status-tag.pending { background: #12151b; color: #6e7c91; border: 1px solid #2a313d; }
    .status-tag.success { background: rgba(0,255,102,0.2); color: #00ff66; border: 1px solid #00ff66; }
  `;
  document.head.appendChild(style);
}