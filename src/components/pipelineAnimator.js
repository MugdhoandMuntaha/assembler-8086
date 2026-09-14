/**
 * Intel 8086 Microprocessor Pipeline & Bus Animator
 * Interactive architectural visualization of the Bus Interface Unit (BIU),
 * 6-Byte Instruction Prefetch Queue (FIFO), Execution Unit (EU), ALU, and Bus Cycles.
 */

export class PipelineAnimator {
  constructor(container, cpu) {
    this.container = container;
    this.cpu = cpu;
    this.activePhase = 'FETCH'; // FETCH, DECODE, EXECUTE, WRITEBACK, IDLE
    this.cycleCount = 0;
    this.instructionCount = 0;
    this.busState = {
      address: '07000',
      data: '00',
      type: 'IDLE', // FETCH, MEM_READ, MEM_WRITE, IDLE
      tState: 'T1', // T1, T2, T3, T4
      ale: true,
      rd: false,
      wr: false,
      m_io: true
    };
    this.queue = ['--', '--', '--', '--', '--', '--']; // 6-byte prefetch queue

    this.initDOM();
  }

  initDOM() {
    this.container.innerHTML = `
      <div class="pipeline-wrapper">
        <!-- Pipeline Control & Status Banner -->
        <div class="pipeline-header">
          <div class="pipeline-title-group">
            <span class="pipeline-chip">8086 Microarchitecture</span>
            <div class="pipeline-phases">
              <span class="phase-chip" data-phase="FETCH">1. FETCH (BIU)</span>
              <span class="phase-arrow">→</span>
              <span class="phase-chip" data-phase="DECODE">2. DECODE (EU)</span>
              <span class="phase-arrow">→</span>
              <span class="phase-chip" data-phase="EXECUTE">3. EXECUTE (ALU)</span>
              <span class="phase-arrow">→</span>
              <span class="phase-chip" data-phase="WRITEBACK">4. WRITEBACK</span>
            </div>
          </div>
          <div class="pipeline-stats">
            <span class="stat-badge">Instr: <strong id="pipe-instr-count">0</strong></span>
            <span class="stat-badge">Clock Cycles: <strong id="pipe-cycle-count">0</strong></span>
            <span class="stat-badge bus-cycle-badge" id="pipe-bus-status">BUS: IDLE</span>
          </div>
        </div>

        <!-- Main Architecture Split (BIU vs EU) -->
        <div class="architecture-grid">
          <!-- LEFT: BUS INTERFACE UNIT (BIU) -->
          <div class="unit-card biu-card">
            <div class="unit-header">
              <div class="unit-title">
                <span class="unit-badge">BIU</span>
                <span>Bus Interface Unit</span>
              </div>
              <span class="unit-freq">Clock: Active</span>
            </div>

            <!-- Segment Registers & Physical Address Generation -->
            <div class="biu-section">
              <div class="sub-section-title">Segment Registers & Address Adder</div>
              <div class="seg-grid">
                <div class="seg-item" id="pipe-reg-CS"><span class="lbl">CS</span><span class="val mono">0700</span></div>
                <div class="seg-item" id="pipe-reg-DS"><span class="lbl">DS</span><span class="val mono">0710</span></div>
                <div class="seg-item" id="pipe-reg-SS"><span class="lbl">SS</span><span class="val mono">0700</span></div>
                <div class="seg-item" id="pipe-reg-ES"><span class="lbl">ES</span><span class="val mono">0700</span></div>
                <div class="seg-item highlight" id="pipe-reg-IP"><span class="lbl">IP</span><span class="val mono">0000</span></div>
              </div>

              <!-- Dedicated 20-bit Physical Address Calculation Circuit -->
              <div class="adder-box">
                <div class="adder-formula mono">
                  <span id="pipe-adder-seg">0700</span>h × 16 + <span id="pipe-adder-ip">0000</span>h
                </div>
                <div class="adder-arrow">↓ Physical Address (20-Bit)</div>
                <div class="adder-result mono" id="pipe-phys-addr">07000H</div>
              </div>
            </div>

            <!-- 6-Byte Instruction Prefetch Queue (FIFO) -->
            <div class="biu-section queue-section">
              <div class="queue-header">
                <div class="sub-section-title">6-Byte Instruction Prefetch Queue (FIFO)</div>
                <span class="queue-status" id="pipe-queue-status">6 bytes active</span>
              </div>
              <div class="queue-container">
                <div class="queue-marker-head">◀ Head (to EU)</div>
                <div class="queue-slots">
                  <div class="queue-slot" data-index="0"><span class="slot-num">Q1</span><span class="slot-val mono" id="q-slot-0">--</span></div>
                  <div class="queue-slot" data-index="1"><span class="slot-num">Q2</span><span class="slot-val mono" id="q-slot-1">--</span></div>
                  <div class="queue-slot" data-index="2"><span class="slot-num">Q3</span><span class="slot-val mono" id="q-slot-2">--</span></div>
                  <div class="queue-slot" data-index="3"><span class="slot-num">Q4</span><span class="slot-val mono" id="q-slot-3">--</span></div>
                  <div class="queue-slot" data-index="4"><span class="slot-num">Q5</span><span class="slot-val mono" id="q-slot-4">--</span></div>
                  <div class="queue-slot" data-index="5"><span class="slot-num">Q6</span><span class="slot-val mono" id="q-slot-5">--</span></div>
                </div>
                <div class="queue-marker-tail">Tail (from Bus) ◀</div>
              </div>
            </div>

            <!-- Bus Control Logic & Pins -->
            <div class="biu-section bus-control-section">
              <div class="sub-section-title">Bus Control & Status Lines</div>
              <div class="pin-grid">
                <span class="pin-chip active" id="pin-ale">ALE: 1</span>
                <span class="pin-chip" id="pin-mio">M/IO: 1</span>
                <span class="pin-chip" id="pin-rd">RD: 0</span>
                <span class="pin-chip" id="pin-wr">WR: 0</span>
                <span class="pin-chip" id="pin-tstate">State: T1</span>
              </div>
            </div>
          </div>

          <!-- INTER-UNIT PIPELINE BUS CONDUIT -->
          <div class="pipeline-conduit">
            <div class="conduit-line conduit-fetch" id="conduit-fetch">
              <div class="conduit-label">Fetch Opcode Stream</div>
              <div class="conduit-pulse pulse-fetch"></div>
            </div>
            <div class="conduit-line conduit-data" id="conduit-data">
              <div class="conduit-label">Operand & Result Bus</div>
              <div class="conduit-pulse pulse-data"></div>
            </div>
            <div class="conduit-line conduit-control" id="conduit-control">
              <div class="conduit-label">Control Signals</div>
              <div class="conduit-pulse pulse-control"></div>
            </div>
          </div>

          <!-- RIGHT: EXECUTION UNIT (EU) -->
          <div class="unit-card eu-card">
            <div class="unit-header">
              <div class="unit-title">
                <span class="unit-badge eu-badge">EU</span>
                <span>Execution Unit</span>
              </div>
              <span class="unit-freq" id="pipe-eu-status">Status: Ready</span>
            </div>

            <!-- Instruction Decoder & Control System -->
            <div class="eu-section decoder-section">
              <div class="sub-section-title">Instruction Decoder & Micro-Control</div>
              <div class="decoder-card">
                <div class="decoder-inst mono" id="pipe-current-instruction">NOP</div>
                <div class="decoder-details" id="pipe-decoder-details">Waiting for instruction...</div>
              </div>
            </div>

            <!-- 16-Bit Arithmetic Logic Unit (ALU) Graphic -->
            <div class="eu-section alu-section">
              <div class="sub-section-title">16-Bit Arithmetic Logic Unit (ALU)</div>
              <div class="alu-visual-container">
                <div class="alu-inputs">
                  <div class="alu-op-box">
                    <span class="alu-op-label">Operand A</span>
                    <span class="alu-op-val mono" id="pipe-alu-opA">0000</span>
                  </div>
                  <div class="alu-op-badge" id="pipe-alu-action">+</div>
                  <div class="alu-op-box">
                    <span class="alu-op-label">Operand B</span>
                    <span class="alu-op-val mono" id="pipe-alu-opB">0000</span>
                  </div>
                </div>
                <!-- Stylized Trapezoid ALU Graphic -->
                <div class="alu-trapezoid">
                  <span class="alu-core-text">ALU CORE (16-bit)</span>
                </div>
                <div class="alu-output">
                  <span class="alu-out-label">Output Result</span>
                  <span class="alu-out-val mono" id="pipe-alu-result">0000</span>
                </div>
              </div>
            </div>

            <!-- General Purpose & Pointer Registers in EU -->
            <div class="eu-section">
              <div class="sub-section-title">General Registers & Pointers</div>
              <div class="eu-reg-grid">
                <div class="eu-reg-item" id="pipe-reg-AX"><span class="lbl">AX</span><span class="val mono" id="pipe-val-AX">0000</span></div>
                <div class="eu-reg-item" id="pipe-reg-BX"><span class="lbl">BX</span><span class="val mono" id="pipe-val-BX">0000</span></div>
                <div class="eu-reg-item" id="pipe-reg-CX"><span class="lbl">CX</span><span class="val mono" id="pipe-val-CX">0000</span></div>
                <div class="eu-reg-item" id="pipe-reg-DX"><span class="lbl">DX</span><span class="val mono" id="pipe-val-DX">0000</span></div>
                <div class="eu-reg-item" id="pipe-reg-SP"><span class="lbl">SP</span><span class="val mono" id="pipe-val-SP">FFFE</span></div>
                <div class="eu-reg-item" id="pipe-reg-BP"><span class="lbl">BP</span><span class="val mono" id="pipe-val-BP">0000</span></div>
                <div class="eu-reg-item" id="pipe-reg-SI"><span class="lbl">SI</span><span class="val mono" id="pipe-val-SI">0000</span></div>
                <div class="eu-reg-item" id="pipe-reg-DI"><span class="lbl">DI</span><span class="val mono" id="pipe-val-DI">0000</span></div>
              </div>
            </div>

            <!-- Status Flags Register Output -->
            <div class="eu-section flags-mini-section">
              <div class="sub-section-title">Flags Register (PSW)</div>
              <div class="pipe-flags-bar" id="pipe-flags-bar">
                <span class="pipe-flag" id="pflag-OF">OF:0</span>
                <span class="pipe-flag" id="pflag-DF">DF:0</span>
                <span class="pipe-flag" id="pflag-IF">IF:1</span>
                <span class="pipe-flag" id="pflag-TF">TF:0</span>
                <span class="pipe-flag" id="pflag-SF">SF:0</span>
                <span class="pipe-flag" id="pflag-ZF">ZF:0</span>
                <span class="pipe-flag" id="pflag-AF">AF:0</span>
                <span class="pipe-flag" id="pflag-PF">PF:0</span>
                <span class="pipe-flag" id="pflag-CF">CF:0</span>
              </div>
            </div>
          </div>
        </div>

        <!-- BOTTOM: SYSTEM BUS & EXTERNAL MEMORY INTERFACE -->
        <div class="system-bus-card">
          <div class="bus-label-row">
            <div class="bus-highway-title">
              <span class="bus-icon">⚡</span>
              <span>External System Bus & Memory Controller (20-Bit Address / 16-Bit Data)</span>
            </div>
            <div class="bus-metrics mono">
              <span>ADDR: <strong id="pipe-bus-addr">07000H</strong></span>
              <span>DATA: <strong id="pipe-bus-data">B8 01H</strong></span>
              <span>CYCLE: <strong id="pipe-bus-cycle">MEMORY FETCH</strong></span>
            </div>
          </div>
          <div class="bus-lines-visual">
            <div class="bus-wire wire-address"><span class="wire-tag">A0..A19 (20-bit Address Bus)</span></div>
            <div class="bus-wire wire-data"><span class="wire-tag">D0..D15 (16-bit Data Bus)</span></div>
            <div class="bus-wire wire-control"><span class="wire-tag">Control Signals (M/IO, RD, WR, INTA)</span></div>
          </div>
        </div>
      </div>
    `;
  }

