/**
 * 8086 Assembly Parser & Lexer
 */

export class Assembler {
  constructor(memory, registers) {
    this.memory = memory;
    this.registers = registers;
  }

  // Helper to parse numbers in decimal, hex ( ending with H/h or starting with 0x ), binary ( ending in B/b )
  parseNumber(token) {
    if (typeof token !== 'string') return token;
    token = token.trim();

    // Character literal e.g. 'A' or "A"
    if ((token.startsWith("'") && token.endsWith("'") && token.length === 3) ||
        (token.startsWith('"') && token.endsWith('"') && token.length === 3)) {
      return token.charCodeAt(1);
    }

    const upper = token.toUpperCase();
    if (upper === '@DATA') {
      return this.registers.DS;
    }

    // Hex like 100H or 0FFH or 0x100
    if (upper.endsWith('H')) {
      const hexStr = upper.slice(0, -1);
      const val = parseInt(hexStr, 16);
      if (!isNaN(val)) return val;
    }
    if (upper.startsWith('0X')) {
      const val = parseInt(upper.slice(2), 16);
      if (!isNaN(val)) return val;
    }

    // Binary like 1010B
    if (upper.endsWith('B') && /^[01]+B$/.test(upper)) {
      const val = parseInt(upper.slice(0, -1), 2);
      if (!isNaN(val)) return val;
    }

    // Decimal
    const decVal = parseInt(token, 10);
    if (!isNaN(decVal)) return decVal;

    return null;
  }

  parse(sourceCode) {
    const lines = sourceCode.split(/\r?\n/);
    const instructions = [];
    const symbolTable = {}; // name -> { type: 'var'|'label', offset, size: 1|2, length }
    let currentSegment = 'NONE'; // '.DATA' or '.CODE'
    let dataOffset = 0x0000;
    let codeOffset = 0x0000;
    let stackSize = 0x0100; // default 256 bytes stack

    const cleanedLines = [];

    // Phase 1: Preprocess, strip comments, discover sections, variables & labels
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      let rawLine = lines[lineIdx];
      const commentIdx = rawLine.indexOf(';');
      if (commentIdx !== -1) {
        rawLine = rawLine.substring(0, commentIdx);
      }
      const trimmed = rawLine.trim();
      if (!trimmed) continue;

      const lineNum = lineIdx + 1;
      const tokens = this.tokenizeLine(trimmed);
      if (tokens.length === 0) continue;

      const firstTokenUpper = tokens[0].toUpperCase();

      // Check section directives
      if (firstTokenUpper === '.MODEL') {
        continue;
      }
      if (firstTokenUpper === '.STACK') {
        if (tokens.length > 1) {
          const sz = this.parseNumber(tokens[1]);
          if (sz !== null) stackSize = sz;
        }
        continue;
      }
      if (firstTokenUpper === '.DATA') {
        currentSegment = 'DATA';
        continue;
      }
      if (firstTokenUpper === '.CODE') {
        currentSegment = 'CODE';
        continue;
      }

      if (firstTokenUpper === 'END' || firstTokenUpper === 'ENDP') {
        if (tokens.length > 1 && tokens[1].toUpperCase() !== 'MAIN') {
          // might be ENDP MAIN or END MAIN
        }
        continue;
      }

      // Check PROC directive (e.g., MAIN PROC)
      if (tokens.length >= 2 && tokens[1].toUpperCase() === 'PROC') {
        const procName = tokens[0].toUpperCase();
        symbolTable[procName] = { type: 'label', offset: codeOffset };
        continue;
      }

      // Check ENDP directive (e.g., MAIN ENDP or ENDP MAIN)
      if (tokens.length >= 2 && (tokens[1].toUpperCase() === 'ENDP' || tokens[0].toUpperCase() === 'ENDP')) {
        continue;
      }

      // Label definition: `label_name:` or `label_name` followed by instruction in code segment
      if (tokens[0].endsWith(':')) {
        const labelName = tokens[0].slice(0, -1).toUpperCase();
        symbolTable[labelName] = { type: 'label', offset: codeOffset };
        // If there's content after colon
        const restTokens = tokens.slice(1);
        if (restTokens.length > 0) {
          cleanedLines.push({ lineNum, tokens: restTokens, origText: trimmed });
          codeOffset++;
        }
        continue;
      }

      // Data Segment variable declarations
      if (currentSegment === 'DATA') {
        if (tokens.length >= 2 && ['DB', 'DW'].includes(tokens[1].toUpperCase())) {
          const varName = tokens[0].toUpperCase();
          const dataType = tokens[1].toUpperCase(); // DB = byte, DW = word
          const itemSize = dataType === 'DB' ? 1 : 2;
          const varValues = [];

          // Parse data values (handling DUP, strings, arrays)
          const valueTokens = tokens.slice(2);
          const rawValueStr = trimmed.substring(trimmed.indexOf(tokens[1]) + tokens[1].length).trim();

          this.parseDataValues(rawValueStr, dataType, itemSize, varValues);

          // Write variables to Data Segment RAM
          const varOffset = dataOffset;
          for (let i = 0; i < varValues.length; i++) {
            if (itemSize === 1) {
              this.memory.write8(this.registers.DS, varOffset + i, varValues[i]);
            } else {
              this.memory.write16(this.registers.DS, varOffset + (i * 2), varValues[i]);
            }
          }

          symbolTable[varName] = {
            type: 'var',
            offset: varOffset,
            size: itemSize,
            length: varValues.length
          };

          dataOffset += varValues.length * itemSize;
          continue;
        }
      }

      // If we are in code segment or default code line
      cleanedLines.push({ lineNum, tokens, origText: trimmed });
      codeOffset++;
    }

