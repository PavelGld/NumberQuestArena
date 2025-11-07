import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Puzzle, Home, User, Target, Calendar, TrendingUp } from "lucide-react";
import { Link, useLocation } from "wouter";
import type { CustomBoard } from "@shared/schema";

type Difficulty = "easy" | "medium" | "hard";
type BoardSize = 5 | 10 | 15;

export default function CustomBoards() {
  const [, setLocation] = useLocation();
  const [filterDifficulty, setFilterDifficulty] = useState<string>("all");
  const [filterBoardSize, setFilterBoardSize] = useState<string>("all");
  const [showTop100, setShowTop100] = useState(false);

  const { data: boards = [], isLoading } = useQuery<CustomBoard[]>({
    queryKey: showTop100 
      ? ["/api/custom-boards/top"]
      : [
          "/api/custom-boards",
          {
            difficulty: filterDifficulty !== "all" ? filterDifficulty : undefined,
            boardSize: filterBoardSize !== "all" ? parseInt(filterBoardSize) : undefined,
          },
        ],
  });

  const getDifficultyBadge = (difficulty: string) => {
    const variants: Record<string, string> = {
      easy: "bg-green-100 text-green-800",
      medium: "bg-yellow-100 text-yellow-800",
      hard: "bg-red-100 text-red-800",
    };
    const labels: Record<string, string> = {
      easy: "Легко",
      medium: "Средне",
      hard: "Сложно",
    };
    return (
      <Badge className={variants[difficulty] || ""}>
        {labels[difficulty] || difficulty}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const handlePlayBoard = (boardId: number) => {
    setLocation(`/game/custom/${boardId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-indigo-900 flex items-center gap-2">
            <Puzzle className="w-8 h-8" />
            Пользовательские поля
          </h1>
          <Link href="/">
            <Button variant="outline" data-testid="button-home">
              <Home className="w-4 h-4 mr-2" />
              На главную
            </Button>
          </Link>
        </div>

        <Card className="mb-6" data-testid="card-filters">
          <CardHeader>
            <CardTitle>Фильтры</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="top100"
                  checked={showTop100}
                  onChange={(e) => setShowTop100(e.target.checked)}
                  className="rounded border-gray-300"
                  data-testid="checkbox-top100"
                />
                <label htmlFor="top100" className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Показать только топ-100 популярных
                </label>
              </div>
              
              {!showTop100 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Сложность</label>
                    <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                      <SelectTrigger data-testid="select-filter-difficulty">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все</SelectItem>
                        <SelectItem value="easy">Легко</SelectItem>
                        <SelectItem value="medium">Средне</SelectItem>
                        <SelectItem value="hard">Сложно</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Размер поля</label>
                    <Select value={filterBoardSize} onValueChange={setFilterBoardSize}>
                      <SelectTrigger data-testid="select-filter-board-size">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все</SelectItem>
                        <SelectItem value="5">5×5</SelectItem>
                        <SelectItem value="10">10×10</SelectItem>
                        <SelectItem value="15">15×15</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="text-gray-600">Загрузка...</div>
          </div>
        ) : boards.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Puzzle className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                Нет доступных полей
              </h3>
              <p className="text-gray-500 mb-4">
                Создайте своё первое поле в конструкторе!
              </p>
              <Link href="/constructor">
                <Button data-testid="button-create-board">
                  Создать поле
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {boards.map((board) => (
              <Card
                key={board.id}
                className="hover:shadow-lg transition-shadow"
                data-testid={`board-card-${board.id}`}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="truncate">{board.name}</span>
                    {getDifficultyBadge(board.difficulty)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <User className="w-4 h-4" />
                      <span>Автор: {board.creatorName}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Target className="w-4 h-4" />
                      <span>
                        Размер: {board.boardSize}×{board.boardSize}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Target className="w-4 h-4" />
                      <span>Целей: {board.targets.length}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <TrendingUp className="w-4 h-4" />
                      <span>Решений: {board.completionCount}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(board.createdAt.toString())}</span>
                    </div>
                  </div>

                  <Button
                    onClick={() => handlePlayBoard(board.id)}
                    className="w-full"
                    data-testid={`button-play-${board.id}`}
                  >
                    Играть
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
