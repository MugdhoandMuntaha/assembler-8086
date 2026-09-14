/**
 * VS Code Style Command Palette Controller (Ctrl+Shift+P / F1)
 * 
 * Provides quick searching and 1-click execution for:
 * - Layout Presets (VS Code IDE, 3-Column, Bottom Terminal, Floating Mode, Maximize)
 * - Themes (Light, Cyber Dark, Amber Phosphor, Matrix Green)
 * - CPU Execution Speed (Max Speed, Fast, Normal, Medium, Step-by-Step)
 * - Core Execution Actions (Assemble, Run, Step, Pause, Reset)
 * - Cloud & Terminal Actions (Google Drive, GitHub, Clear Terminal)
 */

export class CommandPalette {
  constructor(options = {}) {
    this.options = options;
    this.isOpen = false;
    this.commands = [];
    this.filteredCommands = [];
    this.selectedIndex = 0;

    this.initDOM();
    this.initListeners();
  }

  initDOM() {
    this.modalEl = document.getElementById('command-palette-modal');
    if (!this.modalEl) {
      this.modalEl = document.createElement('div');
      this.modalEl.id = 'command-palette-modal';
      this.modalEl.className = 'command-palette-modal hidden';
      document.body.appendChild(this.modalEl);
    }

    this.modalEl.innerHTML = `
      <div class="command-palette-backdrop"></div>
      <div class="command-palette-box" role="dialog" aria-modal="true" aria-label="Command Palette">
        <div class="command-palette-search-row">
          <span class="command-palette-prompt">&gt;</span>
          <input 
            type="text" 
            id="command-palette-input" 
            class="command-palette-input mono" 
            placeholder="Type a command or search... (Layout, Theme, Speed, Run)"
            autocomplete="off" 
            autocorrect="off" 
            autocapitalize="off" 
            spellcheck="false" 
          />
          <span class="command-palette-esc-badge" title="Close (Escape)">ESC</span>
        </div>
        <div class="command-palette-body">
          <ul id="command-palette-list" class="command-palette-list" role="listbox"></ul>
          <div id="command-palette-empty" class="command-palette-empty hidden">
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
            <span>No matching commands found</span>
          </div>
        </div>
        <div class="command-palette-footer">
          <div class="palette-hint-group">
            <span class="palette-key">↑</span><span class="palette-key">↓</span><span>Navigate</span>
          </div>
          <div class="palette-hint-group">
            <span class="palette-key">↵ Enter</span><span>Select</span>
          </div>
          <div class="palette-hint-group">
            <span class="palette-key">ESC</span><span>Dismiss</span>
          </div>
        </div>
      </div>
    `;

    this.inputEl = this.modalEl.querySelector('#command-palette-input');
    this.listEl = this.modalEl.querySelector('#command-palette-list');
    this.emptyEl = this.modalEl.querySelector('#command-palette-empty');
    this.backdropEl = this.modalEl.querySelector('.command-palette-backdrop');
  }

  setCommands(commands) {
    this.commands = commands;
    this.filteredCommands = [...this.commands];
  }