  // Update animated pipeline with live CPU execution state
  update() {
    if (!this.cpu || !this.cpu.registers) return;

    const regs = this.cpu.registers;
    const ip = regs.IP || 0;
    const cs = regs.CS || 0x0700;
    const ds = regs.DS || 0x0710;
    const ss = regs.SS || 0x0700;
    const es = regs.ES || 0x0700;

    // 1. Calculate 20-bit physical address
    const physAddr = ((cs << 4) + ip) & 0xFFFFF;
    const physHex = physAddr.toString(16).toUpperCase().padStart(5, '0');

    this.setElText('pipe-adder-seg', cs.toString(16).toUpperCase().padStart(4, '0'));
    this.setElText('pipe-adder-ip', ip.toString(16).toUpperCase().padStart(4, '0'));
    this.setElText('pipe-phys-addr', `${physHex}H`);
    this.setElText('pipe-bus-addr', `${physHex}H`);

    // 2. Update Segment Registers
    this.setElText('pipe-reg-CS', cs.toString(16).toUpperCase().padStart(4, '0'), '.val');
    this.setElText('pipe-reg-DS', ds.toString(16).toUpperCase().padStart(4, '0'), '.val');
    this.setElText('pipe-reg-SS', ss.toString(16).toUpperCase().padStart(4, '0'), '.val');
    this.setElText('pipe-reg-ES', es.toString(16).toUpperCase().padStart(4, '0'), '.val');
    this.setElText('pipe-reg-IP', ip.toString(16).toUpperCase().padStart(4, '0'), '.val');

    // 3. Update General Registers in EU
    ['AX', 'BX', 'CX', 'DX', 'SP', 'BP', 'SI', 'DI'].forEach(r => {
      const val = regs[r] || 0;
      this.setElText(`pipe-val-${r}`, val.toString(16).toUpperCase().padStart(4, '0'));
    });

    // 4. Update Status Flags
    ['OF', 'DF', 'IF', 'TF', 'SF', 'ZF', 'AF', 'PF', 'CF'].forEach(f => {
      const el = document.getElementById(`pflag-${f}`);
      if (el) {
        const val = regs.flags[f] ? 1 : 0;
        el.textContent = `${f}:${val}`;
        el.classList.toggle('active', !!regs.flags[f]);
      }
    });

    // 5. Update Current Decoded Instruction
    const instructions = this.cpu.instructions || [];
    const currentInstr = instructions[ip];
    const prevInstr = ip > 0 ? instructions[ip - 1] : currentInstr;

    if (currentInstr) {
      this.setElText('pipe-current-instruction', currentInstr.origText || currentInstr.mnemonic);
      this.setElText('pipe-decoder-details', `Decoded Mnemonic: ${currentInstr.mnemonic} | Type: ${currentInstr.type || 'EXEC'}`);
    } else {
      this.setElText('pipe-current-instruction', 'HALT / END');
      this.setElText('pipe-decoder-details', 'Program terminated or halted');
    }

    // 6. Prefetch Queue Simulation (6 Bytes)
    this.updatePrefetchQueue(instructions, ip);

    // 7. Update ALU visualization based on active instruction
    this.updateALU(currentInstr || prevInstr, regs);

    // 8. Cycle & Counts Update
    this.instructionCount = ip;
    this.cycleCount = ip * 4 + 2; // Average 4 T-states per 8086 instruction
    this.setElText('pipe-instr-count', this.instructionCount);
    this.setElText('pipe-cycle-count', this.cycleCount);

    // 9. Trigger animated pipeline pulses
    this.animatePulse(currentInstr);
  }

