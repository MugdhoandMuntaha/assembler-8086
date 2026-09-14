import './style.css';
import * as monaco from 'monaco-editor';
import { Memory } from './emulator/memory.js';
import { Registers } from './emulator/registers.js';
import { Assembler } from './emulator/assembler.js';
import { CPU, CPU_STATE } from './emulator/cpu.js';
import { Terminal } from './components/terminal.js';
import { registerAssemblyIntel } from './editor/intel.js';
import { DockManager } from './layout/dockManager.js';
import { GitHubModal } from './components/githubModal.js';
import { GoogleDriveModal } from './components/googleDriveModal.js';
import { CommandPalette } from './components/commandPalette.js';

let dockManager = null;
let activePresetBtnSetter = null;
let githubModal = null;
let googleDriveModal = null;
let commandPalette = null;
let currentTheme = 'theme-light';
let currentLayout = 'VSCODE';

// Setup Monaco Environment
self.MonacoEnvironment = {
  getWorker() {
    return new Worker(
      URL.createObjectURL(
        new Blob([''], { type: 'application/javascript' })
      )
    );
  }
};

// Register x86 / 8086 Assembly Language Definition for Monaco
monaco.languages.register({ id: 'x86asm' });

monaco.languages.setLanguageConfiguration('x86asm', {
  comments: {
    lineComment: ';'
  },
  brackets: [
    ['[', ']'],
    ['(', ')']
  ],
  autoClosingPairs: [
    { open: "'", close: "'" },
    { open: '"', close: '"' },
    { open: '[', close: ']' },
    { open: '(', close: ')' }
  ],
  surroundingPairs: [
    { open: "'", close: "'" },
    { open: '"', close: '"' },
    { open: '[', close: ']' },
    { open: '(', close: ')' }
  ]
});

monaco.languages.setMonarchTokensProvider('x86asm', {
  defaultToken: '',
  ignoreCase: true,
  tokenPostfix: '.asm',

  keywords: [
    'MOV', 'ADD', 'SUB', 'INC', 'DEC', 'MUL', 'IMUL', 'DIV', 'IDIV',
    'CMP', 'AND', 'OR', 'XOR', 'NOT', 'NEG', 'SHL', 'SAL', 'SHR', 'SAR',
    'ROL', 'ROR', 'JMP', 'JE', 'JZ', 'JNE', 'JNZ', 'JL', 'JNGE', 'JLE',
    'JNG', 'JG', 'JNLE', 'JGE', 'JNL', 'JC', 'JB', 'JNC', 'JNB', 'LOOP',
    'LOOPE', 'LOOPNE', 'CALL', 'RET', 'INT', 'LEA', 'PUSH', 'POP', 'XCHG',
    'NOP', 'CLC', 'STC', 'CMC', 'CLD', 'STD', 'CLI', 'STI'
  ],

  directives: [
    '.MODEL', '.STACK', '.DATA', '.CODE', 'PROC', 'ENDP', 'END',
    'DB', 'DW', 'DUP', 'ORG', 'SMALL', 'MEDIUM', 'LARGE', 'TINY',
    'OFFSET', 'PTR', 'BYTE', 'WORD'
  ],

  registers: [
    'AX', 'AH', 'AL', 'BX', 'BH', 'BL', 'CX', 'CH', 'CL', 'DX', 'DH', 'DL',
    'SI', 'DI', 'BP', 'SP', 'IP', 'CS', 'DS', 'SS', 'ES', '@DATA'
  ],

  tokenizer: {
    root: [
      [/;.*$/, 'comment'],
      [/'[^\\']*'/, 'string'],
      [/"[^\\"]*"/, 'string'],
      [/[0-9]+[HhBb]?/, 'number'],
      [/0x[0-9a-fA-F]+/, 'number'],
      [/@[a-zA-Z_]\w*/, 'variable.predefined'],
      [/[a-zA-Z_][\w$]*:/, 'type.identifier'],
      [/[a-zA-Z_][\w$]*/, {
        cases: {
          '@keywords': 'keyword',
          '@directives': 'keyword.directive',
          '@registers': 'variable',
          '@default': 'identifier'
        }
      }],
      [/[{}()\[\]]/, '@brackets'],
      [/[;,.]/, 'delimiter']
    ]
  }
});

// Register Autocomplete Suggestions and Hover Documentation
registerAssemblyIntel(monaco);