    // Set stack pointer
    this.registers.SP = stackSize;

    // Phase 2: Build Instruction AST
    for (let i = 0; i < cleanedLines.length; i++) {
      const { lineNum, tokens, origText } = cleanedLines[i];
      let opcodeToken = tokens[0].toUpperCase();
      
      // Handle label on same line without colon if recognized
      if (symbolTable[opcodeToken] && symbolTable[opcodeToken].type === 'label' && tokens.length > 1) {
        tokens.shift();
        opcodeToken = tokens[0].toUpperCase();
      }

      const operandStr = origText.substring(origText.toUpperCase().indexOf(opcodeToken) + opcodeToken.length).trim();
      const operands = this.parseOperands(operandStr, symbolTable);

      instructions.push({
        lineNum,
        ipOffset: i,
        origText,
        opcode: opcodeToken,
        operands
      });
    }

    return {
      instructions,
      symbolTable,
      dataOffset,
      stackSize
    };
  }

  tokenizeLine(line) {
    const tokens = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if ((char === "'" || char === '"')) {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
          current += char;
        } else if (char === quoteChar) {
          inQuotes = false;
          current += char;
          tokens.push(current);
          current = '';
        } else {
          current += char;
        }
        continue;
      }

      if (inQuotes) {
        current += char;
        continue;
      }

      if (char === ',' || char === ' ' || char === '\t') {
        if (current.trim().length > 0) {
          tokens.push(current.trim());
          current = '';
        }
        if (char === ',') {
          // comma handled as delimiter
        }
      } else {
        current += char;
      }
    }
    if (current.trim().length > 0) {
      tokens.push(current.trim());
    }

    return tokens;
  }

  parseDataValues(rawValueStr, dataType, itemSize, varValues) {
    // Check DUP syntax e.g. 10 DUP(0) or 5 DUP('A')
    const dupMatch = rawValueStr.match(/^(\d+|\w+)\s+DUP\s*\((.*?)\)$/i);
    if (dupMatch) {
      const count = this.parseNumber(dupMatch[1]) || 1;
      const fillStr = dupMatch[2].trim();
      const fillVal = this.parseNumber(fillStr) || (fillStr.startsWith("'") ? fillStr.charCodeAt(1) : 0);
      for (let c = 0; c < count; c++) {
        varValues.push(fillVal);
      }
      return;
    }

    // Split by comma outside quotes
    const items = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < rawValueStr.length; i++) {
      const char = rawValueStr[i];
      if (char === "'" || char === '"') {
        if (!inQuotes) { inQuotes = true; quoteChar = char; }
        else if (char === quoteChar) { inQuotes = false; }
      }
      if (char === ',' && !inQuotes) {
        items.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    if (current.trim().length > 0) items.push(current.trim());

    for (const item of items) {
      if ((item.startsWith("'") && item.endsWith("'")) || (item.startsWith('"') && item.endsWith('"'))) {
        const strContent = item.slice(1, -1);
        for (let s = 0; s < strContent.length; s++) {
          varValues.push(strContent.charCodeAt(s));
        }
      } else {
        const num = this.parseNumber(item);
        if (num !== null) {
          varValues.push(num);
        }
      }
    }
  }

  parseOperands(operandStr, symbolTable) {
    if (!operandStr) return [];
    
    // Split operands by comma outside brackets or quotes
    const parts = [];
    let current = '';
    let inBracket = 0;
    let inQuotes = false;

    for (let i = 0; i < operandStr.length; i++) {
      const char = operandStr[i];
      if (char === "'" || char === '"') inQuotes = !inQuotes;
      if (char === '[' && !inQuotes) inBracket++;
      if (char === ']' && !inQuotes) inBracket--;

      if (char === ',' && !inQuotes && inBracket === 0) {
        if (current.trim()) parts.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    if (current.trim()) parts.push(current.trim());

    return parts.map(part => this.parseSingleOperand(part, symbolTable));
  }

  parseSingleOperand(opText, symbolTable) {
    const raw = opText.trim();
    const upper = raw.toUpperCase();

    // Register check
    if (this.registers.is8BitRegister(upper) || this.registers.is16BitRegister(upper)) {
      return { type: 'REG', value: upper, is8Bit: this.registers.is8BitRegister(upper) };
    }

    // Immediate number or @DATA
    const num = this.parseNumber(raw);
    if (num !== null) {
      return { type: 'IMM', value: num };
    }

    // Symbol / Label check
    if (symbolTable[upper]) {
      const sym = symbolTable[upper];
      if (sym.type === 'label') {
        return { type: 'LABEL', value: upper, offset: sym.offset };
      } else if (sym.type === 'var') {
        return { type: 'MEM_DIRECT', name: upper, offset: sym.offset, size: sym.size };
      }
    }

    // Bracketed Memory addressing e.g. [BX], [SI], [BX+SI], [msg+BX], [BX + 2]
    if (raw.startsWith('[') && raw.endsWith(']')) {
      const inner = raw.slice(1, -1).trim();
      return this.parseMemoryAddress(inner, symbolTable);
    }

    // Direct memory variable like `msg` or `msg + 2`
    if (raw.includes('+') || raw.includes('-')) {
      return this.parseMemoryAddress(raw, symbolTable);
    }

    // Fallback: raw symbol or undefined
    return { type: 'LABEL', value: upper, offset: 0 };
  }

  parseMemoryAddress(innerStr, symbolTable) {
    const upper = innerStr.toUpperCase();
    let baseReg = null;
    let indexReg = null;
    let displacement = 0;
    let varName = null;
    let size = 1; // default byte

    // Check variable name inclusion e.g. msg + BX
    for (const name in symbolTable) {
      if (symbolTable[name].type === 'var' && upper.includes(name)) {
        varName = name;
        displacement += symbolTable[name].offset;
        size = symbolTable[name].size;
        break;
      }
    }

    const tokens = upper.replace(/\+/g, ' + ').replace(/\-/g, ' - ').split(/\s+/);
    let sign = 1;

    for (const tok of tokens) {
      if (tok === '+') { sign = 1; continue; }
      if (tok === '-') { sign = -1; continue; }
      if (varName && tok === varName) continue;

      if (['BX', 'BP'].includes(tok)) {
        baseReg = tok;
      } else if (['SI', 'DI'].includes(tok)) {
        indexReg = tok;
      } else {
        const val = this.parseNumber(tok);
        if (val !== null) {
          displacement += sign * val;
        }
      }
    }

    return {
      type: 'MEM_INDIRECT',
      baseReg,
      indexReg,
      displacement,
      varName,
      size
    };
  }
}
