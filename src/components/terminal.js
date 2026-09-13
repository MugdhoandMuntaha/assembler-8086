/**
 * Interactive DOS Terminal Controller
 */

export class Terminal {
  constructor(screenElement, inputElement) {
    this.screenElement = screenElement;
    this.inputElement = inputElement;
    this.inputCallback = null;
    this.isWaitingLine = false;

    this.initListeners();
  }

  initListeners() {
    if (!this.inputElement) return;

    this.inputElement.addEventListener('keydown', (e) => {
      if (!this.inputCallback) return;

      if (this.isWaitingLine) {
        if (e.key === 'Enter') {
          e.preventDefault();
          const val = this.inputElement.value;
          this.inputElement.value = '';
          const cb = this.inputCallback;
          this.inputCallback = null;
          this.isWaitingLine = false;
          this.inputElement.disabled = true;
          this.inputElement.placeholder = 'Terminal output area...';
          cb(val);
        }
      } else {
        // Single char input
        if (e.key.length === 1 || e.key === 'Enter') {
          e.preventDefault();
          const char = e.key === 'Enter' ? '\r' : e.key;
          this.inputElement.value = '';
          const cb = this.inputCallback;
          this.inputCallback = null;
          this.inputElement.disabled = true;
          this.inputElement.placeholder = 'Terminal output area...';
          cb(char);
        }
      }
    });
  }

  clear() {
    if (this.screenElement) {
      this.screenElement.textContent = '';
    }
  }

  printChar(char) {
    if (!this.screenElement) return;
    this.screenElement.textContent += char;
    this.scrollToBottom();
  }

  printString(str) {
    if (!this.screenElement) return;
    this.screenElement.textContent += str;
    this.scrollToBottom();
  }

  scrollToBottom() {
    if (this.screenElement) {
      this.screenElement.scrollTop = this.screenElement.scrollHeight;
    }
  }

  requestSingleCharInput(callback) {
    this.inputCallback = callback;
    this.isWaitingLine = false;
    if (this.inputElement) {
      this.inputElement.disabled = false;
      this.inputElement.placeholder = 'Type single key input for INT 21H (AH=01H)...';
      this.inputElement.focus();
    }
  }

  requestLineInput(callback) {
    this.inputCallback = callback;
    this.isWaitingLine = true;
    if (this.inputElement) {
      this.inputElement.disabled = false;
      this.inputElement.placeholder = 'Type line input & press Enter for INT 21H (AH=0AH)...';
      this.inputElement.focus();
    }
  }
}