// Define Monaco Themes matching the UI palettes
monaco.editor.defineTheme('emu8086-dark', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
    { token: 'keyword', foreground: '38bdf8', fontStyle: 'bold' },
    { token: 'keyword.directive', foreground: 'c084fc', fontStyle: 'bold' },
    { token: 'variable', foreground: '4ade80' },
    { token: 'number', foreground: 'fbbf24' },
    { token: 'string', foreground: '34d399' },
    { token: 'type.identifier', foreground: 'f43f5e', fontStyle: 'bold' },
    { token: 'identifier', foreground: 'e2e8f0' }
  ],
  colors: {
    'editor.background': '#0a0d14',
    'editor.foreground': '#f1f5f9',
    'editorLineNumber.foreground': '#475569',
    'editorLineNumber.activeForeground': '#38bdf8',
    'editor.lineHighlightBackground': '#161e2e44',
    'editorCursor.foreground': '#38bdf8',
    'editor.selectionBackground': '#38bdf833',
    'editorGutter.background': '#070a0f'
  }
});

monaco.editor.defineTheme('emu8086-light', {
  base: 'vs',
  inherit: true,
  rules: [
    { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
    { token: 'keyword', foreground: '0284c7', fontStyle: 'bold' },
    { token: 'keyword.directive', foreground: '7c3aed', fontStyle: 'bold' },
    { token: 'variable', foreground: '16a34a' },
    { token: 'number', foreground: 'd97706' },
    { token: 'string', foreground: '059669' },
    { token: 'type.identifier', foreground: 'e11d48', fontStyle: 'bold' },
    { token: 'identifier', foreground: '0f172a' }
  ],
  colors: {
    'editor.background': '#ffffff',
    'editor.foreground': '#0f172a',
    'editorLineNumber.foreground': '#94a3b8',
    'editorLineNumber.activeForeground': '#0284c7',
    'editor.lineHighlightBackground': '#f1f5f988',
    'editorCursor.foreground': '#0284c7',
    'editor.selectionBackground': '#0284c726',
    'editorGutter.background': '#f8fafc'
  }
});

// Application Instances
const memory = new Memory();
const registers = new Registers();
const terminalScreen = document.getElementById('terminal-screen');
const terminal = new Terminal(terminalScreen);
const assembler = new Assembler(memory, registers);
const cpu = new CPU(registers, memory, terminal);

// UI Elements
const cpuStateBadge = document.getElementById('cpu-state-badge');
const errorConsole = document.getElementById('error-console');
const errorMessage = document.getElementById('error-message');

const btnAssemble = document.getElementById('btn-assemble');
const btnRun = document.getElementById('btn-run');
const btnStep = document.getElementById('btn-step');
const btnPause = document.getElementById('btn-pause');
const btnStop = document.getElementById('btn-stop');
const btnClearTerm = document.getElementById('btn-clear-term');

const speedRange = document.getElementById('speed-range');
const speedLabel = document.getElementById('speed-label');
const themeSelect = document.getElementById('theme-select');

const memSegmentInput = document.getElementById('mem-segment-input');
const memOffsetInput = document.getElementById('mem-offset-input');
const btnMemJump = document.getElementById('btn-mem-jump');
const memoryTableBody = document.getElementById('memory-table-body');

let displayFormat = 'HEX'; // 'HEX' | 'DEC' | 'BIN'
let activeProgram = null;
let monacoEditor = null;
let executionDecorations = [];

const DEFAULT_CODE = `.MODEL SMALL
.STACK 100H
.DATA

.CODE

MAIN PROC
    

ENDP MAIN
END MAIN`;

// Initialize App
function init() {
  initMonacoEditor();
  setupEventListeners();

  const panelsMap = {
    'panel-editor': document.getElementById('panel-editor'),
    'panel-cpu': document.getElementById('panel-cpu'),
    'panel-terminal': document.getElementById('panel-terminal')
  };

  dockManager = new DockManager(
    document.getElementById('main-container'),
    panelsMap,
    () => {
      if (monacoEditor) monacoEditor.layout();
    },
    () => {
      if (typeof activePresetBtnSetter === 'function') {
        activePresetBtnSetter(null);
      }
    }
  );

  setupWindowActions();
  assembleCode();

  // Initialize GitHub Export & Push Modal
  githubModal = new GitHubModal(() => {
    return monacoEditor ? monacoEditor.getValue() : DEFAULT_CODE;
  });

  // Initialize Google Drive Integration Modal
  googleDriveModal = new GoogleDriveModal(() => {
    return monacoEditor ? monacoEditor.getValue() : DEFAULT_CODE;
  });

  // Initialize Command Palette
  setupCommandPalette();

  cpu.onStateChange = renderUI;
  renderUI();
}

function initMonacoEditor() {
  const container = document.getElementById('monaco-editor-container');
  monacoEditor = monaco.editor.create(container, {
    value: DEFAULT_CODE,
    language: 'x86asm',
    theme: 'emu8086-light',
    fontFamily: "'Fira Code', Consolas, monospace",
    fontSize: 13,
    lineHeight: 20,
    minimap: { enabled: false },
    glyphMargin: true,
    automaticLayout: true,
    tabSize: 4,
    scrollBeyondLastLine: false,
    wordWrap: 'off',
    renderLineHighlight: 'all',
    bracketPairColorization: { enabled: true },
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: 'on',
    cursorWidth: 3,
    cursorStyle: 'line'
  });

  // Override Monaco shortcuts for Command Palette (Ctrl+Shift+P, Ctrl+P, F1)
  monacoEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyP, () => {
    if (commandPalette) commandPalette.toggle();
  });
  monacoEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyP, () => {
    if (commandPalette) commandPalette.toggle();
  });
  monacoEditor.addCommand(monaco.KeyCode.F1, () => {
    if (commandPalette) commandPalette.toggle();
  });
  monacoEditor.addCommand(monaco.KeyCode.F5, () => btnRun.click());
  monacoEditor.addCommand(monaco.KeyCode.F8, () => btnStep.click());
  monacoEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
    if (googleDriveModal) googleDriveModal.open();
  });

  // Re-layout on resize
  window.addEventListener('resize', () => {
    if (monacoEditor) monacoEditor.layout();
  });
}

