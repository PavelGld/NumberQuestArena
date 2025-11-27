const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://arithmetic-relay.replit.app';

export interface LeaderboardEntry {
  id: number;
  nickname: string;
  time: number;
  attempts: number;
  difficulty: string;
  boardSize: number;
  completedAt: string;
}

export interface CustomBoard {
  id: number;
  name: string;
  creatorName: string;
  difficulty: string;
  boardSize: number;
  boardData: Cell[][];
  targets: number[];
  isSolved: boolean;
  completionCount: number;
  createdAt: string;
}

export interface CustomBoardLeaderboard {
  id: number;
  customBoardId: number;
  nickname: string;
  time: number;
  attempts: number;
  completedAt: string;
}

export type CellType = "number" | "operation";
export type Operation = "+" | "-" | "*" | "/" | "^";
export type Difficulty = "easy" | "medium" | "hard";
export type BoardSize = 5 | 10 | 15;

export interface Cell {
  value: number | Operation;
  type: CellType;
  row: number;
  col: number;
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status}`);
  }

  return response.json();
}

export const api = {
  getLeaderboard: (difficulty?: string, boardSize?: number): Promise<LeaderboardEntry[]> => {
    const params = new URLSearchParams();
    if (difficulty) params.append('difficulty', difficulty);
    if (boardSize) params.append('boardSize', boardSize.toString());
    return fetchApi<LeaderboardEntry[]>(`/api/leaderboard?${params}`);
  },

  submitScore: (data: {
    nickname: string;
    time: number;
    attempts: number;
    difficulty: string;
    boardSize: number;
  }): Promise<LeaderboardEntry> => {
    return fetchApi<LeaderboardEntry>('/api/leaderboard', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getCustomBoards: (difficulty?: string, boardSize?: number): Promise<CustomBoard[]> => {
    const params = new URLSearchParams();
    if (difficulty) params.append('difficulty', difficulty);
    if (boardSize) params.append('boardSize', boardSize.toString());
    return fetchApi<CustomBoard[]>(`/api/custom-boards?${params}`);
  },

  getTopCustomBoards: (): Promise<CustomBoard[]> => {
    return fetchApi<CustomBoard[]>('/api/custom-boards/top');
  },

  getCustomBoard: (id: number): Promise<CustomBoard> => {
    return fetchApi<CustomBoard>(`/api/custom-boards/${id}`);
  },

  createCustomBoard: (data: {
    name: string;
    creatorName: string;
    difficulty: string;
    boardSize: number;
    boardData: Cell[][];
    targets: number[];
    isSolved: boolean;
  }): Promise<CustomBoard> => {
    return fetchApi<CustomBoard>('/api/custom-boards', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  getCustomBoardLeaderboard: (boardId: number): Promise<CustomBoardLeaderboard[]> => {
    return fetchApi<CustomBoardLeaderboard[]>(`/api/custom-boards/${boardId}/leaderboard`);
  },

  submitCustomBoardScore: (boardId: number, data: {
    nickname: string;
    time: number;
    attempts: number;
  }): Promise<CustomBoardLeaderboard> => {
    return fetchApi<CustomBoardLeaderboard>(`/api/custom-boards/${boardId}/leaderboard`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
};
