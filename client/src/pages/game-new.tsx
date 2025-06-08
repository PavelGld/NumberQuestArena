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
import { Calculator, Trophy, RotateCcw, Target, BarChart3, Info, CheckCircle, Circle, Settings } from "lucide-react";
import type { LeaderboardEntry, InsertLeaderboardEntry } from "@shared/schema";

type CellType = "number" | "operation";
type Operation = "+" | "-" | "*" | "/" | "^";
type Difficulty = "easy" | "medium" | "hard";
type BoardSize = 5 | 10 | 15;

interface Cell {
  value: number | Operation;
  type: CellType;
  row: number;
  col: number;
}

interface GameState {
  board: Cell[][];
  targets: number[];
  foundTargets: Set<number>;
  selectedCells: { row: number; col: number }[];
  gameTime: number;
  isPlaying: boolean;
  attemptCount: number;
  currentExpression: string;
  currentResult: number | null;
  difficulty: Difficulty;
  boardSize: BoardSize;
}

const DIFFICULTY_LABELS = {
  easy: "Легко",
  medium: "Средне", 
  hard: "Сложно"
};

const BOARD_SIZE_LABELS = {
  5: "5×5",
  10: "10×10",
  15: "15×15"
};

export default function Game() {
  const { toast } = useToast();
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
  });

  const [showVictoryModal, setShowVictoryModal] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [playerNickname, setPlayerNickname] = useState("");
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ row: number; col: number } | null>(null);
  const [tempDifficulty, setTempDifficulty] = useState<Difficulty>(gameState.difficulty);
  const [tempBoardSize, setTempBoardSize] = useState<BoardSize>(gameState.boardSize);

  // Fetch leaderboard
  const { data: leaderboard = [] } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/leaderboard", gameState.difficulty, gameState.boardSize],
  });

  // Submit score mutation
  const submitScoreMutation = useMutation({
    mutationFn: (data: InsertLeaderboardEntry) => 
      apiRequest("POST", "/api/leaderboard", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leaderboard"] });
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

  // Generate operations based on difficulty
  const getOperationsForDifficulty = (difficulty: Difficulty): Operation[] => {
    switch (difficulty) {
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

  // Generate random board
  const generateBoard = useCallback((boardSize: BoardSize, difficulty: Difficulty): Cell[][] => {
    const board: Cell[][] = [];
    const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const operations = getOperationsForDifficulty(difficulty);

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

  // Evaluate mathematical expression
  const evaluateExpression = (expression: (number | Operation)[]): number | null => {
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
            result = Math.pow(result, operand);
            break;
        }
      }
      return Math.round(result * 100) / 100;
    } catch {
      return null;
    }
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

  // Check if path is valid
  const isValidPath = (cells: { row: number; col: number }[]): boolean => {
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

  // Handle cell selection
  const handleCellMouseDown = (row: number, col: number) => {
    setIsSelecting(true);
    setSelectionStart({ row, col });
    setGameState(prev => ({
      ...prev,
      selectedCells: [{ row, col }],
      currentExpression: "",
      currentResult: null,
    }));
  };

  const handleCellMouseEnter = (row: number, col: number) => {
    if (!isSelecting || !selectionStart) return;

    const newPath = [];
    
    if (selectionStart.row === row) {
      if (selectionStart.col <= col) {
        for (let c = selectionStart.col; c <= col; c++) {
          newPath.push({ row, col: c });
        }
      } else {
        for (let c = selectionStart.col; c >= col; c--) {
          newPath.push({ row, col: c });
        }
      }
    } else if (selectionStart.col === col) {
      if (selectionStart.row <= row) {
        for (let r = selectionStart.row; r <= row; r++) {
          newPath.push({ row: r, col });
        }
      } else {
        for (let r = selectionStart.row; r >= row; r--) {
          newPath.push({ row: r, col });
        }
      }
    } else {
      newPath.push(selectionStart);
    }

    updateSelection(newPath);
  };

  const updateSelection = (cells: { row: number; col: number }[]) => {
    if (!isValidPath(cells) && cells.length > 1) return;

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

    const expressionString = expression.join(" ");
    const result = expression.length >= 3 ? evaluateExpression(expression) : null;

    setGameState(prev => ({
      ...prev,
      selectedCells: cells,
      currentExpression: expressionString,
      currentResult: result,
    }));
  };

  const handleMouseUp = () => {
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
          title: "Отлично!",
          description: `Вы нашли число ${result}!`,
        });

        if (newFoundTargets.size === gameState.targets.length) {
          setGameState(prev => ({ ...prev, isPlaying: false }));
          setShowVictoryModal(true);
        }
      }
    }

    setTimeout(() => {
      setGameState(prev => ({
        ...prev,
        selectedCells: [],
        currentExpression: "",
        currentResult: null,
      }));
    }, 500);
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
  }, []);

  const isCellSelected = (row: number, col: number) => {
    return gameState.selectedCells.some(cell => cell.row === row && cell.col === col);
  };

  const getCellClasses = (cell: Cell, row: number, col: number) => {
    const isSelected = isCellSelected(row, col);
    const baseClasses = "aspect-square border-2 rounded-lg flex items-center justify-center font-bold transition-all cursor-pointer select-none";
    
    // Adjust text size based on board size
    const textSize = gameState.boardSize === 5 ? "text-2xl" : gameState.boardSize === 10 ? "text-lg" : "text-sm";
    
    if (isSelected) {
      return `${baseClasses} ${textSize} bg-indigo-500 border-indigo-600 text-white`;
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
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-indigo-500 p-2 rounded-lg">
                <Calculator className="text-white text-xl" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Арифметическая эстафета</h1>
                <div className="text-sm text-gray-600">
                  {DIFFICULTY_LABELS[gameState.difficulty]} • {BOARD_SIZE_LABELS[gameState.boardSize]}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-gray-100 px-4 py-2 rounded-lg">
                <span className="font-mono text-lg font-semibold text-gray-900">
                  {formatTime(gameState.gameTime)}
                </span>
              </div>
              <Button 
                onClick={() => setShowSettings(true)} 
                variant="outline" 
                className="border-gray-300"
              >
                <Settings className="mr-2 h-4 w-4" />
                Настройки
              </Button>
              <Button 
                onClick={() => initializeGame()} 
                className="bg-indigo-500 hover:bg-indigo-600"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Новая игра
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Game Board */}
          <div className="lg:col-span-3">
            <Card className="shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">Игровое поле</h2>
                  <Badge variant={gameState.isPlaying ? "default" : "secondary"}>
                    {gameState.isPlaying ? "Игра идёт" : "Игра окончена"}
                  </Badge>
                </div>

                <div 
                  className={`grid gap-1 mx-auto bg-gray-100 p-4 rounded-xl max-w-fit`}
                  style={{
                    gridTemplateColumns: `repeat(${gameState.boardSize}, minmax(0, 1fr))`
                  }}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
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
                        onMouseDown={() => handleCellMouseDown(rowIndex, colIndex)}
                        onMouseEnter={() => handleCellMouseEnter(rowIndex, colIndex)}
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
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Текущий выбор:</h3>
                      <div className="text-lg font-mono text-gray-900 bg-white px-3 py-2 rounded border">
                        {gameState.currentExpression || "Выберите путь на поле"}
                        {gameState.currentResult !== null && (
                          <span className="font-bold text-indigo-600 ml-2">
                            = {gameState.currentResult}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Targets Panel */}
            <Card className="shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Target className="text-indigo-500" />
                  <h3 className="text-lg font-semibold text-gray-900">Найдите числа</h3>
                </div>
                <div className="space-y-3">
                  {gameState.targets.map((target, index) => (
                    <div 
                      key={index} 
                      className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                        gameState.foundTargets.has(target)
                          ? "bg-green-50 border-green-200 text-green-800"
                          : "bg-gray-50 border-gray-200 text-gray-900"
                      }`}
                    >
                      <span className="font-semibold text-lg">{target}</span>
                      {gameState.foundTargets.has(target) ? (
                        <CheckCircle className="text-green-600" size={20} />
                      ) : (
                        <Circle className="text-gray-400" size={20} />
                      )}
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between text-sm text-gray-600 mb-2">
                    <span>Прогресс:</span>
                    <span>{gameState.foundTargets.size}/{gameState.targets.length}</span>
                  </div>
                  <Progress 
                    value={(gameState.foundTargets.size / gameState.targets.length) * 100} 
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Stats Panel */}
            <Card className="shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <BarChart3 className="text-indigo-500" />
                  <h3 className="text-lg font-semibold text-gray-900">Статистика</h3>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Время:</span>
                    <span className="font-mono font-semibold">{formatTime(gameState.gameTime)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Попытки:</span>
                    <span className="font-semibold">{gameState.attemptCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Найдено:</span>
                    <span className="font-semibold">{gameState.foundTargets.size}/{gameState.targets.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Leaderboard Button */}
            <Button 
              onClick={() => setShowLeaderboard(true)} 
              className="w-full bg-amber-500 hover:bg-amber-600"
            >
              <Trophy className="mr-2 h-4 w-4" />
              Лидерборд
            </Button>
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Настройки игры</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Сложность</label>
              <Select value={tempDifficulty} onValueChange={(value: Difficulty) => setTempDifficulty(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Легко (+, -, *)</SelectItem>
                  <SelectItem value="medium">Средне (+, -, *, /)</SelectItem>
                  <SelectItem value="hard">Сложно (+, -, *, /, ^)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Размер поля</label>
              <Select value={tempBoardSize.toString()} onValueChange={(value) => setTempBoardSize(parseInt(value) as BoardSize)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5×5 (4 цели)</SelectItem>
                  <SelectItem value="10">10×10 (5 целей)</SelectItem>
                  <SelectItem value="15">15×15 (7 целей)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex space-x-2 pt-4">
              <Button 
                onClick={() => setShowSettings(false)} 
                variant="outline" 
                className="flex-1"
              >
                Отмена
              </Button>
              <Button 
                onClick={handleSaveSettings} 
                className="flex-1 bg-indigo-500 hover:bg-indigo-600"
              >
                Начать игру
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Victory Modal */}
      <Dialog open={showVictoryModal} onOpenChange={setShowVictoryModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl text-green-600">
              🎉 Поздравляем!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4 text-center">
            <p className="text-gray-600">
              Вы нашли все числа за <span className="font-bold">{formatTime(gameState.gameTime)}</span>!
            </p>
            <p className="text-sm text-gray-500">
              Сложность: {DIFFICULTY_LABELS[gameState.difficulty]} • Поле: {BOARD_SIZE_LABELS[gameState.boardSize]}
            </p>
            
            <form onSubmit={handleSubmitScore} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Введите ваш никнейм:</label>
                <Input
                  type="text"
                  placeholder="Ваш никнейм"
                  value={playerNickname}
                  onChange={(e) => setPlayerNickname(e.target.value)}
                  maxLength={20}
                  required
                />
              </div>
              
              <div className="flex space-x-2">
                <Button 
                  type="button" 
                  onClick={() => setShowVictoryModal(false)} 
                  variant="outline" 
                  className="flex-1"
                >
                  Пропустить
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 bg-green-500 hover:bg-green-600"
                  disabled={submitScoreMutation.isPending}
                >
                  {submitScoreMutation.isPending ? "Сохранение..." : "Сохранить"}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Leaderboard Modal */}
      <Dialog open={showLeaderboard} onOpenChange={setShowLeaderboard}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <Trophy className="text-amber-500" />
              <span>Лидерборд</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-gray-600 text-center">
              {DIFFICULTY_LABELS[gameState.difficulty]} • {BOARD_SIZE_LABELS[gameState.boardSize]}
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {leaderboard && leaderboard.length > 0 ? (
                <div className="space-y-2">
                  {leaderboard.map((entry: LeaderboardEntry, index: number) => (
                    <div 
                      key={entry.id} 
                      className={`flex items-center justify-between p-3 rounded-lg ${
                        index === 0 ? "bg-amber-50 border border-amber-200" :
                        index === 1 ? "bg-gray-50 border border-gray-200" :
                        index === 2 ? "bg-orange-50 border border-orange-200" :
                        "bg-white border border-gray-100"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className={`font-bold text-lg ${
                          index === 0 ? "text-amber-600" :
                          index === 1 ? "text-gray-600" :
                          index === 2 ? "text-orange-600" :
                          "text-gray-400"
                        }`}>
                          #{index + 1}
                        </span>
                        <div>
                          <div className="font-medium">{entry.nickname}</div>
                          <div className="text-xs text-gray-500">
                            {entry.attempts} попыток
                          </div>
                        </div>
                      </div>
                      <span className="font-mono font-semibold">
                        {formatTime(entry.time)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Trophy className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <p>Пока нет результатов для этой категории</p>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}