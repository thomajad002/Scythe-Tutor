import { cache } from "react";
import boardData from "@/data/boards/scythe_board.json";

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

export const loadScytheBoardData = cache(async (): Promise<ScytheBoardData> => {
  const parsed = boardData as ScytheBoardData;

  if (parsed.gameType !== "scythe") {
    throw new Error("Unexpected board type in scythe_board.json");
  }

  return parsed;
});