function setupEventListeners() {
  // Buttons
  btnAssemble.addEventListener('click', assembleCode);
  btnRun.addEventListener('click', () => {
    if (cpu.state === CPU_STATE.STOPPED || cpu.state === CPU_STATE.ERROR || cpu.state === CPU_STATE.HALTED) {
      if (assembleCode()) cpu.run();
    } else {
      cpu.run();
    }
  });

  btnStep.addEventListener('click', () => {
    if (cpu.state === CPU_STATE.STOPPED || cpu.state === CPU_STATE.ERROR || cpu.state === CPU_STATE.HALTED) {
      if (assembleCode()) cpu.step();
    } else {
      cpu.step();
    }
  });

  btnPause.addEventListener('click', () => cpu.pause());
  btnStop.addEventListener('click', () => {
    cpu.stop();
    registers.reset();
    renderUI();
  });

  btnClearTerm.addEventListener('click', () => terminal.clear());

  // Speed slider (if present)
  if (speedRange) {
    speedRange.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      setSpeed(val);
    });
  }

  // Theme select (if present)
  if (themeSelect) {
    themeSelect.addEventListener('change', (e) => {
      setTheme(e.target.value);
    });
  }

  // Display Format Toggle
  document.querySelectorAll('.fmt-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.fmt-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      displayFormat = e.target.dataset.fmt;
      renderUI();
    });
  });

  // Memory Jump
  btnMemJump.addEventListener('click', renderMemoryTable);

  // Google Drive Cloud Save Button
  const btnOpenGDrive = document.getElementById('btn-open-gdrive');
  if (btnOpenGDrive) {
    btnOpenGDrive.addEventListener('click', () => {
      if (googleDriveModal) googleDriveModal.open();
    });
  }

  // GitHub Export / Push Button
  const btnOpenGithub = document.getElementById('btn-open-github');
  if (btnOpenGithub) {
    btnOpenGithub.addEventListener('click', () => {
      if (githubModal) githubModal.open();
    });
  }

  // Global Keyboard Shortcuts (captured at window level to override browser default accelerators)
  window.addEventListener(
    'keydown',
    (e) => {
      const isCmdOrCtrl = e.ctrlKey || e.metaKey;
      const isKeyP = e.code === 'KeyP' || e.key === 'p' || e.key === 'P';

      if (isCmdOrCtrl && isKeyP) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (commandPalette) commandPalette.toggle();
        return false;
      }

      if (e.key === 'F1') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (commandPalette) commandPalette.toggle();
        return false;
      }

      if (e.key === 'F5') {
        e.preventDefault();
        btnRun.click();
      } else if (e.key === 'F8') {
        e.preventDefault();
        btnStep.click();
      } else if (isCmdOrCtrl && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (googleDriveModal) googleDriveModal.open();
      }
    },
    { capture: true }
  );
}

function setTheme(themeName) {
  currentTheme = themeName;
  document.body.className = themeName;
  if (themeName === 'theme-light') {
    monaco.editor.setTheme('emu8086-light');
  } else {
    monaco.editor.setTheme('emu8086-dark');
  }
}

function setSpeed(speedMs) {
  cpu.speedMs = speedMs;
  if (speedRange) speedRange.value = speedMs;
  if (speedLabel) speedLabel.textContent = speedMs === 0 ? 'Max Speed' : `${speedMs}ms`;
}

