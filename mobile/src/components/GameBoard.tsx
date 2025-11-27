import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  PanResponder,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import { Cell, Operation, BoardSize } from '../lib/api';
import { isValidPath, evaluateExpression } from '../lib/gameLogic';

interface GameBoardProps {
  board: Cell[][];
  boardSize: BoardSize;
  selectedCells: { row: number; col: number }[];
  onSelectionChange: (cells: { row: number; col: number }[], expression: string, result: number | null) => void;
  onSelectionEnd: () => void;
  foundTargets: Set<number>;
  solutionCells?: { row: number; col: number }[];
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BOARD_PADDING = 16;

export const GameBoard: React.FC<GameBoardProps> = ({
  board,
  boardSize,
  selectedCells,
  onSelectionChange,
  onSelectionEnd,
  foundTargets,
  solutionCells = [],
}) => {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ row: number; col: number } | null>(null);
  const boardRef = useRef<View>(null);
  const boardLayout = useRef<{ x: number; y: number; width: number; height: number } | null>(null);

  const maxBoardWidth = SCREEN_WIDTH - BOARD_PADDING * 2;
  const cellSize = Math.floor(maxBoardWidth / boardSize);
  const boardWidth = cellSize * boardSize;

  const getCellFromPosition = useCallback((x: number, y: number): { row: number; col: number } | null => {
    if (!boardLayout.current) return null;

    const relativeX = x - boardLayout.current.x;
    const relativeY = y - boardLayout.current.y;

    const col = Math.floor(relativeX / cellSize);
    const row = Math.floor(relativeY / cellSize);

    if (row >= 0 && row < boardSize && col >= 0 && col < boardSize) {
      return { row, col };
    }
    return null;
  }, [cellSize, boardSize]);

  const updateSelection = useCallback((cells: { row: number; col: number }[]) => {
    if (!isValidPath(cells) && cells.length > 1) return;

    if (cells.length > 0) {
      const startCell = board[cells[0].row][cells[0].col];
      if (startCell.type !== "number") return;
    }

    const expression: (number | Operation)[] = [];
    let validExpression = true;

    for (let i = 0; i < cells.length; i++) {
      const cell = board[cells[i].row][cells[i].col];
      const expectedType = i % 2 === 0 ? "number" : "operation";
      
      if (cell.type !== expectedType) {
        validExpression = false;
        break;
      }
      expression.push(cell.value as number | Operation);
    }

    if (!validExpression && cells.length > 1) return;

    let expressionString = "";
    
    if (expression.length >= 3 && expression.length % 2 === 1) {
      if (expression.length === 3) {
        expressionString = expression.join(" ");
      } else {
        let formatted = `${expression[0]}`;
        for (let i = 1; i < expression.length - 1; i += 2) {
          const operation = expression[i];
          const operand = expression[i + 1];
          if (operand !== undefined) {
            formatted = `(${formatted} ${operation} ${operand})`;
          }
        }
        expressionString = formatted;
      }
    } else if (expression.length === 1) {
      expressionString = `${expression[0]}`;
    } else if (expression.length === 2) {
      expressionString = `${expression[0]} ${expression[1]} ...`;
    }
    
    const result = expression.length >= 3 ? evaluateExpression(expression) : null;
    onSelectionChange(cells, expressionString, result);
  }, [board, onSelectionChange]);

  const handleSelectionMove = useCallback((startCell: { row: number; col: number }, currentCell: { row: number; col: number }) => {
    const newPath: { row: number; col: number }[] = [];
    
    if (startCell.row === currentCell.row) {
      if (startCell.col <= currentCell.col) {
        for (let c = startCell.col; c <= currentCell.col; c++) {
          newPath.push({ row: currentCell.row, col: c });
        }
      } else {
        for (let c = startCell.col; c >= currentCell.col; c--) {
          newPath.push({ row: currentCell.row, col: c });
        }
      }
    } else if (startCell.col === currentCell.col) {
      if (startCell.row <= currentCell.row) {
        for (let r = startCell.row; r <= currentCell.row; r++) {
          newPath.push({ row: r, col: currentCell.col });
        }
      } else {
        for (let r = startCell.row; r >= currentCell.row; r--) {
          newPath.push({ row: r, col: currentCell.col });
        }
      }
    } else {
      newPath.push(startCell);
    }

    updateSelection(newPath);
  }, [updateSelection]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        const { pageX, pageY } = evt.nativeEvent;
        const cell = getCellFromPosition(pageX, pageY);
        if (cell) {
          setIsSelecting(true);
          setSelectionStart(cell);
          updateSelection([cell]);
        }
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        if (!isSelecting || !selectionStart) return;
        const { pageX, pageY } = evt.nativeEvent;
        const cell = getCellFromPosition(pageX, pageY);
        if (cell) {
          handleSelectionMove(selectionStart, cell);
        }
      },
      onPanResponderRelease: () => {
        setIsSelecting(false);
        setSelectionStart(null);
        onSelectionEnd();
      },
      onPanResponderTerminate: () => {
        setIsSelecting(false);
        setSelectionStart(null);
        onSelectionEnd();
      },
    })
  ).current;

  const isCellSelected = (row: number, col: number): boolean => {
    return selectedCells.some(cell => cell.row === row && cell.col === col);
  };

  const isCellInSolution = (row: number, col: number): boolean => {
    return solutionCells.some(cell => cell.row === row && cell.col === col);
  };

  const getCellStyle = (cell: Cell, row: number, col: number) => {
    const isSelected = isCellSelected(row, col);
    const isInSolution = isCellInSolution(row, col);
    const isNumber = cell.type === "number";

    return [
      styles.cell,
      { width: cellSize, height: cellSize },
      isNumber ? styles.numberCell : styles.operationCell,
      isSelected && styles.selectedCell,
      isInSolution && styles.solutionCell,
    ];
  };

  const getCellTextStyle = (cell: Cell, row: number, col: number) => {
    const isSelected = isCellSelected(row, col);
    const isNumber = cell.type === "number";

    return [
      styles.cellText,
      isNumber ? styles.numberText : styles.operationText,
      isSelected && styles.selectedText,
      { fontSize: boardSize <= 5 ? 24 : boardSize <= 10 ? 18 : 14 },
    ];
  };

  return (
    <View
      ref={boardRef}
      style={[styles.container, { width: boardWidth, height: boardWidth }]}
      onLayout={(event) => {
        event.target.measure((x, y, width, height, pageX, pageY) => {
          boardLayout.current = { x: pageX, y: pageY, width, height };
        });
      }}
      {...panResponder.panHandlers}
    >
      {board.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((cell, colIndex) => (
            <View
              key={`${rowIndex}-${colIndex}`}
              style={getCellStyle(cell, rowIndex, colIndex)}
            >
              <Text style={getCellTextStyle(cell, rowIndex, colIndex)}>
                {cell.value}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 4,
    alignSelf: 'center',
  },
  row: {
    flexDirection: 'row',
  },
  cell: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 6,
    margin: 1,
  },
  numberCell: {
    backgroundColor: '#334155',
  },
  operationCell: {
    backgroundColor: '#475569',
  },
  selectedCell: {
    backgroundColor: '#3b82f6',
  },
  solutionCell: {
    backgroundColor: '#22c55e',
  },
  cellText: {
    fontWeight: 'bold',
  },
  numberText: {
    color: '#f1f5f9',
  },
  operationText: {
    color: '#fbbf24',
  },
  selectedText: {
    color: '#ffffff',
  },
});
