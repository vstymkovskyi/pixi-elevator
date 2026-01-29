import { Container, Graphics, Text } from "pixi.js";
import { IPerson } from "../IConfig";

export class Person implements IPerson {
  public currentFloor: number;
  public targetFloor: number;
  public direction: number;
  public inElevator: boolean = false;
  public view: Container;

  private bg: Graphics;
  private label: Text;

  private static COLOR_UP = 0x4096ee;
  private static COLOR_DOWN = 0x4CAF50;

  constructor(currentFloor: number, targetFloor: number) {
    this.currentFloor = currentFloor;
    this.targetFloor = targetFloor;
    this.direction = targetFloor > currentFloor ? 1 : -1;

    this.view = new Container();

    this.bg = new Graphics();
    this.view.addChild(this.bg);

    this.label = new Text({
      text: `${this.targetFloor}`,
      style: { fontSize: 10, fill: 0xffffff, fontWeight: 'bold' }
    });
    this.label.anchor.set(0.5);
    this.view.addChild(this.label);
  }

  public redraw(totalFloors: number, floorHeight: number, index: number): void {
    const color = this.direction === 1 ? Person.COLOR_UP : Person.COLOR_DOWN;

    this.bg.clear();

    if (this.inElevator) {
      this.bg.roundRect(0, 0, 15, 20, 2).fill(color);

      this.label.position.set(7.5, 10);

    } else {

      const yPos = (totalFloors - this.currentFloor) * floorHeight + 20;
      // const xPos = (index % 5) * 18;

      this.bg.roundRect(-7, -10, 14, 20, 2).fill(color);
      this.label.position.set(0, 0);

      this.view.y = yPos;
    }
  }
}