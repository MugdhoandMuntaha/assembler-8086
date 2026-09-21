/**
 * 8086 1MB Memory Controller (Segmented Access)
 */

export class Memory {
  constructor() {
    // 1 MB physical memory (0x00000 to 0xFFFFF)
    this.ram = new Uint8Array(1048576);
    this.reset();
  }

  reset() {
    this.ram.fill(0);
  }

  getPhysicalAddress(segment, offset) {
    return (((segment & 0xFFFF) << 4) + (offset & 0xFFFF)) & 0xFFFFF;
  }

  read8(segment, offset) {
    const addr = this.getPhysicalAddress(segment, offset);
    return this.ram[addr];
  }

  write8(segment, offset, val) {
    const addr = this.getPhysicalAddress(segment, offset);
    this.ram[addr] = val & 0xFF;
  }

  read16(segment, offset) {
    const addr = this.getPhysicalAddress(segment, offset);
    const low = this.ram[addr];
    const high = this.ram[(addr + 1) & 0xFFFFF];
    return (high << 8) | low;
  }

  write16(segment, offset, val) {
    const addr = this.getPhysicalAddress(segment, offset);
    this.ram[addr] = val & 0xFF;
    this.ram[(addr + 1) & 0xFFFFF] = (val >> 8) & 0xFF;
  }

  // Helper for reading a $' terminated DOS string
  readDosString(segment, offset, maxLen = 0xFFFF) {
    let str = '';
    let currOffset = offset;
    let count = 0;
    while (currOffset < 0xFFFF && count < maxLen) {
      const charCode = this.read8(segment, currOffset);
      if (charCode === 0x24) break; // '$' character
      str += String.fromCharCode(charCode);
      currOffset++;
      count++;
    }
    return str;
  }

  // Helper to dump range for visual UI memory grid
  getSlice(segment, startOffset, length = 128) {
    const slice = [];
    for (let i = 0; i < length; i++) {
      const offset = (startOffset + i) & 0xFFFF;
      const val = this.read8(segment, offset);
      slice.push({ offset, val });
    }
    return slice;
  }
}
