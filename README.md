# assembler-8086

> **Intel 8086 Microprocessor Web Emulator, Assembler, Interactive Terminal & Pipeline Visualizer**

An advanced, browser-based Intel 8086 microprocessor simulation environment built with modern web technologies, featuring real-time architecture animation, context-aware DOS interrupt intelligence, docking window manager, and interactive terminal screen.

---

## 🚀 Key Features

### 1. ⚡ 8086 Microprocessor Pipeline & Bus Animator (EU / BIU)
- **Bus Interface Unit (BIU)**:
  - 16-bit Segment Registers (`CS`, `DS`, `SS`, `ES`) and Instruction Pointer (`IP`).
  - **Dedicated 20-bit Physical Address Generation Circuit** displaying calculation:  
    $$\text{Physical Address} = (\text{Segment} \times 16) + \text{Offset}$$
  - **6-Byte Instruction Prefetch Queue (FIFO)** with active byte occupancy indicators (`Q1`–`Q6`).
  - **Bus Controller Pins**: `ALE`, `M/IO`, `RD`, `WR`, and `T-State` activity.
- **Inter-Unit Bus Conduit**:
  - Animated electrical pulse wires for Opcode Fetch, Data Bus, and Control Signals.
- **Execution Unit (EU)**:
  - Real-time **Instruction Decoder & Micro-Control** status.
  - **ALU Hardware Trapezoid** showing Operand A, Operand B, active operation (`+`, `-`, `AND`, `OR`, `XOR`, etc.), and Result.
  - General Registers bank (`AX`, `BX`, `CX`, `DX`, `SP`, `BP`, `SI`, `DI`) and 9 Status Flags (`OF`, `DF`, `IF`, `TF`, `SF`, `ZF`, `AF`, `PF`, `CF`).
- **Bus Cycle Timeline**: Tracks `T1`, `T2`, `T3`, `T4` cycles during fetch, decode, execute, and writeback.

---

### 2. 🧠 Context-Aware DOS Interrupt Hover Documentation
- **Rich Monaco Editor Hover Cards** for:
  - `INT 21H` (DOS Services: String display `$`, Character I/O, Buffered Input, Terminate process)
  - `INT 10H` (Video Services: Cursor positioning, Scroll screen, Teletype output)
  - `INT 16H` (Keyboard Services: Read keystroke, Check keystroke buffer)
  - `INT 1AH` (System Clock Services) & `INT 20H` (Program Terminate)
- **Backward Static Analysis**: Automatically inspects preceding statements to detect the loaded `AH` function code (e.g. `MOV AH, 09H`) and renders the precise service parameters, required inputs, return registers, and runnable examples.

---

### 3. 🖥️ Interactive DOS Terminal & Display
- Full text-mode DOS terminal simulation supporting:
  - `INT 21H / AH=09H`: `$`-terminated string printing
  - `INT 21H / AH=02H`: Character output
  - `INT 21H / AH=01H`: Single character input with echo
  - `INT 21H / AH=0AH`: Buffered string input
  - Screen clearing and cursor manipulation via `INT 10H`

---

### 4. 🪟 VS Code Style Docking & Layout System
- Resizable, draggable panels with drop zones (Left, Right, Top, Bottom).
- Presets for **VS Code Layout**, **3 Columns**, and **Bottom Terminal**.
- Pop-out floating windows and panel maximization.

---

### 5. 🐙 GitHub Export & Push Integration
- **Push to GitHub Gist**: 1-click publishing of assembly programs to public or secret Gists.
- **Commit to Repository**: Direct commit and push of assembly files via GitHub REST API.
- **Git CLI Commands Center**: Fast access to terminal git workflow commands.

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
