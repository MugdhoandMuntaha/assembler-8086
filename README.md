# assembler-8086

> **Intel 8086 Microprocessor Web Emulator, Assembler, Interactive Terminal & Modern IDE**

An advanced, browser-based Intel 8086 microprocessor simulation environment built with modern web technologies, featuring futuristic cyber deck interface, context-aware DOS interrupt intelligence, docking window manager, and interactive terminal screen.

---

## 🚀 Key Features

### 1. 🧠 Context-Aware DOS Interrupt Hover Documentation
- **Rich Monaco Editor Hover Cards** for:
  - `INT 21H` (DOS Services: String display `$`, Character I/O, Buffered Input, Terminate process)
  - `INT 10H` (Video Services: Cursor positioning, Scroll screen, Teletype output)
  - `INT 16H` (Keyboard Services: Read keystroke, Check keystroke buffer)
  - `INT 1AH` (System Clock Services) & `INT 20H` (Program Terminate)
- **Backward Static Analysis**: Automatically inspects preceding statements to detect the loaded `AH` function code (e.g. `MOV AH, 09H`) and renders the precise service parameters, required inputs, return registers, and runnable examples.

---

### 2. 🖥️ Interactive DOS Terminal & Display
- Full text-mode DOS terminal simulation supporting:
  - `INT 21H / AH=09H`: `$`-terminated string printing
  - `INT 21H / AH=02H`: Character output
  - `INT 21H / AH=01H`: Single character input with echo
  - `INT 21H / AH=0AH`: Buffered string input
  - Screen clearing and cursor manipulation via `INT 10H`

---

### 3. 🪟 VS Code Style Docking & Layout System
- Resizable, draggable panels with drop zones (Left, Right, Top, Bottom).
- Presets for **VS Code Layout**, **3 Columns**, and **Bottom Terminal**.
- Pop-out floating windows and panel maximization.

---

### 4. 🐙 GitHub Export & Push Integration
- **Push to GitHub Gist**: 1-click publishing of assembly programs to public or secret Gists.
- **Commit to Repository**: Direct commit and push of assembly files via GitHub REST API.
- **Git CLI Commands Center**: Fast access to terminal git workflow commands.

---

### 5. 📁 Google Drive Cloud Save & Synchronization
- **Google Identity Services (GIS) OAuth 2.0**: Secure in-browser authentication with Google account using the least-privilege `drive.file` scope.
- **Direct Cloud Upload**: Multipart upload to Google Drive v3 REST API saving active 8086 assembly source code directly to Google Drive.
- **Revisions & Versioning**: Option to update/overwrite existing files or save new timestamped versions.
- **Recent Saves Manager**: Quick history list with direct 1-click "Open in Google Drive" links and file selection for overwriting.
- **Built-in Setup Guide**: Guided 3-minute instructions on generating an OAuth 2.0 Client ID in Google Cloud Console.

---

## 🛠️ Getting Started

### Prerequisites
- Node.js (v18 or newer recommended)
- npm

### Installation & Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Start Vite development server
npm run dev
```

Open your browser and navigate to `http://localhost:5173`.

### Production Build

```bash
npm run build
```

---

## 📜 License
MIT License
