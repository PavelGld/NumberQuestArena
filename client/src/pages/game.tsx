import { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLanguage, type Language } from "@/lib/i18n";
import { Calculator, Trophy, RotateCcw, Target, BarChart3, Info, CheckCircle, Circle, Settings, Flag, Languages } from "lucide-react";
import type { LeaderboardEntry, InsertLeaderboardEntry } from "@shared/schema";

// Типы для игровой логики
type CellType = "number" | "operation"; // Тип ячейки: число или операция
type Operation = "+" | "-" | "*" | "/" | "^"; // Доступные математические операции
type Difficulty = "easy" | "medium" | "hard"; // Уровни сложности игры
type BoardSize = 5 | 10 | 15; // Доступные размеры игрового поля

// Интерфейс для ячейки игрового поля
interface Cell {
  value: number | Operation; // Значение: число или математическая операция
  type: CellType; // Тип ячейки
  row: number; // Позиция по вертикали
  col: number; // Позиция по горизонтали
}

// Основное состояние игры
interface GameState {
  board: Cell[][]; // Двумерный массив игрового поля
  targets: number[]; // Целевые числа для поиска
  foundTargets: Set<number>; // Найденные целевые числа
  selectedCells: { row: number; col: number }[]; // Выбранные ячейки
  gameTime: number; // Время игры в секундах
  isPlaying: boolean; // Статус игры (идёт/завершена)
  attemptCount: number; // Количество попыток
  currentExpression: string; // Текущее математическое выражение
  currentResult: number | null; // Результат текущего выражения
  difficulty: Difficulty; // Уровень сложности
  boardSize: BoardSize; // Размер игрового поля
  showSolutions: boolean; // Показывать ли подсказки
  solutions: { cells: { row: number; col: number }[]; target: number; expression: string }[]; // Найденные решения
}

