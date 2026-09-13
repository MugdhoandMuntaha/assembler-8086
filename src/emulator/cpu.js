/**
 * 8086 CPU Execution Engine & Interrupt Controller
 */

export const CPU_STATE = {
  STOPPED: 'STOPPED',
  RUNNING: 'RUNNING',
  PAUSED: 'PAUSED',
  WAITING_FOR_INPUT: 'WAITING_FOR_INPUT',
  HALTED: 'HALTED',
  ERROR: 'ERROR'
};

export class CPU {
  constructor(registers, memory, terminal) {
    this.registers = registers;
    this.memory = memory;
    this.terminal = terminal;

    this.instructions = [];
    this.symbolTable = {};
    this.state = CPU_STATE.STOPPED;
    this.errorMessage = '';
    this.speedMs = 100; // Execution delay in ms for automatic run mode
    this.timer = null;
    this.onStateChange = null; // Callback function for UI updates
  }

  loadProgram(program) {
    this.stop();
    this.instructions = program.instructions;
    this.symbolTable = program.symbolTable;
    this.registers.IP = 0;
    this.state = CPU_STATE.PAUSED;
    this.errorMessage = '';
    if (this.onStateChange) this.onStateChange();
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.state = CPU_STATE.STOPPED;
    this.registers.IP = 0;
    if (this.onStateChange) this.onStateChange();
  }

