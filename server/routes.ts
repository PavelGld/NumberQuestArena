import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertLeaderboardEntrySchema, insertCustomBoardSchema, insertCustomBoardLeaderboardSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get leaderboard
  app.get("/api/leaderboard", async (req, res) => {
    try {
      const { difficulty, boardSize } = req.query;
      const leaderboard = await storage.getLeaderboard(
        difficulty as string,
        boardSize ? parseInt(boardSize as string) : undefined
      );
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  // Submit score to leaderboard
  app.post("/api/leaderboard", async (req, res) => {
    try {
      const validatedData = insertLeaderboardEntrySchema.parse(req.body);
      const entry = await storage.createLeaderboardEntry(validatedData);
      res.json(entry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to save score" });
      }
    }
  });

  // Get custom boards
  app.get("/api/custom-boards", async (req, res) => {
    try {
      const { difficulty, boardSize } = req.query;
      const boards = await storage.getCustomBoards(
        difficulty as string,
        boardSize ? parseInt(boardSize as string) : undefined
      );
      res.json(boards);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch custom boards" });
    }
  });

  // Get top 100 popular custom boards (MUST be before /:id route)
  app.get("/api/custom-boards/top", async (req, res) => {
    try {
      const boards = await storage.getTop100PopularBoards();
      res.json(boards);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch top boards" });
    }
  });

  // Get single custom board
  app.get("/api/custom-boards/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const board = await storage.getCustomBoard(id);
      if (!board) {
        res.status(404).json({ message: "Board not found" });
        return;
      }
      res.json(board);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch custom board" });
    }
  });

  // Create custom board
  app.post("/api/custom-boards", async (req, res) => {
    try {
      const validatedData = insertCustomBoardSchema.parse(req.body);
      const board = await storage.createCustomBoard(validatedData);
      res.json(board);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create custom board" });
      }
    }
  });

  // Mark custom board as solved
  app.patch("/api/custom-boards/:id/solved", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const board = await storage.updateCustomBoardSolved(id);
      res.json(board);
    } catch (error) {
      res.status(500).json({ message: "Failed to update custom board" });
    }
  });

  // Get leaderboard for a custom board
  app.get("/api/custom-boards/:id/leaderboard", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const leaderboard = await storage.getCustomBoardLeaderboard(id);
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch custom board leaderboard" });
    }
  });

  // Submit score to custom board leaderboard
  app.post("/api/custom-boards/:id/leaderboard", async (req, res) => {
    try {
      const customBoardId = parseInt(req.params.id);
      const validatedData = insertCustomBoardLeaderboardSchema.parse({
        ...req.body,
        customBoardId,
      });
      
      const entry = await storage.createCustomBoardLeaderboardEntry(validatedData);
      await storage.incrementCustomBoardCompletionCount(customBoardId);
      
      res.json(entry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to save score" });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
