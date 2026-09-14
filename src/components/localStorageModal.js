/**
 * Local Storage Code Manager for emu8086
 * Enables saving, loading, organizing, and backing up 8086 Assembly programs
 * directly in the browser's localStorage without requiring external accounts or networks.
 */

const STORAGE_KEY_PROGRAMS = 'emu8086_saved_programs';
const STORAGE_KEY_ACTIVE_NAME = 'emu8086_active_filename';
const STORAGE_KEY_ACTIVE_ID = 'emu8086_active_prog_id';
const STORAGE_KEY_DRAFT_CODE = 'emu8086_draft_code';
const STORAGE_KEY_AUTOSAVE = 'emu8086_autosave_enabled';

export class LocalStorageModal {
  constructor(getCodeCallback, setCodeCallback, onFileChangeCallback) {
    this.getCode = getCodeCallback;
    this.setCode = setCodeCallback;
    this.onFileChange = onFileChangeCallback || (() => {});

    this.modalEl = null;
    this.isOpen = false;
    this.activeTab = 'save';
    this.searchQuery = '';
    this.pendingDeleteId = null;
    this.statusTimer = null;
    this.autosaveTimer = null;

    this.activeFilename = localStorage.getItem(STORAGE_KEY_ACTIVE_NAME) || 'program.asm';
    this.activeProgId = localStorage.getItem(STORAGE_KEY_ACTIVE_ID) || null;

    this.initDOM();
    this.initListeners();
    this.updateStorageStats();
  }

  // --- Data Access Helpers ---

  getSavedPrograms() {
    try {
      const data = localStorage.getItem(STORAGE_KEY_PROGRAMS);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      console.error('Failed to parse saved programs from localStorage:', e);
      return [];
    }
  }

  saveProgramsToStorage(programs) {
    try {
      localStorage.setItem(STORAGE_KEY_PROGRAMS, JSON.stringify(programs));
      this.updateStorageStats();
      return true;
    } catch (e) {
      console.error('Failed to save programs to localStorage:', e);
      return false;
    }
  }

  isAutosaveEnabled() {
    const val = localStorage.getItem(STORAGE_KEY_AUTOSAVE);
    return val === null ? true : val === 'true';
  }

  setAutosaveEnabled(enabled) {
    localStorage.setItem(STORAGE_KEY_AUTOSAVE, enabled ? 'true' : 'false');
  }

  getDraftCode() {
    return localStorage.getItem(STORAGE_KEY_DRAFT_CODE);
  }

  setDraftCode(code) {
    try {
      localStorage.setItem(STORAGE_KEY_DRAFT_CODE, code);
    } catch (e) {
      console.warn('Draft auto-save failed (storage quota full?):', e);
    }
  }

  // --- DOM Construction ---