function setupCommandPalette() {
  commandPalette = new CommandPalette();

  const commands = [
    // --- Layout Presets ---
    {
      id: 'layout-vscode',
      category: 'Layout',
      title: 'VS Code IDE Split (Default)',
      detail: 'Editor on top, Terminal below, CPU on right',
      icon: '📐',
      keywords: ['layout', 'vscode', 'split', 'default', 'ide'],
      isActive: () => currentLayout === 'VSCODE',
      action: () => {
        currentLayout = 'VSCODE';
        unfloatAllPanels();
        if (dockManager) dockManager.setPreset('VSCODE');
      }
    },
    {
      id: 'layout-columns',
      category: 'Layout',
      title: '3-Column Studio Layout',
      detail: 'Side-by-side Editor, CPU, and Terminal',
      icon: '▥',
      keywords: ['layout', 'columns', 'three', 'studio'],
      isActive: () => currentLayout === 'COLUMNS',
      action: () => {
        currentLayout = 'COLUMNS';
        unfloatAllPanels();
        if (dockManager) dockManager.setPreset('COLUMNS');
      }
    },
    {
      id: 'layout-bottom',
      category: 'Layout',
      title: 'Bottom Terminal (Wide Screen)',
      detail: 'Editor & CPU on top, wide Terminal below',
      icon: '⬓',
      keywords: ['layout', 'bottom', 'terminal', 'wide'],
      isActive: () => currentLayout === 'BOTTOM_TERM',
      action: () => {
        currentLayout = 'BOTTOM_TERM';
        unfloatAllPanels();
        if (dockManager) dockManager.setPreset('BOTTOM_TERM');
      }
    },
    {
      id: 'layout-float-all',
      category: 'Layout',
      title: 'Floating Windows Mode',
      detail: 'Detach all panels into movable floating windows',
      icon: '❐',
      keywords: ['layout', 'float', 'windows', 'detach', 'popout'],
      isActive: () => currentLayout === 'FLOATING',
      action: () => {
        currentLayout = 'FLOATING';
        floatAllPanels();
      }
    },
    {
      id: 'layout-focus-editor',
      category: 'Layout',
      title: 'Maximize / Focus Editor',
      detail: 'Expand code editor to full window',
      icon: '🔍',
      keywords: ['layout', 'focus', 'editor', 'maximize'],
      action: () => toggleMaximize(document.getElementById('panel-editor'))
    },
    {
      id: 'layout-focus-terminal',
      category: 'Layout',
      title: 'Maximize / Focus Terminal',
      detail: 'Expand terminal panel to full window',
      icon: '💻',
      keywords: ['layout', 'focus', 'terminal', 'maximize'],
      action: () => toggleMaximize(document.getElementById('panel-terminal'))
    },
    {
      id: 'layout-focus-cpu',
      category: 'Layout',
      title: 'Maximize / Focus CPU & Registers',
      detail: 'Expand CPU panel to full window',
      icon: '🎛️',
      keywords: ['layout', 'focus', 'cpu', 'registers', 'maximize'],
      action: () => toggleMaximize(document.getElementById('panel-cpu'))
    },
    {
      id: 'layout-reset',
      category: 'Layout',
      title: 'Reset to Default Layout',
      detail: 'Restore standard panel arrangement',
      icon: '↺',
      keywords: ['layout', 'reset', 'default'],
      action: () => {
        currentLayout = 'VSCODE';
        resetAllLayout();
      }
    },

    // --- Color Themes ---
    {
      id: 'theme-light',
      category: 'Theme',
      title: 'Light Theme (Clean Studio)',
      detail: 'Crisp high-contrast daylight aesthetic',
      icon: '☀️',
      keywords: ['theme', 'light', 'white', 'day'],
      isActive: () => currentTheme === 'theme-light',
      action: () => setTheme('theme-light')
    },
    {
      id: 'theme-cyber',
      category: 'Theme',
      title: 'Cyber Dark (Neon Blue / Slate)',
      detail: 'Modern developer dark mode with electric accents',
      icon: '🌙',
      keywords: ['theme', 'dark', 'cyber', 'night', 'blue'],
      isActive: () => currentTheme === 'theme-cyber',
      action: () => setTheme('theme-cyber')
    },
    {
      id: 'theme-amber',
      category: 'Theme',
      title: 'Amber Phosphor CRT',
      detail: 'Vintage warm amber monochrome display',
      icon: '🟠',
      keywords: ['theme', 'amber', 'vintage', 'crt', 'orange'],
      isActive: () => currentTheme === 'theme-amber',
      action: () => setTheme('theme-amber')
    },
    {
      id: 'theme-matrix',
      category: 'Theme',
      title: 'Matrix Green Phosphor CRT',
      detail: 'Classic terminal hacker phosphor green',
      icon: '🟢',
      keywords: ['theme', 'matrix', 'green', 'hacker', 'crt'],
      isActive: () => currentTheme === 'theme-matrix',
      action: () => setTheme('theme-matrix')
    },

    // --- Execution Speed ---
    {
      id: 'speed-0',
      category: 'Speed',
      title: 'Max Speed (Instant / 0ms delay)',
      detail: 'Executes instructions without clock delay',
      icon: '⚡',
      keywords: ['speed', 'instant', 'max', 'fast', 'fastest', '0ms'],
      isActive: () => cpu.speedMs === 0,
      action: () => setSpeed(0)
    },
    {
      id: 'speed-50',
      category: 'Speed',
      title: 'Fast Speed (50ms delay)',
      detail: 'Quick execution with visible register animations',
      icon: '⏩',
      keywords: ['speed', 'fast', '50ms'],
      isActive: () => cpu.speedMs === 50,
      action: () => setSpeed(50)
    },
    {
      id: 'speed-100',
      category: 'Speed',
      title: 'Normal Speed (100ms delay - Default)',
      detail: 'Standard educational execution pacing',
      icon: '▶',
      keywords: ['speed', 'normal', 'default', '100ms'],
      isActive: () => cpu.speedMs === 100,
      action: () => setSpeed(100)
    },
    {
      id: 'speed-200',
      category: 'Speed',
      title: 'Medium Speed (200ms delay)',
      detail: 'Clear view of register & memory changes',
      icon: '⏱️',
      keywords: ['speed', 'medium', '200ms'],
      isActive: () => cpu.speedMs === 200,
      action: () => setSpeed(200)
    },
    {
      id: 'speed-500',
      category: 'Speed',
      title: 'Step-by-Step Slow (500ms delay)',
      detail: 'Slow-motion debugging and instruction tracing',
      icon: '🐌',
      keywords: ['speed', 'slow', 'step', 'trace', '500ms'],
      isActive: () => cpu.speedMs === 500,
      action: () => setSpeed(500)
    },

    // --- Execution Controls ---
    {
      id: 'exec-assemble',
      category: 'Execution',
      title: 'Assemble Code',
      detail: 'Compile assembly instructions and sync RAM',
      icon: '⚙️',
      keywords: ['assemble', 'compile', 'build'],
      action: () => assembleCode()
    },
    {
      id: 'exec-run',
      category: 'Execution',
      title: 'Run Program',
      detail: 'Start continuous CPU execution',
      icon: '▶️',
      shortcut: 'F5',
      keywords: ['run', 'start', 'execute'],
      action: () => btnRun.click()
    },
    {
      id: 'exec-step',
      category: 'Execution',
      title: 'Single Cycle Step',
      detail: 'Execute one instruction and advance IP',
      icon: '⏭️',
      shortcut: 'F8',
      keywords: ['step', 'single', 'cycle', 'next'],
      action: () => btnStep.click()
    },
    {
      id: 'exec-pause',
      category: 'Execution',
      title: 'Pause Execution',
      detail: 'Temporarily halt the CPU clock',
      icon: '⏸️',
      keywords: ['pause', 'freeze'],
      action: () => cpu.pause()
    },
    {
      id: 'exec-reset',
      category: 'Execution',
      title: 'Reset Registers & CPU',
      detail: 'Zero out CPU state and reload memory',
      icon: '⏹️',
      keywords: ['reset', 'stop', 'halt', 'restart'],
      action: () => btnStop.click()
    },

    // --- Tools & Cloud ---
    {
      id: 'tool-clear-term',
      category: 'Terminal',
      title: 'Clear Terminal Output',
      detail: 'Wipe all text from the DOS screen',
      icon: '🗑️',
      keywords: ['terminal', 'clear', 'cls'],
      action: () => terminal.clear()
    },
    {
      id: 'tool-gdrive',
      category: 'Cloud',
      title: 'Save & Sync to Google Drive',
      detail: 'Upload source code via Google Identity Services',
      icon: '☁️',
      shortcut: 'Ctrl+S',
      keywords: ['google', 'drive', 'save', 'cloud', 'backup'],
      action: () => {
        if (googleDriveModal) googleDriveModal.open();
      }
    },
    {
      id: 'tool-github',
      category: 'Cloud',
      title: 'Push / Commit to GitHub',
      detail: 'Publish code repository directly to GitHub',
      icon: '🐙',
      keywords: ['github', 'git', 'push', 'commit', 'repo'],
      action: () => {
        if (githubModal) githubModal.open();
      }
    }
  ];

  commandPalette.setCommands(commands);

  const btnOpenPalette = document.getElementById('btn-open-palette');
  if (btnOpenPalette) {
    btnOpenPalette.addEventListener('click', () => {
      commandPalette.toggle();
    });
  }
}

