import { 
  users, 
  leaderboardEntries, 
  customBoards,
  type User, 
  type InsertUser, 
  type LeaderboardEntry, 
  type InsertLeaderboardEntry,
  type CustomBoard,
  type InsertCustomBoard
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

/**
 * Интерфейс для работы с хранилищем данных
 * Определяет все методы для CRUD операций с пользователями и лидербордом
 * 
 * @interface IStorage
 * @description Абстрактный интерфейс для работы с данными приложения
 * @since 1.0.0
 * @license Apache-2.0
 */
export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createLeaderboardEntry(entry: InsertLeaderboardEntry): Promise<LeaderboardEntry>;
  getLeaderboard(difficulty?: string, boardSize?: number): Promise<LeaderboardEntry[]>;
  createCustomBoard(board: InsertCustomBoard): Promise<CustomBoard>;
  getCustomBoards(difficulty?: string, boardSize?: number): Promise<CustomBoard[]>;
  getCustomBoard(id: number): Promise<CustomBoard | undefined>;
  updateCustomBoardSolved(id: number): Promise<CustomBoard>;
}

/**
 * Реализация хранилища данных с использованием PostgreSQL через Drizzle ORM
 * 
 * @class DatabaseStorage
 * @implements {IStorage}
 * @description Конкретная реализация интерфейса IStorage для работы с PostgreSQL
 * @since 1.0.0
 * @license Apache-2.0
 */
export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async createLeaderboardEntry(insertEntry: InsertLeaderboardEntry): Promise<LeaderboardEntry> {
    const [entry] = await db
      .insert(leaderboardEntries)
      .values(insertEntry)
      .returning();
    return entry;
  }

  async getLeaderboard(difficulty?: string, boardSize?: number): Promise<LeaderboardEntry[]> {
    const conditions = [];
    if (difficulty) {
      conditions.push(eq(leaderboardEntries.difficulty, difficulty));
    }
    if (boardSize !== undefined) {
      conditions.push(eq(leaderboardEntries.boardSize, boardSize));
    }
    
    const entries = conditions.length > 0
      ? await db.select().from(leaderboardEntries).where(and(...conditions)).orderBy(leaderboardEntries.time).limit(10)
      : await db.select().from(leaderboardEntries).orderBy(leaderboardEntries.time).limit(10);
    
    return entries;
  }

  async createCustomBoard(insertBoard: InsertCustomBoard): Promise<CustomBoard> {
    const [board] = await db
      .insert(customBoards)
      .values(insertBoard)
      .returning();
    return board;
  }

  async getCustomBoards(difficulty?: string, boardSize?: number): Promise<CustomBoard[]> {
    const conditions = [];
    
    conditions.push(eq(customBoards.isSolved, true));
    
    if (difficulty) {
      conditions.push(eq(customBoards.difficulty, difficulty));
    }
    if (boardSize !== undefined) {
      conditions.push(eq(customBoards.boardSize, boardSize));
    }
    
    const boards = await db
      .select()
      .from(customBoards)
      .where(and(...conditions))
      .orderBy(desc(customBoards.createdAt));
    
    return boards;
  }

  async getCustomBoard(id: number): Promise<CustomBoard | undefined> {
    const [board] = await db.select().from(customBoards).where(eq(customBoards.id, id));
    return board || undefined;
  }

  async updateCustomBoardSolved(id: number): Promise<CustomBoard> {
    const [board] = await db
      .update(customBoards)
      .set({ isSolved: true })
      .where(eq(customBoards.id, id))
      .returning();
    return board;
  }
}

export const storage = new DatabaseStorage();