  initDOM() {
    const backdrop = document.createElement('div');
    backdrop.id = 'storage-modal-backdrop';
    backdrop.className = 'modal-backdrop hidden';
    backdrop.innerHTML = `
      <div class="storage-modal-dialog">
        <!-- Modal Header -->
        <div class="storage-modal-header">
          <div class="storage-header-title">
            <div class="storage-brand-icon">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
                <polyline points="17 21 17 13 7 13 7 21"/>
                <polyline points="7 3 7 8 15 8"/>
              </svg>
            </div>
            <div class="storage-title-text">
              <span class="main-title">Local Storage Code Manager</span>
              <span class="sub-title">Offline browser storage • Save, load & manage programs</span>
            </div>
          </div>
          <button id="storage-btn-close" class="storage-close-btn" title="Close modal (Esc)">×</button>
        </div>

        <!-- Quick Metrics Bar -->
        <div class="storage-metrics-bar">
          <div class="storage-metric-left">
            <span class="storage-active-badge" id="storage-current-file-badge">
              <span class="storage-dot"></span>
              <span id="storage-badge-filename">Active: ${this.escapeHtml(this.activeFilename)}</span>
            </span>
          </div>
          <div class="storage-metric-right">
            <span id="storage-summary-count" class="storage-stat-pill">0 programs</span>
            <span id="storage-summary-bytes" class="storage-stat-pill">0 KB used</span>
            <span id="storage-autosave-indicator" class="storage-stat-pill autosave-badge">Autosave: ON</span>
          </div>
        </div>

        <!-- Tabs Navigation -->
        <div class="storage-tabs" role="tablist">
          <button class="storage-tab active" data-tab="save">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            <span>Save Code</span>
          </button>
          <button class="storage-tab" data-tab="library">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
            <span>Saved Programs (<span id="storage-tab-count">0</span>)</span>
          </button>
          <button class="storage-tab" data-tab="backup">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
            <span>Backup & Settings</span>
          </button>
        </div>

        <!-- Tab Body -->
        <div class="storage-modal-body">
          <!-- TAB 1: SAVE CURRENT PROGRAM -->
          <div class="storage-tab-content active" id="storage-pane-save">
            <p class="storage-hint">Save the active 8086 Assembly source code from the editor into your browser's persistent storage.</p>

            <div class="storage-field">
              <label for="storage-filename-input">Program File Name</label>
              <div class="storage-input-group">
                <input type="text" id="storage-filename-input" class="storage-input mono" value="${this.escapeHtml(this.activeFilename)}" placeholder="my_program.asm" />
                <button type="button" id="storage-btn-timestamp" class="storage-pill-btn" title="Add timestamp to name">+ Timestamp</button>
              </div>
              <div class="storage-name-presets">
                <span class="preset-label">Suggestions:</span>
                <button type="button" class="storage-preset-tag" data-name="program.asm">program.asm</button>
                <button type="button" class="storage-preset-tag" data-name="hello_world.asm">hello_world.asm</button>
                <button type="button" class="storage-preset-tag" data-name="loop_counter.asm">loop_counter.asm</button>
                <button type="button" class="storage-preset-tag" data-name="input_calc.asm">input_calc.asm</button>
              </div>
            </div>

            <div class="storage-field">
              <label for="storage-desc-input">Description / Notes <span class="storage-sub">(Optional)</span></label>
              <input type="text" id="storage-desc-input" class="storage-input" placeholder="e.g. Assignment 2, String reversal using INT 21H" />
            </div>

            <div class="storage-code-metrics" id="storage-save-metrics">
              <span id="storage-metric-lines">0 lines</span>
              <span class="metric-dot">•</span>
              <span id="storage-metric-chars">0 characters</span>
              <span class="metric-dot">•</span>
              <span id="storage-metric-bytes">0 bytes</span>
            </div>

            <div class="storage-field-row" id="storage-overwrite-row">
              <label class="storage-checkbox-label">
                <input type="checkbox" id="storage-chk-overwrite" checked />
                <span>Overwrite if a program with this name already exists in Local Storage</span>
              </label>
            </div>

            <!-- Actions Bar -->
            <div class="storage-actions-bar">
              <button id="storage-btn-save-now" class="btn btn-primary storage-save-btn">
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
                <span>Save to Local Storage</span>
              </button>

              <button id="storage-btn-export-file" class="btn btn-secondary" title="Download directly to your computer as .asm file">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span>Export .ASM</span>
              </button>
            </div>

            <div id="storage-save-status" class="storage-status-banner hidden"></div>
          </div>

          <!-- TAB 2: SAVED PROGRAMS LIBRARY -->
          <div class="storage-tab-content" id="storage-pane-library">
            <div class="storage-library-header">
              <div class="storage-search-box">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input type="text" id="storage-search-input" class="storage-search-input" placeholder="Search saved programs by name or notes..." />
                <button type="button" id="storage-search-clear" class="storage-clear-btn hidden" title="Clear search">×</button>
              </div>
              <div class="storage-library-actions">
                <button type="button" id="storage-btn-new-save" class="btn btn-xs btn-primary">+ Save Current</button>
              </div>
            </div>

            <div id="storage-library-list" class="storage-library-list">
              <!-- Dynamically populated -->
            </div>
          </div>

          <!-- TAB 3: BACKUP & SETTINGS -->
          <div class="storage-tab-content" id="storage-pane-backup">
            <div class="storage-settings-section">
              <h4 class="settings-title">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                Editor Autosave
              </h4>
              <p class="storage-hint">When enabled, your active code changes in the editor are automatically cached to local storage so your work is never lost if you refresh or close the tab.</p>
              
              <label class="storage-toggle-label">
                <input type="checkbox" id="storage-toggle-autosave" ${this.isAutosaveEnabled() ? 'checked' : ''} />
                <span class="toggle-track"><span class="toggle-thumb"></span></span>
                <span class="toggle-text">Enable automatic background draft saving</span>
              </label>
            </div>

            <div class="storage-settings-section">
              <h4 class="settings-title">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Backup All Saved Programs (JSON)
              </h4>
              <p class="storage-hint">Export your entire library of assembly programs into a portable JSON backup file, or restore from an existing backup.</p>

              <div class="storage-backup-btn-group">
                <button type="button" id="storage-btn-export-json" class="btn btn-secondary">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  <span>Export All to JSON</span>
                </button>

                <label class="btn btn-secondary storage-file-label" id="storage-btn-import-json-label">
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                  <span>Restore from JSON</span>
                  <input type="file" id="storage-input-import-json" accept=".json,application/json" class="hidden-file-input" />
                </label>
              </div>
            </div>

            <div class="storage-settings-section danger-zone">
              <h4 class="settings-title text-danger">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Clear All Saved Programs
              </h4>
              <p class="storage-hint text-danger">Permanently delete all assembly programs stored in this browser's local storage. This action cannot be undone unless you exported a JSON backup.</p>

              <button type="button" id="storage-btn-clear-all" class="btn btn-danger btn-xs">
                Clear All Saved Codes
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    this.modalEl = backdrop;
  }

  // --- Listeners & Handlers ---

  initListeners() {
    if (!this.modalEl) return;

    // Close on backdrop click
    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) this.close();
    });

    // Close button
    const btnClose = this.modalEl.querySelector('#storage-btn-close');
    if (btnClose) {
      btnClose.addEventListener('click', () => this.close());
    }

    // Escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    // Tab switching
    const tabs = this.modalEl.querySelectorAll('.storage-tab');
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab;
        this.switchTab(target);
      });
    });

    // Filename input changes
    const filenameInput = this.modalEl.querySelector('#storage-filename-input');
    if (filenameInput) {
      filenameInput.addEventListener('input', () => {
        this.checkOverwriteState();
      });
    }

    // Timestamp button
    const btnTimestamp = this.modalEl.querySelector('#storage-btn-timestamp');
    if (btnTimestamp && filenameInput) {
      btnTimestamp.addEventListener('click', () => {
        const now = new Date();
        const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
        const base = filenameInput.value.replace(/\.asm$/i, '').replace(/_\d{8}_\d{4}$/, '') || 'program';
        filenameInput.value = `${base}_${dateStr}.asm`;
        this.checkOverwriteState();
      });
    }

    // Preset suggestion pills
    const presetTags = this.modalEl.querySelectorAll('.storage-preset-tag');
    presetTags.forEach((btn) => {
      btn.addEventListener('click', () => {
        if (filenameInput) {
          filenameInput.value = btn.dataset.name;
          this.checkOverwriteState();
        }
      });
    });

    // Save button
    const btnSaveNow = this.modalEl.querySelector('#storage-btn-save-now');
    if (btnSaveNow) {
      btnSaveNow.addEventListener('click', () => this.handleSaveAction());
    }

    // Export .asm button
    const btnExport = this.modalEl.querySelector('#storage-btn-export-file');
    if (btnExport) {
      btnExport.addEventListener('click', () => {
        const name = filenameInput?.value.trim() || this.activeFilename;
        const code = this.getCode();
        this.downloadAsmFile(name, code);
      });
    }

    // Library search input
    const searchInput = this.modalEl.querySelector('#storage-search-input');
    const searchClear = this.modalEl.querySelector('#storage-search-clear');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        if (searchClear) {
          searchClear.classList.toggle('hidden', this.searchQuery.length === 0);
        }
        this.renderLibrary();
      });
    }

    if (searchClear && searchInput) {
      searchClear.addEventListener('click', () => {
        searchInput.value = '';
        this.searchQuery = '';
        searchClear.classList.add('hidden');
        this.renderLibrary();
        searchInput.focus();
      });
    }

    // Switch to save tab from library
    const btnNewSave = this.modalEl.querySelector('#storage-btn-new-save');
    if (btnNewSave) {
      btnNewSave.addEventListener('click', () => this.switchTab('save'));
    }

    // Autosave toggle
    const toggleAutosave = this.modalEl.querySelector('#storage-toggle-autosave');
    if (toggleAutosave) {
      toggleAutosave.addEventListener('change', (e) => {
        this.setAutosaveEnabled(e.target.checked);
        this.updateStorageStats();
      });
    }

    // Export JSON
    const btnExportJSON = this.modalEl.querySelector('#storage-btn-export-json');
    if (btnExportJSON) {
      btnExportJSON.addEventListener('click', () => this.exportAllJSON());
    }

    // Import JSON
    const inputImportJSON = this.modalEl.querySelector('#storage-input-import-json');
    if (inputImportJSON) {
      inputImportJSON.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (file) {
          this.importFromJSON(file);
          inputImportJSON.value = '';
        }
      });
    }

    // Clear All
    const btnClearAll = this.modalEl.querySelector('#storage-btn-clear-all');
    if (btnClearAll) {
      btnClearAll.addEventListener('click', () => {
        if (confirm('Are you sure you want to delete ALL saved programs from Local Storage? This cannot be undone.')) {
          this.saveProgramsToStorage([]);
          this.renderLibrary();
          this.showStatus('All saved programs have been cleared from Local Storage.', 'info');
        }
      });
    }
  }

  // --- Modal Open & Tab Switching ---

  open(initialTab = 'save') {
    if (!this.modalEl) return;
    this.isOpen = true;
    this.modalEl.classList.remove('hidden');

    this.updateCodeMetrics();
    this.updateStorageStats();
    this.renderLibrary();

    const filenameInput = this.modalEl.querySelector('#storage-filename-input');
    if (filenameInput) {
      filenameInput.value = this.activeFilename;
      this.checkOverwriteState();
    }

    this.switchTab(initialTab);
  }

  close() {
    if (!this.modalEl) return;
    this.isOpen = false;
    this.modalEl.classList.add('hidden');
    this.hideStatus();
  }

  switchTab(tabKey) {
    this.activeTab = tabKey;
    if (!this.modalEl) return;

    this.modalEl.querySelectorAll('.storage-tab').forEach((t) => {
      t.classList.toggle('active', t.dataset.tab === tabKey);
    });

    this.modalEl.querySelectorAll('.storage-tab-content').forEach((c) => {
      c.classList.remove('active');
    });

    const targetPane = this.modalEl.querySelector(`#storage-pane-${tabKey}`);
    if (targetPane) {
      targetPane.classList.add('active');
    }

    if (tabKey === 'library') {
      this.renderLibrary();
      const searchInput = this.modalEl.querySelector('#storage-search-input');
      if (searchInput) searchInput.focus();
    } else if (tabKey === 'save') {
      this.updateCodeMetrics();
      const filenameInput = this.modalEl.querySelector('#storage-filename-input');
      if (filenameInput) filenameInput.focus();
    }
  }

