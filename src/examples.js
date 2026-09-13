/**
 * Pre-loaded 8086 Assembly Program Examples
 */

export const EXAMPLES = [
  {
    name: '1. Hello World (DOS String Display)',
    code: `.MODEL SMALL
.STACK 100H
.DATA
    MSG DB 'Hello, World! Welcome to 8086 Emulator.$'

.CODE
MAIN PROC
    ; Initialize Data Segment
    MOV AX, @DATA
    MOV DS, AX

    ; Display String using INT 21h (AH=09h)
    LEA DX, MSG
    MOV AH, 09H
    INT 21H

    ; Exit Program (AH=4Ch)
    MOV AH, 4CH
    INT 21H
MAIN ENDP
END MAIN`
  },
  {
    name: '2. Interactive Key Input & Echo',
    code: `.MODEL SMALL
.STACK 100H
.DATA
    PROMPT DB 'Press any key on terminal: $'
    OUT_MSG DB 0DH, 0AH, 'You pressed character: $'

.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX

    ; Print Prompt
    LEA DX, PROMPT
    MOV AH, 09H
    INT 21H

    ; Read Single Character with Echo (AH=01h)
    MOV AH, 01H
    INT 21H
    MOV BL, AL   ; Save character in BL

    ; Print Output Message
    LEA DX, OUT_MSG
    MOV AH, 09H
    INT 21H

    ; Print Saved Character (AH=02h)
    MOV DL, BL
    MOV AH, 02H
    INT 21H

    ; Exit Program
    MOV AH, 4CH
    INT 21H
MAIN ENDP
END MAIN`
  },
  {
    name: '3. Add Two Numbers from Terminal Input',
    code: `.MODEL SMALL
.STACK 100H
.DATA
    MSG1 DB 'Enter First Digit (0-9): $'
    MSG2 DB 0DH, 0AH, 'Enter Second Digit (0-9): $'
    MSG3 DB 0DH, 0AH, 'Sum of Digits = $'

.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX

    ; Prompt 1
    LEA DX, MSG1
    MOV AH, 09H
    INT 21H

    ; Read Digit 1
    MOV AH, 01H
    INT 21H
    SUB AL, '0'   ; Convert ASCII to number
    MOV BL, AL

    ; Prompt 2
    LEA DX, MSG2
    MOV AH, 09H
    INT 21H

    ; Read Digit 2
    MOV AH, 01H
    INT 21H
    SUB AL, '0'   ; Convert ASCII to number

    ; Addition
    ADD AL, BL    ; AL = AL + BL
    ADD AL, '0'   ; Convert back to ASCII character
    MOV CL, AL

    ; Print Result Prompt
    LEA DX, MSG3
    MOV AH, 09H
    INT 21H

    ; Display Result Digit
    MOV DL, CL
    MOV AH, 02H
    INT 21H

    ; Exit
    MOV AH, 4CH
    INT 21H
MAIN ENDP
END MAIN`
  },
  {
    name: '4. Loop Counter & Array Summation',
    code: `.MODEL SMALL
.STACK 100H
.DATA
    ARRAY DB 5, 10, 15, 20, 25
    COUNT DB 5
    SUM DB 0
    MSG DB 'Array elements summed successfully! Check registers & memory.$'

.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX

    LEA SI, ARRAY     ; Load array offset into SI
    MOV CL, COUNT     ; Set loop counter in CL
    MOV AL, 0         ; Clear accumulator AL

SUM_LOOP:
    ADD AL, [SI]      ; Add byte at DS:SI to AL
    INC SI            ; Point to next element
    LOOP SUM_LOOP     ; Decrement CX and loop if CX != 0

    MOV SUM, AL       ; Store total sum in memory

    LEA DX, MSG
    MOV AH, 09H
    INT 21H

    MOV AH, 4CH
    INT 21H
MAIN ENDP
END MAIN`
  },
  {
    name: '5. Stack Push/Pop & Subroutine CALL',
    code: `.MODEL SMALL
.STACK 100H
.DATA
    MSG DB 'Stack demo complete. Check SP & SS registers!$', 0DH, 0AH

.CODE
MAIN PROC
    MOV AX, @DATA
    MOV DS, AX

    ; Push values onto Stack
    MOV AX, 1234H
    PUSH AX
    MOV BX, 5678H
    PUSH BX

    ; Subroutine Call
    CALL SWAP_STACK

    POP CX
    POP DX

    LEA DX, MSG
    MOV AH, 09H
    INT 21H

    MOV AH, 4CH
    INT 21H
MAIN ENDP

SWAP_STACK PROC
    NOP
    RET
SWAP_STACK ENDP

END MAIN`
  }
];
