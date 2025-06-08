import { users, leaderboardEntries, type User, type InsertUser, type LeaderboardEntry, type InsertLeaderboardEntry } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createLeaderboardEntry(entry: InsertLeaderboardEntry): Promise<LeaderboardEntry>;
  getLeaderboard(difficulty?: string, boardSize?: number): Promise<LeaderboardEntry[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private leaderboardEntries: Map<number, LeaderboardEntry>;
  private currentUserId: number;
  private currentLeaderboardId: number;

  constructor() {
    this.users = new Map();
    this.leaderboardEntries = new Map();
    this.currentUserId = 1;
    this.currentLeaderboardId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async createLeaderboardEntry(insertEntry: InsertLeaderboardEntry): Promise<LeaderboardEntry> {
    const id = this.currentLeaderboardId++;
    const entry: LeaderboardEntry = { 
      ...insertEntry, 
      id, 
      completedAt: new Date() 
    };
    this.leaderboardEntries.set(id, entry);
    return entry;
  }

  async getLeaderboard(difficulty?: string, boardSize?: number): Promise<LeaderboardEntry[]> {
    let entries = Array.from(this.leaderboardEntries.values());
    
    // Filter by difficulty and board size if provided
    if (difficulty) {
      entries = entries.filter(entry => entry.difficulty === difficulty);
    }
    if (boardSize) {
      entries = entries.filter(entry => entry.boardSize === boardSize);
    }
    
    return entries
      .sort((a, b) => a.time - b.time) // Sort by time ascending (best times first)
      .slice(0, 10); // Top 10 entries
  }
}

export const storage = new MemStorage();