  initListeners() {
    // Click backdrop to close
    if (this.backdropEl) {
      this.backdropEl.addEventListener('click', () => this.close());
    }

    // Input typing filter
    if (this.inputEl) {
      this.inputEl.addEventListener('input', () => {
        this.filter(this.inputEl.value);
      });

      this.inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.moveSelection(1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          this.moveSelection(-1);
        } else if (e.key === 'Enter') {
          e.preventDefault();
          this.executeSelected();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          this.close();
        } else if (e.key === 'PageDown') {
          e.preventDefault();
          this.moveSelection(5);
        } else if (e.key === 'PageUp') {
          e.preventDefault();
          this.moveSelection(-5);
        }
      });
    }

    // Global shortcut capture: Ctrl+Shift+P, Ctrl+P, Cmd+Shift+P, F1
    // Using { capture: true } to intercept in the capturing phase before browser print dialog can fire
    window.addEventListener(
      'keydown',
      (e) => {
        const isCmdOrCtrl = e.ctrlKey || e.metaKey;
        const isKeyP = e.code === 'KeyP' || e.key === 'p' || e.key === 'P';

        if (isCmdOrCtrl && isKeyP) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          this.toggle();
          return false;
        }

        if (e.key === 'F1') {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          this.toggle();
          return false;
        }
      },
      { capture: true }
    );
  }

  open(initialQuery = '') {
    this.isOpen = true;
    this.modalEl.classList.remove('hidden');
    if (this.inputEl) {
      this.inputEl.value = initialQuery;
      this.filter(initialQuery);
      setTimeout(() => {
        this.inputEl.focus();
        this.inputEl.select();
      }, 30);
    }
  }

  close() {
    this.isOpen = false;
    this.modalEl.classList.add('hidden');
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  filter(query) {
    const q = query.trim().toLowerCase();
    if (!q) {
      this.filteredCommands = [...this.commands];
    } else {
      this.filteredCommands = this.commands.filter(cmd => {
        const titleMatch = cmd.title.toLowerCase().includes(q);
        const catMatch = cmd.category.toLowerCase().includes(q);
        const tagMatch = cmd.keywords && cmd.keywords.some(k => k.toLowerCase().includes(q));
        return titleMatch || catMatch || tagMatch;
      });
    }

    this.selectedIndex = 0;
    this.renderList();
  }

  moveSelection(delta) {
    if (this.filteredCommands.length === 0) return;
    this.selectedIndex = (this.selectedIndex + delta + this.filteredCommands.length) % this.filteredCommands.length;
    this.updateActiveItem();
  }

  updateActiveItem() {
    const items = this.listEl.querySelectorAll('.command-palette-item');
    items.forEach((item, idx) => {
      if (idx === this.selectedIndex) {
        item.classList.add('selected');
        item.setAttribute('aria-selected', 'true');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('selected');
        item.setAttribute('aria-selected', 'false');
      }
    });
  }

  executeSelected() {
    if (this.filteredCommands.length === 0) return;
    const cmd = this.filteredCommands[this.selectedIndex];
    if (cmd && typeof cmd.action === 'function') {
      this.close();
      cmd.action();
    }
  }

  renderList() {
    if (!this.listEl) return;
    this.listEl.innerHTML = '';

    if (this.filteredCommands.length === 0) {
      this.emptyEl.classList.remove('hidden');
      return;
    }

    this.emptyEl.classList.add('hidden');

    this.filteredCommands.forEach((cmd, idx) => {
      const li = document.createElement('li');
      li.className = `command-palette-item ${idx === this.selectedIndex ? 'selected' : ''}`;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', idx === this.selectedIndex ? 'true' : 'false');

      const isActive = typeof cmd.isActive === 'function' ? cmd.isActive() : false;

      li.innerHTML = `
        <div class="cmd-item-left">
          <span class="cmd-item-icon">${cmd.icon || '⚡'}</span>
          <span class="cmd-item-category">${cmd.category}</span>
          <span class="cmd-item-title">${this.escapeHtml(cmd.title)}</span>
          ${isActive ? '<span class="cmd-item-active-check" title="Currently Active">✓</span>' : ''}
        </div>
        <div class="cmd-item-right">
          ${cmd.detail ? `<span class="cmd-item-detail">${this.escapeHtml(cmd.detail)}</span>` : ''}
          ${cmd.shortcut ? `<kbd class="cmd-item-shortcut">${cmd.shortcut}</kbd>` : ''}
        </div>
      `;

      li.addEventListener('mouseenter', () => {
        this.selectedIndex = idx;
        this.updateActiveItem();
      });

      li.addEventListener('click', () => {
        this.close();
        if (typeof cmd.action === 'function') {
          cmd.action();
        }
      });

      this.listEl.appendChild(li);
    });

    this.updateActiveItem();
  }

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