  // --- Save Operations ---

  handleSaveAction() {
    const filenameInput = this.modalEl.querySelector('#storage-filename-input');
    const descInput = this.modalEl.querySelector('#storage-desc-input');
    const chkOverwrite = this.modalEl.querySelector('#storage-chk-overwrite');

    let filename = filenameInput ? filenameInput.value.trim() : '';
    if (!filename) {
      filename = 'program.asm';
    }
    if (!filename.toLowerCase().endsWith('.asm')) {
      filename += '.asm';
      if (filenameInput) filenameInput.value = filename;
    }

    const desc = descInput ? descInput.value.trim() : '';
    const code = this.getCode();
    const overwrite = chkOverwrite ? chkOverwrite.checked : true;

    const result = this.saveProgram(filename, code, desc, overwrite);
    if (result.success) {
      this.showStatus(result.message, 'success');
      this.renderLibrary();
      this.updateStorageStats();
      setTimeout(() => {
        if (this.isOpen && this.activeTab === 'save') {
          this.switchTab('library');
        }
      }, 900);
    } else {
      this.showStatus(result.message, 'warning');
    }
  }

  saveProgram(filename, code, desc = '', allowOverwrite = true) {
    if (!filename) filename = 'program.asm';
    if (!code) code = '';

    const programs = this.getSavedPrograms();
    const existingIndex = programs.findIndex((p) => p.name.toLowerCase() === filename.toLowerCase());

    const now = Date.now();
    const lines = code.split('\n').length;
    const size = new Blob([code]).size;

    if (existingIndex >= 0) {
      if (!allowOverwrite) {
        return {
          success: false,
          message: `A file named "${filename}" already exists. Check the overwrite option or choose another name.`
        };
      }

      // Update existing
      programs[existingIndex].code = code;
      programs[existingIndex].desc = desc || programs[existingIndex].desc || '';
      programs[existingIndex].updatedAt = now;
      programs[existingIndex].lines = lines;
      programs[existingIndex].size = size;

      this.saveProgramsToStorage(programs);
      this.setActiveFile(filename, programs[existingIndex].id);

      return {
        success: true,
        message: `Updated "${filename}" in Local Storage (${lines} lines, ${this.formatBytes(size)})`
      };
    } else {
      // Create new
      const newProgram = {
        id: 'prog_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        name: filename,
        code: code,
        desc: desc,
        createdAt: now,
        updatedAt: now,
        lines: lines,
        size: size
      };

      programs.unshift(newProgram);
      this.saveProgramsToStorage(programs);
      this.setActiveFile(filename, newProgram.id);

      return {
        success: true,
        message: `Saved "${filename}" to Local Storage (${lines} lines, ${this.formatBytes(size)})`
      };
    }
  }

