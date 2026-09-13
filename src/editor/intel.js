/**
 * 8086 Assembly IntelliSense, Autocomplete & Hover Provider for Monaco Editor
 */

export function registerAssemblyIntel(monaco) {
  // Completion Items Data
  const INSTRUCTIONS = [
    {
      label: 'MOV',
      snippet: 'MOV ${1:AX}, ${2:BX}',
      detail: 'MOV dest, src',
      doc: 'Copy data from source operand to destination operand.\n\n```assembly\nMOV AX, 1234H\nMOV DS, AX\n```'
    },
    {
      label: 'ADD',
      snippet: 'ADD ${1:AX}, ${2:BX}',
      detail: 'ADD dest, src',
      doc: 'Add source operand to destination operand. Sets Zero, Carry, Sign, Overflow, Parity, Aux Carry flags.\n\n```assembly\nADD AL, 5\nADD AX, BX\n```'
    },
    {
      label: 'SUB',
      snippet: 'SUB ${1:AX}, ${2:BX}',
      detail: 'SUB dest, src',
      doc: 'Subtract source operand from destination operand. Sets flags.\n\n```assembly\nSUB AL, \'0\'  ; Convert ASCII to digit\n```'
    },
    {
      label: 'INC',
      snippet: 'INC ${1:AX}',
      detail: 'INC dest',
      doc: 'Increment destination operand by 1 (does not affect CF flag).'
    },
    {
      label: 'DEC',
      snippet: 'DEC ${1:AX}',
      detail: 'DEC dest',
      doc: 'Decrement destination operand by 1 (does not affect CF flag).'
    },
    {
      label: 'MUL',
      snippet: 'MUL ${1:BL}',
      detail: 'MUL src',
      doc: 'Unsigned multiplication.\n- 8-bit: `AL * src -> AX`\n- 16-bit: `AX * src -> DX:AX`'
    },
    {
      label: 'IMUL',
      snippet: 'IMUL ${1:BL}',
      detail: 'IMUL src',
      doc: 'Signed integer multiplication.'
    },
    {
      label: 'DIV',
      snippet: 'DIV ${1:BL}',
      detail: 'DIV src',
      doc: 'Unsigned division.\n- 8-bit: `AX / src -> AL` (Quotient), `AH` (Remainder)\n- 16-bit: `DX:AX / src -> AX` (Quotient), `DX` (Remainder)'
    },
    {
      label: 'CMP',
      snippet: 'CMP ${1:AX}, ${2:0}',
      detail: 'CMP op1, op2',
      doc: 'Compare two operands by subtracting `op2` from `op1` without saving result. Updates ZF, CF, SF, OF, PF flags.'
    },
    {
      label: 'AND',
      snippet: 'AND ${1:AX}, ${2:BX}',
      detail: 'AND dest, src',
      doc: 'Bitwise logical AND. Clears CF and OF flags.'
    },
    {
      label: 'OR',
      snippet: 'OR ${1:AX}, ${2:BX}',
      detail: 'OR dest, src',
      doc: 'Bitwise logical OR. Clears CF and OF flags.'
    },
    {
      label: 'XOR',
      snippet: 'XOR ${1:AX}, ${2:AX}',
      detail: 'XOR dest, src',
      doc: 'Bitwise logical Exclusive OR. Frequently used to clear a register to 0 (`XOR AX, AX`).'
    },
    {
      label: 'NOT',
      snippet: 'NOT ${1:AX}',
      detail: 'NOT dest',
      doc: 'Bitwise one\'s complement (inverts all bits).'
    },
    {
      label: 'NEG',
      snippet: 'NEG ${1:AX}',
      detail: 'NEG dest',
      doc: 'Two\'s complement negation (`dest = -dest`). Sets CF unless result is 0.'
    },
    {
      label: 'SHL',
      snippet: 'SHL ${1:AX}, ${2:1}',
      detail: 'SHL dest, count',
      doc: 'Shift logical left by `count` bits. Fills vacated bits with zeros.'
    },
    {
      label: 'SHR',
      snippet: 'SHR ${1:AX}, ${2:1}',
      detail: 'SHR dest, count',
      doc: 'Shift logical right by `count` bits. Fills vacated bits with zeros.'
    },
    {
      label: 'JMP',
      snippet: 'JMP ${1:LABEL}',
      detail: 'JMP target',
      doc: 'Unconditional jump to code label.'
    },
    {
      label: 'JE',
      snippet: 'JE ${1:LABEL}',
      detail: 'JE label (Jump if Equal)',
      doc: 'Jump to label if ZF = 1 (equal).'
    },
    {
      label: 'JZ',
      snippet: 'JZ ${1:LABEL}',
      detail: 'JZ label (Jump if Zero)',
      doc: 'Jump to label if Zero Flag ZF = 1.'
    },
    {
      label: 'JNE',
      snippet: 'JNE ${1:LABEL}',
      detail: 'JNE label (Jump if Not Equal)',
      doc: 'Jump to label if ZF = 0 (not equal).'
    },
    {
      label: 'JNZ',
      snippet: 'JNZ ${1:LABEL}',
      detail: 'JNZ label (Jump if Not Zero)',
      doc: 'Jump to label if Zero Flag ZF = 0.'
    },
    {
      label: 'JL',
      snippet: 'JL ${1:LABEL}',
      detail: 'JL label (Jump if Less)',
      doc: 'Jump if SF != OF (signed comparison).'
    },
    {
      label: 'JLE',
      snippet: 'JLE ${1:LABEL}',
      detail: 'JLE label (Jump if Less or Equal)',
      doc: 'Jump if ZF = 1 or SF != OF.'
    },
    {
      label: 'JG',
      snippet: 'JG ${1:LABEL}',
      detail: 'JG label (Jump if Greater)',
      doc: 'Jump if ZF = 0 and SF == OF.'
    },
    {
      label: 'JGE',
      snippet: 'JGE ${1:LABEL}',
      detail: 'JGE label (Jump if Greater or Equal)',
      doc: 'Jump if SF == OF.'
    },
    {
      label: 'JC',
      snippet: 'JC ${1:LABEL}',
      detail: 'JC label (Jump if Carry)',
      doc: 'Jump to label if Carry Flag CF = 1.'
    },
    {
      label: 'JNC',
      snippet: 'JNC ${1:LABEL}',
      detail: 'JNC label (Jump if No Carry)',
      doc: 'Jump to label if Carry Flag CF = 0.'
    },
    {
      label: 'LOOP',
      snippet: 'LOOP ${1:LABEL}',
      detail: 'LOOP label',
      doc: 'Decrement CX register by 1. If CX != 0, jump to label.'
    },
    {
      label: 'CALL',
      snippet: 'CALL ${1:PROC_NAME}',
      detail: 'CALL target',
      doc: 'Call subroutine / procedure. Pushes return address onto stack.'
    },
    {
      label: 'RET',
      snippet: 'RET',
      detail: 'RET',
      doc: 'Return from procedure. Pops return address from stack into IP.'
    },
    {
      label: 'PUSH',
      snippet: 'PUSH ${1:AX}',
      detail: 'PUSH reg/mem',
      doc: 'Push 16-bit word onto stack (decrements SP by 2).'
    },
    {
      label: 'POP',
      snippet: 'POP ${1:AX}',
      detail: 'POP reg/mem',
      doc: 'Pop 16-bit word from stack into operand (increments SP by 2).'
    },
    {
      label: 'LEA',
      snippet: 'LEA ${1:DX}, ${2:MSG}',
      detail: 'LEA reg, memory',
      doc: 'Load Effective Address offset of variable into register.'
    },
    {
      label: 'XCHG',
      snippet: 'XCHG ${1:AX}, ${2:BX}',
      detail: 'XCHG op1, op2',
      doc: 'Exchange values of two operands.'
    },
    {
      label: 'INT',
      snippet: 'INT ${1:21H}',
      detail: 'INT number',
      doc: 'Call software interrupt vector (e.g., INT 21H for DOS services).'
    },
    {
      label: 'NOP',
      snippet: 'NOP',
      detail: 'NOP',
      doc: 'No operation (1 byte delay).'
    }
  ];

  const REGISTERS = [
    { label: 'AX', detail: '16-bit Primary Accumulator Register', doc: 'Used in arithmetic, logic, and I/O operations.' },
    { label: 'AH', detail: '8-bit High byte of AX', doc: 'Frequently used for DOS Interrupt Service Numbers (e.g., AH=09h, AH=01h).' },
    { label: 'AL', detail: '8-bit Low byte of AX', doc: 'Frequently used for character I/O and arithmetic results.' },
    { label: 'BX', detail: '16-bit Base Register', doc: 'Used for general arithmetic and base memory addressing `[BX]`.' },
    { label: 'BH', detail: '8-bit High byte of BX', doc: 'General purpose 8-bit register.' },
    { label: 'BL', detail: '8-bit Low byte of BX', doc: 'General purpose 8-bit register.' },
    { label: 'CX', detail: '16-bit Count Register', doc: 'Used as a counter for loops and shift/rotate instructions.' },
    { label: 'CH', detail: '8-bit High byte of CX', doc: 'General purpose 8-bit counter register.' },
    { label: 'CL', detail: '8-bit Low byte of CX', doc: 'Count register used for variable shifts and rotates.' },
    { label: 'DX', detail: '16-bit Data Register', doc: 'Used in multiplication, division, and holds memory offsets for `INT 21h`.' },
    { label: 'DH', detail: '8-bit High byte of DX', doc: 'General purpose 8-bit register.' },
    { label: 'DL', detail: '8-bit Low byte of DX', doc: 'Holds character for `INT 21h (AH=02h)` display output.' },
    { label: 'SI', detail: '16-bit Source Index Register', doc: 'Used as an index in pointer addressing and string operations.' },
    { label: 'DI', detail: '16-bit Destination Index Register', doc: 'Used as an index in pointer addressing and string operations.' },
    { label: 'BP', detail: '16-bit Base Pointer', doc: 'Points to parameters and local variables on the stack segment.' },
    { label: 'SP', detail: '16-bit Stack Pointer', doc: 'Points to the current top of stack in Stack Segment (SS).' },
    { label: 'IP', detail: '16-bit Instruction Pointer', doc: 'Holds the offset address of the next instruction to execute.' },
    { label: 'CS', detail: '16-bit Code Segment Register', doc: 'Base segment for executable machine instructions.' },
    { label: 'DS', detail: '16-bit Data Segment Register', doc: 'Base segment for program variables and data constants.' },
    { label: 'SS', detail: '16-bit Stack Segment Register', doc: 'Base segment for CPU stack memory.' },
    { label: 'ES', detail: '16-bit Extra Segment Register', doc: 'Additional data segment for string and memory operations.' },
    { label: '@DATA', detail: 'Data Segment Address Constant', doc: 'Evaluates to the base address of the `.DATA` segment.' }
  ];

  const SNIPPETS = [
    {
      label: 'dos_print_string',
      snippet: '; Print $-terminated string at DS:DX\nLEA DX, ${1:MSG}\nMOV AH, 09H\nINT 21H',
      detail: 'INT 21H (AH=09H) Display String',
      doc: 'Prints the `$`-terminated string located at `DS:DX` to the interactive terminal.'
    },
    {
      label: 'dos_read_char',
      snippet: '; Read single character with echo into AL\nMOV AH, 01H\nINT 21H',
      detail: 'INT 21H (AH=01H) Read Character',
      doc: 'Waits for terminal key input and stores the ASCII character code in `AL` with echo.'
    },
    {
      label: 'dos_print_char',
      snippet: '; Print single character in DL\nMOV DL, ${1:\'A\'}\nMOV AH, 02H\nINT 21H',
      detail: 'INT 21H (AH=02H) Display Character',
      doc: 'Prints the single ASCII character stored in `DL` to the terminal.'
    },
    {
      label: 'dos_exit',
      snippet: '; Exit program back to DOS\nMOV AH, 4CH\nINT 21H',
      detail: 'INT 21H (AH=4CH) Terminate Program',
      doc: 'Terminates program execution cleanly.'
    },
    {
      label: 'init_data_segment',
      snippet: 'MOV AX, @DATA\nMOV DS, AX',
      detail: 'Initialize DS with @DATA',
      doc: 'Loads the data segment selector `@DATA` into `AX` and then into `DS`.'
    },
    {
      label: 'procedure_template',
      snippet: '${1:MY_PROC} PROC\n    $0\n    RET\n${1:MY_PROC} ENDP',
      detail: 'Procedure / Subroutine Block',
      doc: 'Defines a subroutine with `PROC`, code body, `RET`, and `ENDP`.'
    },
    {
      label: 'db_string',
      snippet: '${1:MSG} DB \'${2:Hello, World!}\$\'',
      detail: 'Define $-terminated Byte String',
      doc: 'Declares a DOS printable string variable ending in `$`.'
    },
    {
      label: 'db_dup',
      snippet: '${1:BUFFER} DB ${2:20} DUP(${3:0})',
      detail: 'Array of Duplicated Bytes',
      doc: 'Allocates an array of bytes initialized with a repeated value.'
    }
  ];

  // 1. Register Completion Item Provider (VS Code Style Autocomplete)
  monaco.languages.registerCompletionItemProvider('x86asm', {
    provideCompletionItems: (model, position) => {
      const word = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: word.startColumn,
        endColumn: word.endColumn
      };

      const suggestions = [];

      // Add Instructions
      INSTRUCTIONS.forEach(item => {
        suggestions.push({
          label: item.label,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: item.snippet,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: item.detail,
          documentation: { value: item.doc },
          range
        });
      });

      // Add Registers
      REGISTERS.forEach(item => {
        suggestions.push({
          label: item.label,
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: item.label,
          detail: item.detail,
          documentation: { value: item.doc },
          range
        });
      });

      // Add Snippets
      SNIPPETS.forEach(item => {
        suggestions.push({
          label: item.label,
          kind: monaco.languages.CompletionItemKind.Snippet,
          insertText: item.snippet,
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: item.detail,
          documentation: { value: item.doc },
          range
        });
      });

      // Add Directives
      ['.MODEL SMALL', '.STACK 100H', '.DATA', '.CODE', 'MAIN PROC', 'ENDP MAIN', 'END MAIN', 'DB', 'DW', 'DUP', 'ORG 100H'].forEach(d => {
        suggestions.push({
          label: d,
          kind: monaco.languages.CompletionItemKind.Function,
          insertText: d,
          detail: '8086 Directive',
          range
        });
      });

      return { suggestions };
    }
  });

  // 2. Register Hover Provider (Rich Documentation Popup on Hover)
  monaco.languages.registerHoverProvider('x86asm', {
    provideHover: (model, position) => {
      const word = model.getWordAtPosition(position);
      if (!word) return null;

      const upper = word.word.toUpperCase();

      // Check Instructions
      const instr = INSTRUCTIONS.find(i => i.label === upper);
      if (instr) {
        return {
          range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
          contents: [
            { value: `**8086 Instruction:** \`${instr.label}\`` },
            { value: `**Syntax:** \`${instr.detail}\`` },
            { value: instr.doc }
          ]
        };
      }

      // Check Registers
      const reg = REGISTERS.find(r => r.label === upper);
      if (reg) {
        return {
          range: new monaco.Range(position.lineNumber, word.startColumn, position.lineNumber, word.endColumn),
          contents: [
            { value: `**8086 CPU Register:** \`${reg.label}\`` },
            { value: `**Role:** ${reg.detail}` },
            { value: reg.doc }
          ]
        };
      }

      return null;
    }
  });
}
