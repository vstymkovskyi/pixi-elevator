import { Application, Graphics, Text, Container } from "pixi.js";

import { Config  } from "./models/Config";

export class ElevatorSystem {
  private app: Application;
  private config: Config;
  private container: Container;
  private elevator: Graphics;
  private elevatorText: Text;
  private currentFloor: number = 0;
  private targetFloor: number = 0;
  private isMoving: boolean = false;
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
    this.drawControls();
    this.app.ticker.add(() => this.update());
  }

  private drawBuilding(): void {
    // Draw building structure
    const building = new Graphics();

    for (let i = 0; i < this.config.floors; i++) {
      building.rect(0, 0, 200, 2);
      building.fill(0x555555);

      const y = (this.config.floors - 1 - i) * this.config.floorHeight;

      // Floor line
      building.rect(0, y + this.config.floorHeight, 200, 2);
      building.fill(0x555555);

      // Floor number
      const floorText = new Text({
        text: `Floor ${i}`,
        style: { fontSize: 14, fill: 0xcccccc }
      });
      floorText.x = -100;
      floorText.y = y + this.config.floorHeight - 40;
      this.container.addChild(floorText);

      // Call button
      const button = new Graphics();
      button.rect(-40, y + this.config.floorHeight - 40, 30, 20);
      button.fill(0x4CAF50);
      button.eventMode = 'static';
      button.cursor = 'pointer';

      const buttonText = new Text({ text: "Call", style: { fontSize: 10, fill: 0xffffff } });
      buttonText.x = -35;
      buttonText.y = y + this.config.floorHeight - 37;

      button.on('pointerdown', () => this.callElevator(i));

      this.container.addChild(button);
      this.container.addChild(buttonText);
    }

    // Elevator shaft
    building.rect(0, 0, this.config.elevatorWidth + 10, this.config.floors * this.config.floorHeight);
    building.stroke({ width: 2, color: 0x333333 });

    this.container.addChild(building);
  }

  private drawElevator(): void {
    this.updateElevatorPosition();
    this.container.addChild(this.elevator);

    this.elevatorText.x = 10;
    this.elevatorText.y = -30;
    this.elevator.addChild(this.elevatorText);

    // People count display
    this.peopleCountText.x = 220;
    this.peopleCountText.y = 20;
    this.container.addChild(this.peopleCountText);
  }

  private drawControls(): void {
    const controlsX = 220;
    let controlsY = 60;

    const controlsTitle = new Text({
      text: "Floor Buttons:",
      style: { fontSize: 14, fill: 0xffffff, fontWeight: 'bold' }
    });
    controlsTitle.x = controlsX;
    controlsTitle.y = controlsY;
    this.container.addChild(controlsTitle);

    controlsY += 30;

    // Create floor selection buttons
    for (let i = this.config.floors - 1; i >= 0; i--) {
      const button = new Graphics();
      const buttonSize = 30;
      const col = (this.config.floors - 1 - i) % 5;
      const row = Math.floor((this.config.floors - 1 - i) / 5);

      button.rect(controlsX + col * 35, controlsY + row * 35, buttonSize, buttonSize);
      button.fill(0x2196F3);
      button.eventMode = 'static';
      button.cursor = 'pointer';

      const btnText = new Text({ text: `${i}`, style: { fontSize: 12, fill: 0xffffff } });
      btnText.x = controlsX + col * 35 + (i < 10 ? 11 : 7);
      btnText.y = controlsY + row * 35 + 9;

      button.on('pointerdown', () => this.setTargetFloor(i));

      this.container.addChild(button);
      this.container.addChild(btnText);
    }

    // Info text
    const infoText = new Text({
      text: `Capacity: ${this.config.capacity}\nFloors: ${this.config.floors}`,
      style: { fontSize: 12, fill: 0xaaaaaa }
    });
    infoText.x = controlsX;
    infoText.y = controlsY + 90;
    this.container.addChild(infoText);
  }

  private updateElevatorPosition(): void {
    const y = (this.config.floors - 1 - this.currentFloor) * this.config.floorHeight;

    this.elevator.clear();
    this.elevator.rect(5, y + 5, this.config.elevatorWidth, this.config.elevatorHeight);
    this.elevator.fill(0xFF5722);
    this.elevator.stroke({ width: 2, color: 0xffffff });

    this.elevatorText.text = `Floor ${parseFloat(this.currentFloor.toFixed(2))}`;
  }

  private callElevator(floor: number): void {
    this.setTargetFloor(floor);
  }

  private setTargetFloor(floor: number): void {
    if (floor >= 0 && floor < this.config.floors && floor !== this.currentFloor) {
      this.targetFloor = floor;
      this.isMoving = true;
    }
  }

  private update(): void {
    if (this.isMoving) {
      const direction = this.targetFloor > this.currentFloor ? 1 : -1;
      const distance = Math.abs(this.targetFloor - this.currentFloor);

      if (distance > 0) {
        // Move towards a target floor
        const step = this.config.animationSpeed / this.config.floorHeight;
        this.currentFloor += direction * step;

        // Snap to the floor when close enough
        if (Math.abs(this.currentFloor - this.targetFloor) < step) {
          this.currentFloor = this.targetFloor;
          this.isMoving = false;
        }

        this.updateElevatorPosition();
      } else {
        this.isMoving = false;
      }
    }
  }
}
