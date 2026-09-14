/**
 * Interactive VS Code Style DOS Terminal Controller
 * 
 * Features:
 * - Crisp, clean VS Code integrated terminal styling
 * - Minimal modern floating input popup widget for DOS INT 21H input interrupts (AH=01H, AH=0AH)
 * - Zero unnecessary clutter or verbose startup text
 * - Dual-input capture: sleek focused popup + direct inline terminal keyboard capture
 */

export class Terminal {
  constructor(screenElement) {
    this.screenElement = screenElement;
    this.panelElement = screenElement ? screenElement.closest('.panel') : null;
    this.inputCallback = null;
    this.isWaitingInput = false;
    this.isWaitingLine = false;
    this.lineBuffer = '';

    this.initDOM();
    this.initPopup();
    this.initListeners();
  }

  initDOM() {
    if (!this.screenElement) return;

    this.screenElement.tabIndex = 0;
    this.screenElement.setAttribute('role', 'textbox');
    this.screenElement.setAttribute('aria-label', 'Terminal Screen');

    this.screenElement.innerHTML = `
      <div class="terminal-content">
        <span class="terminal-text"></span><span class="terminal-inline-buffer"></span><span class="terminal-cursor blink"></span>
      </div>
      <input type="text" class="terminal-hidden-input" aria-hidden="true" tabindex="-1" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false">
    `;

    this.textEl = this.screenElement.querySelector('.terminal-text');
    this.bufferEl = this.screenElement.querySelector('.terminal-inline-buffer');
    this.cursorEl = this.screenElement.querySelector('.terminal-cursor');
    this.hiddenInput = this.screenElement.querySelector('.terminal-hidden-input');
    this.statusDot = document.getElementById('term-status-dot');

    // Start with a clean, empty screen like VS Code integrated terminal
    this.clear();
  }

  initPopup() {
    this.popupEl = document.getElementById('terminal-input-popup');
    if (!this.popupEl && this.panelElement) {
      this.popupEl = this.panelElement.querySelector('#terminal-input-popup');
    }

    if (this.popupEl) {
      this.popupInput = this.popupEl.querySelector('#terminal-popup-input');
      this.popupBadge = this.popupEl.querySelector('#popup-mode-badge');
      this.popupHint = this.popupEl.querySelector('#popup-hint-text');
      this.popupSubmit = this.popupEl.querySelector('#terminal-popup-submit');
    }
  }

  initListeners() {
    if (!this.screenElement || !this.hiddenInput) return;

    // Clicking terminal focuses input
    this.screenElement.addEventListener('pointerdown', () => {
      this.focus();
    });

    if (this.panelElement) {
      this.panelElement.addEventListener('pointerdown', (e) => {
        if (!e.target.closest('button') && !e.target.closest('.panel-header') && !e.target.closest('.terminal-input-popup')) {
          this.focus();
        }
      });
    }

    // Keyboard capture on hidden input for direct inline terminal typing
    this.hiddenInput.addEventListener('keydown', (e) => {
      this.handleKeyDown(e);
    });

    this.screenElement.addEventListener('keydown', (e) => {
      if (document.activeElement !== this.hiddenInput && document.activeElement !== this.popupInput) {
        this.handleKeyDown(e);
      }
    });

    this.hiddenInput.addEventListener('input', () => {
      this.hiddenInput.value = '';
    });

    // Setup input popup listeners
    if (this.popupInput) {
      this.popupInput.addEventListener('keydown', (e) => {
        if (!this.isWaitingInput || !this.inputCallback) return;

        if (e.key === 'F5' || e.key === 'F8' || e.ctrlKey || e.altKey || e.metaKey) {
          return;
        }

        if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'].includes(e.key)) {
          return;
        }

        if (!this.isWaitingLine) {
          // Single character input mode (INT 21H AH=01H / AH=07H / AH=08H)
          if (e.key.length === 1 || e.key === 'Enter') {
            e.preventDefault();
            const char = e.key === 'Enter' ? '\r' : e.key;
            const cb = this.inputCallback;
            this.finishInput();
            cb(char);
          }
        } else {
          // Buffered string input mode (INT 21H AH=0AH)
          if (e.key === 'Enter') {
            e.preventDefault();
            const line = this.popupInput.value;
            const cb = this.inputCallback;
            this.finishInput();
            cb(line);
          } else if (e.key === 'Escape') {
            e.preventDefault();
            const cb = this.inputCallback;
            this.finishInput();
            cb('');
          }
        }
      });
    }

