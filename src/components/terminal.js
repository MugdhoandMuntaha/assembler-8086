/**
 * Interactive DOS Terminal Controller with Inline Keyboard Input & Blinking Cursor
 * Emulates true DOS hardware console behavior without a separate input box.
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

    // Initial welcome banner
    this.printString(`emu8086 Terminal [DOS INT 21H Emulation]\nRun (F5) or Step (F8) to execute. Keystrokes are captured directly inline at the cursor.\n-----------------------------------------------------------------------------------------\n`);
  }

  initListeners() {
    if (!this.screenElement || !this.hiddenInput) return;

    // Clicking anywhere in the terminal focuses the hidden input
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

    // Keyboard capture on hidden input
    this.hiddenInput.addEventListener('keydown', (e) => {
      this.handleKeyDown(e);
    });

    // Also support keyboard capture on screen element if focused directly
    this.screenElement.addEventListener('keydown', (e) => {
      if (document.activeElement !== this.hiddenInput) {
        this.handleKeyDown(e);
      }
    });

    // Keep hidden input clear of accumulated text
    this.hiddenInput.addEventListener('input', () => {
      this.hiddenInput.value = '';
    });
  }

  focus() {
    if (this.hiddenInput) {
      this.hiddenInput.focus({ preventScroll: true });
    }
  }

  handleKeyDown(e) {
    if (!this.isWaitingInput || !this.inputCallback) return;

    // Allow hotkeys to bubble (e.g. F5, F8, Alt, Ctrl, etc.)
    if (e.key === 'F5' || e.key === 'F8' || e.ctrlKey || e.altKey || e.metaKey) {
      return;
    }

    // Ignore standalone modifier keys
    if (['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'].includes(e.key)) {
      return;
    }

    if (!this.isWaitingLine) {
      // Single character input (INT 21H AH=01H / AH=07H / AH=08H)
      if (e.key.length === 1 || e.key === 'Enter') {
        e.preventDefault();
        const char = e.key === 'Enter' ? '\r' : e.key;
        const cb = this.inputCallback;
        this.finishInput();
        cb(char);
      }
    } else {
      // Buffered string input (INT 21H AH=0AH)
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
          this.scrollToBottom();
        }
      } else if (e.key.length === 1) {
        e.preventDefault();
        this.lineBuffer += e.key;
        if (this.bufferEl) this.bufferEl.textContent = this.lineBuffer;
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
  }

  clear() {
    if (this.textEl) this.textEl.textContent = '';
    if (this.bufferEl) this.bufferEl.textContent = '';
    this.lineBuffer = '';
    this.finishInput();
  }

  printChar(char) {
    if (!this.textEl) return;
    if (char === '\r') return; // Handled with \n
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

    this.focus();
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

    this.focus();
    this.scrollToBottom();
  }
}