function assembleCode() {
  registers.reset();
  memory.reset();
  errorConsole.classList.add('hidden');

  const code = monacoEditor ? monacoEditor.getValue() : DEFAULT_CODE;

  try {
    activeProgram = assembler.parse(code);
    cpu.loadProgram(activeProgram);
    renderUI();
    return true;
  } catch (err) {
    errorConsole.classList.remove('hidden');
    errorMessage.textContent = err.message;
    cpu.state = CPU_STATE.ERROR;
    renderUI();
    return false;
  }
}

function formatVal(val, bits = 16) {
  if (val === undefined || val === null) return '0';
  if (displayFormat === 'DEC') {
    return val.toString(10);
  }
  if (displayFormat === 'BIN') {
    return val.toString(2).padStart(bits, '0');
  }
  // HEX
  const hexLen = bits / 4;
  return val.toString(16).toUpperCase().padStart(hexLen, '0');
}

function renderUI() {
  renderStatusBadge();
  renderRegisters();
  renderFlags();
  renderMemoryTable();
  renderExecutionPointer();
}

function renderStatusBadge() {
  cpuStateBadge.textContent = cpu.state;
  cpuStateBadge.className = `badge state-${cpu.state.toLowerCase()}`;
}

function renderRegisters() {
  // General purpose
  document.getElementById('reg-AX').textContent = formatVal(registers.AX, 16);
  document.getElementById('reg-AH').textContent = formatVal(registers.AH, 8);
  document.getElementById('reg-AL').textContent = formatVal(registers.AL, 8);

  document.getElementById('reg-BX').textContent = formatVal(registers.BX, 16);
  document.getElementById('reg-BH').textContent = formatVal(registers.BH, 8);
  document.getElementById('reg-BL').textContent = formatVal(registers.BL, 8);

  document.getElementById('reg-CX').textContent = formatVal(registers.CX, 16);
  document.getElementById('reg-CH').textContent = formatVal(registers.CH, 8);
  document.getElementById('reg-CL').textContent = formatVal(registers.CL, 8);

  document.getElementById('reg-DX').textContent = formatVal(registers.DX, 16);
  document.getElementById('reg-DH').textContent = formatVal(registers.DH, 8);
  document.getElementById('reg-DL').textContent = formatVal(registers.DL, 8);

  // Pointers & Indexes
  document.getElementById('reg-SI').textContent = formatVal(registers.SI, 16);
  document.getElementById('reg-DI').textContent = formatVal(registers.DI, 16);
  document.getElementById('reg-BP').textContent = formatVal(registers.BP, 16);
  document.getElementById('reg-SP').textContent = formatVal(registers.SP, 16);
  document.getElementById('reg-IP').textContent = formatVal(registers.IP, 16);

  // Segments
  document.getElementById('reg-CS').textContent = formatVal(registers.CS, 16);
  document.getElementById('reg-DS').textContent = formatVal(registers.DS, 16);
  document.getElementById('reg-SS').textContent = formatVal(registers.SS, 16);
}

