import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertLeaderboardEntrySchema } from "@shared/schema";
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

  const httpServer = createServer(app);
  return httpServer;
}
