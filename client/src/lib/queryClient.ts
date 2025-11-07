import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    let url = queryKey[0] as string;
    
    // Handle leaderboard queries with filtering parameters
    if (url === "/api/leaderboard" && queryKey.length > 1) {
      const difficulty = queryKey[1];
      const boardSize = queryKey[2];
      url = `/api/leaderboard?difficulty=${difficulty}&boardSize=${boardSize}`;
    }
    
    // Handle custom-boards queries with filtering parameters
    if (url === "/api/custom-boards" && queryKey.length > 1) {
      const params = queryKey[1] as { difficulty?: string; boardSize?: number };
      const queryParams = new URLSearchParams();
      if (params.difficulty) queryParams.append("difficulty", params.difficulty);
      if (params.boardSize !== undefined) queryParams.append("boardSize", params.boardSize.toString());
      if (queryParams.toString()) {
        url = `/api/custom-boards?${queryParams.toString()}`;
      }
    }
    
    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