  updatePrefetchQueue(instructions, ip) {
    // Generate realistic machine byte stream preview for the 6-byte prefetch buffer
    const mockBytes = [];
    for (let i = ip; i < ip + 6; i++) {
      if (instructions[i]) {
        // Approximate opcode byte from instruction mnemonic
        const opByte = this.getApproxOpcode(instructions[i]);
        mockBytes.push(opByte);
      } else {
        mockBytes.push('--');
      }
    }

    for (let s = 0; s < 6; s++) {
      const slotEl = document.getElementById(`q-slot-${s}`);
      if (slotEl) {
        slotEl.textContent = mockBytes[s] || '--';
        slotEl.parentElement.classList.toggle('occupied', mockBytes[s] !== '--');
      }
    }

    const occupiedCount = mockBytes.filter(b => b !== '--').length;
    this.setElText('pipe-queue-status', `${occupiedCount} / 6 bytes queued`);
  }

  getApproxOpcode(instr) {
    if (!instr) return '--';
    const m = (instr.mnemonic || '').toUpperCase();
    if (m === 'MOV') return 'B8';
    if (m === 'ADD') return '03';
    if (m === 'SUB') return '2B';
    if (m === 'INC') return '40';
    if (m === 'DEC') return '48';
    if (m === 'CMP') return '3B';
    if (m === 'JMP') return 'E9';
    if (m.startsWith('J')) return '74';
    if (m === 'INT') return 'CD';
    if (m === 'PUSH') return '50';
    if (m === 'POP') return '58';
    if (m === 'XOR') return '33';
    if (m === 'AND') return '23';
    if (m === 'OR') return '0B';
    return '90';
  }