function renderFlags() {
  for (const flagName in registers.flags) {
    const chip = document.getElementById(`flag-${flagName}`);
    if (chip) {
      const val = registers.flags[flagName];
      chip.querySelector('span').textContent = val;
      if (val === 1) chip.classList.add('active');
      else chip.classList.remove('active');
    }
  }
}

function renderMemoryTable() {
  const segHex = memSegmentInput.value.trim() || '0710';
  const offHex = memOffsetInput.value.trim() || '0000';
  const seg = parseInt(segHex, 16) || registers.DS;
  const startOffset = parseInt(offHex, 16) || 0;

  memoryTableBody.innerHTML = '';

  for (let row = 0; row < 16; row++) {
    const rowOffset = startOffset + (row * 8);
    const tr = document.createElement('tr');

    const tdAddr = document.createElement('td');
    tdAddr.textContent = `${seg.toString(16).toUpperCase().padStart(4, '0')}:${rowOffset.toString(16).toUpperCase().padStart(4, '0')}`;
    tr.appendChild(tdAddr);

    let asciiStr = '';

    for (let col = 0; col < 8; col++) {
      const offset = rowOffset + col;
      const val = memory.read8(seg, offset);
      const tdVal = document.createElement('td');
      tdVal.textContent = val.toString(16).toUpperCase().padStart(2, '0');
      if (val !== 0) tdVal.classList.add('mem-changed');
      tr.appendChild(tdVal);

      // ASCII printable preview
      asciiStr += (val >= 32 && val <= 126) ? String.fromCharCode(val) : '.';
    }

    const tdAscii = document.createElement('td');
    tdAscii.textContent = asciiStr;
    tr.appendChild(tdAscii);

    memoryTableBody.appendChild(tr);
  }
}

