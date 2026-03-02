import fs from 'fs';
import path from 'path';
import sqlite3 from 'sqlite3';
import { Player } from '../game/types';

export interface RankingRow {
  name: string;
  gamesPlayed: number;
  totalScore: number;
  totalFound: number;
  totalWrong: number;
}

export interface RankedRow extends RankingRow {
  rank: number;
}

class RankingRepository {
  private db: sqlite3.Database;

  constructor() {
    const dataDir = path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const dbPath = path.join(dataDir, 'mine_finder.sqlite');
    this.db = new sqlite3.Database(dbPath);
  }

  async init(): Promise<void> {
    await this.run(`
      CREATE TABLE IF NOT EXISTS player_rankings (
        name TEXT PRIMARY KEY,
        games_played INTEGER NOT NULL DEFAULT 0,
        total_score INTEGER NOT NULL DEFAULT 0,
        total_found INTEGER NOT NULL DEFAULT 0,
        total_wrong INTEGER NOT NULL DEFAULT 0,
        updated_at INTEGER NOT NULL
      )
    `);
  }

  async saveGameResult(players: Player[]): Promise<void> {
    const now = Date.now();
    for (const player of players) {
      await this.run(
        `
        INSERT INTO player_rankings (name, games_played, total_score, total_found, total_wrong, updated_at)
        VALUES (?, 1, ?, ?, ?, ?)
        ON CONFLICT(name) DO UPDATE SET
          games_played = player_rankings.games_played + 1,
          total_score = player_rankings.total_score + excluded.total_score,
          total_found = player_rankings.total_found + excluded.total_found,
          total_wrong = player_rankings.total_wrong + excluded.total_wrong,
          updated_at = excluded.updated_at
        `,
        [player.name, player.score, player.foundCount, player.wrongCount, now]
      );
    }
  }

  async getTop3(): Promise<RankedRow[]> {
    const rows = await this.all<RankingRow>(
      `
      SELECT
        name,
        games_played AS gamesPlayed,
        total_score AS totalScore,
        total_found AS totalFound,
        total_wrong AS totalWrong
      FROM player_rankings
      ORDER BY total_score DESC, total_found DESC, total_wrong ASC, name ASC
      LIMIT 3
      `
    );
    return rows.map((row, idx) => ({ ...row, rank: idx + 1 }));
  }

  async getRankByName(name: string): Promise<RankedRow | null> {
    const me = await this.get<RankingRow>(
      `
      SELECT
        name,
        games_played AS gamesPlayed,
        total_score AS totalScore,
        total_found AS totalFound,
        total_wrong AS totalWrong
      FROM player_rankings
      WHERE name = ?
      `,
      [name]
    );
    if (!me) return null;

    const better = await this.get<{ count: number }>(
      `
      SELECT COUNT(*) AS count
      FROM player_rankings
      WHERE
        total_score > ?
        OR (total_score = ? AND total_found > ?)
        OR (total_score = ? AND total_found = ? AND total_wrong < ?)
        OR (total_score = ? AND total_found = ? AND total_wrong = ? AND name < ?)
      `,
      [
        me.totalScore,
        me.totalScore, me.totalFound,
        me.totalScore, me.totalFound, me.totalWrong,
        me.totalScore, me.totalFound, me.totalWrong, me.name,
      ]
    );

    return {
      ...me,
      rank: (better?.count ?? 0) + 1,
    };
  }

  private run(sql: string, params: unknown[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params as any[], (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  private get<T>(sql: string, params: unknown[] = []): Promise<T | null> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params as any[], (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        resolve((row as T) ?? null);
      });
    });
  }

  private all<T>(sql: string, params: unknown[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params as any[], (err, rows) => {
        if (err) {
          reject(err);
          return;
        }
        resolve((rows as T[]) ?? []);
      });
    });
  }
}

export const rankingRepository = new RankingRepository();