  updateALU(instr, regs) {
    if (!instr) return;
    const m = (instr.mnemonic || '').toUpperCase();

    let opA = '0000';
    let opB = '0000';
    let action = '+';
    let result = '0000';

    if (m === 'ADD') {
      action = '+';
      opA = (regs.AX || 0).toString(16).toUpperCase().padStart(4, '0');
      opB = (regs.BX || 0).toString(16).toUpperCase().padStart(4, '0');
      result = (((regs.AX || 0) + (regs.BX || 0)) & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
    } else if (m === 'SUB' || m === 'CMP') {
      action = '-';
      opA = (regs.AX || 0).toString(16).toUpperCase().padStart(4, '0');
      opB = (regs.BX || 0).toString(16).toUpperCase().padStart(4, '0');
      result = (((regs.AX || 0) - (regs.BX || 0)) & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
    } else if (m === 'INC') {
      action = '+1';
      opA = (regs.AX || 0).toString(16).toUpperCase().padStart(4, '0');
      opB = '0001';
      result = (((regs.AX || 0) + 1) & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
    } else if (m === 'DEC') {
      action = '-1';
      opA = (regs.AX || 0).toString(16).toUpperCase().padStart(4, '0');
      opB = '0001';
      result = (((regs.AX || 0) - 1) & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
    } else if (m === 'AND') {
      action = 'AND';
      opA = (regs.AX || 0).toString(16).toUpperCase().padStart(4, '0');
      opB = (regs.BX || 0).toString(16).toUpperCase().padStart(4, '0');
      result = (((regs.AX || 0) & (regs.BX || 0)) & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
    } else if (m === 'OR') {
      action = 'OR';
      opA = (regs.AX || 0).toString(16).toUpperCase().padStart(4, '0');
      opB = (regs.BX || 0).toString(16).toUpperCase().padStart(4, '0');
      result = (((regs.AX || 0) | (regs.BX || 0)) & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
    } else if (m === 'XOR') {
      action = 'XOR';
      opA = (regs.AX || 0).toString(16).toUpperCase().padStart(4, '0');
      opB = (regs.AX || 0).toString(16).toUpperCase().padStart(4, '0');
      result = '0000';
    } else if (m === 'MOV') {
      action = 'LOAD';
      opA = (regs.AX || 0).toString(16).toUpperCase().padStart(4, '0');
      opB = '--';
      result = opA;
    } else if (m === 'INT') {
      action = 'INT CALL';
      opA = (regs.AH || 0).toString(16).toUpperCase().padStart(2, '0') + 'h';
      opB = '21h';
      result = 'ISR DISPATCH';
    }

    this.setElText('pipe-alu-opA', opA);
    this.setElText('pipe-alu-opB', opB);
    this.setElText('pipe-alu-action', action);
    this.setElText('pipe-alu-result', result);
  }

  animatePulse(instr) {
    const isMem = instr && (instr.origText || '').includes('[');
    const m = (instr?.mnemonic || '').toUpperCase();

    // Pulse pipeline conduit signals
    const pulseFetch = document.querySelector('.pulse-fetch');
    const pulseData = document.querySelector('.pulse-data');
    const pulseControl = document.querySelector('.pulse-control');

    [pulseFetch, pulseData, pulseControl].forEach(p => {
      if (p) {
        p.classList.remove('active');
        void p.offsetWidth; // Trigger reflow for re-animation
        p.classList.add('active');
      }
    });

    // Update bus cycle banner
    const busCycle = isMem ? 'MEMORY READ/WRITE' : (m === 'INT' ? 'INT ACKNOWLEDGE' : 'OPCODE FETCH');
    this.setElText('pipe-bus-status', `BUS: ${busCycle}`);
    this.setElText('pipe-bus-cycle', busCycle);

    // Highlight active pipeline phase chip
    const phaseChips = document.querySelectorAll('.phase-chip');
    phaseChips.forEach(c => c.classList.remove('active'));

    const activePhase = isMem ? 'WRITEBACK' : 'EXECUTE';
    const activeChip = document.querySelector(`.phase-chip[data-phase="${activePhase}"]`);
    if (activeChip) activeChip.classList.add('active');
  }

  setElText(id, text, subSelector) {
    const el = document.getElementById(id);
    if (el) {
      if (subSelector) {
        const sub = el.querySelector(subSelector);
        if (sub) sub.textContent = text;
      } else {
        el.textContent = text;
      }
    }
  }
}
