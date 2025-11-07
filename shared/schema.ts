import { pgTable, text, serial, integer, timestamp, jsonb, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const leaderboardEntries = pgTable("leaderboard_entries", {
  id: serial("id").primaryKey(),
  nickname: text("nickname").notNull(),
  time: integer("time").notNull(), // time in seconds
  attempts: integer("attempts").notNull(), // number of attempts made
  difficulty: text("difficulty").notNull(), // "easy", "medium", "hard"
  boardSize: integer("board_size").notNull(), // 5, 10, 15
  completedAt: timestamp("completed_at").defaultNow().notNull(),
});

export const customBoards = pgTable("custom_boards", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  creatorName: text("creator_name").notNull(),
  difficulty: text("difficulty").notNull(), // "easy", "medium", "hard"
  boardSize: integer("board_size").notNull(), // 5, 10, 15
  boardData: jsonb("board_data").notNull(), // 2D array of cells
  targets: integer("targets").array().notNull(), // target numbers
  isSolved: boolean("is_solved").notNull().default(false), // has creator solved it?
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertLeaderboardEntrySchema = createInsertSchema(leaderboardEntries).pick({
  nickname: true,
  time: true,
  attempts: true,
  difficulty: true,
  boardSize: true,
});

export const insertCustomBoardSchema = createInsertSchema(customBoards).omit({
  id: true,
  createdAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertLeaderboardEntry = z.infer<typeof insertLeaderboardEntrySchema>;
export type LeaderboardEntry = typeof leaderboardEntries.$inferSelect;
export type InsertCustomBoard = z.infer<typeof insertCustomBoardSchema>;
export type CustomBoard = typeof customBoards.$inferSelect;
