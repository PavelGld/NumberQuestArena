import { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Calculator, Trophy, RotateCcw, Target, BarChart3, Info, CheckCircle, Circle } from "lucide-react";
import type { LeaderboardEntry, InsertLeaderboardEntry } from "@shared/schema";

type CellType = "number" | "operation";
type Operation = "+" | "-" | "*" | "/";

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
}

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
  });

  const [showVictoryModal, setShowVictoryModal] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [playerNickname, setPlayerNickname] = useState("");
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ row: number; col: number } | null>(null);

  // Fetch leaderboard
  const { data: leaderboard = [] } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/leaderboard"],
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

  // Generate random board
  const generateBoard = useCallback((): Cell[][] => {
    const board: Cell[][] = [];
    const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const operations: Operation[] = ["+", "-", "*", "/"];

    for (let row = 0; row < 5; row++) {
      board[row] = [];
      for (let col = 0; col < 5; col++) {
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
  const generateTargets = useCallback((board: Cell[][]): number[] => {
    const targets: number[] = [];
    const usedResults = new Set<number>();

    // Generate targets from rows and columns
    for (let i = 0; i < 5; i++) {
      // Row targets
      for (let startCol = 0; startCol < 5; startCol += 2) {
        for (let endCol = startCol + 2; endCol < 5; endCol += 2) {
          const expression = [];
          for (let col = startCol; col <= endCol; col++) {
            expression.push(board[i][col].value);
          }
          const result = evaluateExpression(expression);
          if (result !== null && result > 0 && result <= 100 && !usedResults.has(result)) {
            targets.push(result);
            usedResults.add(result);
            if (targets.length >= 4) break;
          }
        }
        if (targets.length >= 4) break;
      }
      if (targets.length >= 4) break;

      // Column targets
      for (let startRow = 0; startRow < 5; startRow += 2) {
        for (let endRow = startRow + 2; endRow < 5; endRow += 2) {
          const expression = [];
          for (let row = startRow; row <= endRow; row++) {
            expression.push(board[row][i].value);
          }
          const result = evaluateExpression(expression);
          if (result !== null && result > 0 && result <= 100 && !usedResults.has(result)) {
            targets.push(result);
            usedResults.add(result);
            if (targets.length >= 4) break;
          }
        }
        if (targets.length >= 4) break;
      }
      if (targets.length >= 4) break;
    }

    return targets.slice(0, 4);
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
        }
      }
      return Math.round(result * 100) / 100; // Round to 2 decimal places
    } catch {
      return null;
    }
  };

  // Initialize new game
  const initializeGame = useCallback(() => {
    const board = generateBoard();
    const targets = generateTargets(board);
    
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
    });
    setShowVictoryModal(false);
    setShowLeaderboard(false);
    setPlayerNickname("");
  }, [generateBoard, generateTargets]);

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
    if (cells.length < 2) return false;

    // Check if all cells are in the same row or column
    const allSameRow = cells.every(cell => cell.row === cells[0].row);
    const allSameCol = cells.every(cell => cell.col === cells[0].col);

    if (!allSameRow && !allSameCol) return false;

    // Check if cells are continuous
    if (allSameRow) {
      const cols = cells.map(cell => cell.col).sort((a, b) => a - b);
      for (let i = 1; i < cols.length; i++) {
        if (cols[i] - cols[i - 1] !== 1) return false;
      }
    } else {
      const rows = cells.map(cell => cell.row).sort((a, b) => a - b);
      for (let i = 1; i < rows.length; i++) {
        if (rows[i] - rows[i - 1] !== 1) return false;
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
    
    // Determine if we're selecting horizontally or vertically
    if (selectionStart.row === row) {
      // Horizontal selection
      const startCol = Math.min(selectionStart.col, col);
      const endCol = Math.max(selectionStart.col, col);
      for (let c = startCol; c <= endCol; c++) {
        newPath.push({ row, col: c });
      }
    } else if (selectionStart.col === col) {
      // Vertical selection
      const startRow = Math.min(selectionStart.row, row);
      const endRow = Math.max(selectionStart.row, row);
      for (let r = startRow; r <= endRow; r++) {
        newPath.push({ row: r, col });
      }
    } else {
      // Invalid selection (diagonal), keep only start cell
      newPath.push(selectionStart);
    }

    updateSelection(newPath);
  };

  const updateSelection = (cells: { row: number; col: number }[]) => {
    if (!isValidPath(cells) && cells.length > 1) return;

    // Check if path starts with number and alternates correctly
    if (cells.length > 0) {
      const startCell = gameState.board[cells[0].row][cells[0].col];
      if (startCell.type !== "number") return;
    }

    const expression = [];
    let validExpression = true;

    for (let i = 0; i < cells.length; i++) {
      const cell = gameState.board[cells[i].row][cells[i].col];
      const expectedType = i % 2 === 0 ? "number" : "operation";
      
      if (cell.type !== expectedType) {
        validExpression = false;
        break;
      }
      expression.push(cell.value);
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

  // Handle score submission
  const handleSubmitScore = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerNickname.trim()) {
      submitScoreMutation.mutate({
        nickname: playerNickname.trim(),
        time: gameState.gameTime,
      });
    }
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

  const getCellClasses = (cell: Cell, row: number, col: number) => {
    const isSelected = isCellSelected(row, col);
    const baseClasses = "aspect-square border-2 rounded-lg flex items-center justify-center text-2xl font-bold transition-all cursor-pointer select-none";
    
    if (isSelected) {
      return `${baseClasses} bg-indigo-500 border-indigo-600 text-white`;
    }
    
    if (cell.type === "number") {
      return `${baseClasses} bg-white border-gray-200 text-gray-900 hover:border-indigo-300 hover:bg-indigo-50`;
    } else {
      return `${baseClasses} bg-amber-100 border-amber-200 text-amber-800 hover:border-amber-400 hover:bg-amber-200`;
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
              <h1 className="text-2xl font-bold text-gray-900">Арифметическая эстафета</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="bg-gray-100 px-4 py-2 rounded-lg">
                <span className="font-mono text-lg font-semibold text-gray-900">
                  {formatTime(gameState.gameTime)}
                </span>
              </div>
              <Button onClick={initializeGame} className="bg-indigo-500 hover:bg-indigo-600">
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
                  className="grid grid-cols-5 gap-2 max-w-md mx-auto bg-gray-100 p-4 rounded-xl"
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                >
                  {gameState.board.map((row, rowIndex) =>
                    row.map((cell, colIndex) => (
                      <div
                        key={`${rowIndex}-${colIndex}`}
                        className={getCellClasses(cell, rowIndex, colIndex)}
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
                    {gameState.currentResult !== null && (
                      <div className="text-right">
                        <div className="text-sm text-gray-500 mb-1">Результат</div>
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
          <div className="space-y-6">
            {/* Target Numbers */}
            <Card className="shadow-lg">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Target className="text-indigo-500 mr-2" />
                  Найдите числа:
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
                    <span className="text-gray-600">Прогресс:</span>
                    <span className="font-semibold text-gray-900">
                      {gameState.foundTargets.size} из {gameState.targets.length}
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
                  Статистика
                </h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Попыток:</span>
                    <span className="font-semibold text-gray-900">{gameState.attemptCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Найдено:</span>
                    <span className="font-semibold text-emerald-600">{gameState.foundTargets.size}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Осталось:</span>
                    <span className="font-semibold text-amber-600">
                      {gameState.targets.length - gameState.foundTargets.size}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card className="bg-indigo-50 border-indigo-200">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-indigo-900 mb-3 flex items-center">
                  <Info className="text-indigo-600 mr-2" />
                  Как играть
                </h3>

                <div className="space-y-2 text-sm text-indigo-800">
                  <p>• Выделяйте непрерывные линии (горизонтально или вертикально)</p>
                  <p>• Начинайте с числа, затем операция, затем число</p>
                  <p>• Найдите все целевые числа как можно быстрее</p>
                  <p>• Операции выполняются слева направо</p>
                </div>
              </CardContent>
            </Card>
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
                Лидерборд
              </Button>
            </div>
            <div className="text-gray-500 text-sm">
              © 2024 Арифметическая эстафета
            </div>
          </div>
        </div>
      </footer>

      {/* Victory Modal */}
      <Dialog open={showVictoryModal} onOpenChange={setShowVictoryModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="text-center">
              <Trophy className="mx-auto text-4xl text-yellow-500 mb-3" />
              <DialogTitle className="text-2xl">Поздравляем!</DialogTitle>
              <p className="text-gray-600 mt-2">Вы нашли все числа!</p>
            </div>
          </DialogHeader>

          <div className="text-center mb-6">
            <div className="text-3xl font-bold text-gray-900 mb-2">
              <span className="font-mono">{formatTime(gameState.gameTime)}</span>
            </div>
            <p className="text-gray-600">Ваше время</p>
          </div>

          <form onSubmit={handleSubmitScore} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Введите ваш никнейм:
              </label>
              <Input
                value={playerNickname}
                onChange={(e) => setPlayerNickname(e.target.value)}
                placeholder="Ваш никнейм"
                maxLength={20}
                required
              />
            </div>

            <div className="flex space-x-3">
              <Button 
                type="submit" 
                className="flex-1"
                disabled={submitScoreMutation.isPending}
              >
                Сохранить результат
              </Button>
              <Button 
                type="button" 
                variant="secondary"
                className="flex-1"
                onClick={initializeGame}
              >
                Новая игра
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Leaderboard Modal */}
      <Dialog open={showLeaderboard} onOpenChange={setShowLeaderboard}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center text-2xl">
              <Trophy className="mr-3 text-yellow-500" />
              Лидерборд
            </DialogTitle>
          </DialogHeader>

          <div className="overflow-y-auto">
            <div className="space-y-3">
              {leaderboard.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  Пока никто не играл. Будьте первым!
                </p>
              ) : (
                leaderboard.map((entry, index) => (
                  <div
                    key={entry.id}
                    className={`flex items-center justify-between p-3 rounded-lg ${
                      index === 0
                        ? "bg-yellow-50 border border-yellow-200"
                        : "bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          index === 0
                            ? "bg-yellow-500 text-white"
                            : "bg-gray-400 text-white"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <span className="font-semibold text-gray-900">
                        {entry.nickname}
                      </span>
                    </div>
                    <span
                      className={`font-mono text-lg font-semibold ${
                        index === 0 ? "text-yellow-700" : "text-gray-700"
                      }`}
                    >
                      {formatTime(entry.time)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
