/**
 * In-App GitHub Integration Modal
 * Allows exporting 8086 Assembly programs to GitHub Gist,
 * committing files to GitHub Repositories via GitHub REST API,
 * and viewing Git CLI push instructions.
 */

export class GitHubModal {
  constructor(getCodeCallback) {
    this.getCode = getCodeCallback;
    this.modalEl = null;
    this.isOpen = false;
    this.initDOM();
  }

  initDOM() {
    // Create modal backdrop and container
    const backdrop = document.createElement('div');
    backdrop.id = 'github-modal-backdrop';
    backdrop.className = 'modal-backdrop hidden';
    backdrop.innerHTML = `
      <div class="github-modal-dialog">
        <div class="gh-modal-header">
          <div class="gh-header-title">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
            <span>GitHub Export & Push Center</span>
          </div>
          <button id="gh-btn-close" class="gh-close-btn" title="Close modal">×</button>
        </div>

        <!-- Mode Navigation Tabs -->
        <div class="gh-tabs">
          <button class="gh-tab active" data-tab="gist">Push to GitHub Gist</button>
          <button class="gh-tab" data-tab="repo">Commit to Repository</button>
          <button class="gh-tab" data-tab="cli">Git CLI Commands</button>
        </div>

        <div class="gh-modal-body">
          <!-- TAB 1: GIST -->
          <div class="gh-tab-content active" id="gh-tab-gist">
            <p class="gh-hint">Instantly publish your 8086 assembly program to a public or secret GitHub Gist for easy sharing or embedding.</p>
            
            <div class="gh-field">
              <label for="gh-gist-filename">File Name</label>
              <input type="text" id="gh-gist-filename" class="gh-input mono" value="program.asm" placeholder="filename.asm" />
            </div>

            <div class="gh-field">
              <label for="gh-gist-desc">Description</label>
              <input type="text" id="gh-gist-desc" class="gh-input" value="Intel 8086 Assembly Program (emu8086)" placeholder="Short description..." />
            </div>

            <div class="gh-field-row">
              <label class="gh-checkbox-label">
                <input type="checkbox" id="gh-gist-public" checked />
                <span>Public Gist (visible to anyone)</span>
              </label>
            </div>

            <div class="gh-field">
              <label for="gh-gist-token">GitHub Token <span class="gh-sub">(Optional, required for private or account-linked gists)</span></label>
              <input type="password" id="gh-gist-token" class="gh-input" placeholder="ghp_... (or leave empty for anonymous)" />
            </div>

            <div class="gh-actions">
              <button id="gh-btn-create-gist" class="btn btn-primary gh-action-btn">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
                Publish to GitHub Gist
              </button>
            </div>

            <div id="gh-gist-result" class="gh-result hidden"></div>
          </div>

          <!-- TAB 2: REPOSITORY -->
          <div class="gh-tab-content" id="gh-tab-repo">
            <p class="gh-hint">Commit and push the current assembly file directly to any GitHub repository using GitHub's Contents API.</p>

            <div class="gh-field">
              <label for="gh-repo-token">Personal Access Token (PAT) <span class="gh-sub">('repo' permission required)</span></label>
              <input type="password" id="gh-repo-token" class="gh-input" placeholder="github_pat_... or ghp_..." />
            </div>

            <div class="gh-field-group">
              <div class="gh-field">
                <label for="gh-repo-owner">Repo Owner / Username</label>
                <input type="text" id="gh-repo-owner" class="gh-input" placeholder="e.g. muntaha-ux" value="muntaha-ux" />
              </div>
              <div class="gh-field">
                <label for="gh-repo-name">Repository Name</label>
                <input type="text" id="gh-repo-name" class="gh-input" placeholder="e.g. emu8086" value="emu8086" />
              </div>
            </div>

            <div class="gh-field-group">
              <div class="gh-field">
                <label for="gh-repo-path">File Path in Repo</label>
                <input type="text" id="gh-repo-path" class="gh-input mono" placeholder="e.g. programs/sample.asm" value="programs/program.asm" />
              </div>
              <div class="gh-field">
                <label for="gh-repo-branch">Branch</label>
                <input type="text" id="gh-repo-branch" class="gh-input mono" value="main" />
              </div>
            </div>

            <div class="gh-field">
              <label for="gh-repo-message">Commit Message</label>
              <input type="text" id="gh-repo-message" class="gh-input" value="Update 8086 assembly program via emu8086" />
            </div>

            <div class="gh-actions">
              <button id="gh-btn-push-repo" class="btn btn-primary gh-action-btn">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                Push Commit to Repository
              </button>
            </div>

            <div id="gh-repo-result" class="gh-result hidden"></div>
          </div>

          <!-- TAB 3: CLI COMMANDS -->
          <div class="gh-tab-content" id="gh-tab-cli">
            <p class="gh-hint">Use these commands in your PowerShell or Bash terminal to push local project changes directly to GitHub:</p>

            <div class="gh-cli-box">
              <pre class="mono" id="gh-cli-snippet"># 1. Stage modified files and components
git add src/ index.html .gitignore package.json package-lock.json

# 2. Commit your latest updates
git commit -m "feat: enhance emu8086 emulator with minimal futuristic UI"

# 3. Push to GitHub remote main branch
git push origin main</pre>
              <button id="gh-btn-copy-cli" class="btn btn-xs btn-secondary">
                <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                Copy Commands
              </button>
            </div>

            <div class="gh-remote-info">
              <div class="remote-row">
                <span class="lbl">Remote URL:</span>
                <span class="mono val">https://github.com/MugdhoandMuntaha/assembler-8086.git</span>
              </div>
              <div class="remote-row">
                <span class="lbl">Target Branch:</span>
                <span class="mono val">main</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    this.modalEl = backdrop;

    this.bindEvents();
  }

  bindEvents() {
    const closeBtn = document.getElementById('gh-btn-close');
    closeBtn.addEventListener('click', () => this.close());

    // Click outside dialog to close
    this.modalEl.addEventListener('click', (e) => {
      if (e.target === this.modalEl) {
        this.close();
      }
    });

    // Escape key to close
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    // Tab switching
    const tabs = this.modalEl.querySelectorAll('.gh-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const targetTab = tab.dataset.tab;
        this.modalEl.querySelectorAll('.gh-tab-content').forEach(c => c.classList.remove('active'));
        const activeContent = document.getElementById(`gh-tab-${targetTab}`);
        if (activeContent) activeContent.classList.add('active');
      });
    });

    // Gist Creation Button
    const btnCreateGist = document.getElementById('gh-btn-create-gist');
    btnCreateGist.addEventListener('click', () => this.handleCreateGist());

    // Repo Push Button
    const btnPushRepo = document.getElementById('gh-btn-push-repo');
    btnPushRepo.addEventListener('click', () => this.handlePushRepo());

    // Copy CLI Snippet Button
    const btnCopyCli = document.getElementById('gh-btn-copy-cli');
    btnCopyCli.addEventListener('click', () => {
      const text = document.getElementById('gh-cli-snippet').textContent;
      navigator.clipboard.writeText(text).then(() => {
        btnCopyCli.textContent = 'Copied! ✓';
        setTimeout(() => {
          btnCopyCli.innerHTML = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy Commands`;
        }, 2000);
      });
    });
  }

  open() {
    this.modalEl.classList.remove('hidden');
    this.isOpen = true;
  }

  close() {
    this.modalEl.classList.add('hidden');
    this.isOpen = false;
  }

  async handleCreateGist() {
    const filename = document.getElementById('gh-gist-filename').value.trim() || 'program.asm';
    const description = document.getElementById('gh-gist-desc').value.trim() || 'Intel 8086 Assembly Program';
    const isPublic = document.getElementById('gh-gist-public').checked;
    const token = document.getElementById('gh-gist-token').value.trim();
    const resultBox = document.getElementById('gh-gist-result');
    const actionBtn = document.getElementById('gh-btn-create-gist');

    const code = this.getCode();
    if (!code || !code.trim()) {
      this.showResult(resultBox, 'error', 'Assembly editor is empty. Nothing to export.');
      return;
    }

    actionBtn.disabled = true;
    actionBtn.textContent = 'Publishing to GitHub...';
    resultBox.classList.add('hidden');

    try {
      const headers = {
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json'
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const body = {
        description,
        public: isPublic,
        files: {
          [filename]: {
            content: code
          }
        }
      };

      const response = await fetch('https://api.github.com/gists', {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `GitHub API returned HTTP ${response.status}`);
      }

      const gistUrl = data.html_url;
      this.showResult(
        resultBox,
        'success',
        `<span>Gist successfully created!</span> <a href="${gistUrl}" target="_blank" rel="noopener noreferrer" class="gh-link">Open Gist on GitHub ↗</a>`
      );
    } catch (err) {
      this.showResult(resultBox, 'error', `Failed to publish Gist: ${err.message}`);
    } finally {
      actionBtn.disabled = false;
      actionBtn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg> Publish to GitHub Gist`;
    }
  }

  async handlePushRepo() {
    const token = document.getElementById('gh-repo-token').value.trim();
    const owner = document.getElementById('gh-repo-owner').value.trim();
    const repo = document.getElementById('gh-repo-name').value.trim();
    const path = document.getElementById('gh-repo-path').value.trim();
    const branch = document.getElementById('gh-repo-branch').value.trim() || 'main';
    const message = document.getElementById('gh-repo-message').value.trim() || 'Update 8086 program';
    const resultBox = document.getElementById('gh-repo-result');
    const actionBtn = document.getElementById('gh-btn-push-repo');

    if (!token) {
      this.showResult(resultBox, 'error', 'Please provide a GitHub Personal Access Token (PAT) with repo scope.');
      return;
    }
    if (!owner || !repo || !path) {
      this.showResult(resultBox, 'error', 'Owner, Repository name, and File path are required.');
      return;
    }

    const code = this.getCode();
    actionBtn.disabled = true;
    actionBtn.textContent = 'Pushing commit...';
    resultBox.classList.add('hidden');

    try {
      // 1. Check if the file already exists to get its SHA (required by GitHub API for updates)
      let sha = null;
      const getUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;
      const getRes = await fetch(getUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json'
        }
      });

      if (getRes.ok) {
        const fileData = await getRes.json();
        sha = fileData.sha;
      }

      // 2. Commit file with Base64 encoding
      const utf8Bytes = new TextEncoder().encode(code);
      let binaryStr = '';
      for (let i = 0; i < utf8Bytes.length; i++) {
        binaryStr += String.fromCharCode(utf8Bytes[i]);
      }
      const b64Content = btoa(binaryStr);

      const putUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
      const putBody = {
        message,
        content: b64Content,
        branch
      };
      if (sha) {
        putBody.sha = sha;
      }

      const putRes = await fetch(putUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(putBody)
      });

      const putData = await putRes.json();

      if (!putRes.ok) {
        throw new Error(putData.message || `GitHub returned HTTP ${putRes.status}`);
      }

      const fileUrl = putData.content?.html_url || `https://github.com/${owner}/${repo}/blob/${branch}/${path}`;
      this.showResult(
        resultBox,
        'success',
        `<span>Committed & pushed successfully!</span> <a href="${fileUrl}" target="_blank" rel="noopener noreferrer" class="gh-link">View File on GitHub ↗</a>`
      );
    } catch (err) {
      this.showResult(resultBox, 'error', `Push failed: ${err.message}`);
    } finally {
      actionBtn.disabled = false;
      actionBtn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Push Commit to Repository`;
    }
  }

  showResult(el, type, html) {
    el.className = `gh-result ${type}`;
    el.innerHTML = html;
    el.classList.remove('hidden');
  }
}