  pause() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.state = CPU_STATE.PAUSED;
    if (this.onStateChange) this.onStateChange();
  }

  run() {
    if (this.state === CPU_STATE.HALTED || this.instructions.length === 0) return;
    this.state = CPU_STATE.RUNNING;
    if (this.onStateChange) this.onStateChange();

    this.executeLoop();
  }

  executeLoop() {
    if (this.timer) clearInterval(this.timer);

    const stepInterval = () => {
      if (this.state !== CPU_STATE.RUNNING) return;
      const success = this.step();
      if (!success || this.state !== CPU_STATE.RUNNING) {
        clearInterval(this.timer);
        this.timer = null;
      }
    };

    if (this.speedMs === 0) {
      // Maximum speed execution
      while (this.state === CPU_STATE.RUNNING) {
        const ok = this.step();
        if (!ok) break;
      }
    } else {
      this.timer = setInterval(stepInterval, this.speedMs);
    }
  }

  step() {
    if (this.registers.IP < 0 || this.registers.IP >= this.instructions.length) {
      this.state = CPU_STATE.HALTED;
      if (this.onStateChange) this.onStateChange();
      return false;
    }

    const instr = this.instructions[this.registers.IP];
    const prevIP = this.registers.IP;

    try {
      this.executeInstruction(instr);
      // Advance IP if jump/call instruction didn't alter IP directly
      if (this.registers.IP === prevIP && this.state !== CPU_STATE.WAITING_FOR_INPUT) {
        this.registers.IP++;
      }
    } catch (err) {
      this.state = CPU_STATE.ERROR;
      this.errorMessage = `Error at line ${instr.lineNum} (${instr.origText}): ${err.message}`;
      if (this.onStateChange) this.onStateChange();
      return false;
    }

    if (this.registers.IP >= this.instructions.length && this.state !== CPU_STATE.WAITING_FOR_INPUT) {
      this.state = CPU_STATE.HALTED;
    }

    if (this.onStateChange) this.onStateChange();
    return this.state === CPU_STATE.RUNNING || this.state === CPU_STATE.PAUSED;
  }

  // Evaluate operand value
  readOperand(op) {
    if (!op) return 0;

    switch (op.type) {
      case 'IMM':
        return op.value;
      case 'REG':
        return this.registers.getByName(op.value);
      case 'LABEL':
        return op.offset;
      case 'MEM_DIRECT':
        return op.size === 1
          ? this.memory.read8(this.registers.DS, op.offset)
          : this.memory.read16(this.registers.DS, op.offset);
      case 'MEM_INDIRECT': {
        const addr = this.resolveIndirectAddress(op);
        const seg = op.baseReg === 'BP' ? this.registers.SS : this.registers.DS;
        return op.size === 1
          ? this.memory.read8(seg, addr)
          : this.memory.read16(seg, addr);
      }
      default:
        return 0;
    }
  }

  // Write value to destination operand
  writeOperand(op, val, is8BitHint = false) {
    if (!op) return;

    switch (op.type) {
      case 'REG':
        this.registers.setByName(op.value, val);
        break;
      case 'MEM_DIRECT':
        if (op.size === 1 || is8BitHint) {
          this.memory.write8(this.registers.DS, op.offset, val);
        } else {
          this.memory.write16(this.registers.DS, op.offset, val);
        }
        break;
      case 'MEM_INDIRECT': {
        const addr = this.resolveIndirectAddress(op);
        const seg = op.baseReg === 'BP' ? this.registers.SS : this.registers.DS;
        if (op.size === 1 || is8BitHint) {
          this.memory.write8(seg, addr, val);
        } else {
          this.memory.write16(seg, addr, val);
        }
        break;
      }
      default:
        throw new Error(`Invalid destination operand type: ${op.type}`);
    }
  }

  resolveIndirectAddress(op) {
    let addr = op.displacement || 0;
    if (op.baseReg) addr += this.registers.getByName(op.baseReg);
    if (op.indexReg) addr += this.registers.getByName(op.indexReg);
    return addr & 0xFFFF;
  }

  // Determine if operation is 8-bit or 16-bit
  is8BitOperation(op1, op2) {
    if (op1 && op1.type === 'REG') return op1.is8Bit;
    if (op2 && op2.type === 'REG') return op2.is8Bit;
    if (op1 && (op1.size === 1 || op1.is8Bit)) return true;
    return false;
  }

  executeInstruction(instr) {
    const { opcode, operands } = instr;
    const op1 = operands[0];
    const op2 = operands[1];
    const is8Bit = this.is8BitOperation(op1, op2);

    switch (opcode) {
      case 'MOV': {
        const val = this.readOperand(op2);
        this.writeOperand(op1, val, is8Bit);
        break;
      }

      case 'LEA': {
        if (op2.type === 'MEM_DIRECT') {
          this.writeOperand(op1, op2.offset);
        } else if (op2.type === 'MEM_INDIRECT') {
          const addr = this.resolveIndirectAddress(op2);
          this.writeOperand(op1, addr);
        } else {
          throw new Error('LEA requires memory operand');
        }
        break;
      }

      case 'ADD': {
        const v1 = this.readOperand(op1);
        const v2 = this.readOperand(op2);
        const result = v1 + v2;
        this.writeOperand(op1, result, is8Bit);

        this.registers.updateZSP(result, is8Bit);
        const maxVal = is8Bit ? 0xFF : 0xFFFF;
        this.registers.flags.CF = result > maxVal ? 1 : 0;
        break;
      }

      case 'SUB': {
        const v1 = this.readOperand(op1);
        const v2 = this.readOperand(op2);
        const result = v1 - v2;
        this.writeOperand(op1, result, is8Bit);

        this.registers.updateZSP(result, is8Bit);
        this.registers.flags.CF = v1 < v2 ? 1 : 0;
        break;
      }

      case 'INC': {
        const v = this.readOperand(op1);
        const result = v + 1;
        this.writeOperand(op1, result, is8Bit);
        this.registers.updateZSP(result, is8Bit);
        break;
      }

      case 'DEC': {
        const v = this.readOperand(op1);
        const result = v - 1;
        this.writeOperand(op1, result, is8Bit);
        this.registers.updateZSP(result, is8Bit);
        break;
      }

      case 'CMP': {
        const v1 = this.readOperand(op1);
        const v2 = this.readOperand(op2);
        const result = v1 - v2;
        this.registers.updateZSP(result, is8Bit);
        this.registers.flags.CF = v1 < v2 ? 1 : 0;
        break;
      }

      case 'MUL': {
        const v = this.readOperand(op1);
        if (is8Bit) {
          const res = this.registers.AL * (v & 0xFF);
          this.registers.AX = res & 0xFFFF;
          this.registers.flags.CF = (res > 0xFF) ? 1 : 0;
        } else {
          const res = this.registers.AX * (v & 0xFFFF);
          this.registers.AX = res & 0xFFFF;
          this.registers.DX = (res >> 16) & 0xFFFF;
          this.registers.flags.CF = (res > 0xFFFF) ? 1 : 0;
        }
        break;
      }

      case 'DIV': {
        const v = this.readOperand(op1);
        if (v === 0) throw new Error('Divide by zero');
        if (is8Bit) {
          const ax = this.registers.AX;
          this.registers.AL = Math.floor(ax / v) & 0xFF;
          this.registers.AH = (ax % v) & 0xFF;
        } else {
          const dxax = (this.registers.DX << 16) | this.registers.AX;
          this.registers.AX = Math.floor(dxax / v) & 0xFFFF;
          this.registers.DX = (dxax % v) & 0xFFFF;
        }
        break;
      }

      case 'AND': {
        const v1 = this.readOperand(op1);
        const v2 = this.readOperand(op2);
        const res = v1 & v2;
        this.writeOperand(op1, res, is8Bit);
        this.registers.updateZSP(res, is8Bit);
        this.registers.flags.CF = 0;
        this.registers.flags.OF = 0;
        break;
      }

      case 'OR': {
        const v1 = this.readOperand(op1);
        const v2 = this.readOperand(op2);
        const res = v1 | v2;
        this.writeOperand(op1, res, is8Bit);
        this.registers.updateZSP(res, is8Bit);
        this.registers.flags.CF = 0;
        this.registers.flags.OF = 0;
        break;
      }

      case 'XOR': {
        const v1 = this.readOperand(op1);
        const v2 = this.readOperand(op2);
        const res = v1 ^ v2;
        this.writeOperand(op1, res, is8Bit);
        this.registers.updateZSP(res, is8Bit);
        this.registers.flags.CF = 0;
        this.registers.flags.OF = 0;
        break;
      }

      case 'NOT': {
        const v = this.readOperand(op1);
        const mask = is8Bit ? 0xFF : 0xFFFF;
        const res = (~v) & mask;
        this.writeOperand(op1, res, is8Bit);
        break;
      }

      case 'NEG': {
        const v = this.readOperand(op1);
        const mask = is8Bit ? 0xFF : 0xFFFF;
        const res = (-v) & mask;
        this.writeOperand(op1, res, is8Bit);
        this.registers.updateZSP(res, is8Bit);
        this.registers.flags.CF = v !== 0 ? 1 : 0;
        break;
      }

      case 'SHL':
      case 'SAL': {
        const v = this.readOperand(op1);
        const cnt = op2 ? this.readOperand(op2) : 1;
        const res = (v << cnt);
        this.writeOperand(op1, res, is8Bit);
        this.registers.updateZSP(res, is8Bit);
        break;
      }

      case 'SHR': {
        const v = this.readOperand(op1);
        const cnt = op2 ? this.readOperand(op2) : 1;
        const res = (v >> cnt);
        this.writeOperand(op1, res, is8Bit);
        this.registers.updateZSP(res, is8Bit);
        break;
      }

      // Jumps
      case 'JMP': {
        const targetIP = this.resolveJumpTarget(op1);
        this.registers.IP = targetIP;
        break;
      }
      case 'JE':
      case 'JZ': {
        if (this.registers.flags.ZF === 1) {
          this.registers.IP = this.resolveJumpTarget(op1);
        }
        break;
      }
      case 'JNE':
      case 'JNZ': {
        if (this.registers.flags.ZF === 0) {
          this.registers.IP = this.resolveJumpTarget(op1);
        }
        break;
      }
      case 'JL':
      case 'JNGE': {
        if (this.registers.flags.SF !== this.registers.flags.OF) {
          this.registers.IP = this.resolveJumpTarget(op1);
        }
        break;
      }
      case 'JLE':
      case 'JNG': {
        if (this.registers.flags.ZF === 1 || (this.registers.flags.SF !== this.registers.flags.OF)) {
          this.registers.IP = this.resolveJumpTarget(op1);
        }
        break;
      }
      case 'JG':
      case 'JNLE': {
        if (this.registers.flags.ZF === 0 && (this.registers.flags.SF === this.registers.flags.OF)) {
          this.registers.IP = this.resolveJumpTarget(op1);
        }
        break;
      }
      case 'JGE':
      case 'JNL': {
        if (this.registers.flags.SF === this.registers.flags.OF) {
          this.registers.IP = this.resolveJumpTarget(op1);
        }
        break;
      }
      case 'JC':
      case 'JB': {
        if (this.registers.flags.CF === 1) {
          this.registers.IP = this.resolveJumpTarget(op1);
        }
        break;
      }
      case 'JNC':
      case 'JNB':
      case 'JAE': {
        if (this.registers.flags.CF === 0) {
          this.registers.IP = this.resolveJumpTarget(op1);
        }
        break;
      }

      case 'LOOP': {
        this.registers.CX = (this.registers.CX - 1) & 0xFFFF;
        if (this.registers.CX !== 0) {
          this.registers.IP = this.resolveJumpTarget(op1);
        }
        break;
      }

      case 'CALL': {
        // Push return IP onto stack
        const returnIP = this.registers.IP + 1;
        this.pushStack(returnIP);
        this.registers.IP = this.resolveJumpTarget(op1);
        break;
      }

      case 'RET': {
        const returnIP = this.popStack();
        this.registers.IP = returnIP;
        break;
      }

      case 'PUSH': {
        const val = this.readOperand(op1);
        this.pushStack(val);
        break;
      }

      case 'POP': {
        const val = this.popStack();
        this.writeOperand(op1, val);
        break;
      }

      case 'XCHG': {
        const v1 = this.readOperand(op1);
        const v2 = this.readOperand(op2);
        this.writeOperand(op1, v2, is8Bit);
        this.writeOperand(op2, v1, is8Bit);
        break;
      }

      // Interrupts
      case 'INT': {
        const intNum = this.readOperand(op1);
        this.handleInterrupt(intNum);
        break;
      }

      case 'NOP':
        break;

      default:
        throw new Error(`Unsupported opcode: ${opcode}`);
    }
  }

  resolveJumpTarget(op) {
    if (op.type === 'LABEL' && this.symbolTable[op.value]) {
      return this.symbolTable[op.value].offset;
    }
    if (op.type === 'IMM' || typeof op.offset === 'number') {
      return op.offset !== undefined ? op.offset : op.value;
    }
    return op.value;
  }

  pushStack(val) {
    this.registers.SP = (this.registers.SP - 2) & 0xFFFF;
    this.memory.write16(this.registers.SS, this.registers.SP, val);
  }

  popStack() {
    const val = this.memory.read16(this.registers.SS, this.registers.SP);
    this.registers.SP = (this.registers.SP + 2) & 0xFFFF;
    return val;
  }

  // DOS & BIOS Interrupt Handler
  handleInterrupt(intNum) {
    if (intNum === 0x21) {
      // DOS Interrupt 21h
      const ah = this.registers.AH;

      if (ah === 0x01) {
        // Read character from terminal with echo
        this.pauseForInput((char) => {
          const charCode = char.charCodeAt(0);
          this.registers.AL = charCode;
          this.terminal.printChar(char);
        });
      } else if (ah === 0x02) {
        // Output character in DL
        const charCode = this.registers.DL;
        this.terminal.printChar(String.fromCharCode(charCode));
      } else if (ah === 0x09) {
        // Display string at DS:DX ending with '$'
        const dx = this.registers.DX;
        const str = this.memory.readDosString(this.registers.DS, dx);
        this.terminal.printString(str);
      } else if (ah === 0x0A) {
        // Buffered String Input at DS:DX
        const bufferAddr = this.registers.DX;
        const maxLen = this.memory.read8(this.registers.DS, bufferAddr);

        this.pauseForLineInput((lineStr) => {
          const actualLen = Math.min(lineStr.length, maxLen - 1);
          this.memory.write8(this.registers.DS, bufferAddr + 1, actualLen);
          for (let i = 0; i < actualLen; i++) {
            this.memory.write8(this.registers.DS, bufferAddr + 2 + i, lineStr.charCodeAt(i));
          }
          this.memory.write8(this.registers.DS, bufferAddr + 2 + actualLen, 0x0D); // CR
          this.terminal.printString(lineStr + '\n');
        });
      } else if (ah === 0x4C) {
        // Exit program
        this.state = CPU_STATE.HALTED;
        this.terminal.printString('\n[Program terminated with return code 0]\n');
      }
    }
  }

  pauseForInput(callback) {
    this.state = CPU_STATE.WAITING_FOR_INPUT;
    if (this.timer) clearInterval(this.timer);

    this.terminal.requestSingleCharInput((char) => {
      callback(char);
      this.state = CPU_STATE.RUNNING;
      this.registers.IP++;
      if (this.onStateChange) this.onStateChange();
      this.executeLoop();
    });
  }

  pauseForLineInput(callback) {
    this.state = CPU_STATE.WAITING_FOR_INPUT;
    if (this.timer) clearInterval(this.timer);

    this.terminal.requestLineInput((lineStr) => {
      callback(lineStr);
      this.state = CPU_STATE.RUNNING;
      this.registers.IP++;
      if (this.onStateChange) this.onStateChange();
      this.executeLoop();
    });
  }
}
