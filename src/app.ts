import { Application, Graphics, Text, Container } from "pixi.js";

import { Config  } from "./models/Config";

export class ElevatorSystem {
  private app: Application;
  private config: Config;
  private container: Container;
  private elevator: Graphics;
  private elevatorText: Text;
  private peopleCountText: Text;

  constructor(app: Application, ELEVATOR_CONFIG: Config) {
    this.app = app;
    this.config = ELEVATOR_CONFIG;
    this.container = new Container();
    this.app.stage.addChild(this.container);

    // Center the container
    this.container.x = this.app.screen.width / 2 - 100;
    this.container.y = 50;

    this.elevator = new Graphics();
    this.elevatorText = new Text({ text: "", style: { fontSize: 12, fill: 0xffffff } });
    this.peopleCountText = new Text({
      text: `People in elevator: 0/${ELEVATOR_CONFIG.capacity}`,
      style: { fontSize: 16, fill: 0xffffff }
    });

    this.init();
  }

  private init(): void {
    this.drawBuilding();
    this.drawElevator();
  }

  private drawBuilding(): void {
    // Draw building structure
    const building = new Graphics();

    for (let i = 0; i < this.config.floors; i++) {
      const y = (this.config.floors - 1 - i) * this.config.floorHeight;

      // Floor line
      building.rect(0, y + this.config.floorHeight, 200, 2);
      building.fill(0x555555);

      // Floor number
      const floorText = new Text({
        text: `Floor ${i}`,
        style: { fontSize: 14, fill: 0xcccccc }
      });
      floorText.x = -60;
      floorText.y = y + this.config.floorHeight - 25;
      this.container.addChild(floorText);

      // Call button
      const button = new Graphics();
      button.rect(-40, y + this.config.floorHeight - 15, 30, 20);
      button.fill(0x4CAF50);
      button.eventMode = 'static';
      button.cursor = 'pointer';

      const buttonText = new Text({ text: "Call", style: { fontSize: 10, fill: 0xffffff } });
      buttonText.x = -35;
      buttonText.y = y + this.config.floorHeight - 13;

      this.container.addChild(button);
      this.container.addChild(buttonText);
    }

    // Elevator shaft
    building.rect(0, 0, this.config.elevatorWidth + 10, this.config.floors * this.config.floorHeight);
    building.stroke({ width: 2, color: 0x333333 });

    this.container.addChild(building);
  }

  private drawElevator(): void {
    this.container.addChild(this.elevator);

    this.elevatorText.x = 10;
    this.elevatorText.y = 5;
    this.elevator.addChild(this.elevatorText);

    // People count display
    this.peopleCountText.x = 220;
    this.peopleCountText.y = 20;
    this.container.addChild(this.peopleCountText);
  }
}
