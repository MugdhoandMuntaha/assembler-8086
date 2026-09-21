/**
 * Interactive VS Code Style DOS Terminal Controller
 * 
 * Features:
 * - Direct inline keyboard typing at cursor for DOS INT 21H input interrupts (AH=01H, AH=0AH)
 * - Zero intrusive floating popups or external prompts
 * - Immediate keyboard auto-focus and click-to-focus support
 * - Clean terminal styling matching VS Code integrated terminal
 */

export class Terminal {
  constructor(screenElement) {
    this.screenElement = screenElement;
    this.panelElement = screenElement ? screenElement.closest('.panel') : null;
    this.inputCallback = null;
    this.isWaitingInput = false;
    this.isWaitingLine = false;
    this.lineBuffer = '';
    this.maxChars = 255;

    this.initDOM();
    this.initListeners();
  }

  initDOM() {
    if (!this.screenElement) return;

    this.screenElement.tabIndex = 0;
    this.screenElement.setAttribute('role', 'textbox');
    this.screenElement.setAttribute('aria-label', 'Terminal Screen');

    this.screenElement.innerHTML = '<div class="terminal-content"><span class="terminal-text"></span><span class="terminal-inline-buffer"></span><span class="terminal-cursor blink"></span></div><input type="text" class="terminal-hidden-input" aria-hidden="true" tabindex="-1" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">';

    this.textEl = this.screenElement.querySelector('.terminal-text');
    this.bufferEl = this.screenElement.querySelector('.terminal-inline-buffer');
    this.cursorEl = this.screenElement.querySelector('.terminal-cursor');
    this.hiddenInput = this.screenElement.querySelector('.terminal-hidden-input');
    this.statusDot = document.getElementById('term-status-dot');

    // Start with a clean, empty screen
    this.clear();
  }

  initListeners() {
    if (!this.screenElement || !this.hiddenInput) return;

    // Clicking terminal focuses inline input
    this.screenElement.addEventListener('pointerdown', () => {
      this.focus();
    });

    if (this.panelElement) {
      this.panelElement.addEventListener('pointerdown', (e) => {
        if (!e.target.closest('button') && !e.target.closest('.panel-header')) {
          this.focus();
        }
      });
    }

    // Capture keys on hidden input
    this.hiddenInput.addEventListener('keydown', (e) => {
      this.handleKeyDown(e);
    });

    // Capture keys directly on screen element
    this.screenElement.addEventListener('keydown', (e) => {
      if (document.activeElement !== this.hiddenInput) {
        this.handleKeyDown(e);
      }
    });

    // Forward screen element focus to hiddenInput
    this.screenElement.addEventListener('focus', () => {
      if (this.hiddenInput && document.activeElement !== this.hiddenInput) {
        this.hiddenInput.focus({ preventScroll: true });
      }
    });

    // Handle mobile virtual keyboard / IME input
    this.hiddenInput.addEventListener('input', () => {
      if (!this.isWaitingInput) {
        this.hiddenInput.value = '';
        return;
      }
      const val = this.hiddenInput.value;
      this.hiddenInput.value = '';
      if (!val) return;

      for (const ch of val) {
        if (!this.isWaitingLine) {
          const cb = this.inputCallback;
          this.finishInput();
          if (cb) cb(ch);
          break;
        } else {
          if (ch === '\n' || ch === '\r') {
            const line = this.lineBuffer;
            const cb = this.inputCallback;
            this.finishInput();
            if (cb) cb(line);
            break;
          } else {
            if (!this.maxChars || this.lineBuffer.length < this.maxChars) {
              this.lineBuffer += ch;
              if (this.bufferEl) this.bufferEl.textContent = this.lineBuffer;
              this.scrollToBottom();
            }
          }
        }
      }
    });

    // Handle paste inline
    const handlePaste = (e) => {
      if (!this.isWaitingInput || !this.inputCallback) return;
      e.preventDefault();
      const pasteData = (e.clipboardData || window.clipboardData)?.getData('text') || '';
      if (!pasteData) return;

      if (!this.isWaitingLine) {
        const char = pasteData.charAt(0);
        const cb = this.inputCallback;
        this.finishInput();
        if (cb) cb(char);
      } else {
        const clean = pasteData.replace(/[\r\n]/g, '');
        for (const ch of clean) {
          if (!this.maxChars || this.lineBuffer.length < this.maxChars) {
            this.lineBuffer += ch;
          }
        }
        if (this.bufferEl) this.bufferEl.textContent = this.lineBuffer;
        this.scrollToBottom();
      }
    };

    this.hiddenInput.addEventListener('paste', handlePaste);
    this.screenElement.addEventListener('paste', handlePaste);

    // Global keyboard fallback:
    // If the terminal is waiting for input and the user starts typing,
    // route keystrokes directly to the terminal unless typing in Monaco or a modal
    window.addEventListener('keydown', (e) => {
      if (!this.isWaitingInput || !this.inputCallback) return;

      const active = document.activeElement;
      if (active && (
        active.closest('.monaco-editor') ||
        active.closest('.modal-overlay:not(.hidden)') ||
        active.closest('.command-palette-overlay:not(.hidden)') ||
        (active.tagName === 'INPUT' && active !== this.hiddenInput) ||
        active.tagName === 'TEXTAREA' ||
        active.isContentEditable
      )) {
        return;
      }

      if (active !== this.hiddenInput && active !== this.screenElement) {
        this.focus();
        this.handleKeyDown(e);
      }
    });
  }