export default function Game() {
  const { toast } = useToast();
  const { t, language, setLanguage } = useLanguage();
  const [gameState, setGameState] = useState<GameState>({
    board: [],
    targets: [],
    foundTargets: new Set(),
    selectedCells: [],
    gameTime: 0,
    isPlaying: false,
    attemptCount: 0,
    currentExpression: "",
    currentResult: null,
    difficulty: "easy",
    boardSize: 5,
    showSolutions: false,
    solutions: [],
  });

  const [showVictoryModal, setShowVictoryModal] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [playerNickname, setPlayerNickname] = useState("");
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ row: number; col: number } | null>(null);
  const [tempDifficulty, setTempDifficulty] = useState<Difficulty>(gameState.difficulty);
  const [tempBoardSize, setTempBoardSize] = useState<BoardSize>(gameState.boardSize);
  const [leaderboardDifficulty, setLeaderboardDifficulty] = useState<Difficulty>(gameState.difficulty);
  const [leaderboardBoardSize, setLeaderboardBoardSize] = useState<BoardSize>(gameState.boardSize);

  // Fetch leaderboard for current category
  const { data: leaderboard = [] } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/leaderboard", leaderboardDifficulty, leaderboardBoardSize],
  });

  // Submit score mutation
  const submitScoreMutation = useMutation({
    mutationFn: (data: InsertLeaderboardEntry) => 
      apiRequest("POST", "/api/leaderboard", data),
    onSuccess: (_, data) => {
      // Invalidate all leaderboard queries to ensure fresh data
      queryClient.invalidateQueries({ queryKey: ["/api/leaderboard"] });
      // Set leaderboard view to the category where the score was submitted
      setLeaderboardDifficulty(data.difficulty as Difficulty);
      setLeaderboardBoardSize(data.boardSize as BoardSize);
      setShowVictoryModal(false);
      setShowLeaderboard(true);
      toast({
        title: "Результат сохранён!",
        description: "Ваш результат добавлен в лидерборд.",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить результат.",
        variant: "destructive",
      });
    },
  });

  // Generate random board
  const generateBoard = useCallback((boardSize: BoardSize, difficulty: Difficulty): Cell[][] => {
    const board: Cell[][] = [];
    const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    
    // Get operations based on difficulty
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
  }, []);

  // Generate target numbers based on board
  const generateTargets = useCallback((board: Cell[][], boardSize: BoardSize): number[] => {
    const targets: number[] = [];
    const usedResults = new Set<number>();
    const targetCount = Math.max(4, Math.floor(boardSize / 2));

    // Generate targets from rows and columns
    for (let i = 0; i < boardSize && targets.length < targetCount; i++) {
      // Row targets
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

      // Column targets
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
  }, []);

  /**
   * Вычисляет математическое выражение с проверкой на ошибки
   * @param expression - Массив чисел и операций (число, операция, число, операция, ...)
   * @returns Результат вычисления или null при ошибке
   */
  const evaluateExpression = (expression: (number | Operation)[]): number | null => {
    // Проверяем, что выражение имеет правильную структуру (минимум 3 элемента, нечётное количество)
    if (expression.length < 3 || expression.length % 2 === 0) return null;
    
    try {
      let result = expression[0] as number; // Начинаем с первого числа
      
      // Обрабатываем каждую пару операция-число
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
            // Проверка деления на ноль
            if (operand === 0) {
              toast({
                title: t('game.invalidOperation'),
                description: t('game.divisionByZero'),
                variant: "destructive",
              });
              return null;
            }
            result /= operand;
            break;
          case "^":
            // Проверка возведения отрицательного числа в степень
            if (result < 0) {
              toast({
                title: t('game.invalidOperation'),
                description: t('game.negativePower'),
                variant: "destructive",
              });
              return null;
            }
            result = Math.pow(result, operand);
            break;
        }
      }
      // Округляем результат до 2 знаков после запятой для избежания проблем с плавающей точкой
      return Math.round(result * 100) / 100;
    } catch {
      // В случае любой другой ошибки возвращаем null
      return null;
    }
  };

  const findAllSolutions = useCallback((board: Cell[][], targets: number[], boardSize: BoardSize) => {
    const solutions: { cells: { row: number; col: number }[]; target: number; expression: string }[] = [];
    
    // Check all possible paths on the board
    for (let startRow = 0; startRow < boardSize; startRow++) {
      for (let startCol = 0; startCol < boardSize; startCol++) {
        if (board[startRow][startCol].type === "number") {
          // Try paths in all 8 directions
          const directions = [
            [0, 1], [1, 0], [0, -1], [-1, 0], // horizontal/vertical
            [1, 1], [1, -1], [-1, 1], [-1, -1] // diagonal
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
                  // Format expression for display
                  let expressionString = "";
                  if (expression.length === 3) {
                    expressionString = expression.join(" ");
                  } else {
                    let formatted = `${expression[0]}`;
                    for (let i = 1; i < expression.length - 1; i += 2) {
                      const operation = expression[i];
                      const operand = expression[i + 1];
                      if (i === 1) {
                        formatted = `(${formatted} ${operation} ${operand})`;
                      } else {
                        formatted = `(${formatted} ${operation} ${operand})`;
                      }
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
  }, []);

  // Handle give up
  const handleGiveUp = () => {
    const solutions = findAllSolutions(gameState.board, gameState.targets, gameState.boardSize);
    setGameState(prev => ({
      ...prev,
      isPlaying: false,
      showSolutions: true,
      solutions
    }));
  };

  // Initialize new game
  const initializeGame = useCallback((difficulty?: Difficulty, boardSize?: BoardSize) => {
    const newDifficulty = difficulty || gameState.difficulty;
    const newBoardSize = boardSize || gameState.boardSize;
    const board = generateBoard(newBoardSize, newDifficulty);
    const targets = generateTargets(board, newBoardSize);
    
    setGameState({
      board,
      targets,
      foundTargets: new Set(),
      selectedCells: [],
      gameTime: 0,
      isPlaying: true,
      attemptCount: 0,
      currentExpression: "",
      currentResult: null,
      difficulty: newDifficulty,
      boardSize: newBoardSize,
      showSolutions: false,
      solutions: [],
    });
    setShowVictoryModal(false);
    setShowLeaderboard(false);
    setShowSettings(false);
    setPlayerNickname("");
  }, [generateBoard, generateTargets, gameState.difficulty, gameState.boardSize]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (gameState.isPlaying) {
      interval = setInterval(() => {
        setGameState(prev => ({ ...prev, gameTime: prev.gameTime + 1 }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [gameState.isPlaying]);

  // Check if path is valid (continuous horizontal or vertical)
  const isValidPath = (cells: { row: number; col: number }[]): boolean => {
    if (cells.length < 2) return true;

    // Check if all cells are in the same row or column
    const allSameRow = cells.every(cell => cell.row === cells[0].row);
    const allSameCol = cells.every(cell => cell.col === cells[0].col);

    if (!allSameRow && !allSameCol) return false;

    // Check if cells are continuous in the order they were selected
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

  // Handle cell selection - both mouse and touch
  const handleCellSelectionStart = (row: number, col: number) => {
    setIsSelecting(true);
    setSelectionStart({ row, col });
    setGameState(prev => ({
      ...prev,
      selectedCells: [{ row, col }],
      currentExpression: "",
      currentResult: null,
    }));
  };

  const handleCellMouseDown = (row: number, col: number) => {
    handleCellSelectionStart(row, col);
  };

  const handleCellTouchStart = (row: number, col: number, e: React.TouchEvent) => {
    e.preventDefault(); // Prevent scrolling on touch
    handleCellSelectionStart(row, col);
  };

  const handleCellSelectionMove = (row: number, col: number) => {
    if (!isSelecting || !selectionStart) return;

    const newPath = [];
    
    // Determine if we're selecting horizontally or vertically
    if (selectionStart.row === row) {
      // Horizontal selection - maintain direction based on start and end
      if (selectionStart.col <= col) {
        // Left to right
        for (let c = selectionStart.col; c <= col; c++) {
          newPath.push({ row, col: c });
        }
      } else {
        // Right to left
        for (let c = selectionStart.col; c >= col; c--) {
          newPath.push({ row, col: c });
        }
      }
    } else if (selectionStart.col === col) {
      // Vertical selection - maintain direction based on start and end
      if (selectionStart.row <= row) {
        // Top to bottom
        for (let r = selectionStart.row; r <= row; r++) {
          newPath.push({ row: r, col });
        }
      } else {
        // Bottom to top
        for (let r = selectionStart.row; r >= row; r--) {
          newPath.push({ row: r, col });
        }
      }
    } else {
      // Invalid selection (diagonal), keep only start cell
      newPath.push(selectionStart);
    }

    updateSelection(newPath);
  };

  const handleCellMouseEnter = (row: number, col: number) => {
    handleCellSelectionMove(row, col);
  };

  const handleCellTouchMove = (e: React.TouchEvent) => {
    if (!isSelecting) return;
    
    e.preventDefault(); // Prevent scrolling
    e.stopPropagation();
    
    const touch = e.touches[0];
    if (!touch) return;
    
    // Get element at touch position
    const element = document.elementFromPoint(touch.clientX, touch.clientY);
    
    // Find the cell element or its parent with data attributes
    let cellElement = element;
    while (cellElement && cellElement !== document.body) {
      if (cellElement.hasAttribute && cellElement.hasAttribute('data-row') && cellElement.hasAttribute('data-col')) {
        const row = parseInt(cellElement.getAttribute('data-row') || '0');
        const col = parseInt(cellElement.getAttribute('data-col') || '0');
        handleCellSelectionMove(row, col);
        break;
      }
      cellElement = cellElement.parentElement;
    }
  };

  const updateSelection = (cells: { row: number; col: number }[]) => {
    if (!isValidPath(cells) && cells.length > 1) return;

    // Check if path starts with number and alternates correctly
    if (cells.length > 0) {
      const startCell = gameState.board[cells[0].row][cells[0].col];
      if (startCell.type !== "number") return;
    }

    const expression: (number | Operation)[] = [];
    let validExpression = true;

    for (let i = 0; i < cells.length; i++) {
      const cell = gameState.board[cells[i].row][cells[i].col];
      const expectedType = i % 2 === 0 ? "number" : "operation";
      
      if (cell.type !== expectedType) {
        validExpression = false;
        break;
      }
      expression.push(cell.value as number | Operation);
    }

    if (!validExpression && cells.length > 1) return;

    // Format expression with proper parentheses for clarity
    let expressionString = "";
    
    // Only show complete number-operation-number patterns
    if (expression.length >= 3 && expression.length % 2 === 1) {
      if (expression.length === 3) {
        expressionString = expression.join(" ");
      } else {
        // For longer expressions, add parentheses to show order of operations
        let formatted = `${expression[0]}`;
        for (let i = 1; i < expression.length - 1; i += 2) {
          const operation = expression[i];
          const operand = expression[i + 1];
          
          if (operand !== undefined) {
            if (i === 1) {
              formatted = `(${formatted} ${operation} ${operand})`;
            } else {
              formatted = `(${formatted} ${operation} ${operand})`;
            }
          }
        }
        expressionString = formatted;
      }
    } else if (expression.length === 1) {
      // Show single number
      expressionString = `${expression[0]}`;
    } else if (expression.length === 2) {
      // Show number and operation, but wait for next number
      expressionString = `${expression[0]} ${expression[1]} ...`;
    } else {
      // For incomplete expressions, show what we have so far
      const completeTerms = [];
      for (let i = 0; i < expression.length; i += 2) {
        if (expression[i] !== undefined) {
          completeTerms.push(expression[i]);
          if (expression[i + 1] !== undefined && expression[i + 2] !== undefined) {
            completeTerms.push(expression[i + 1]);
          } else if (expression[i + 1] !== undefined) {
            completeTerms.push(expression[i + 1]);
            completeTerms.push("...");
            break;
          }
        }
      }
      expressionString = completeTerms.join(" ");
    }
    
    const result = expression.length >= 3 ? evaluateExpression(expression) : null;

    setGameState(prev => ({
      ...prev,
      selectedCells: cells,
      currentExpression: expressionString,
      currentResult: result,
    }));
  };

  const handleSelectionEnd = () => {
    if (!isSelecting) return;
    
    setIsSelecting(false);
    setSelectionStart(null);

    if (gameState.currentResult !== null && gameState.selectedCells.length >= 3) {
      const result = gameState.currentResult;
      
      setGameState(prev => ({ ...prev, attemptCount: prev.attemptCount + 1 }));

      if (gameState.targets.includes(result) && !gameState.foundTargets.has(result)) {
        const newFoundTargets = new Set(gameState.foundTargets);
        newFoundTargets.add(result);
        
        setGameState(prev => ({ ...prev, foundTargets: newFoundTargets }));
        
        toast({
          title: t('toast.found'),
          description: `${t('toast.foundNumber')} ${result}!`,
        });

        if (newFoundTargets.size === gameState.targets.length) {
          setGameState(prev => ({ ...prev, isPlaying: false }));
          setShowVictoryModal(true);
        }
      }
    }

    // Clear selection
    setTimeout(() => {
      setGameState(prev => ({
        ...prev,
        selectedCells: [],
        currentExpression: "",
        currentResult: null,
      }));
    }, 500);
  };

  const handleMouseUp = () => {
    handleSelectionEnd();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    handleSelectionEnd();
  };

  // Handle score submission
  const handleSubmitScore = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerNickname.trim()) {
      submitScoreMutation.mutate({
        nickname: playerNickname.trim(),
        time: gameState.gameTime,
        attempts: gameState.attemptCount,
        difficulty: gameState.difficulty,
        boardSize: gameState.boardSize,
      });
    }
  };

  // Handle settings save
  const handleSaveSettings = () => {
    initializeGame(tempDifficulty, tempBoardSize);
  };

  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Initialize game on mount
  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  const isCellSelected = (row: number, col: number) => {
    return gameState.selectedCells.some(cell => cell.row === row && cell.col === col);
  };

  const isCellInSolution = (row: number, col: number) => {
    if (!gameState.showSolutions) return false;
    return gameState.solutions.some(solution => 
      solution.cells.some(cell => cell.row === row && cell.col === col)
    );
  };

  const getCellClasses = (cell: Cell, row: number, col: number) => {
    const isSelected = isCellSelected(row, col);
    const isInSolution = isCellInSolution(row, col);
    const baseClasses = "game-cell aspect-square border-2 rounded-lg flex items-center justify-center font-bold transition-all cursor-pointer select-none";
    
    // Adjust text size based on board size
    const textSize = gameState.boardSize === 5 ? "text-2xl" : gameState.boardSize === 10 ? "text-lg" : "text-sm";
    
    if (isSelected) {
      return `${baseClasses} ${textSize} bg-indigo-500 border-indigo-600 text-white`;
    }
    
    if (isInSolution) {
      if (cell.type === "number") {
        return `${baseClasses} ${textSize} bg-green-100 border-green-400 text-green-800 hover:border-green-500`;
      } else {
        return `${baseClasses} ${textSize} bg-green-200 border-green-400 text-green-900 hover:border-green-500`;
      }
    }
    
    if (cell.type === "number") {
      return `${baseClasses} ${textSize} bg-white border-gray-200 text-gray-900 hover:border-indigo-300 hover:bg-indigo-50`;
    } else {
      return `${baseClasses} ${textSize} bg-amber-100 border-amber-200 text-amber-800 hover:border-amber-400 hover:bg-amber-200`;
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-2 sm:px-4 py-3 sm:py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center space-x-3">
              <div className="bg-indigo-500 p-2 rounded-lg">
                <Calculator className="text-white text-lg sm:text-xl" />
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900">{t('game.title')}</h1>
                <div className="text-xs sm:text-sm text-gray-600">
                  {t(`difficulty.${gameState.difficulty}`)} • {t(`boardSize.${gameState.boardSize}`)}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto overflow-x-auto">
              <div className="bg-gray-100 px-2 sm:px-4 py-1 sm:py-2 rounded-lg flex-shrink-0">
                <span className="font-mono text-sm sm:text-lg font-semibold text-gray-900">
                  {formatTime(gameState.gameTime)}
                </span>
              </div>
              <Select value={language} onValueChange={(value: Language) => setLanguage(value)}>
                <SelectTrigger className="w-16 sm:w-20 flex-shrink-0">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ru">🇷🇺 RU</SelectItem>
                  <SelectItem value="en">🇺🇸 EN</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={() => setShowSettings(true)} 
                variant="outline" 
                className="border-gray-300 flex-shrink-0"
                size="sm"
              >
                <Settings className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('game.settings')}</span>
              </Button>
              {gameState.isPlaying && (
                <Button 
                  onClick={handleGiveUp}
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50 flex-shrink-0"
                  size="sm"
                >
                  <Flag className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">{t('game.giveUp')}</span>
                </Button>
              )}
              <Button 
                onClick={() => initializeGame()} 
                className="bg-indigo-500 hover:bg-indigo-600 flex-shrink-0"
                size="sm"
              >
                <RotateCcw className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">{t('game.newGame')}</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="max-w-6xl mx-auto px-2 sm:px-4 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:gap-6 game-container">
          {/* Game Board */}
          <div className="lg:col-span-3 order-1 lg:order-1">
            <Card className="shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">{t('game.board.title')}</h2>
                  <Badge variant={gameState.isPlaying ? "default" : "secondary"}>
                    {gameState.isPlaying ? t('game.status.playing') : t('game.status.finished')}
                  </Badge>
                </div>

                <div 
                  className={`grid gap-1 mx-auto bg-gray-100 p-4 rounded-xl max-w-fit game-board`}
                  style={{
                    gridTemplateColumns: `repeat(${gameState.boardSize}, minmax(0, 1fr))`
                  }}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchEnd={handleTouchEnd}
                  onTouchMove={handleCellTouchMove}
                >
                  {gameState.board.map((row, rowIndex) =>
                    row.map((cell, colIndex) => (
                      <div
                        key={`${rowIndex}-${colIndex}`}
                        className={getCellClasses(cell, rowIndex, colIndex)}
                        style={{
                          width: gameState.boardSize === 5 ? "60px" : gameState.boardSize === 10 ? "40px" : "30px",
                          height: gameState.boardSize === 5 ? "60px" : gameState.boardSize === 10 ? "40px" : "30px"
                        }}
                        data-row={rowIndex}
                        data-col={colIndex}
                        onMouseDown={() => handleCellMouseDown(rowIndex, colIndex)}
                        onMouseEnter={() => handleCellMouseEnter(rowIndex, colIndex)}
                        onTouchStart={(e) => handleCellTouchStart(rowIndex, colIndex, e)}
                      >
                        {cell.value}
                      </div>
                    ))
                  )}
                </div>

                {/* Current Selection Display */}
                <div className="mt-6 bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">{t('game.currentSelection')}</h3>
                      <div className="text-lg font-mono text-gray-900 bg-white px-3 py-2 rounded border">
                        {gameState.currentExpression || t('game.selectPath')}
                        {gameState.currentResult !== null && (
                          <span className="font-bold text-indigo-600 ml-2">
                            = {gameState.currentResult}
                          </span>
                        )}
                      </div>
                    </div>
                    {gameState.currentResult !== null && (
                      <div className="text-right">
                        <div className="text-sm text-gray-500 mb-1">{t('game.result')}</div>
                        <div className="text-3xl font-bold text-indigo-600">
                          {gameState.currentResult}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-4 lg:space-y-6 order-2 lg:order-2">
            {/* Target Numbers */}
            <Card className="shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Target className="text-indigo-500 mr-2" />
                  {t('game.targets.title')}
                </h3>

                <div className="space-y-3">
                  {gameState.targets.map((target, index) => {
                    const isFound = gameState.foundTargets.has(target);
                    return (
                      <div
                        key={index}
                        className={`flex items-center justify-between p-3 rounded-lg border-2 ${
                          isFound
                            ? "bg-emerald-50 border-emerald-200"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <span
                          className={`text-xl font-bold ${
                            isFound ? "text-emerald-800" : "text-gray-900"
                          }`}
                        >
                          {target}
                        </span>
                        {isFound ? (
                          <CheckCircle className="text-emerald-500" />
                        ) : (
                          <Circle className="text-gray-300" />
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600">{t('game.progress.title')}:</span>
                    <span className="font-semibold text-gray-900">
                      {gameState.foundTargets.size} {t('game.progress.of')} {gameState.targets.length}
                    </span>
                  </div>
                  <Progress 
                    value={(gameState.foundTargets.size / gameState.targets.length) * 100} 
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Game Stats */}
            <Card className="shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <BarChart3 className="text-amber-500 mr-2" />
                  {t('game.stats.title')}
                </h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">{t('game.stats.attempts')}:</span>
                    <span className="font-semibold text-gray-900">{gameState.attemptCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">{t('game.stats.found')}:</span>
                    <span className="font-semibold text-emerald-600">{gameState.foundTargets.size}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">{t('game.stats.remaining')}:</span>
                    <span className="font-semibold text-amber-600">
                      {gameState.targets.length - gameState.foundTargets.size}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Solutions Display (when showing solutions) */}
            {gameState.showSolutions && (
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-green-900 mb-3 flex items-center">
                    <Target className="text-green-600 mr-2" />
                    {t('game.solutions.title')}
                  </h3>

                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {gameState.solutions.map((solution, index) => (
                      <div 
                        key={index}
                        className="p-3 bg-white rounded-lg border border-green-200"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-sm text-gray-700">
                            {solution.expression}
                          </span>
                          <span className="font-bold text-green-800">
                            = {solution.target}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {gameState.solutions.length === 0 && (
                    <p className="text-green-700 text-sm">
                      {t('game.solutions.noSolutions')}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Instructions */}
            {!gameState.showSolutions && (
              <Card className="bg-indigo-50 border-indigo-200">
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold text-indigo-900 mb-3 flex items-center">
                    <Info className="text-indigo-600 mr-2" />
                    {t('game.instructions.title')}
                  </h3>

                  <div className="space-y-2 text-sm text-indigo-800">
                    <p>• {t('game.instructions.rule1')}</p>
                    <p>• {t('game.instructions.rule2')}</p>
                    <p>• {t('game.instructions.rule3')}</p>
                    <p>• {t('game.instructions.rule4')}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                onClick={() => setShowLeaderboard(true)}
                className="text-indigo-500 hover:text-indigo-600"
              >
                <Trophy className="mr-2 h-4 w-4" />
                {t('leaderboard.title')}
              </Button>
            </div>
            <div className="text-gray-500 text-sm">
              © 2024 {t('game.title')}
            </div>
          </div>
        </div>
      </footer>

      {/* Victory Modal */}
      <Dialog open={showVictoryModal} onOpenChange={setShowVictoryModal}>
        <DialogContent className="max-w-md mx-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="text-center">
              <Trophy className="mx-auto text-4xl text-yellow-500 mb-3" />
              <DialogTitle className="text-xl sm:text-2xl">{t('victory.title')}</DialogTitle>
              <p className="text-gray-600 mt-2 text-sm sm:text-base">{t('victory.message')}</p>
            </div>
          </DialogHeader>

          <div className="text-center mb-6">
            <div className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              <span className="font-mono">{formatTime(gameState.gameTime)}</span>
            </div>
            <p className="text-gray-600 text-sm sm:text-base">{t('victory.yourTime')}</p>
          </div>

          <form onSubmit={handleSubmitScore} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('victory.enterNickname')}:
              </label>
              <Input
                value={playerNickname}
                onChange={(e) => setPlayerNickname(e.target.value)}
                placeholder={t('victory.nicknamePlaceholder')}
                maxLength={20}
                required
                className="w-full"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                type="submit" 
                className="flex-1 w-full"
                disabled={submitScoreMutation.isPending}
              >
                {t('victory.saveResult')}
              </Button>
              <Button 
                type="button" 
                variant="secondary"
                className="flex-1 w-full"
                onClick={() => initializeGame()}
              >
                {t('game.newGame')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Leaderboard Modal */}
      <Dialog open={showLeaderboard} onOpenChange={setShowLeaderboard}>
        <DialogContent className="w-[95vw] max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center text-lg sm:text-2xl">
              <Trophy className="mr-2 sm:mr-3 text-yellow-500 h-5 w-5 sm:h-6 sm:w-6" />
              {t('leaderboard.title')}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Category Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">{t('leaderboard.difficulty')}</label>
                <Select value={leaderboardDifficulty} onValueChange={(value: Difficulty) => setLeaderboardDifficulty(value)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">{t('difficulty.easy')}</SelectItem>
                    <SelectItem value="medium">{t('difficulty.medium')}</SelectItem>
                    <SelectItem value="hard">{t('difficulty.hard')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">{t('leaderboard.boardSize')}</label>
                <Select value={leaderboardBoardSize.toString()} onValueChange={(value) => setLeaderboardBoardSize(parseInt(value) as BoardSize)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5×5</SelectItem>
                    <SelectItem value="10">10×10</SelectItem>
                    <SelectItem value="15">15×15</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="text-center text-sm text-gray-600 bg-gray-50 rounded-lg p-2">
              {t(`difficulty.${leaderboardDifficulty}`)} • {t(`boardSize.${leaderboardBoardSize}`)}
            </div>

            {/* Leaderboard List */}
            <div className="overflow-y-auto max-h-60 sm:max-h-96">
              <div className="space-y-2">
                {leaderboard.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Trophy className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                    <p>{t('leaderboard.noResults')}</p>
                    <p className="text-sm">{t('leaderboard.beFirst')}</p>
                  </div>
                ) : (
                  leaderboard.map((entry, index) => (
                    <div
                      key={entry.id}
                      className={`flex items-center justify-between p-3 rounded-lg transition-all ${
                        index === 0
                          ? "bg-amber-50 border border-amber-200"
                          : index === 1
                          ? "bg-gray-50 border border-gray-200"
                          : index === 2
                          ? "bg-orange-50 border border-orange-200"
                          : "bg-white border border-gray-100"
                      }`}
                    >
                      <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                        <span
                          className={`text-sm sm:text-lg font-bold flex-shrink-0 ${
                            index === 0
                              ? "text-amber-600"
                              : index === 1
                              ? "text-gray-600"
                              : index === 2
                              ? "text-orange-600"
                              : "text-gray-400"
                          }`}
                        >
                          #{index + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-gray-900 font-medium text-sm sm:text-base truncate">
                            {entry.nickname}
                          </div>
                          <div className="text-xs text-gray-500">
                            {entry.attempts} {t('leaderboard.attempts')}
                          </div>
                        </div>
                      </div>
                      <span className="text-gray-700 font-mono font-semibold text-sm sm:text-base flex-shrink-0">
                        {formatTime(entry.time)}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick Category Buttons */}
            <div className="border-t pt-4">
              <div className="text-xs text-gray-500 mb-2 text-center">{t('leaderboard.quickJump')}:</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(["easy", "medium", "hard"] as Difficulty[]).map((difficulty) => (
                  <div key={difficulty} className="space-y-1">
                    <div className="text-xs font-medium text-gray-600 text-center">
                      {t(`difficulty.${difficulty}`)}
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {([5, 10, 15] as BoardSize[]).map((size) => (
                        <Button
                          key={`${difficulty}-${size}`}
                          variant={
                            leaderboardDifficulty === difficulty && leaderboardBoardSize === size
                              ? "default"
                              : "outline"
                          }
                          size="sm"
                          className="text-xs h-8 px-2 sm:h-6 sm:px-1"
                          onClick={() => {
                            setLeaderboardDifficulty(difficulty);
                            setLeaderboardBoardSize(size);
                          }}
                        >
                          {t(`boardSize.${size}`)}
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Settings Modal */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="w-[95vw] max-w-md mx-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">{t('settings.title')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">{t('settings.difficulty')}</label>
              <Select value={tempDifficulty} onValueChange={(value: Difficulty) => setTempDifficulty(value)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">{t('settings.easyDesc')}</SelectItem>
                  <SelectItem value="medium">{t('settings.mediumDesc')}</SelectItem>
                  <SelectItem value="hard">{t('settings.hardDesc')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">{t('settings.boardSize')}</label>
              <Select value={tempBoardSize.toString()} onValueChange={(value) => setTempBoardSize(parseInt(value) as BoardSize)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">{t('settings.size5')}</SelectItem>
                  <SelectItem value="10">{t('settings.size10')}</SelectItem>
                  <SelectItem value="15">{t('settings.size15')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-4">
              <Button 
                onClick={() => setShowSettings(false)} 
                variant="outline" 
                className="flex-1 w-full"
              >
                {t('settings.cancel')}
              </Button>
              <Button 
                onClick={handleSaveSettings} 
                className="flex-1 w-full bg-indigo-500 hover:bg-indigo-600"
              >
                {t('settings.startGame')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
