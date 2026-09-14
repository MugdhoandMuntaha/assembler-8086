/**
 * Google Drive Integration Modal for Intel 8086 Assembly Web IDE
 * 
 * Provides direct Google Drive cloud storage integration:
 * - Google Identity Services (GIS) OAuth 2.0 authentication
 * - Safe 'drive.file' scope (access only to files created/opened by this app)
 * - Multipart upload to Google Drive REST API v3
 * - File creation, revision update, and history tracking
 * - Step-by-step Google Cloud Console setup guide for Client ID
 */

const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
const DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink,size,createdTime,modifiedTime';
const DRIVE_UPDATE_URL = (fileId) => `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart&fields=id,name,webViewLink,webContentLink,size,modifiedTime`;

export class GoogleDriveModal {
  constructor(getCodeCallback) {
    this.getCode = getCodeCallback;
    this.modalEl = null;
    this.isOpen = false;
    this.gisLoaded = false;
    this.tokenClient = null;
    this.accessToken = null;
    this.tokenExpiry = 0;
    this.userProfile = null;
    this.recentFiles = this.loadRecentFiles();

    this.initDOM();
    this.loadGISScript();
  }

  loadRecentFiles() {
    try {
      const data = localStorage.getItem('emu8086_gdrive_recent');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  saveRecentFiles(list) {
    try {
      this.recentFiles = list.slice(0, 15);
      localStorage.setItem('emu8086_gdrive_recent', JSON.stringify(this.recentFiles));
      this.renderRecentFiles();
    } catch (e) {
      console.error('Failed to cache recent Google Drive files:', e);
    }
  }

  getClientId() {
    return (localStorage.getItem('emu8086_gdrive_client_id') || '').trim();
  }

  setClientId(clientId) {
    localStorage.setItem('emu8086_gdrive_client_id', clientId.trim());
    this.tokenClient = null; // Re-initialize token client
    this.updateAuthStatusUI();
  }

  loadGISScript() {
    if (window.google?.accounts?.oauth2) {
      this.gisLoaded = true;
      return;
    }
    const script = document.createElement('script');
    script.src = GIS_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      this.gisLoaded = true;
      this.initTokenClientIfNeeded();
    };
    script.onerror = () => {
      console.warn('Google Identity Services script failed to load. Check internet connection or content security policy.');
    };
    document.head.appendChild(script);
  }

  initTokenClientIfNeeded() {
    const clientId = this.getClientId();
    if (!clientId || !window.google?.accounts?.oauth2) return false;

    try {
      this.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: DRIVE_FILE_SCOPE,
        callback: (resp) => this.handleTokenResponse(resp),
        error_callback: (err) => {
          this.showStatus('OAuth error: ' + (err.message || 'Authorization failed'), 'error');
        }
      });
      return true;
    } catch (e) {
      console.error('Failed to init Google OAuth token client:', e);
      return false;
    }
  }

  handleTokenResponse(response) {
    if (response.error) {
      this.showStatus(`Authorization Error: ${response.error_description || response.error}`, 'error');
      return;
    }

    this.accessToken = response.access_token;
    const expiresIn = parseInt(response.expires_in, 10) || 3600;
    this.tokenExpiry = Date.now() + expiresIn * 1000;

    this.fetchUserProfile();
    this.updateAuthStatusUI();
    this.showStatus('Successfully authenticated with Google Drive!', 'success');
  }

  async fetchUserProfile() {
    if (!this.accessToken) return;
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${this.accessToken}` }
      });
      if (res.ok) {
        this.userProfile = await res.json();
        this.updateAuthStatusUI();
      }
    } catch (e) {
      console.warn('Could not fetch user profile info:', e);
    }
  }

  isAuthorized() {
    return !!this.accessToken && Date.now() < this.tokenExpiry;
  }

  requestAuth() {
    const clientId = this.getClientId();
    if (!clientId) {
      this.switchTab('setup');
      this.showStatus('Please enter your Google Cloud Client ID in the Settings tab first.', 'warning');
      return;
    }

    if (!this.gisLoaded || !window.google?.accounts?.oauth2) {
      this.showStatus('Google Identity Services is still loading. Please try again in a moment.', 'warning');
      this.loadGISScript();
      return;
    }

    if (!this.tokenClient) {
      const ok = this.initTokenClientIfNeeded();
      if (!ok) {
        this.showStatus('Failed to configure Google OAuth. Check your Client ID format.', 'error');
        return;
      }
    }

    // Trigger GIS OAuth popup
    this.tokenClient.requestAccessToken({ prompt: '' });
  }

  disconnect() {
    if (this.accessToken && window.google?.accounts?.oauth2?.revoke) {
      window.google.accounts.oauth2.revoke(this.accessToken, () => {});
    }
    this.accessToken = null;
    this.tokenExpiry = 0;
    this.userProfile = null;
    this.updateAuthStatusUI();
    this.showStatus('Disconnected from Google Drive.', 'info');
  }

  initDOM() {
    const backdrop = document.createElement('div');
    backdrop.id = 'gdrive-modal-backdrop';
    backdrop.className = 'modal-backdrop hidden';
    backdrop.innerHTML = `
      <div class="gdrive-modal-dialog">
        <!-- Modal Header -->
        <div class="gdrive-modal-header">
          <div class="gdrive-header-title">
            <svg class="gdrive-brand-icon" viewBox="0 0 87.3 78" width="22" height="20">
              <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
              <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
              <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
              <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
              <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
              <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
            </svg>
            <div class="gdrive-title-text">
              <span class="main-title">Google Drive Cloud Save</span>
              <span class="sub-title">Sync and store 8086 assembly source code</span>
            </div>
          </div>
          <button id="gdrive-btn-close" class="gdrive-close-btn" title="Close modal">×</button>
        </div>

        <!-- Account Status Deck -->
        <div class="gdrive-account-card" id="gdrive-account-card">
          <div class="gdrive-account-info" id="gdrive-account-info">
            <div class="gdrive-avatar-placeholder">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>
            </div>
            <div class="gdrive-account-text">
              <span class="account-name" id="gdrive-user-name">Google Drive Not Connected</span>
              <span class="account-email" id="gdrive-user-email">Connect your account to save files directly</span>
            </div>
          </div>
          <div class="gdrive-account-actions">
            <button id="gdrive-btn-auth" class="btn btn-xs gdrive-connect-btn">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 15h-2v-6h2zm0-8h-2V7h2z"/></svg>
              <span>Connect Google</span>
            </button>
            <button id="gdrive-btn-disconnect" class="btn btn-xs btn-secondary hidden">
              Disconnect
            </button>
          </div>
        </div>

        <!-- Tabs Navigation -->
        <div class="gdrive-tabs" role="tablist">
          <button class="gdrive-tab active" data-tab="save" id="gdrive-tab-btn-save">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            <span>Save to Drive</span>
          </button>
          <button class="gdrive-tab" data-tab="recent" id="gdrive-tab-btn-recent">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            <span>Recent Saves</span>
          </button>
          <button class="gdrive-tab" data-tab="setup" id="gdrive-tab-btn-setup">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            <span>Settings & Setup</span>
          </button>
        </div>

        <!-- Tab Bodies -->
        <div class="gdrive-modal-body">
          <!-- TAB 1: SAVE TO DRIVE -->
          <div class="gdrive-tab-content active" id="gdrive-pane-save">
            <p class="gdrive-hint">Save the current active 8086 assembly program directly to your personal Google Drive account as a text file.</p>

            <div class="gdrive-field">
              <label for="gdrive-file-name">File Name</label>
              <div class="gdrive-input-prefix-box">
                <input type="text" id="gdrive-file-name" class="gdrive-input mono" value="program.asm" placeholder="my_program.asm" />
                <button id="gdrive-btn-timestamp" class="gdrive-pill-btn" title="Append current timestamp">Timestamp</button>
              </div>
            </div>

            <div class="gdrive-field">
              <label for="gdrive-file-desc">File Description</label>
              <input type="text" id="gdrive-file-desc" class="gdrive-input" value="Intel 8086 Assembly Program generated in emu8086 Web IDE" placeholder="Short description..." />
            </div>

            <div class="gdrive-field">
              <label for="gdrive-folder-id">Target Folder ID <span class="gdrive-sub">(Optional, leave blank for Google Drive root folder)</span></label>
              <input type="text" id="gdrive-folder-id" class="gdrive-input mono" placeholder="e.g. 1a2b3c4d5e6f... (from folder URL)" />
            </div>

            <!-- Existing File Overwrite Toggle -->
            <div class="gdrive-field-row" id="gdrive-overwrite-container">
              <label class="gdrive-checkbox-label">
                <input type="checkbox" id="gdrive-chk-overwrite" />
                <span>Update / Overwrite previous Google Drive file if already saved</span>
              </label>
            </div>

            <!-- Actions Bar -->
            <div class="gdrive-actions-bar">
              <button id="gdrive-btn-save-now" class="btn btn-primary gdrive-save-btn">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                  <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/>
                </svg>
                <span id="gdrive-btn-save-label">Save to Google Drive</span>
              </button>

              <button id="gdrive-btn-download-fallback" class="btn btn-secondary" title="Download .asm file directly to disk">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span>Export .ASM</span>
              </button>
            </div>

            <!-- Result Feedback Box -->
            <div id="gdrive-result-box" class="gdrive-result-box hidden"></div>
          </div>

          <!-- TAB 2: RECENT SAVES -->
          <div class="gdrive-tab-content" id="gdrive-pane-recent">
            <div class="gdrive-recent-header">
              <p class="gdrive-hint">Files saved to your Google Drive in this browser session.</p>
              <button id="gdrive-btn-clear-recent" class="btn btn-xs btn-secondary">Clear History</button>
            </div>
            <div id="gdrive-recent-list" class="gdrive-recent-list">
              <!-- Dynamically populated -->
            </div>
          </div>

          <!-- TAB 3: SETTINGS & SETUP GUIDE -->
          <div class="gdrive-tab-content" id="gdrive-pane-setup">
            <div class="gdrive-setup-section">
              <h4 class="setup-heading">Google Cloud OAuth 2.0 Credentials</h4>
              <p class="gdrive-hint">
                To enable direct in-browser saving, provide your free Google Cloud <strong>Client ID</strong>.
                This is completely secure: tokens are stored locally in memory only, and permissions are scoped strictly to files created by this app (<code>drive.file</code>).
              </p>

              <div class="gdrive-field">
                <label for="gdrive-client-id-input">Google Client ID</label>
                <input type="text" id="gdrive-client-id-input" class="gdrive-input mono" placeholder="xxxxxxxxxxxx-xxxxxxxxxxxxxxxx.apps.googleusercontent.com" />
              </div>

              <div class="gdrive-setup-actions">
                <button id="gdrive-btn-save-client-id" class="btn btn-primary btn-xs">
                  Save Client ID
                </button>
                <span id="gdrive-client-id-status" class="setup-save-status"></span>
              </div>
            </div>

            <div class="gdrive-guide-card">
              <div class="guide-header">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2zm0-8h-2V7h2z"/></svg>
                <span>3-Minute Google Cloud Setup Guide</span>
              </div>
              <ol class="guide-steps">
                <li>Go to <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer">Google Cloud Console</a> and create or select a project.</li>
                <li>Navigate to <strong>APIs & Services &gt; Library</strong>, search for <strong>Google Drive API</strong>, and click <strong>Enable</strong>.</li>
                <li>Go to <strong>APIs & Services &gt; Credentials</strong>, click <strong>Create Credentials &gt; OAuth client ID</strong>.</li>
                <li>Set Application type to <strong>Web application</strong>.</li>
                <li>Under <strong>Authorized JavaScript origins</strong>, add:
                  <div class="code-badge-row">
                    <code class="mono">http://localhost:5173</code>
                    <code class="mono">http://localhost:3000</code>
                  </div>
                </li>
                <li>Click <strong>Create</strong>, copy the generated <strong>Client ID</strong>, and paste it into the field above!</li>
              </ol>
            </div>
          </div>
        </div>

        <!-- Global Status Toast / Notification -->
        <div id="gdrive-status-bar" class="gdrive-status-bar hidden"></div>
      </div>
    `;

    document.body.appendChild(backdrop);
    this.modalEl = backdrop;

    this.bindEvents();
    this.updateAuthStatusUI();
    this.renderRecentFiles();
  }

  bindEvents() {
    // Close modal
    const btnClose = this.modalEl.querySelector('#gdrive-btn-close');
    btnClose.addEventListener('click', () => this.close());

    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) this.close();
    });

    // Tab buttons
    const tabs = this.modalEl.querySelectorAll('.gdrive-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.switchTab(tab.getAttribute('data-tab'));
      });
    });

    // Auth actions
    const btnAuth = this.modalEl.querySelector('#gdrive-btn-auth');
    btnAuth.addEventListener('click', () => this.requestAuth());

    const btnDisconnect = this.modalEl.querySelector('#gdrive-btn-disconnect');
    btnDisconnect.addEventListener('click', () => this.disconnect());

    // Timestamp button
    const btnTimestamp = this.modalEl.querySelector('#gdrive-btn-timestamp');
    btnTimestamp.addEventListener('click', () => {
      const input = this.modalEl.querySelector('#gdrive-file-name');
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
      const base = input.value.replace(/\.asm$/i, '').replace(/_\d{8}_\d{4}$/, '');
      input.value = `${base}_${stamp}.asm`;
    });

    // Save now button
    const btnSaveNow = this.modalEl.querySelector('#gdrive-btn-save-now');
    btnSaveNow.addEventListener('click', () => this.saveToGoogleDrive());

    // Download fallback
    const btnFallback = this.modalEl.querySelector('#gdrive-btn-download-fallback');
    btnFallback.addEventListener('click', () => this.downloadAsmFile());

    // Client ID Save
    const btnSaveClientId = this.modalEl.querySelector('#gdrive-btn-save-client-id');
    btnSaveClientId.addEventListener('click', () => {
      const input = this.modalEl.querySelector('#gdrive-client-id-input');
      const val = input.value.trim();
      if (!val) {
        this.showStatus('Client ID cannot be empty.', 'warning');
        return;
      }
      this.setClientId(val);
      const statusEl = this.modalEl.querySelector('#gdrive-client-id-status');
      statusEl.textContent = 'Saved!';
      statusEl.className = 'setup-save-status success';
      setTimeout(() => {
        statusEl.textContent = '';
      }, 3000);
      this.showStatus('Google Client ID saved successfully.', 'success');
    });

    // Clear recent list
    const btnClearRecent = this.modalEl.querySelector('#gdrive-btn-clear-recent');
    btnClearRecent.addEventListener('click', () => {
      this.saveRecentFiles([]);
      this.showStatus('Recent files history cleared.', 'info');
    });
  }

  switchTab(tabId) {
    const tabs = this.modalEl.querySelectorAll('.gdrive-tab');
    tabs.forEach(t => {
      if (t.getAttribute('data-tab') === tabId) {
        t.classList.add('active');
      } else {
        t.classList.remove('active');
      }
    });

    const panes = this.modalEl.querySelectorAll('.gdrive-tab-content');
    panes.forEach(p => {
      if (p.id === `gdrive-pane-${tabId}`) {
        p.classList.add('active');
      } else {
        p.classList.remove('active');
      }
    });
  }

  updateAuthStatusUI() {
    const card = this.modalEl.querySelector('#gdrive-account-card');
    const nameEl = this.modalEl.querySelector('#gdrive-user-name');
    const emailEl = this.modalEl.querySelector('#gdrive-user-email');
    const btnAuth = this.modalEl.querySelector('#gdrive-btn-auth');
    const btnDisconnect = this.modalEl.querySelector('#gdrive-btn-disconnect');
    const avatarBox = this.modalEl.querySelector('.gdrive-avatar-placeholder');
    const clientIdInput = this.modalEl.querySelector('#gdrive-client-id-input');

    const clientId = this.getClientId();
    if (clientIdInput && !clientIdInput.value) {
      clientIdInput.value = clientId;
    }

    if (this.isAuthorized()) {
      card.classList.add('connected');
      if (this.userProfile) {
        nameEl.textContent = this.userProfile.name || 'Connected Google Account';
        emailEl.textContent = this.userProfile.email || 'Ready to save files to Drive';
        if (this.userProfile.picture) {
          avatarBox.innerHTML = `<img src="${this.userProfile.picture}" alt="User Avatar" class="gdrive-avatar-img" />`;
        }
      } else {
        nameEl.textContent = 'Google Account Connected';
        emailEl.textContent = 'OAuth access token active';
      }
      btnAuth.classList.add('hidden');
      btnDisconnect.classList.remove('hidden');
    } else {
      card.classList.remove('connected');
      nameEl.textContent = clientId ? 'Google Account Disconnected' : 'Client ID Configuration Required';
      emailEl.textContent = clientId ? 'Click "Connect Google" to authorize access' : 'Enter your Google Client ID in the Settings tab';
      avatarBox.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>`;
      btnAuth.classList.remove('hidden');
      btnDisconnect.classList.add('hidden');
    }
  }

  showStatus(msg, type = 'info') {
    const bar = this.modalEl.querySelector('#gdrive-status-bar');
    bar.textContent = msg;
    bar.className = `gdrive-status-bar ${type}`;
    bar.classList.remove('hidden');

    if (this.statusTimer) clearTimeout(this.statusTimer);
    this.statusTimer = setTimeout(() => {
      bar.classList.add('hidden');
    }, 4500);
  }

  async saveToGoogleDrive() {
    if (!this.isAuthorized()) {
      this.showStatus('Please connect your Google account first.', 'warning');
      this.requestAuth();
      return;
    }

    const nameInput = this.modalEl.querySelector('#gdrive-file-name');
    let filename = nameInput.value.trim();
    if (!filename) filename = 'program.asm';
    if (!filename.toLowerCase().endsWith('.asm')) filename += '.asm';
    nameInput.value = filename;

    const desc = this.modalEl.querySelector('#gdrive-file-desc').value.trim();
    const folderId = this.modalEl.querySelector('#gdrive-folder-id').value.trim();
    const overwrite = this.modalEl.querySelector('#gdrive-chk-overwrite').checked;

    const code = typeof this.getCode === 'function' ? this.getCode() : '';
    if (!code || !code.trim()) {
      this.showStatus('Editor is empty. Write or assemble some 8086 code first!', 'warning');
      return;
    }

    const saveBtn = this.modalEl.querySelector('#gdrive-btn-save-now');
    const label = this.modalEl.querySelector('#gdrive-btn-save-label');
    const resultBox = this.modalEl.querySelector('#gdrive-result-box');

    saveBtn.disabled = true;
    label.textContent = 'Uploading to Drive...';
    resultBox.classList.add('hidden');

    try {
      // Check if we are updating an existing file with the same name in recent files
      let existingFile = null;
      if (overwrite) {
        existingFile = this.recentFiles.find(f => f.name.toLowerCase() === filename.toLowerCase());
      }

      const boundary = '-------314159265358979323846';
      const delimiter = `\r\n--${boundary}\r\n`;
      const closeDelim = `\r\n--${boundary}--`;

      const metadata = {
        name: filename,
        description: desc,
        mimeType: 'text/plain'
      };
      if (folderId && !existingFile) {
        metadata.parents = [folderId];
      }

      const multipartRequestBody =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: text/plain; charset=UTF-8\r\n\r\n' +
        code +
        closeDelim;

      let endpoint = DRIVE_UPLOAD_URL;
      let method = 'POST';

      if (existingFile && existingFile.id) {
        endpoint = DRIVE_UPDATE_URL(existingFile.id);
        method = 'PATCH';
      }

      const response = await fetch(endpoint, {
        method,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: multipartRequestBody
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errDetail = errorData?.error?.message || `HTTP ${response.status} ${response.statusText}`;
        throw new Error(errDetail);
      }

      const driveFile = await response.json();
      const webViewLink = driveFile.webViewLink || `https://drive.google.com/file/d/${driveFile.id}/view`;

      // Save to recent files history
      const savedRecord = {
        id: driveFile.id,
        name: driveFile.name || filename,
        webViewLink,
        size: driveFile.size || code.length,
        savedAt: new Date().toISOString()
      };

      const updatedRecent = [savedRecord, ...this.recentFiles.filter(f => f.id !== driveFile.id)];
      this.saveRecentFiles(updatedRecent);

      // Render success feedback
      resultBox.innerHTML = `
        <div class="gdrive-success-card">
          <div class="success-top">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="#10b981"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
            <div class="success-text">
              <span class="success-title">Successfully Saved to Google Drive!</span>
              <span class="success-filename mono">${driveFile.name || filename} (${Math.round((driveFile.size || code.length) / 1024 * 10) / 10} KB)</span>
            </div>
          </div>
          <div class="success-actions">
            <a href="${webViewLink}" target="_blank" rel="noopener noreferrer" class="btn btn-xs btn-primary gdrive-link-btn">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor"><path d="M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
              Open in Google Drive
            </a>
            <button class="btn btn-xs btn-secondary" id="gdrive-btn-copy-link" data-link="${webViewLink}">
              Copy Link
            </button>
          </div>
        </div>
      `;
      resultBox.classList.remove('hidden');

      const copyBtn = resultBox.querySelector('#gdrive-btn-copy-link');
      if (copyBtn) {
        copyBtn.addEventListener('click', () => {
          navigator.clipboard.writeText(webViewLink).then(() => {
            copyBtn.textContent = 'Copied!';
            setTimeout(() => { copyBtn.textContent = 'Copy Link'; }, 2000);
          });
        });
      }

      this.showStatus('File saved to Google Drive successfully!', 'success');
    } catch (err) {
      console.error('Google Drive save error:', err);
      resultBox.innerHTML = `
        <div class="gdrive-error-card">
          <strong>Upload Failed:</strong> ${err.message || 'Unknown error occurred'}
        </div>
      `;
      resultBox.classList.remove('hidden');
      this.showStatus(`Failed to upload: ${err.message}`, 'error');
    } finally {
      saveBtn.disabled = false;
      label.textContent = 'Save to Google Drive';
    }
  }

  downloadAsmFile() {
    const nameInput = this.modalEl.querySelector('#gdrive-file-name');
    let filename = nameInput ? nameInput.value.trim() : 'program.asm';
    if (!filename.toLowerCase().endsWith('.asm')) filename += '.asm';

    const code = typeof this.getCode === 'function' ? this.getCode() : '';
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    this.showStatus(`Exported ${filename} locally.`, 'success');
  }

  renderRecentFiles() {
    const listEl = this.modalEl.querySelector('#gdrive-recent-list');
    if (!listEl) return;

    if (!this.recentFiles || this.recentFiles.length === 0) {
      listEl.innerHTML = `
        <div class="gdrive-recent-empty">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <span>No files saved to Google Drive yet in this browser session.</span>
        </div>
      `;
      return;
    }

    listEl.innerHTML = this.recentFiles.map(file => {
      const date = file.savedAt ? new Date(file.savedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }) : '';
      return `
        <div class="gdrive-recent-item" data-id="${file.id}">
          <div class="recent-item-info">
            <svg class="recent-file-icon" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm4 18H6V4h7v5h5v11z"/>
            </svg>
            <div class="recent-name-group">
              <span class="recent-filename mono">${file.name}</span>
              <span class="recent-date">${date}</span>
            </div>
          </div>
          <div class="recent-item-actions">
            <a href="${file.webViewLink}" target="_blank" rel="noopener noreferrer" class="btn btn-xs btn-secondary" title="View file in Google Drive">
              Open Drive
            </a>
            <button class="btn btn-xs btn-secondary btn-recent-load" data-name="${file.name}" data-id="${file.id}" title="Select this filename to update with current editor code">
              Select
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach listeners to "Select" buttons
    const loadBtns = listEl.querySelectorAll('.btn-recent-load');
    loadBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const fname = btn.getAttribute('data-name');
        const nameInput = this.modalEl.querySelector('#gdrive-file-name');
        if (nameInput) nameInput.value = fname;
        const chk = this.modalEl.querySelector('#gdrive-chk-overwrite');
        if (chk) chk.checked = true;
        this.switchTab('save');
        this.showStatus(`Selected "${fname}" for saving/updating.`, 'info');
      });
    });
  }

  open() {
    if (!this.modalEl) return;
    this.updateAuthStatusUI();
    this.renderRecentFiles();
    this.modalEl.classList.remove('hidden');
    this.isOpen = true;
  }

  close() {
    if (!this.modalEl) return;
    this.modalEl.classList.add('hidden');
    this.isOpen = false;
  }
}