function renderExecutionPointer() {
  if (!monacoEditor) return;

  if (!activeProgram || !activeProgram.instructions || activeProgram.instructions.length === 0) {
    executionDecorations = monacoEditor.deltaDecorations(executionDecorations, []);
    return;
  }

  const currentInstr = activeProgram.instructions[registers.IP];
  if (currentInstr && currentInstr.lineNum) {
    const lineNum = currentInstr.lineNum;
    executionDecorations = monacoEditor.deltaDecorations(executionDecorations, [
      {
        range: new monaco.Range(lineNum, 1, lineNum, 1),
        options: {
          isWholeLine: true,
          className: 'monaco-executing-line',
          glyphMarginClassName: 'monaco-executing-glyph'
        }
      }
    ]);
    monacoEditor.revealLineInCenterIfOutsideViewport(lineNum);
  } else {
    executionDecorations = monacoEditor.deltaDecorations(executionDecorations, []);
  }
}

// Window Management (Pop-out / Float / Maximize / Restore)
let highestZIndex = 1000;
const panelPositions = {
  'panel-editor': { top: 80, left: 30, width: 480, height: 600 },
  'panel-cpu': { top: 100, left: 380, width: 500, height: 620 },
  'panel-terminal': { top: 120, left: 740, width: 500, height: 560 }
};

function unfloatAllPanels() {
  const panels = document.querySelectorAll('.panel');
  panels.forEach(panel => {
    panel.classList.remove('is-floating', 'is-maximized', 'active-window');
    panel.style.position = '';
    panel.style.left = '';
    panel.style.top = '';
    panel.style.width = '';
    panel.style.height = '';
    panel.style.zIndex = '';
    const floatBtn = panel.querySelector('.btn-float');
    const maxBtn = panel.querySelector('.btn-maximize');
    if (floatBtn) { floatBtn.classList.remove('active'); floatBtn.title = 'Pop out into floating window'; }
    if (maxBtn) { maxBtn.classList.remove('active'); maxBtn.title = 'Maximize panel'; }
  });
}

function setupWindowActions() {
  const panels = document.querySelectorAll('.panel');

  panels.forEach(panel => {
    const panelId = panel.id;
    const header = panel.querySelector('.panel-header');
    const floatBtn = panel.querySelector('.btn-float');
    const maxBtn = panel.querySelector('.btn-maximize');

    // Clicking brings active floating window to top
    panel.addEventListener('pointerdown', () => {
      if (panel.classList.contains('is-floating')) {
        bringToFront(panel);
      }
    });

    // Float / Pop out toggle
    if (floatBtn) {
      floatBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFloat(panel);
      });
    }

    // Maximize toggle
    if (maxBtn) {
      maxBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleMaximize(panel);
      });
    }

    // Draggable header when in floating mode
    if (header) {
      let isDragging = false;
      let dragStartX = 0;
      let dragStartY = 0;
      let panelStartLeft = 0;
      let panelStartTop = 0;

      header.addEventListener('pointerdown', (e) => {
        if (!panel.classList.contains('is-floating')) return;
        // Don't drag if clicking buttons or inputs inside header
        if (e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) return;

        e.preventDefault();
        bringToFront(panel);
        isDragging = true;
        dragStartX = e.clientX;
        dragStartY = e.clientY;

        const rect = panel.getBoundingClientRect();
        panelStartLeft = rect.left;
        panelStartTop = rect.top;

        document.body.style.cursor = 'grabbing';
        document.body.style.userSelect = 'none';

        const onPointerMove = (moveEvt) => {
          if (!isDragging) return;
          const dx = moveEvt.clientX - dragStartX;
          const dy = moveEvt.clientY - dragStartY;

          const newLeft = Math.max(0, Math.min(window.innerWidth - 100, panelStartLeft + dx));
          const newTop = Math.max(64, Math.min(window.innerHeight - 60, panelStartTop + dy));

          panel.style.left = `${newLeft}px`;
          panel.style.top = `${newTop}px`;

          if (panelPositions[panelId]) {
            panelPositions[panelId].left = newLeft;
            panelPositions[panelId].top = newTop;
          }
        };

        const onPointerUp = () => {
          isDragging = false;
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
          window.removeEventListener('pointermove', onPointerMove);
          window.removeEventListener('pointerup', onPointerUp);
          window.removeEventListener('pointercancel', onPointerUp);
        };

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', onPointerUp);
      });
    }
  });

  // Dock Layout Preset Controls
  const btnLayoutVscode = document.getElementById('btn-layout-vscode');
  const btnLayoutColumns = document.getElementById('btn-layout-columns');
  const btnLayoutBottom = document.getElementById('btn-layout-bottom');
  const btnFloatAll = document.getElementById('btn-float-all');

  function setActivePresetBtn(activeBtn) {
    [btnLayoutVscode, btnLayoutColumns, btnLayoutBottom].forEach(b => {
      if (b) {
        b.classList.remove('btn-primary');
        b.classList.add('btn-secondary');
      }
    });
    if (activeBtn) {
      activeBtn.classList.remove('btn-secondary');
      activeBtn.classList.add('btn-primary');
    }
  }
  activePresetBtnSetter = setActivePresetBtn;

  if (btnLayoutVscode) {
    btnLayoutVscode.addEventListener('click', () => {
      unfloatAllPanels();
      if (dockManager) dockManager.setPreset('VSCODE');
      setActivePresetBtn(btnLayoutVscode);
    });
  }

  if (btnLayoutColumns) {
    btnLayoutColumns.addEventListener('click', () => {
      unfloatAllPanels();
      if (dockManager) dockManager.setPreset('COLUMNS');
      setActivePresetBtn(btnLayoutColumns);
    });
  }

  if (btnLayoutBottom) {
    btnLayoutBottom.addEventListener('click', () => {
      unfloatAllPanels();
      if (dockManager) dockManager.setPreset('BOTTOM_TERM');
      setActivePresetBtn(btnLayoutBottom);
    });
  }

  if (btnFloatAll) {
    btnFloatAll.addEventListener('click', floatAllPanels);
  }
}

