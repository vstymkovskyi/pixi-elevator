import { Graphics } from "pixi.js";

export interface Person {
  currentFloor: number;
  targetFloor: number;
  sprite: Graphics;
  inElevator: boolean;
  direction: number; //1 up, -1 down
}
