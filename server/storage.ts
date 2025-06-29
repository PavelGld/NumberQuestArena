import { users, leaderboardEntries, type User, type InsertUser, type LeaderboardEntry, type InsertLeaderboardEntry } from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

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
    let query = db.select().from(leaderboardEntries);
    
    const conditions = [];
    if (difficulty) {
      conditions.push(eq(leaderboardEntries.difficulty, difficulty));
    }
    if (boardSize !== undefined) {
      conditions.push(eq(leaderboardEntries.boardSize, boardSize));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    // Sort by time (ascending - faster is better) and limit to top 10
    const entries = await query.orderBy(leaderboardEntries.time).limit(10);
    return entries;
  }
}

export const storage = new DatabaseStorage();