function bringToFront(panel) {
  highestZIndex += 2;
  panel.style.zIndex = highestZIndex;
  document.querySelectorAll('.panel.is-floating').forEach(p => p.classList.remove('active-window'));
  panel.classList.add('active-window');
}

function toggleFloat(panel) {
  const panelId = panel.id;
  const floatBtn = panel.querySelector('.btn-float');
  const isCurrentlyFloating = panel.classList.contains('is-floating');

  if (isCurrentlyFloating) {
    // Dock back into layout
    panel.classList.remove('is-floating');
    panel.classList.remove('active-window');
    panel.style.position = '';
    panel.style.left = '';
    panel.style.top = '';
    panel.style.width = '';
    panel.style.height = '';
    panel.style.zIndex = '';
    if (floatBtn) {
      floatBtn.title = 'Pop out into floating window';
      floatBtn.classList.remove('active');
    }
    if (dockManager) dockManager.render();
  } else {
    // Pop out into floating window
    panel.classList.remove('is-maximized');
    const pos = panelPositions[panelId] || { top: 100, left: 100, width: 480, height: 500 };
    panel.classList.add('is-floating');
    panel.style.left = `${pos.left}px`;
    panel.style.top = `${pos.top}px`;
    panel.style.width = `${pos.width}px`;
    panel.style.height = `${pos.height}px`;
    bringToFront(panel);
    if (floatBtn) {
      floatBtn.title = 'Dock back into layout';
      floatBtn.classList.add('active');
    }
  }

  setTimeout(() => {
    if (monacoEditor) monacoEditor.layout();
  }, 60);
}

function toggleMaximize(panel) {
  const maxBtn = panel.querySelector('.btn-maximize');
  const isMax = panel.classList.contains('is-maximized');

  if (isMax) {
    panel.classList.remove('is-maximized');
    if (maxBtn) {
      maxBtn.title = 'Maximize panel';
      maxBtn.classList.remove('active');
    }
  } else {
    if (panel.classList.contains('is-floating')) {
      toggleFloat(panel);
    }
    panel.classList.add('is-maximized');
    if (maxBtn) {
      maxBtn.title = 'Restore panel';
      maxBtn.classList.add('active');
    }
  }

  setTimeout(() => {
    if (monacoEditor) monacoEditor.layout();
  }, 60);
}

function resetAllLayout() {
  unfloatAllPanels();
  if (dockManager) dockManager.setPreset('VSCODE');
  const btn = document.getElementById('btn-layout-vscode');
  if (btn) {
    [document.getElementById('btn-layout-columns'), document.getElementById('btn-layout-bottom')].forEach(b => {
      if (b) { b.classList.remove('btn-primary'); b.classList.add('btn-secondary'); }
    });
    btn.classList.remove('btn-secondary');
    btn.classList.add('btn-primary');
  }
}

function floatAllPanels() {
  const panels = document.querySelectorAll('.panel');
  panels.forEach(panel => {
    if (!panel.classList.contains('is-floating')) {
      toggleFloat(panel);
    }
  });
}

// Start application
window.addEventListener('DOMContentLoaded', init);
