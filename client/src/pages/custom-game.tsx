import { useState, useEffect, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Calculator, 
  Trophy, 
  RotateCcw, 
  Target, 
  CheckCircle, 
  Circle,
  Home,
  ArrowLeft
} from "lucide-react";
import type { CustomBoard, LeaderboardEntry, InsertLeaderboardEntry } from "@shared/schema";

type CellType = "number" | "operation";
type Operation = "+" | "-" | "*" | "/" | "^";

interface Cell {
  value: number | Operation;
  type: CellType;
  row: number;
  col: number;
}

interface GameState {
  selectedCells: { row: number; col: number }[];
  foundTargets: Set<number>;
  gameTime: number;
  isPlaying: boolean;
  attemptCount: number;
  currentExpression: string;
  currentResult: number | null;
}

export default function CustomGame() {
  const { toast } = useToast();
  const params = useParams<{ id: string }>();
  const boardId = parseInt(params.id || "0");

  const { data: customBoard, isLoading } = useQuery<CustomBoard>({
    queryKey: [`/api/custom-boards/${boardId}`],
  });

  const [board, setBoard] = useState<Cell[][]>([]);
  const [targets, setTargets] = useState<number[]>([]);
  const [gameState, setGameState] = useState<GameState>({
    selectedCells: [],
    foundTargets: new Set(),
    gameTime: 0,
    isPlaying: false,
    attemptCount: 0,
    currentExpression: "",
    currentResult: null,
  });

  const [showVictoryModal, setShowVictoryModal] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [playerNickname, setPlayerNickname] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  const { data: leaderboard = [] } = useQuery<LeaderboardEntry[]>({
    queryKey: ["/api/leaderboard", customBoard?.difficulty, customBoard?.boardSize],
  });

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

  useEffect(() => {
    if (customBoard) {
      const boardData = customBoard.boardData as unknown as Cell[][];
      setBoard(boardData);
      setTargets(customBoard.targets);
      setGameState(prev => ({
        ...prev,
        isPlaying: true,
        gameTime: 0,
        foundTargets: new Set(),
        attemptCount: 0,
      }));
    }
  }, [customBoard]);

  useEffect(() => {
    if (!gameState.isPlaying) return;

    const timer = setInterval(() => {
      setGameState(prev => ({
        ...prev,
        gameTime: prev.gameTime + 1,
      }));
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState.isPlaying]);

  useEffect(() => {
    if (gameState.foundTargets.size === targets.length && targets.length > 0 && gameState.isPlaying) {
      setGameState(prev => ({ ...prev, isPlaying: false }));
      setShowVictoryModal(true);
    }
  }, [gameState.foundTargets.size, targets.length, gameState.isPlaying]);

  const evaluateExpression = (expression: (number | Operation)[]): number | null => {
    if (expression.length < 1) return null;

    try {
      let result = expression[0] as number;

      for (let i = 1; i < expression.length; i += 2) {
        if (i + 1 >= expression.length) break;
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

  const handleCellSelectionStart = (row: number, col: number) => {
    setIsDragging(true);
    handleCellClick(row, col);
  };

  const handleCellSelectionMove = (row: number, col: number) => {
    if (!isDragging) return;
    handleCellClick(row, col);
  };

  const handleSelectionEnd = () => {
    setIsDragging(false);
  };

  const handleCellClick = (row: number, col: number) => {
    if (!gameState.isPlaying) return;

    const clickedCell = board[row][col];
    const { selectedCells } = gameState;
    const isAlreadySelected = selectedCells.some(c => c.row === row && c.col === col);

    if (isAlreadySelected) {
      setGameState(prev => ({
        ...prev,
        selectedCells: [],
        currentExpression: "",
        currentResult: null,
      }));
      return;
    }

    if (selectedCells.length === 0) {
      if (clickedCell.type !== "number") return;

      setGameState(prev => ({
        ...prev,
        selectedCells: [{ row, col }],
        currentExpression: String(clickedCell.value),
        currentResult: clickedCell.value as number,
      }));
      return;
    }

    const lastCell = selectedCells[selectedCells.length - 1];
    const isAdjacent =
      (Math.abs(lastCell.row - row) === 1 && lastCell.col === col) ||
      (Math.abs(lastCell.col - col) === 1 && lastCell.row === row);

    if (!isAdjacent) {
      setGameState(prev => ({
        ...prev,
        selectedCells: [],
        currentExpression: "",
        currentResult: null,
      }));
      return;
    }

    const allInLine = selectedCells.every(cell =>
      (cell.row === lastCell.row && cell.row === row) ||
      (cell.col === lastCell.col && cell.col === col)
    );

    if (!allInLine) {
      setGameState(prev => ({
        ...prev,
        selectedCells: [],
        currentExpression: "",
        currentResult: null,
      }));
      return;
    }

    const newSelectedCells = [...selectedCells, { row, col }];
    const expression: (number | Operation)[] = [];

    for (const cell of newSelectedCells) {
      const cellData = board[cell.row][cell.col];
      expression.push(cellData.value as number | Operation);
    }

    let concatenatedExpression = expression.slice();
    for (let i = 0; i < concatenatedExpression.length - 1; i++) {
      if (
        typeof concatenatedExpression[i] === "number" &&
        typeof concatenatedExpression[i + 1] === "number"
      ) {
        const concatenated = parseInt(
          String(concatenatedExpression[i]) + String(concatenatedExpression[i + 1])
        );
        concatenatedExpression.splice(i, 2, concatenated);
        i--;
      }
    }

    const result = evaluateExpression(concatenatedExpression);
    const expressionString = concatenatedExpression.join(" ");

    setGameState(prev => ({
      ...prev,
      selectedCells: newSelectedCells,
      currentExpression: expressionString,
      currentResult: result,
      attemptCount: prev.attemptCount + 1,
    }));

    if (result !== null && targets.includes(result) && !gameState.foundTargets.has(result)) {
      setGameState(prev => ({
        ...prev,
        foundTargets: new Set([...Array.from(prev.foundTargets), result]),
      }));

      toast({
        title: "Цель найдена!",
        description: `Вы нашли ${result}`,
      });
    }
  };

  const handleRestart = () => {
    setGameState({
      selectedCells: [],
      foundTargets: new Set(),
      gameTime: 0,
      isPlaying: true,
      attemptCount: 0,
      currentExpression: "",
      currentResult: null,
    });
    setShowVictoryModal(false);
  };

  const handleSaveScore = () => {
    if (!playerNickname.trim() || !customBoard) return;

    submitScoreMutation.mutate({
      nickname: playerNickname,
      time: gameState.gameTime,
      attempts: gameState.attemptCount,
      difficulty: customBoard.difficulty,
      boardSize: customBoard.boardSize,
    });
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getCellClasses = (cell: Cell, row: number, col: number) => {
    const isSelected = gameState.selectedCells.some(c => c.row === row && c.col === col);
    const baseClasses = "w-12 h-12 md:w-16 md:h-16 flex items-center justify-center font-bold text-lg rounded-lg transition-all cursor-pointer border-2 select-none";

    if (isSelected) {
      return `${baseClasses} bg-indigo-500 text-white border-indigo-600 scale-110 shadow-lg`;
    }

    return `${baseClasses} ${
      cell.type === "number"
        ? "bg-blue-100 hover:bg-blue-200 text-blue-900 border-blue-300"
        : "bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300"
    }`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-xl text-gray-600">Загрузка...</div>
      </div>
    );
  }

  if (!customBoard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <div className="text-xl text-gray-600 mb-4">Поле не найдено</div>
            <Link href="/custom-boards">
              <Button>Вернуться к списку</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-indigo-900 flex items-center gap-2">
              <Calculator className="w-8 h-8" />
              {customBoard.name}
            </h1>
            <p className="text-gray-600 mt-1">Автор: {customBoard.creatorName}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/custom-boards">
              <Button variant="outline" data-testid="button-back">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Назад
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" data-testid="button-home">
                <Home className="w-4 h-4 mr-2" />
                На главную
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card data-testid="card-board">
              <CardContent className="py-6">
                <div className="flex justify-center mb-4">
                  <div
                    className="inline-grid gap-1"
                    style={{
                      gridTemplateColumns: `repeat(${customBoard.boardSize}, minmax(0, 1fr))`,
                    }}
                    onMouseUp={handleSelectionEnd}
                  >
                    {board.map((row, rowIndex) =>
                      row.map((cell, colIndex) => (
                        <div
                          key={`${rowIndex}-${colIndex}`}
                          className={getCellClasses(cell, rowIndex, colIndex)}
                          onClick={() => handleCellClick(rowIndex, colIndex)}
                          onMouseDown={() => handleCellSelectionStart(rowIndex, colIndex)}
                          onMouseEnter={() => handleCellSelectionMove(rowIndex, colIndex)}
                          data-testid={`cell-${rowIndex}-${colIndex}`}
                        >
                          {cell.value}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {gameState.currentExpression && (
                  <div className="bg-white p-4 rounded-lg border-2 border-indigo-200">
                    <div className="text-center">
                      <div className="text-sm text-gray-600 mb-1">Выражение:</div>
                      <div className="text-2xl font-bold text-indigo-900">
                        {gameState.currentExpression} = {gameState.currentResult ?? "?"}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card data-testid="card-stats">
              <CardContent className="py-6 space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-indigo-900">
                    {formatTime(gameState.gameTime)}
                  </div>
                  <div className="text-sm text-gray-600">Время</div>
                </div>

                <div className="text-center">
                  <div className="text-3xl font-bold text-indigo-900">
                    {gameState.attemptCount}
                  </div>
                  <div className="text-sm text-gray-600">Попытки</div>
                </div>

                <Button
                  onClick={handleRestart}
                  variant="outline"
                  className="w-full"
                  data-testid="button-restart"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Начать заново
                </Button>
              </CardContent>
            </Card>

            <Card data-testid="card-targets">
              <CardContent className="py-6">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Целевые числа
                </h3>
                <ScrollArea className="h-64">
                  <div className="space-y-2 pr-4">
                    {targets.map((target) => (
                      <div
                        key={target}
                        className={`flex items-center justify-between p-3 rounded-lg ${
                          gameState.foundTargets.has(target)
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                        data-testid={`target-${target}`}
                      >
                        <span className="font-bold text-lg">{target}</span>
                        {gameState.foundTargets.has(target) ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : (
                          <Circle className="w-5 h-5" />
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                <div className="mt-4">
                  <Progress
                    value={(gameState.foundTargets.size / targets.length) * 100}
                    className="h-2"
                  />
                  <div className="text-center text-sm text-gray-600 mt-2">
                    {gameState.foundTargets.size} из {targets.length} найдено
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={showVictoryModal} onOpenChange={setShowVictoryModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-2xl text-center">
              🎉 Поздравляем!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-indigo-900">
                  {formatTime(gameState.gameTime)}
                </div>
                <div className="text-sm text-gray-600">Время</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-indigo-900">
                  {gameState.attemptCount}
                </div>
                <div className="text-sm text-gray-600">Попытки</div>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Ваш никнейм</label>
              <Input
                value={playerNickname}
                onChange={(e) => setPlayerNickname(e.target.value)}
                placeholder="Введите никнейм"
                data-testid="input-nickname"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleSaveScore}
                disabled={!playerNickname.trim() || submitScoreMutation.isPending}
                className="flex-1"
                data-testid="button-save-score"
              >
                <Trophy className="w-4 h-4 mr-2" />
                {submitScoreMutation.isPending ? "Сохранение..." : "Сохранить результат"}
              </Button>
              <Button
                onClick={handleRestart}
                variant="outline"
                className="flex-1"
                data-testid="button-play-again"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Играть ещё
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showLeaderboard} onOpenChange={setShowLeaderboard}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              <Trophy className="w-6 h-6 inline mr-2" />
              Лидерборд
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {leaderboard.length === 0 ? (
              <div className="text-center text-gray-600 py-8">
                Пока нет результатов
              </div>
            ) : (
              leaderboard.map((entry, index) => (
                <div
                  key={entry.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    index < 3 ? "bg-amber-50" : "bg-gray-50"
                  }`}
                  data-testid={`leaderboard-entry-${index}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl font-bold text-gray-400">
                      #{index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{entry.nickname}</div>
                      <div className="text-sm text-gray-600">
                        {entry.attempts} попыток
                      </div>
                    </div>
                  </div>
                  <div className="text-xl font-bold text-indigo-900">
                    {formatTime(entry.time)}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
