/**
 * 8086 Register Set & Status Flags Management
 */

export class Registers {
  constructor() {
    this.reset();
  }

  reset() {
    // 16-bit General Purpose & Pointer / Index Registers
    this.AX = 0x0000;
    this.BX = 0x0000;
    this.CX = 0x0000;
    this.DX = 0x0000;
    this.SI = 0x0000;
    this.DI = 0x0000;
    this.BP = 0x0000;
    this.SP = 0x0100; // Stack pointer default
    this.IP = 0x0000; // Instruction Pointer

    // Segment Registers
    this.CS = 0x0700; // Code Segment default
    this.DS = 0x0710; // Data Segment default
    this.SS = 0x0720; // Stack Segment default
    this.ES = 0x0730; // Extra Segment default

    // Status & Control Flags
    this.flags = {
      CF: 0, // Carry Flag
      PF: 0, // Parity Flag
      AF: 0, // Auxiliary Carry Flag
      ZF: 0, // Zero Flag
      SF: 0, // Sign Flag
      TF: 0, // Trap Flag
      IF: 1, // Interrupt Enable Flag
      DF: 0, // Direction Flag
      OF: 0, // Overflow Flag
    };
  }

  // 8-bit register accessors
  get AH() { return (this.AX >> 8) & 0xFF; }
  set AH(val) { this.AX = ((val & 0xFF) << 8) | (this.AX & 0xFF); }

  get AL() { return this.AX & 0xFF; }
  set AL(val) { this.AX = (this.AX & 0xFF00) | (val & 0xFF); }

  get BH() { return (this.BX >> 8) & 0xFF; }
  set BH(val) { this.BX = ((val & 0xFF) << 8) | (this.BX & 0xFF); }

  get BL() { return this.BX & 0xFF; }
  set BL(val) { this.BX = (this.BX & 0xFF00) | (val & 0xFF); }

  get CH() { return (this.CX >> 8) & 0xFF; }
  set CH(val) { this.CX = ((val & 0xFF) << 8) | (this.CX & 0xFF); }

  get CL() { return this.CX & 0xFF; }
  set CL(val) { this.CX = (this.CX & 0xFF00) | (val & 0xFF); }

  get DH() { return (this.DX >> 8) & 0xFF; }
  set DH(val) { this.DX = ((val & 0xFF) << 8) | (this.DX & 0xFF); }

  get DL() { return this.DX & 0xFF; }
  set DL(val) { this.DX = (this.DX & 0xFF00) | (val & 0xFF); }

  // Generic getter by string name ('AX', 'AL', 'AH', etc.)
  getByName(name) {
    const regName = name.toUpperCase();
    if (regName in this) return this[regName];
    if (['AH', 'AL', 'BH', 'BL', 'CH', 'CL', 'DH', 'DL'].includes(regName)) {
      return this[regName];
    }
    throw new Error(`Unknown register: ${name}`);
  }

  setByName(name, val) {
    const regName = name.toUpperCase();
    const is8bit = ['AH', 'AL', 'BH', 'BL', 'CH', 'CL', 'DH', 'DL'].includes(regName);
    const maskedVal = is8bit ? (val & 0xFF) : (val & 0xFFFF);
    
    if (regName in this || is8bit) {
      this[regName] = maskedVal;
    } else {
      throw new Error(`Unknown register: ${name}`);
    }
  }

  is8BitRegister(name) {
    return ['AH', 'AL', 'BH', 'BL', 'CH', 'CL', 'DH', 'DL'].includes(name.toUpperCase());
  }

  is16BitRegister(name) {
    return ['AX', 'BX', 'CX', 'DX', 'SI', 'DI', 'BP', 'SP', 'IP', 'CS', 'DS', 'SS', 'ES'].includes(name.toUpperCase());
  }

  // Update Zero, Sign, Parity flags based on result and size (8 or 16 bit)
  updateZSP(result, is8Bit = false) {
    const mask = is8Bit ? 0xFF : 0xFFFF;
    const signBit = is8Bit ? 0x80 : 0x8000;
    const val = result & mask;

    this.flags.ZF = val === 0 ? 1 : 0;
    this.flags.SF = (val & signBit) ? 1 : 0;

    // Parity flag is set if lower 8 bits have an even number of set bits (1s)
    let lowByte = val & 0xFF;
    let ones = 0;
    while (lowByte > 0) {
      if (lowByte & 1) ones++;
      lowByte >>= 1;
    }
    this.flags.PF = (ones % 2 === 0) ? 1 : 0;
  }
}
