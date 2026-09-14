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

  // Comprehensive DOS & BIOS Interrupt Reference Catalog
  const INTERRUPT_DOCS = {
    '21H': {
      name: 'MS-DOS API System Services',
      desc: 'The fundamental system service interface for MS-DOS programs. The function performed is dictated by the value loaded into register `AH`.',
      functions: {
        '01H': {
          name: 'Read Character with Echo',
          in: '- `AH = 01H`',
          out: '- `AL = ASCII character code`',
          desc: 'Waits for a character from the console, echoes it to the screen, and returns the ASCII code in `AL`. Handles Ctrl-C.',
          example: 'MOV AH, 01H\nINT 21H\n; AL now contains the character pressed'
        },
        '02H': {
          name: 'Write Single Character',
          in: '- `AH = 02H`\n- `DL = ASCII character to display`',
          out: '- `AL = Last character output`',
          desc: 'Outputs the character in register `DL` to the standard output device (terminal). Handles backspace, newline, and carriage return.',
          example: 'MOV DL, \'A\'\nMOV AH, 02H\nINT 21H'
        },
        '06H': {
          name: 'Direct Console I/O',
          in: '- `AH = 06H`\n- `DL = Character code (00H..FEH)` to output, or `DL = 0FFH` to read input without waiting',
          out: '- If reading (`DL=0FFH`):\n  - `ZF = 0` and `AL = ASCII code` if key was pressed\n  - `ZF = 1` if no key available',
          desc: 'Non-blocking raw console I/O service. Can output characters or query/read keys without pausing.',
          example: 'MOV AH, 06H\nMOV DL, 0FFH   ; Check for key\nINT 21H\nJZ NO_KEY_PRESSED'
        },
        '07H': {
          name: 'Direct Input Without Echo',
          in: '- `AH = 07H`',
          out: '- `AL = ASCII character code`',
          desc: 'Waits for a keystroke and returns it in `AL`. Does not echo to the screen and does NOT check for Ctrl-C/Break.',
          example: 'MOV AH, 07H\nINT 21H\n; Key code in AL (silent)'
        },
        '08H': {
          name: 'Console Input Without Echo',
          in: '- `AH = 08H`',
          out: '- `AL = ASCII character code`',
          desc: 'Waits for a keystroke without echoing to screen. Checks for Ctrl-C/Break.',
          example: 'MOV AH, 08H\nINT 21H\n; Key code in AL'
        },
        '09H': {
          name: 'Display String ($-Terminated)',
          in: '- `AH = 09H`\n- `DS:DX = Pointer to $-terminated ASCII string`',
          out: '- `AL = 24H (\'$\')`',
          desc: 'Prints the text string at `DS:DX` to the terminal screen. The string MUST be terminated by a dollar sign (`$`, ASCII `24H`).',
          example: '; Data Segment:\nMSG DB \'Hello, World!$\'\n\n; Code Segment:\nMOV AX, @DATA\nMOV DS, AX\nLEA DX, MSG\nMOV AH, 09H\nINT 21H'
        },
        '0AH': {
          name: 'Buffered Keyboard Input',
          in: '- `AH = 0AH`\n- `DS:DX = Pointer to input buffer`\n  - `Byte 0`: Max characters to accept\n  - `Byte 1`: Actual characters read (set by DOS)\n  - `Byte 2..N`: Buffer holding characters',
          out: '- Buffer populated with user input and terminated with carriage return (`0DH`).',
          desc: 'Reads a line of text into a memory buffer. Allows standard DOS editing keys (Backspace, Left/Right arrows).',
          example: '; Data Segment:\nBUF DB 64, 0, 64 DUP(0)\n\n; Code Segment:\nLEA DX, BUF\nMOV AH, 0AH\nINT 21H'
        },
        '0BH': {
          name: 'Check Keyboard Status',
          in: '- `AH = 0BH`',
          out: '- `AL = 00H` if no character is available\n- `AL = 0FFH` if a character is ready to read',
          desc: 'Checks whether a keystroke is waiting in the input buffer without blocking.',
          example: 'MOV AH, 0BH\nINT 21H\nCMP AL, 0\nJE NO_KEY'
        },
        '25H': {
          name: 'Set Interrupt Vector',
          in: '- `AH = 25H`\n- `AL = Interrupt number (00H..FFH)`\n- `DS:DX = Far pointer to new ISR`',
          out: '- Interrupt Vector Table updated',
          desc: 'Configures the entry in the Interrupt Vector Table (`0000:AL*4`) to point to the new handler at `DS:DX`.',
          example: 'PUSH DS\nMOV AX, SEG MY_ISR\nMOV DS, AX\nLEA DX, MY_ISR\nMOV AL, 1CH\nMOV AH, 25H\nINT 21H\nPOP DS'
        },
        '35H': {
          name: 'Get Interrupt Vector',
          in: '- `AH = 35H`\n- `AL = Interrupt number (00H..FFH)`',
          out: '- `ES:BX = Far pointer to existing ISR`',
          desc: 'Reads the pointer to the current Interrupt Service Routine from the IVT into `ES:BX`.',
          example: 'MOV AL, 1CH\nMOV AH, 35H\nINT 21H\n; ES:BX holds current handler'
        },
        '3CH': {
          name: 'Create / Truncate File',
          in: '- `AH = 3CH`\n- `CX = File attributes (0 = Normal, 1 = Read-only, 2 = Hidden)`\n- `DS:DX = Pointer to ASCIIZ filename`',
          out: '- `CF = 0`, `AX = File Handle` on success\n- `CF = 1`, `AX = Error code` on failure',
          desc: 'Creates a new file or resets an existing file to zero length and returns a handle.',
          example: 'LEA DX, FILENAME\nMOV CX, 0\nMOV AH, 3CH\nINT 21H\nJC ERROR_HANDLER\nMOV [HANDLE], AX'
        },
        '3DH': {
          name: 'Open Existing File',
          in: '- `AH = 3DH`\n- `AL = Access mode (0 = Read, 1 = Write, 2 = Read/Write)`\n- `DS:DX = Pointer to ASCIIZ filename`',
          out: '- `CF = 0`, `AX = File Handle` on success\n- `CF = 1`, `AX = Error code` on failure',
          desc: 'Opens an existing file for reading or writing.',
          example: 'LEA DX, FILENAME\nMOV AL, 0    ; Read only\nMOV AH, 3DH\nINT 21H\nJC ERROR_HANDLER'
        },
        '3EH': {
          name: 'Close File Handle',
          in: '- `AH = 3EH`\n- `BX = File handle to close`',
          out: '- `CF = 0` on success\n- `CF = 1`, `AX = Error code` on failure',
          desc: 'Flushes cached data and releases the file handle back to the operating system.',
          example: 'MOV BX, [HANDLE]\nMOV AH, 3EH\nINT 21H'
        },
        '3FH': {
          name: 'Read From File or Device',
          in: '- `AH = 3FH`\n- `BX = File handle (0 = stdin)`\n- `CX = Number of bytes to read`\n- `DS:DX = Buffer to store data`',
          out: '- `CF = 0`, `AX = Number of bytes read` (0 = EOF)\n- `CF = 1`, `AX = Error code`',
          desc: 'Reads up to `CX` bytes from file handle `BX` into memory buffer `DS:DX`.',
          example: 'MOV BX, [HANDLE]\nMOV CX, 256\nLEA DX, BUFFER\nMOV AH, 3FH\nINT 21H'
        },
        '40H': {
          name: 'Write To File or Device',
          in: '- `AH = 40H`\n- `BX = File handle (1 = stdout, 2 = stderr)`\n- `CX = Number of bytes to write`\n- `DS:DX = Buffer containing data`',
          out: '- `CF = 0`, `AX = Number of bytes written`\n- `CF = 1`, `AX = Error code`',
          desc: 'Writes `CX` bytes from `DS:DX` to file handle `BX`.',
          example: 'MOV BX, [HANDLE]\nMOV CX, 14\nLEA DX, MSG\nMOV AH, 40H\nINT 21H'
        },
        '4CH': {
          name: 'Terminate Process with Exit Code',
          in: '- `AH = 4CH`\n- `AL = Exit status code` (0 = Normal exit)',
          out: '- Control returns to DOS prompt / host operating system',
          desc: 'Standard clean program termination for 8086 programs. Closes files and terminates execution.',
          example: 'MOV AL, 0\nMOV AH, 4CH\nINT 21H'
        }
      }
    },
    '10H': {
      name: 'BIOS Video Display Services',
      desc: 'ROM BIOS video controller interface for mode switching, text cursor positioning, color attributes, and graphics pixel plotting.',
      functions: {
        '00H': {
          name: 'Set Video Mode',
          in: '- `AH = 00H`\n- `AL = Mode number`:\n  - `03H`: 80x25 16-color Text (Standard DOS)\n  - `13H`: 320x200 256-color Graphics (VGA Gaming)\n  - `12H`: 640x480 16-color Graphics',
          out: '- Video hardware mode changed, screen cleared',
          desc: 'Switches display adapter mode and clears screen memory.',
          example: 'MOV AH, 00H\nMOV AL, 13H   ; 320x200 256 colors\nINT 10H'
        },
        '01H': {
          name: 'Set Cursor Shape / Size',
          in: '- `AH = 01H`\n- `CH = Starting scanline (0..7/15)`\n- `CL = Ending scanline (0..7/15)`',
          out: '- Hardware text cursor shape altered',
          desc: 'Configures cursor scanlines (e.g. underline vs solid block).',
          example: 'MOV AH, 01H\nMOV CX, 0007H ; Solid block cursor\nINT 10H'
        },
        '02H': {
          name: 'Set Cursor Position',
          in: '- `AH = 02H`\n- `BH = Page number` (usually 0)\n- `DH = Row (0..24)`\n- `DL = Column (0..79)`',
          out: '- Cursor moved on screen',
          desc: 'Relocates the text cursor to coordinate `(DH, DL)` on video page `BH`.',
          example: 'MOV AH, 02H\nMOV BH, 0\nMOV DH, 12    ; Center row\nMOV DL, 40    ; Center column\nINT 10H'
        },
        '03H': {
          name: 'Get Cursor Position and Size',
          in: '- `AH = 03H`\n- `BH = Page number` (usually 0)',
          out: '- `DH = Row (0..24)`\n- `DL = Column (0..79)`\n- `CH = Cursor start scanline`\n- `CL = Cursor end scanline`',
          desc: 'Reads current text cursor position and scanlines from BIOS video data.',
          example: 'MOV AH, 03H\nMOV BH, 0\nINT 10H\n; DH = Row, DL = Col'
        },
        '06H': {
          name: 'Scroll Window Up / Clear Screen',
          in: '- `AH = 06H`\n- `AL = Number of lines to scroll` (0 = Clear window)\n- `BH = Attribute for blanked lines` (e.g. `07H` white on black, `1FH` white on blue)\n- `CH, CL = Upper left row, column`\n- `DH, DL = Lower right row, column`',
          out: '- Screen scrolled or cleared',
          desc: 'Scrolls an area of the screen or clears it entirely when `AL=0`.',
          example: '; Clear entire screen:\nMOV AH, 06H\nMOV AL, 0\nMOV BH, 07H\nMOV CX, 0000H\nMOV DX, 184FH\nINT 10H'
        },
        '08H': {
          name: 'Read Character & Attribute at Cursor',
          in: '- `AH = 08H`\n- `BH = Video page number` (usually 0)',
          out: '- `AL = ASCII character code`\n- `AH = Color attribute byte`',
          desc: 'Inspects the screen cell at current cursor position.',
          example: 'MOV AH, 08H\nMOV BH, 0\nINT 10H\n; AL = Char, AH = Attribute'
        },
        '09H': {
          name: 'Write Character & Attribute at Cursor',
          in: '- `AH = 09H`\n- `AL = Character code`\n- `BH = Page number` (0)\n- `BL = Color attribute byte`\n- `CX = Repetition count`',
          out: '- Screen cell(s) written',
          desc: 'Prints character `AL` with attribute `BL` repeated `CX` times without moving cursor.',
          example: 'MOV AH, 09H\nMOV AL, \'*\'\nMOV BH, 0\nMOV BL, 0CEH  ; Red on light cyan\nMOV CX, 10    ; 10 times\nINT 10H'
        },
        '0CH': {
          name: 'Write Graphics Pixel',
          in: '- `AH = 0CH`\n- `AL = Color index (0..255)`\n- `BH = Page number` (0 in mode 13H)\n- `CX = X coordinate (0..319)`\n- `DX = Y coordinate (0..199)`',
          out: '- Pixel plotted on screen',
          desc: 'Plots a single color pixel to video RAM at `(CX, DX)`.',
          example: 'MOV AH, 0CH\nMOV AL, 14    ; Yellow\nMOV CX, 160   ; X center\nMOV DX, 100   ; Y center\nINT 10H'
        },
        '0DH': {
          name: 'Read Graphics Pixel',
          in: '- `AH = 0DH`\n- `BH = Page number` (0)\n- `CX = X coordinate`\n- `DX = Y coordinate`',
          out: '- `AL = Color index of pixel`',
          desc: 'Reads the color of the pixel at coordinate `(CX, DX)`.',
          example: 'MOV AH, 0DH\nMOV CX, 160\nMOV DX, 100\nINT 10H\n; AL now contains pixel color'
        },
        '0EH': {
          name: 'Teletype Output (Print Character)',
          in: '- `AH = 0EH`\n- `AL = Character ASCII code`\n- `BH = Page number` (usually 0)\n- `BL = Foreground color` (in graphics modes)',
          out: '- Character displayed, cursor advanced',
          desc: 'Prints a character at cursor position and automatically advances cursor. Handles Backspace, Enter, Linefeed.',
          example: 'MOV AH, 0EH\nMOV AL, \'H\'\nINT 10H'
        }
      }
    },
    '16H': {
      name: 'BIOS Keyboard Services',
      desc: 'Direct BIOS interface for reading keyboard scan codes, ASCII keys, and modifier status.',
      functions: {
        '00H': {
          name: 'Read Keystroke (Blocking)',
          in: '- `AH = 00H`',
          out: '- `AL = ASCII character code` (0 if extended key)\n- `AH = Hardware BIOS scan code`',
          desc: 'Pauses until a key is pressed, removes it from the keyboard buffer, and returns both ASCII and hardware scan codes.',
          example: 'MOV AH, 00H\nINT 16H\n; AL = ASCII code, AH = Scan code'
        },
        '01H': {
          name: 'Check Keystroke Buffer (Non-blocking)',
          in: '- `AH = 01H`',
          out: '- `ZF = 1` if keyboard buffer is empty\n- `ZF = 0` if key ready: `AL = ASCII`, `AH = Scan code` (key stays in buffer)',
          desc: 'Peeks into the keyboard buffer without removing the key. Essential for continuous game loops.',
          example: 'MOV AH, 01H\nINT 16H\nJZ NO_KEY_WAITING\n; Key waiting, read with AH=00H\nMOV AH, 00H\nINT 16H'
        },
        '02H': {
          name: 'Get Shift Flags Status',
          in: '- `AH = 02H`',
          out: '- `AL = Shift Flags Byte`:\n  - Bit 0: Right Shift down\n  - Bit 1: Left Shift down\n  - Bit 2: Ctrl key down\n  - Bit 3: Alt key down\n  - Bit 4: Scroll Lock active\n  - Bit 5: Num Lock active\n  - Bit 6: Caps Lock active\n  - Bit 7: Insert state',
          desc: 'Reads current state of keyboard shift, control, and lock keys from BIOS memory.',
          example: 'MOV AH, 02H\nINT 16H\nTEST AL, 08H  ; Test if Alt is pressed'
        }
      }
    },
    '1AH': {
      name: 'BIOS Real-Time Clock & Timer Services',
      desc: 'Interface to hardware timer ticks (~18.2 ticks per second) and real-time clock chip.',
      functions: {
        '00H': {
          name: 'Read System Clock Tick Counter',
          in: '- `AH = 00H`',
          out: '- `CX:DX = 32-bit tick count since midnight` (18.2065 ticks/sec)\n- `AL = Midnight rollover flag` (0 = No, !=0 = Passed midnight)',
          desc: 'Reads clock ticks from timer interrupt 08h. Used for timing, delays, and random seeds.',
          example: 'MOV AH, 00H\nINT 1AH\n; DX holds low 16 bits of tick count'
        }
      }
    },
    '20H': {
      name: 'DOS Program Terminate',
      desc: 'Legacy CP/M-style program termination. Exits program back to DOS command processor. Note: For modern .EXE files, `MOV AH, 4CH; INT 21H` is preferred.',
      functions: {}
    }
  };

  // Helper: Inspect preceding lines to find what value AH was loaded with
  function findPrecedingAHValue(model, lineNumber) {
    const start = Math.max(1, lineNumber - 25);
    for (let l = lineNumber - 1; l >= start; l--) {
      const lineContent = model.getLineContent(l);
      const code = lineContent.split(';')[0].trim();
      if (!code) continue;

      // Stop searching if encountered another INT or PROC boundary
      if (/^\s*(INT\s+|[a-zA-Z0-9_]+\s+PROC\b)/i.test(code)) {
        break;
      }

      // Match MOV AH, <val>
      const match = code.match(/\bMOV\s+AH\s*,\s*([0-9a-fA-F]+[hH]?|0x[0-9a-fA-F]+|[0-9]+)\b/i);
      if (match) {
        let val = match[1].toUpperCase();
        if (val.startsWith('0X')) {
          val = val.substring(2) + 'H';
        } else if (!val.endsWith('H') && isNaN(Number(val))) {
          val = val + 'H';
        } else if (!val.endsWith('H') && !isNaN(Number(val))) {
          const hex = Number(val).toString(16).toUpperCase();
          val = (hex.length === 1 ? '0' + hex : hex) + 'H';
        }
        if (val.endsWith('H') && val.length === 2) {
          val = '0' + val;
        }
        return val;
      }
    }
    return null;
  }

  // 2. Register Hover Provider (Rich Documentation Popup on Hover)
  monaco.languages.registerHoverProvider('x86asm', {
    provideHover: (model, position) => {
      const lineContent = model.getLineContent(position.lineNumber);
      const word = model.getWordAtPosition(position);
      const upperWord = word ? word.word.toUpperCase() : '';

      // Check if hovering on or near an INT instruction (e.g. INT 21H, INT 10H, INT 16H)
      const intMatch = lineContent.match(/\bINT\s+([0-9a-fA-F]+[hH]?|0x[0-9a-fA-F]+|[0-9]+)\b/i);
      if (intMatch) {
        let intNum = intMatch[1].toUpperCase();
        if (intNum.startsWith('0X')) intNum = intNum.substring(2) + 'H';
        if (!intNum.endsWith('H')) {
          const parsed = Number(intNum);
          if (!isNaN(parsed)) {
            const hex = parsed.toString(16).toUpperCase();
            intNum = (hex.length === 1 ? '0' + hex : hex) + 'H';
          } else {
            intNum = intNum + 'H';
          }
        }
        if (intNum.endsWith('H') && intNum.length === 2) {
          intNum = '0' + intNum;
        }

        // Check if cursor is on INT, the interrupt number, or the statement
        const intIndex = lineContent.toUpperCase().indexOf('INT');
        const intEnd = intIndex + intMatch[0].length;
        const isHoveringInt = (position.column >= intIndex + 1 && position.column <= intEnd + 2) ||
                              upperWord === 'INT' ||
                              upperWord === intNum ||
                              upperWord === intMatch[1].toUpperCase();

        if (isHoveringInt && INTERRUPT_DOCS[intNum]) {
          const docData = INTERRUPT_DOCS[intNum];
          const detectedAH = findPrecedingAHValue(model, position.lineNumber);

          if (detectedAH && docData.functions[detectedAH]) {
            const fn = docData.functions[detectedAH];
            return {
              range: new monaco.Range(position.lineNumber, 1, position.lineNumber, lineContent.length + 1),
              contents: [
                { value: `### ⚡ ${docData.name}\n` +
                         `**Active Service:** \`INT ${intNum}\`, \`AH = ${detectedAH}\` — **${fn.name}**\n\n` +
                         `${fn.desc}` },
                { value: `**📥 Input Parameters:**\n${fn.in}\n\n` +
                         `**📤 Return Values:**\n${fn.out}` },
                { value: `**Example:**\n\`\`\`assembly\n${fn.example}\n\`\`\`` }
              ]
            };
          }

          // If AH was not specifically found or user is hovering generic INT:
          const fnList = Object.entries(docData.functions)
            .map(([code, fn]) => `- **\`AH = ${code}\`**: ${fn.name}`)
            .join('\n');

          return {
            range: new monaco.Range(position.lineNumber, 1, position.lineNumber, lineContent.length + 1),
            contents: [
              { value: `### ⚡ ${docData.name} (\`INT ${intNum}\`)\n${docData.desc}` },
              { value: `**Common Services for \`INT ${intNum}\` (set in \`AH\`):**\n${fnList || '*(No sub-functions defined)*'}` },
              { value: `💡 *Tip: Load \`AH\` with a function code before \`INT ${intNum}\` (e.g. \`MOV AH, 09H\`) to see specific service requirements.*` }
            ]
          };
        }
      }

      if (!word) return null;

      // Check Instructions
      const instr = INSTRUCTIONS.find(i => i.label === upperWord);
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
      const reg = REGISTERS.find(r => r.label === upperWord);
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