    if (this.popupSubmit) {
      this.popupSubmit.addEventListener('click', () => {
        if (!this.isWaitingInput || !this.inputCallback) return;
        const cb = this.inputCallback;
        const val = this.popupInput ? this.popupInput.value : '';
        this.finishInput();
        if (!this.isWaitingLine) {
          cb(val ? val.charAt(0) : '\r');
        } else {
          cb(val);
        }
      });
    }
  }

  focus() {
    if (this.isWaitingInput && this.popupInput && !this.popupEl?.classList.contains('hidden')) {
      this.popupInput.focus();
    } else if (this.hiddenInput) {
      this.hiddenInput.focus({ preventScroll: true });
    }
  }

  handleKeyDown(e) {
    if (!this.isWaitingInput || !this.inputCallback) return;

    if (e.key === 'F5' || e.key === 'F8' || e.ctrlKey || e.altKey || e.metaKey) {
      return;
    }

    if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'].includes(e.key)) {
      return;
    }

    if (!this.isWaitingLine) {
      // Single character input
      if (e.key.length === 1 || e.key === 'Enter') {
        e.preventDefault();
        const char = e.key === 'Enter' ? '\r' : e.key;
        const cb = this.inputCallback;
        this.finishInput();
        cb(char);
      }
    } else {
      // Buffered line input
      if (e.key === 'Enter') {
        e.preventDefault();
        const line = this.lineBuffer;
        const cb = this.inputCallback;
        this.finishInput();
        cb(line);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        if (this.lineBuffer.length > 0) {
          this.lineBuffer = this.lineBuffer.slice(0, -1);
          if (this.bufferEl) this.bufferEl.textContent = this.lineBuffer;
          if (this.popupInput) this.popupInput.value = this.lineBuffer;
          this.scrollToBottom();
        }
      } else if (e.key.length === 1) {
        e.preventDefault();
        this.lineBuffer += e.key;
        if (this.bufferEl) this.bufferEl.textContent = this.lineBuffer;
        if (this.popupInput) this.popupInput.value = this.lineBuffer;
        this.scrollToBottom();
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

    if (this.popupEl) {
      this.popupEl.classList.add('hidden');
    }
    if (this.popupInput) {
      this.popupInput.value = '';
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

  requestSingleCharInput(callback) {
    this.inputCallback = callback;
    this.isWaitingInput = true;
    this.isWaitingLine = false;
    this.lineBuffer = '';
    if (this.bufferEl) this.bufferEl.textContent = '';
    if (this.cursorEl) this.cursorEl.classList.add('waiting');
    if (this.panelElement) this.panelElement.classList.add('is-waiting-input');

    if (this.statusDot) {
      this.statusDot.classList.add('waiting');
      this.statusDot.title = 'Waiting for Single Character Input';
    }

    // Show sleek minimal modern input popup
    if (!this.popupEl) this.initPopup();
    if (this.popupEl) {
      if (this.popupBadge) this.popupBadge.textContent = 'CHAR INPUT (INT 21H, AH=01H)';
      if (this.popupHint) this.popupHint.textContent = 'Press any key or character to send';
      if (this.popupInput) {
        this.popupInput.value = '';
        this.popupInput.placeholder = 'Press any key...';
      }
      this.popupEl.classList.remove('hidden');
      setTimeout(() => {
        if (this.popupInput) {
          this.popupInput.focus();
        }
      }, 50);
    } else {
      this.focus();
    }

    this.scrollToBottom();
  }

  requestLineInput(callback) {
    this.inputCallback = callback;
    this.isWaitingInput = true;
    this.isWaitingLine = true;
    this.lineBuffer = '';
    if (this.bufferEl) this.bufferEl.textContent = '';
    if (this.cursorEl) this.cursorEl.classList.add('waiting');
    if (this.panelElement) this.panelElement.classList.add('is-waiting-input');

    if (this.statusDot) {
      this.statusDot.classList.add('waiting');
      this.statusDot.title = 'Waiting for Buffered String Input';
    }

    // Show sleek minimal modern input popup
    if (!this.popupEl) this.initPopup();
    if (this.popupEl) {
      if (this.popupBadge) this.popupBadge.textContent = 'STRING INPUT (INT 21H, AH=0AH)';
      if (this.popupHint) this.popupHint.textContent = 'Type input string and press Enter';
      if (this.popupInput) {
        this.popupInput.value = '';
        this.popupInput.placeholder = 'Type input and press Enter...';
      }
      this.popupEl.classList.remove('hidden');
      setTimeout(() => {
        if (this.popupInput) {
          this.popupInput.focus();
        }
      }, 50);
    } else {
      this.focus();
    }

    this.scrollToBottom();
  }
}
