import { cache } from "react";
import { promises as fs } from "node:fs";
import path from "node:path";

export type BoardHex = {
  id: number;
  points: Array<{
    x: number;
    y: number;
  }>;
  locationType: string;
};

export type ScytheBoardData = {
  gameType: "scythe";
  image: {
    name: string;
    width: number;
    height: number;
  };
  hexes: BoardHex[];
  boardMarkers?: {
    structureBonus?: {
      points: Array<{
        x: number;
        y: number;
      }>;
      center: {
        x: number;
        y: number;
      };
      width?: number;
      height?: number;
      rotationDegrees?: number;
    };
    popularityTrack?: {
      slots: Array<{
        index: number;
        rectangle: {
          points: Array<{
            x: number;
            y: number;
          }>;
          center: {
            x: number;
            y: number;
          };
          rotationDegrees?: number;
        };
      }>;
    };
    strengthTrack?: {
      slots: Array<{
        index: number;
        rectangle: {
          points: Array<{
            x: number;
            y: number;
          }>;
          center: {
            x: number;
            y: number;
          };
          rotationDegrees?: number;
        };
      }>;
    };
    starTrack?: {
      slots: Array<{
        index: number;
        key?: string;
        rectangle: {
          points: Array<{
            x: number;
            y: number;
          }>;
          center: {
            x: number;
            y: number;
          };
          rotationDegrees?: number;
        };
      }>;
    };
  };
};

const BOARD_JSON_PATH = path.join(process.cwd(), "data", "boards", "scythe_board.json");

export const loadScytheBoardData = cache(async (): Promise<ScytheBoardData> => {
  const raw = await fs.readFile(BOARD_JSON_PATH, "utf8");
  const parsed = JSON.parse(raw) as ScytheBoardData;

  if (parsed.gameType !== "scythe") {
    throw new Error("Unexpected board type in scythe_board.json");
  }

  return parsed;
});