  focus() {
    if (this.hiddenInput) {
      this.hiddenInput.focus({ preventScroll: true });
    } else if (this.screenElement) {
      this.screenElement.focus({ preventScroll: true });
    }
  }

  handleKeyDown(e) {
    if (!this.isWaitingInput || !this.inputCallback) return;

    // Allow hotkeys to pass through
    if (e.key === 'F5' || e.key === 'F8' || e.key === 'F1' || ((e.ctrlKey || e.metaKey) && ['p', 'P', 's', 'S'].includes(e.key))) {
      return;
    }

    // Ignore modifier keys alone
    if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock'].includes(e.key)) {
      return;
    }

    if (!this.isWaitingLine) {
      // Single character input mode (INT 21H AH=01H / AH=07H / AH=08H)
      let char = null;
      if (e.key === 'Enter') {
        char = '\r';
      } else if (e.key === 'Backspace') {
        char = '\b';
      } else if (e.key === 'Tab') {
        char = '\t';
      } else if (e.key === 'Escape') {
        char = '\x1b';
      } else if (e.key.length === 1) {
        char = e.key;
      }

      if (char !== null) {
        e.preventDefault();
        e.stopPropagation();
        const cb = this.inputCallback;
        this.finishInput();
        if (cb) cb(char);
      }
    } else {
      // Buffered string input mode (INT 21H AH=0AH)
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        const line = this.lineBuffer;
        const cb = this.inputCallback;
        this.finishInput();
        if (cb) cb(line);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        e.stopPropagation();
        if (this.lineBuffer.length > 0) {
          this.lineBuffer = this.lineBuffer.slice(0, -1);
          if (this.bufferEl) this.bufferEl.textContent = this.lineBuffer;
          this.scrollToBottom();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.lineBuffer = '';
        if (this.bufferEl) this.bufferEl.textContent = '';
        this.scrollToBottom();
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        e.stopPropagation();
        if (!this.maxChars || this.lineBuffer.length < this.maxChars) {
          this.lineBuffer += e.key;
          if (this.bufferEl) this.bufferEl.textContent = this.lineBuffer;
          this.scrollToBottom();
        }
      }
    }
  }

  finishInput() {
    this.isWaitingInput = false;
    this.isWaitingLine = false;
    this.inputCallback = null;
    this.lineBuffer = '';
    if (this.bufferEl) this.bufferEl.textContent = '';
    if (this.cursorEl) this.cursorEl.classList.remove('waiting');
    if (this.panelElement) this.panelElement.classList.remove('is-waiting-input');

    if (this.statusDot) {
      this.statusDot.classList.remove('waiting');
      this.statusDot.title = 'Terminal Ready';
    }
  }

  clear() {
    if (this.textEl) this.textEl.textContent = '';
    if (this.bufferEl) this.bufferEl.textContent = '';
    this.lineBuffer = '';
    this.finishInput();
  }

  printChar(char) {
    if (!this.textEl) return;
    if (char === '\r') return;
    if (char === '\b') {
      this.textEl.textContent = this.textEl.textContent.slice(0, -1);
    } else {
      this.textEl.textContent += char;
    }
    this.scrollToBottom();
  }

  printString(str) {
    if (!this.textEl) return;
    const formatted = str.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    this.textEl.textContent += formatted;
    this.scrollToBottom();
  }

  scrollToBottom() {
    if (this.screenElement) {
      this.screenElement.scrollTop = this.screenElement.scrollHeight;
    }
  }

  prepareInlineInput() {
    if (!this.textEl) return;
    // If the terminal text ends with a newline right before input, trim trailing newlines
    this.textEl.textContent = this.textEl.textContent.replace(/[\r\n]+$/, '');
    
    // If it ends with ':', ensure there is a space right after the colon
    if (this.textEl.textContent.endsWith(':')) {
      this.textEl.textContent += ' ';
    }
  }

  requestSingleCharInput(callback) {
    this.prepareInlineInput();
    this.inputCallback = callback;
    this.isWaitingInput = true;
    this.isWaitingLine = false;
    this.lineBuffer = '';
    if (this.bufferEl) this.bufferEl.textContent = '';
    if (this.cursorEl) this.cursorEl.classList.add('waiting');
    if (this.panelElement) this.panelElement.classList.add('is-waiting-input');

    if (this.statusDot) {
      this.statusDot.classList.add('waiting');
      this.statusDot.title = 'Waiting for Character Input (type directly in terminal)';
    }

    this.focus();
    setTimeout(() => this.focus(), 20);
    this.scrollToBottom();
  }

  requestLineInput(callback, maxChars = 255) {
    this.prepareInlineInput();
    this.inputCallback = callback;
    this.isWaitingInput = true;
    this.isWaitingLine = true;
    this.maxChars = maxChars;
    this.lineBuffer = '';
    if (this.bufferEl) this.bufferEl.textContent = '';
    if (this.cursorEl) this.cursorEl.classList.add('waiting');
    if (this.panelElement) this.panelElement.classList.add('is-waiting-input');

    if (this.statusDot) {
      this.statusDot.classList.add('waiting');
      this.statusDot.title = 'Waiting for String Input (type directly in terminal and press Enter)';
    }

    this.focus();
    setTimeout(() => this.focus(), 20);
    this.scrollToBottom();
  }
}
