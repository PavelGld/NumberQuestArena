import { Cell, CellType, Operation, Difficulty, BoardSize } from './api';

export const generateBoard = (boardSize: BoardSize, difficulty: Difficulty): Cell[][] => {
  const board: Cell[][] = [];
  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  
  const getOperations = (diff: Difficulty): Operation[] => {
    switch (diff) {
      case "easy":
        return ["+", "-", "*"];
      case "medium":
        return ["+", "-", "*", "/"];
      case "hard":
        return ["+", "-", "*", "/", "^"];
      default:
        return ["+", "-", "*"];
    }
  };
  
  const operations = getOperations(difficulty);

  for (let row = 0; row < boardSize; row++) {
    board[row] = [];
    for (let col = 0; col < boardSize; col++) {
      const isNumberCell = (row + col) % 2 === 0;
      if (isNumberCell) {
        board[row][col] = {
          value: numbers[Math.floor(Math.random() * numbers.length)],
          type: "number",
          row,
          col,
        };
      } else {
        board[row][col] = {
          value: operations[Math.floor(Math.random() * operations.length)],
          type: "operation",
          row,
          col,
        };
      }
    }
  }
  return board;
};

export const evaluateExpression = (expression: (number | Operation)[]): number | null => {
  if (expression.length < 3 || expression.length % 2 === 0) return null;
  
  try {
    let result = expression[0] as number;
    
    for (let i = 1; i < expression.length; i += 2) {
      const operation = expression[i] as Operation;
      const operand = expression[i + 1] as number;
      
      switch (operation) {
        case "+":
          result += operand;
          break;
        case "-":
          result -= operand;
          break;
        case "*":
          result *= operand;
          break;
        case "/":
          if (operand === 0) return null;
          result /= operand;
          break;
        case "^":
          if (result < 0) return null;
          result = Math.pow(result, operand);
          break;
      }
    }
    return Math.round(result * 100) / 100;
  } catch {
    return null;
  }
};

export const generateTargets = (board: Cell[][], boardSize: BoardSize): number[] => {
  const targets: number[] = [];
  const usedResults = new Set<number>();
  const targetCount = Math.max(4, Math.floor(boardSize / 2));

  for (let i = 0; i < boardSize && targets.length < targetCount; i++) {
    for (let startCol = 0; startCol < boardSize && targets.length < targetCount; startCol += 2) {
      for (let endCol = startCol + 2; endCol < boardSize && targets.length < targetCount; endCol += 2) {
        const expression: (number | Operation)[] = [];
        for (let col = startCol; col <= endCol; col++) {
          expression.push(board[i][col].value as number | Operation);
        }
        const result = evaluateExpression(expression);
        if (result !== null && result > 0 && result <= 1000 && !usedResults.has(result)) {
          targets.push(result);
          usedResults.add(result);
        }
      }
    }

    for (let startRow = 0; startRow < boardSize && targets.length < targetCount; startRow += 2) {
      for (let endRow = startRow + 2; endRow < boardSize && targets.length < targetCount; endRow += 2) {
        const expression: (number | Operation)[] = [];
        for (let row = startRow; row <= endRow; row++) {
          expression.push(board[row][i].value as number | Operation);
        }
        const result = evaluateExpression(expression);
        if (result !== null && result > 0 && result <= 1000 && !usedResults.has(result)) {
          targets.push(result);
          usedResults.add(result);
        }
      }
    }
  }

  return targets.slice(0, targetCount);
};

export const findAllSolutions = (
  board: Cell[][],
  targets: number[],
  boardSize: BoardSize
): { cells: { row: number; col: number }[]; target: number; expression: string }[] => {
  const solutions: { cells: { row: number; col: number }[]; target: number; expression: string }[] = [];
  
  for (let startRow = 0; startRow < boardSize; startRow++) {
    for (let startCol = 0; startCol < boardSize; startCol++) {
      if (board[startRow][startCol].type === "number") {
        const directions = [
          [0, 1], [1, 0], [0, -1], [-1, 0],
          [1, 1], [1, -1], [-1, 1], [-1, -1]
        ];
        
        for (const [dRow, dCol] of directions) {
          for (let length = 3; length <= Math.min(boardSize, 7); length += 2) {
            const cells: { row: number; col: number }[] = [];
            const expression: (number | Operation)[] = [];
            let valid = true;
            
            for (let i = 0; i < length; i++) {
              const row = startRow + i * dRow;
              const col = startCol + i * dCol;
              
              if (row < 0 || row >= boardSize || col < 0 || col >= boardSize) {
                valid = false;
                break;
              }
              
              const cell = board[row][col];
              const expectedType = i % 2 === 0 ? "number" : "operation";
              
              if (cell.type !== expectedType) {
                valid = false;
                break;
              }
              
              cells.push({ row, col });
              expression.push(cell.value as number | Operation);
            }
            
            if (valid && expression.length >= 3) {
              const result = evaluateExpression(expression);
              if (result !== null && targets.includes(result)) {
                let expressionString = "";
                if (expression.length === 3) {
                  expressionString = expression.join(" ");
                } else {
                  let formatted = `${expression[0]}`;
                  for (let i = 1; i < expression.length - 1; i += 2) {
                    const op = expression[i];
                    const operand = expression[i + 1];
                    formatted = `(${formatted} ${op} ${operand})`;
                  }
                  expressionString = formatted;
                }
                
                solutions.push({
                  cells,
                  target: result,
                  expression: expressionString
                });
              }
            }
          }
        }
      }
    }
  }
  
  return solutions;
};

export const isValidPath = (cells: { row: number; col: number }[]): boolean => {
  if (cells.length < 2) return true;

  const allSameRow = cells.every(cell => cell.row === cells[0].row);
  const allSameCol = cells.every(cell => cell.col === cells[0].col);

  if (!allSameRow && !allSameCol) return false;

  if (allSameRow) {
    for (let i = 1; i < cells.length; i++) {
      if (Math.abs(cells[i].col - cells[i - 1].col) !== 1) return false;
    }
  } else {
    for (let i = 1; i < cells.length; i++) {
      if (Math.abs(cells[i].row - cells[i - 1].row) !== 1) return false;
    }
  }

  return true;
};

export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};