  quickSave() {
    const code = this.getCode();
    const filename = this.activeFilename || 'program.asm';
    const result = this.saveProgram(filename, code, '', true);

    if (result.success) {
      this.showFloatingToast(`💾 Saved "${filename}" to Local Storage!`);
      const indicator = document.getElementById('editor-save-indicator');
      if (indicator) {
        indicator.textContent = '✓ Saved locally';
        indicator.className = 'editor-save-indicator saved';
        setTimeout(() => {
          indicator.textContent = '• Saved';
        }, 2000);
      }
    } else {
      this.open('save');
    }
    return result;
  }

  loadProgram(progId) {
    const programs = this.getSavedPrograms();
    const prog = programs.find((p) => p.id === progId);
    if (!prog) {
      this.showStatus('Program not found in storage.', 'error');
      return;
    }

    this.setCode(prog.code);
    this.setActiveFile(prog.name, prog.id);
    this.showFloatingToast(`📂 Loaded "${prog.name}" into Editor`);
    this.close();
  }

  deleteProgram(progId) {
    let programs = this.getSavedPrograms();
    const prog = programs.find((p) => p.id === progId);
    const name = prog ? prog.name : 'program';

    programs = programs.filter((p) => p.id !== progId);
    this.saveProgramsToStorage(programs);

    if (this.activeProgId === progId) {
      this.activeProgId = null;
      localStorage.removeItem(STORAGE_KEY_ACTIVE_ID);
    }

    this.renderLibrary();
    this.updateStorageStats();
    this.showFloatingToast(`Deleted "${name}" from Local Storage`);
  }

