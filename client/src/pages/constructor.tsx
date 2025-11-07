import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Pencil, 
  Save, 
  RotateCcw, 
  Target, 
  CheckCircle,
  Play,
  Home
} from "lucide-react";
import { Link } from "wouter";
import type { InsertCustomBoard } from "@shared/schema";

type CellType = "number" | "operation";
type Operation = "+" | "-" | "*" | "/" | "^";
type Difficulty = "easy" | "medium" | "hard";
type BoardSize = 5 | 10 | 15;

interface Cell {
  value: number | Operation | null;
  type: CellType;
  row: number;
  col: number;
}

interface TestGameState {
  selectedCells: { row: number; col: number }[];
  foundTargets: Set<number>;
  currentExpression: string;
  currentResult: number | null;
  attemptCount: number;
}

export default function Constructor() {
  const { toast } = useToast();
  
  const [boardName, setBoardName] = useState("");
  const [creatorName, setCreatorName] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("easy");
  const [boardSize, setBoardSize] = useState<BoardSize>(5);
  const [board, setBoard] = useState<Cell[][]>([]);
  const [targets, setTargets] = useState<number[]>([]);
  const [targetInput, setTargetInput] = useState("");
  const [isTestMode, setIsTestMode] = useState(false);
  const [testState, setTestState] = useState<TestGameState>({
    selectedCells: [],
    foundTargets: new Set(),
    currentExpression: "",
    currentResult: null,
    attemptCount: 0,
  });
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ row: number; col: number } | null>(null);
  const [isBoardDirty, setIsBoardDirty] = useState(false);

  const createEmptyBoard = useCallback((size: BoardSize): Cell[][] => {
    const newBoard: Cell[][] = [];
    for (let row = 0; row < size; row++) {
      newBoard[row] = [];
      for (let col = 0; col < size; col++) {
        newBoard[row][col] = {
          value: null,
          type: "number",
          row,
          col,
        };
      }
    }
    return newBoard;
  }, []);

  const initializeBoard = useCallback(() => {
    const newBoard = createEmptyBoard(boardSize);
    setBoard(newBoard);
    setTargets([]);
    setTestState({
      selectedCells: [],
      foundTargets: new Set(),
      currentExpression: "",
      currentResult: null,
      attemptCount: 0,
    });
    setIsBoardDirty(false);
  }, [boardSize, createEmptyBoard]);

  const handleCellClick = (row: number, col: number) => {
    if (isTestMode) {
      handleTestCellClick(row, col);
    } else {
      setEditingCell({ row, col });
    }
  };

  const handleCellValueChange = (value: string) => {
    if (!editingCell) return;
    
    const { row, col } = editingCell;
    const cell = board[row][col];
    
    const newBoard = [...board];
    if (cell.type === "number") {
      const num = parseInt(value);
      if (!isNaN(num) && num >= 0 && num <= 99) {
        newBoard[row][col] = { ...cell, value: num };
      }
    } else {
      if (["+", "-", "*", "/", "^"].includes(value)) {
        newBoard[row][col] = { ...cell, value: value as Operation };
      }
    }
    
    setBoard(newBoard);
    setEditingCell(null);
    
    if (testState.foundTargets.size > 0) {
      setIsBoardDirty(true);
      setTestState(prev => ({
        ...prev,
        foundTargets: new Set(),
      }));
      toast({
        title: "Поле изменено",
        description: "Решите головоломку заново перед сохранением",
        variant: "destructive",
      });
    }
  };

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

  const updateSelection = (newPath: { row: number; col: number }[]) => {
    const expression: (number | Operation)[] = [];
    
    for (const cell of newPath) {
      const cellData = board[cell.row][cell.col];
      if (cellData.value === null) {
        setTestState(prev => ({
          ...prev,
          selectedCells: [],
          currentExpression: "",
          currentResult: null,
        }));
        return;
      }
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

    setTestState(prev => ({
      ...prev,
      selectedCells: newPath,
      currentExpression: expressionString,
      currentResult: result,
    }));
  };

  const handleCellSelectionStart = (row: number, col: number) => {
    setIsSelecting(true);
    setSelectionStart({ row, col });
    setTestState(prev => ({
      ...prev,
      selectedCells: [{ row, col }],
      currentExpression: "",
      currentResult: null,
    }));
  };

  const handleCellSelectionMove = (row: number, col: number) => {
    if (!isSelecting || !selectionStart) return;

    const newPath: { row: number; col: number }[] = [];
    
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

  const handleSelectionEnd = () => {
    if (!isSelecting) return;
    
    setIsSelecting(false);
    setSelectionStart(null);

    if (testState.currentResult !== null && testState.selectedCells.length >= 1) {
      const result = testState.currentResult;

      if (targets.includes(result) && !testState.foundTargets.has(result)) {
        const newFoundTargets = new Set(testState.foundTargets);
        newFoundTargets.add(result);
        
        setTestState(prev => ({ 
          ...prev, 
          foundTargets: newFoundTargets,
          attemptCount: prev.attemptCount + 1 
        }));
        
        toast({
          title: "Цель найдена!",
          description: `Вы нашли ${result}`,
        });

        if (newFoundTargets.size === targets.length) {
          setIsBoardDirty(false);
          toast({
            title: "Поздравляем!",
            description: "Вы решили головоломку! Теперь можете её сохранить.",
          });
        }
      }
    }

    setTimeout(() => {
      setTestState(prev => ({
        ...prev,
        selectedCells: [],
        currentExpression: "",
        currentResult: null,
      }));
    }, 500);
  };

  const handleTestCellClick = (row: number, col: number) => {
    const clickedCell = board[row][col];
    if (clickedCell.value === null) return;

    const { selectedCells } = testState;
    const isAlreadySelected = selectedCells.some(c => c.row === row && c.col === col);

    if (isAlreadySelected) {
      setTestState(prev => ({
        ...prev,
        selectedCells: [],
        currentExpression: "",
        currentResult: null,
      }));
      return;
    }

    if (selectedCells.length === 0) {
      if (clickedCell.type !== "number") return;
      
      setTestState(prev => ({
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
      setTestState(prev => ({
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
      setTestState(prev => ({
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
      if (cellData.value === null) {
        setTestState(prev => ({
          ...prev,
          selectedCells: [],
          currentExpression: "",
          currentResult: null,
        }));
        return;
      }
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

    setTestState(prev => ({
      ...prev,
      selectedCells: newSelectedCells,
      currentExpression: expressionString,
      currentResult: result,
    }));

    if (result !== null && targets.includes(result) && !testState.foundTargets.has(result)) {
      const newFoundTargets = new Set([...Array.from(testState.foundTargets), result]);
      
      setTestState(prev => ({
        ...prev,
        foundTargets: newFoundTargets,
        attemptCount: prev.attemptCount + 1,
      }));
      
      toast({
        title: "Цель найдена!",
        description: `Вы нашли ${result}`,
      });

      if (newFoundTargets.size === targets.length) {
        setIsBoardDirty(false);
        toast({
          title: "Поздравляем!",
          description: "Вы решили головоломку! Теперь можете её сохранить.",
        });
      }
    }
  };

  const handleAutoFill = () => {
    const newBoard = board.map((row, rowIndex) =>
      row.map((cell, colIndex) => {
        if (cell.value !== null) return cell;
        
        if (cell.type === "number") {
          return { ...cell, value: Math.floor(Math.random() * 10) };
        } else {
          const operations: Operation[] = ["+", "-", "*", "/"];
          if (difficulty === "medium" || difficulty === "hard") {
            operations.push("^");
          }
          return { ...cell, value: operations[Math.floor(Math.random() * operations.length)] };
        }
      })
    );
    
    setBoard(newBoard);
    
    if (testState.foundTargets.size > 0) {
      setIsBoardDirty(true);
      setTestState(prev => ({
        ...prev,
        foundTargets: new Set(),
      }));
    }

    if (targets.length === 0) {
      const generatedTargets: number[] = [];
      const targetCount = 3;
      
      for (let i = 0; i < targetCount; i++) {
        const isHorizontal = Math.random() > 0.5;
        const minLength = 3;
        const maxLength = Math.min(7, boardSize);
        const pathLength = Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
        
        let path: { row: number; col: number }[] = [];
        
        if (isHorizontal) {
          const row = Math.floor(Math.random() * boardSize);
          const maxStart = boardSize - pathLength;
          const startCol = Math.floor(Math.random() * (maxStart + 1));
          
          for (let col = startCol; col < startCol + pathLength; col++) {
            path.push({ row, col });
          }
        } else {
          const col = Math.floor(Math.random() * boardSize);
          const maxStart = boardSize - pathLength;
          const startRow = Math.floor(Math.random() * (maxStart + 1));
          
          for (let row = startRow; row < startRow + pathLength; row++) {
            path.push({ row, col });
          }
        }
        
        const expression: (number | Operation)[] = [];
        for (const cell of path) {
          const cellData = newBoard[cell.row][cell.col];
          if (cellData.value !== null) {
            expression.push(cellData.value as number | Operation);
          }
        }
        
        let concatenatedExpression = expression.slice();
        for (let j = 0; j < concatenatedExpression.length - 1; j++) {
          if (
            typeof concatenatedExpression[j] === "number" &&
            typeof concatenatedExpression[j + 1] === "number"
          ) {
            const concatenated = parseInt(
              String(concatenatedExpression[j]) + String(concatenatedExpression[j + 1])
            );
            concatenatedExpression.splice(j, 2, concatenated);
            j--;
          }
        }
        
        const result = evaluateExpression(concatenatedExpression);
        if (result !== null && !generatedTargets.includes(result)) {
          generatedTargets.push(result);
        }
      }
      
      setTargets(generatedTargets);
    }

    toast({
      title: "Автозаполнение",
      description: testState.foundTargets.size > 0 
        ? "Пустые клетки заполнены. Решите головоломку заново перед сохранением"
        : "Пустые клетки заполнены случайными значениями",
    });
  };

  const handleAddTarget = () => {
    const num = parseFloat(targetInput);
    if (!isNaN(num) && !targets.includes(num)) {
      setTargets([...targets, num]);
      setTargetInput("");
      
      if (testState.foundTargets.size > 0) {
        setIsBoardDirty(true);
        setTestState(prev => ({
          ...prev,
          foundTargets: new Set(),
        }));
        toast({
          title: "Цели изменены",
          description: "Решите головоломку заново перед сохранением",
          variant: "destructive",
        });
      }
    }
  };

  const handleRemoveTarget = (target: number) => {
    setTargets(targets.filter(t => t !== target));
    
    if (testState.foundTargets.size > 0) {
      setIsBoardDirty(true);
      setTestState(prev => ({
        ...prev,
        foundTargets: new Set(),
      }));
      toast({
        title: "Цели изменены",
        description: "Решите головоломку заново перед сохранением",
        variant: "destructive",
      });
    }
  };

  const handleToggleTestMode = () => {
    if (isTestMode) {
      if (testState.foundTargets.size > 0 && testState.foundTargets.size < targets.length) {
        setIsBoardDirty(true);
        setTestState(prev => ({
          ...prev,
          foundTargets: new Set(),
        }));
        toast({
          title: "Тестирование прервано",
          description: "Решите головоломку заново перед сохранением",
          variant: "destructive",
        });
      }
    }
    setIsTestMode(!isTestMode);
  };

  const validateBoard = (): boolean => {
    if (!boardName.trim()) {
      toast({
        title: "Ошибка",
        description: "Укажите название поля",
        variant: "destructive",
      });
      return false;
    }

    if (!creatorName.trim()) {
      toast({
        title: "Ошибка",
        description: "Укажите ваше имя",
        variant: "destructive",
      });
      return false;
    }

    if (targets.length === 0) {
      toast({
        title: "Ошибка",
        description: "Добавьте хотя бы одну цель",
        variant: "destructive",
      });
      return false;
    }

    for (let row = 0; row < boardSize; row++) {
      for (let col = 0; col < boardSize; col++) {
        if (board[row][col].value === null) {
          toast({
            title: "Ошибка",
            description: "Заполните все ячейки поля",
            variant: "destructive",
          });
          return false;
        }
      }
    }

    if (testState.foundTargets.size !== targets.length || isBoardDirty) {
      toast({
        title: "Ошибка",
        description: "Вы должны решить головоломку перед сохранением",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const saveBoardMutation = useMutation({
    mutationFn: (data: InsertCustomBoard) =>
      apiRequest("POST", "/api/custom-boards", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/custom-boards"] });
      toast({
        title: "Сохранено!",
        description: "Ваше поле успешно сохранено",
      });
      setBoardName("");
      setCreatorName("");
      setIsBoardDirty(false);
      initializeBoard();
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось сохранить поле",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    if (!validateBoard()) return;

    saveBoardMutation.mutate({
      name: boardName,
      creatorName,
      difficulty,
      boardSize,
      boardData: board,
      targets,
      isSolved: true,
    });
  };

  const getCellClasses = (cell: Cell, row: number, col: number) => {
    const isSelected = testState.selectedCells.some(c => c.row === row && c.col === col);
    const baseClasses = "w-12 h-12 md:w-16 md:h-16 flex items-center justify-center font-bold text-lg rounded-lg transition-all cursor-pointer border-2 select-none";
    
    if (isTestMode) {
      if (isSelected) {
        return `${baseClasses} bg-indigo-500 text-white border-indigo-600 scale-110 shadow-lg`;
      }
      return `${baseClasses} ${
        cell.type === "number"
          ? "bg-blue-100 hover:bg-blue-200 text-blue-900 border-blue-300"
          : "bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300"
      }`;
    }

    if (cell.value === null) {
      return `${baseClasses} bg-gray-100 border-gray-300 hover:bg-gray-200`;
    }

    return `${baseClasses} ${
      cell.type === "number"
        ? "bg-blue-100 hover:bg-blue-200 text-blue-900 border-blue-300"
        : "bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300"
    }`;
  };

  if (board.length === 0) {
    initializeBoard();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-indigo-900 flex items-center gap-2">
            <Pencil className="w-8 h-8" />
            Конструктор полей
          </h1>
          <Link href="/">
            <Button variant="outline" data-testid="button-home">
              <Home className="w-4 h-4 mr-2" />
              На главную
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card data-testid="card-board">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Игровое поле</span>
                  {isTestMode && (
                    <span className="text-sm font-normal text-gray-600">
                      Найдено: {testState.foundTargets.size}/{targets.length}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center mb-4">
                  <div
                    className="inline-grid gap-1"
                    style={{
                      gridTemplateColumns: `repeat(${boardSize}, minmax(0, 1fr))`,
                    }}
                    onMouseUp={isTestMode ? handleSelectionEnd : undefined}
                  >
                    {board.map((row, rowIndex) =>
                      row.map((cell, colIndex) => (
                        <div
                          key={`${rowIndex}-${colIndex}`}
                          className={getCellClasses(cell, rowIndex, colIndex)}
                          onClick={() => isTestMode ? handleTestCellClick(rowIndex, colIndex) : handleCellClick(rowIndex, colIndex)}
                          onMouseDown={isTestMode ? () => handleCellSelectionStart(rowIndex, colIndex) : undefined}
                          onMouseEnter={isTestMode ? () => handleCellSelectionMove(rowIndex, colIndex) : undefined}
                          data-testid={`cell-${rowIndex}-${colIndex}`}
                        >
                          {cell.value !== null ? cell.value : "?"}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {testState.currentExpression && (
                  <div className="bg-white p-4 rounded-lg border-2 border-indigo-200 mb-4">
                    <div className="text-center">
                      <div className="text-sm text-gray-600 mb-1">Выражение:</div>
                      <div className="text-2xl font-bold text-indigo-900">
                        {testState.currentExpression} = {testState.currentResult ?? "?"}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 justify-center flex-wrap">
                  <Button
                    onClick={handleToggleTestMode}
                    variant={isTestMode ? "destructive" : "default"}
                    data-testid="button-toggle-test-mode"
                  >
                    {isTestMode ? (
                      <>
                        <Pencil className="w-4 h-4 mr-2" />
                        Режим редактирования
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Режим тестирования
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={handleAutoFill}
                    variant="outline"
                    disabled={isTestMode}
                    data-testid="button-autofill"
                  >
                    <Target className="w-4 h-4 mr-2" />
                    Автозаполнение
                  </Button>
                  <Button
                    onClick={initializeBoard}
                    variant="outline"
                    data-testid="button-clear-board"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Очистить
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card data-testid="card-settings">
              <CardHeader>
                <CardTitle>Настройки</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Название поля</label>
                  <Input
                    value={boardName}
                    onChange={(e) => setBoardName(e.target.value)}
                    placeholder="Моё поле"
                    disabled={isTestMode}
                    data-testid="input-board-name"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Ваше имя</label>
                  <Input
                    value={creatorName}
                    onChange={(e) => setCreatorName(e.target.value)}
                    placeholder="Игрок"
                    disabled={isTestMode}
                    data-testid="input-creator-name"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Сложность (по вашему мнению)</label>
                  <Select
                    value={difficulty}
                    onValueChange={(value: Difficulty) => setDifficulty(value)}
                    disabled={isTestMode}
                  >
                    <SelectTrigger data-testid="select-difficulty">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Легко</SelectItem>
                      <SelectItem value="medium">Средне</SelectItem>
                      <SelectItem value="hard">Сложно</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Размер поля</label>
                  <Select
                    value={boardSize.toString()}
                    onValueChange={(value) => {
                      setBoardSize(parseInt(value) as BoardSize);
                      setBoard(createEmptyBoard(parseInt(value) as BoardSize));
                    }}
                    disabled={isTestMode}
                  >
                    <SelectTrigger data-testid="select-board-size">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5×5</SelectItem>
                      <SelectItem value="10">10×10</SelectItem>
                      <SelectItem value="15">15×15</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-targets">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Целевые числа
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={targetInput}
                    onChange={(e) => setTargetInput(e.target.value)}
                    placeholder="Число"
                    disabled={isTestMode}
                    data-testid="input-target"
                  />
                  <Button
                    onClick={handleAddTarget}
                    disabled={isTestMode}
                    data-testid="button-add-target"
                  >
                    Добавить
                  </Button>
                </div>

                <ScrollArea className="h-48">
                  <div className="flex flex-wrap gap-2 pr-4">
                    {targets.map((target) => (
                      <div
                        key={target}
                        className={`flex items-center gap-2 px-3 py-1 rounded-full ${
                          testState.foundTargets.has(target)
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                        data-testid={`target-${target}`}
                      >
                        {testState.foundTargets.has(target) && (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        <span className="font-medium">{target}</span>
                        {!isTestMode && (
                          <button
                            onClick={() => handleRemoveTarget(target)}
                            className="text-red-500 hover:text-red-700"
                            data-testid={`button-remove-target-${target}`}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>

                <Button
                  onClick={handleSave}
                  disabled={isTestMode || saveBoardMutation.isPending}
                  className="w-full"
                  data-testid="button-save-board"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saveBoardMutation.isPending ? "Сохранение..." : "Сохранить поле"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={editingCell !== null} onOpenChange={(open) => !open && setEditingCell(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Редактировать ячейку ({editingCell?.row}, {editingCell?.col})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Тип ячейки</label>
              <Select 
                value={editingCell ? board[editingCell.row]?.[editingCell.col]?.type : "number"}
                onValueChange={(value: CellType) => {
                  if (editingCell) {
                    const newBoard = [...board];
                    newBoard[editingCell.row][editingCell.col] = {
                      ...newBoard[editingCell.row][editingCell.col],
                      type: value,
                      value: null,
                    };
                    setBoard(newBoard);
                    
                    if (testState.foundTargets.size > 0) {
                      setIsBoardDirty(true);
                      setTestState(prev => ({
                        ...prev,
                        foundTargets: new Set(),
                      }));
                      toast({
                        title: "Поле изменено",
                        description: "Решите головоломку заново перед сохранением",
                        variant: "destructive",
                      });
                    }
                  }
                }}
              >
                <SelectTrigger data-testid="select-cell-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="number">Число</SelectItem>
                  <SelectItem value="operation">Операция</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {editingCell && board[editingCell.row]?.[editingCell.col]?.type === "number" ? (
              <div>
                <label className="text-sm font-medium mb-2 block">Число (0-99)</label>
                <Input
                  type="number"
                  min="0"
                  max="99"
                  placeholder="Введите число"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleCellValueChange(e.currentTarget.value);
                    }
                  }}
                  data-testid="input-cell-number"
                />
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium mb-2 block">Операция</label>
                <Select onValueChange={handleCellValueChange}>
                  <SelectTrigger data-testid="select-cell-operation">
                    <SelectValue placeholder="Выберите операцию" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="+">+ (сложение)</SelectItem>
                    <SelectItem value="-">- (вычитание)</SelectItem>
                    <SelectItem value="*">* (умножение)</SelectItem>
                    <SelectItem value="/">/ (деление)</SelectItem>
                    <SelectItem value="^">^ (степень)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