  setActiveFile(filename, progId = null) {
    this.activeFilename = filename;
    this.activeProgId = progId;
    localStorage.setItem(STORAGE_KEY_ACTIVE_NAME, filename);
    if (progId) {
      localStorage.setItem(STORAGE_KEY_ACTIVE_ID, progId);
    }

    const badgeEl = this.modalEl?.querySelector('#storage-badge-filename');
    if (badgeEl) badgeEl.textContent = `Active: ${filename}`;

    const editorTitle = document.getElementById('editor-file-title');
    if (editorTitle) editorTitle.textContent = filename;

    this.onFileChange(filename);
  }

  checkOverwriteState() {
    const filenameInput = this.modalEl?.querySelector('#storage-filename-input');
    const overwriteRow = this.modalEl?.querySelector('#storage-overwrite-row');
    if (!filenameInput || !overwriteRow) return;

    let val = filenameInput.value.trim().toLowerCase();
    if (!val.endsWith('.asm')) val += '.asm';

    const programs = this.getSavedPrograms();
    const exists = programs.some((p) => p.name.toLowerCase() === val);

    overwriteRow.classList.toggle('exists-warning', exists);
  }

  // --- Autosave Engine ---

  setupAutosave(editor) {
    if (!editor) return;

    editor.onDidChangeModelContent(() => {
      const indicator = document.getElementById('editor-save-indicator');
      if (indicator) {
        indicator.textContent = '• Editing...';
        indicator.className = 'editor-save-indicator modified';
      }

      if (!this.isAutosaveEnabled()) return;

      if (this.autosaveTimer) clearTimeout(this.autosaveTimer);
      this.autosaveTimer = setTimeout(() => {
        const code = editor.getValue();
        this.setDraftCode(code);
        if (indicator) {
          indicator.textContent = '• Auto-saved';
          indicator.className = 'editor-save-indicator autosaved';
        }
      }, 1000);
    });
  }

  // --- Rendering Library ---

  renderLibrary() {
    const listEl = this.modalEl?.querySelector('#storage-library-list');
    const tabCount = this.modalEl?.querySelector('#storage-tab-count');
    if (!listEl) return;

    let programs = this.getSavedPrograms();
    if (tabCount) tabCount.textContent = programs.length;

    if (this.searchQuery) {
      programs = programs.filter(
        (p) =>
          p.name.toLowerCase().includes(this.searchQuery) ||
          (p.desc && p.desc.toLowerCase().includes(this.searchQuery)) ||
          p.code.toLowerCase().includes(this.searchQuery)
      );
    }

    if (programs.length === 0) {
      if (this.searchQuery) {
        listEl.innerHTML = `
          <div class="storage-empty-state">
            <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <p class="empty-title">No matching programs found</p>
            <p class="empty-sub">Try searching with a different keyword</p>
          </div>
        `;
      } else {
        listEl.innerHTML = `
          <div class="storage-empty-state">
            <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
            <p class="empty-title">No saved programs in Local Storage yet</p>
            <p class="empty-sub">Save your active code or load a pre-built starter template to get started</p>
            <div class="empty-actions">
              <button type="button" class="btn btn-primary btn-xs" id="storage-empty-btn-save">💾 Save Current Code</button>
              <button type="button" class="btn btn-secondary btn-xs" id="storage-empty-btn-sample">⚡ Load Starter Templates</button>
            </div>
          </div>
        `;

        const btnSave = listEl.querySelector('#storage-empty-btn-save');
        if (btnSave) btnSave.addEventListener('click', () => this.switchTab('save'));

        const btnSample = listEl.querySelector('#storage-empty-btn-sample');
        if (btnSample) btnSample.addEventListener('click', () => this.seedSampleTemplates());
      }
      return;
    }

    listEl.innerHTML = programs
      .map((p) => {
        const isActive = p.id === this.activeProgId || p.name === this.activeFilename;
        const formattedDate = this.formatDate(p.updatedAt || p.createdAt || Date.now());
        const sizeStr = this.formatBytes(p.size || new Blob([p.code]).size);
        const linesStr = `${p.lines || p.code.split('\n').length} lines`;

        return `
        <div class="storage-card ${isActive ? 'active-program' : ''}" data-id="${p.id}">
          <div class="storage-card-main">
            <div class="storage-card-icon">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
              </svg>
            </div>
            <div class="storage-card-details">
              <div class="card-title-row">
                <span class="storage-card-name" title="${this.escapeHtml(p.name)}">${this.escapeHtml(p.name)}</span>
                ${isActive ? '<span class="storage-active-tag">Active in Editor</span>' : ''}
              </div>
              ${p.desc ? `<div class="storage-card-desc">${this.escapeHtml(p.desc)}</div>` : ''}
              <div class="storage-card-meta">
                <span>${formattedDate}</span>
                <span class="meta-dot">•</span>
                <span>${linesStr}</span>
                <span class="meta-dot">•</span>
                <span>${sizeStr}</span>
              </div>
            </div>
          </div>

          <div class="storage-card-actions">
            <button type="button" class="btn btn-xs btn-primary card-btn-load" data-id="${p.id}" title="Load this code into Monaco editor">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><polygon points="6 4 19 12 6 20 6 4"/></svg>
              <span>Load</span>
            </button>
            <button type="button" class="btn btn-xs btn-secondary card-btn-download" data-id="${p.id}" title="Download as .asm file">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            </button>
            <button type="button" class="btn btn-xs btn-danger card-btn-delete" data-id="${p.id}" title="Delete program from local storage">
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
      `;
      })
      .join('');

    // Attach card event listeners
    listEl.querySelectorAll('.card-btn-load').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.loadProgram(btn.dataset.id);
      });
    });

    listEl.querySelectorAll('.card-btn-download').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const p = programs.find((item) => item.id === btn.dataset.id);
        if (p) this.downloadAsmFile(p.name, p.code);
      });
    });

    listEl.querySelectorAll('.card-btn-delete').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = btn.dataset.id;
        if (this.pendingDeleteId === id) {
          this.deleteProgram(id);
          this.pendingDeleteId = null;
        } else {
          this.pendingDeleteId = id;
          btn.innerHTML = '<span>Confirm?</span>';
          btn.classList.add('confirming');
          setTimeout(() => {
            if (this.pendingDeleteId === id) {
              this.pendingDeleteId = null;
              btn.innerHTML = `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
              btn.classList.remove('confirming');
            }
          }, 3000);
        }
      });
    });

    // Clicking card itself loads it
    listEl.querySelectorAll('.storage-card').forEach((card) => {
      card.addEventListener('click', () => {
        this.loadProgram(card.dataset.id);
      });
    });
  }

  // --- Sample Templates Seeder ---

  seedSampleTemplates() {
    const samples = [
      {
        name: 'hello_world.asm',
        desc: 'Prints Hello World to the DOS terminal using INT 21H AH=09H',
        code: `.MODEL SMALL
.STACK 100H
.DATA
    msg DB 'Hello, World! Welcome to emu8086.$'
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX

    LEA DX, msg
    MOV AH, 09H
    INT 21H

    MOV AH, 4CH
    INT 21H
ENDP MAIN
END MAIN`
      },
      {
        name: 'user_input_echo.asm',
        desc: 'Prompts for a character input and prints it back',
        code: `.MODEL SMALL
.STACK 100H
.DATA
    prompt DB 'Enter a single key: $'
    reply  DB 13, 10, 'You entered: $'
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX

    LEA DX, prompt
    MOV AH, 09H
    INT 21H

    ; Read character from keyboard
    MOV AH, 01H
    INT 21H
    MOV BL, AL

    ; Echo back
    LEA DX, reply
    MOV AH, 09H
    INT 21H

    MOV DL, BL
    MOV AH, 02H
    INT 21H

    MOV AH, 4CH
    INT 21H
ENDP MAIN
END MAIN`
      },
      {
        name: 'loop_counter.asm',
        desc: 'Counts from 0 to 9 in a loop and prints each digit',
        code: `.MODEL SMALL
.STACK 100H
.DATA
    msg DB 'Counting 0 to 9: $'
.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX

    LEA DX, msg
    MOV AH, 09H
    INT 21H

    MOV CX, 10
    MOV DL, '0'

PRINT_LOOP:
    MOV AH, 02H
    INT 21H
    INC DL
    LOOP PRINT_LOOP

    MOV AH, 4CH
    INT 21H
ENDP MAIN
END MAIN`
      }
    ];

    const programs = this.getSavedPrograms();
    const now = Date.now();

    samples.forEach((sample) => {
      if (!programs.some((p) => p.name.toLowerCase() === sample.name.toLowerCase())) {
        programs.push({
          id: 'prog_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          name: sample.name,
          code: sample.code,
          desc: sample.desc,
          createdAt: now,
          updatedAt: now,
          lines: sample.code.split('\n').length,
          size: new Blob([sample.code]).size
        });
      }
    });

    this.saveProgramsToStorage(programs);
    this.renderLibrary();
    this.updateStorageStats();
    this.showStatus('Starter templates added to Local Storage!', 'success');
  }

  // --- Backup & Restore JSON ---

  exportAllJSON() {
    const programs = this.getSavedPrograms();
    if (programs.length === 0) {
      alert('No programs to export. Save some code first!');
      return;
    }

    const payload = {
      app: 'emu8086',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      programCount: programs.length,
      programs: programs
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `emu8086_programs_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showStatus(`Exported ${programs.length} programs to JSON backup file.`, 'success');
  }

  importFromJSON(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result);
        const imported = Array.isArray(data) ? data : data.programs;

        if (!Array.isArray(imported)) {
          throw new Error('Invalid JSON format: expected an array of programs.');
        }

        const existing = this.getSavedPrograms();
        let addedCount = 0;
        let updatedCount = 0;

        imported.forEach((prog) => {
          if (!prog.name || !prog.code) return;
          const idx = existing.findIndex((p) => p.name.toLowerCase() === prog.name.toLowerCase());
          if (idx >= 0) {
            existing[idx] = { ...existing[idx], ...prog, updatedAt: Date.now() };
            updatedCount++;
          } else {
            existing.unshift({
              id: prog.id || 'prog_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
              name: prog.name,
              code: prog.code,
              desc: prog.desc || '',
              createdAt: prog.createdAt || Date.now(),
              updatedAt: Date.now(),
              lines: prog.code.split('\n').length,
              size: new Blob([prog.code]).size
            });
            addedCount++;
          }
        });

        this.saveProgramsToStorage(existing);
        this.renderLibrary();
        this.updateStorageStats();
        this.showStatus(`Imported successfully! (${addedCount} added, ${updatedCount} updated)`, 'success');
      } catch (err) {
        this.showStatus(`Import failed: ${err.message}`, 'error');
      }
    };
    reader.readAsText(file);
  }

  // --- Export File ---

  downloadAsmFile(filename, code) {
    if (!filename) filename = 'program.asm';
    if (!filename.toLowerCase().endsWith('.asm')) filename += '.asm';

    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showFloatingToast(`Downloaded "${filename}"`);
  }

  // --- UI Helpers & Stats ---

  updateCodeMetrics() {
    const code = this.getCode();
    const lines = code ? code.split('\n').length : 0;
    const chars = code ? code.length : 0;
    const bytes = new Blob([code || '']).size;

    const elLines = this.modalEl?.querySelector('#storage-metric-lines');
    const elChars = this.modalEl?.querySelector('#storage-metric-chars');
    const elBytes = this.modalEl?.querySelector('#storage-metric-bytes');

    if (elLines) elLines.textContent = `${lines} line${lines === 1 ? '' : 's'}`;
    if (elChars) elChars.textContent = `${chars} character${chars === 1 ? '' : 's'}`;
    if (elBytes) elBytes.textContent = this.formatBytes(bytes);
  }

  updateStorageStats() {
    const programs = this.getSavedPrograms();
    let totalBytes = 0;
    programs.forEach((p) => {
      totalBytes += p.size || new Blob([p.code]).size;
    });

    const elCount = this.modalEl?.querySelector('#storage-summary-count');
    const elBytes = this.modalEl?.querySelector('#storage-summary-bytes');
    const elTabCount = this.modalEl?.querySelector('#storage-tab-count');
    const elAutosave = this.modalEl?.querySelector('#storage-autosave-indicator');

    if (elCount) elCount.textContent = `${programs.length} program${programs.length === 1 ? '' : 's'}`;
    if (elBytes) elBytes.textContent = `${this.formatBytes(totalBytes)} used`;
    if (elTabCount) elTabCount.textContent = programs.length;
    if (elAutosave) {
      const enabled = this.isAutosaveEnabled();
      elAutosave.textContent = `Autosave: ${enabled ? 'ON' : 'OFF'}`;
      elAutosave.classList.toggle('off', !enabled);
    }
  }

  showStatus(msg, type = 'info') {
    const banner = this.modalEl?.querySelector('#storage-save-status');
    if (!banner) return;

    banner.textContent = msg;
    banner.className = `storage-status-banner visible ${type}`;

    if (this.statusTimer) clearTimeout(this.statusTimer);
    this.statusTimer = setTimeout(() => {
      this.hideStatus();
    }, 4500);
  }

  hideStatus() {
    const banner = this.modalEl?.querySelector('#storage-save-status');
    if (banner) {
      banner.className = 'storage-status-banner hidden';
    }
  }

  showFloatingToast(msg) {
    let toast = document.getElementById('storage-floating-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'storage-floating-toast';
      toast.className = 'storage-floating-toast';
      document.body.appendChild(toast);
    }

    toast.textContent = msg;
    toast.classList.remove('hidden', 'fade-out');
    toast.classList.add('visible');

    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      toast.classList.add('fade-out');
      setTimeout(() => {
        toast.classList.remove('visible', 'fade-out');
        toast.classList.add('hidden');
      }, 250);
    }, 2200);
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  formatDate(timestamp) {
    const diff = Date.now() - timestamp;
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

    const d = new Date(timestamp);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
