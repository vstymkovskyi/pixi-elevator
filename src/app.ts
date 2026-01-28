import { Application, Graphics, Text, Container } from "pixi.js";

import { Person } from "./models/Person";
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
  private people: Person[] = [];
  private peopleInElevator: Person[] = [];
  private continuousMode: boolean = false;
  private peopleUpColor: number = 0x4CAF50;
  private peopleDownColor: number = 0x4096ee;
  private elevatorWidth: number = 80;
  private elevatorHeight: number = 50;
  private floorHeight: number = 60;

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

    this.init();
  }

  private init(): void {
    this.drawBuilding();
    this.drawElevator();
    this.drawControls();
    // Delay adding people until next frame
    setTimeout(() => this.addPeople(6), 100); // Add some random people
    this.app.ticker.add(() => this.update());
  }

  private drawBuilding(): void {
    // Draw building structure
    const building = new Graphics();

    for (let i = 0; i < this.config.floors; i++) {
      building.rect(0, 40, 200, 2);
      building.fill(0x555555);

      const y = (this.config.floors - 1 - i) * this.floorHeight;

      // Floor line
      building.rect(0, y + 40 + this.floorHeight, 200, 2);
      building.fill(0x555555);

      // Floor number
      const floorText = new Text({
        text: `Floor ${i}`,
        style: { fontSize: 14, fill: 0xcccccc }
      });
      floorText.x = -100;
      floorText.y = y + this.floorHeight / 2 + 35;
      this.container.addChild(floorText);

      // Call button
      const button = new Graphics();
      button.rect(-40, y + this.floorHeight / 2 + 35, 30, 20);
      button.fill(0x4CAF50);
      button.eventMode = 'static';
      button.cursor = 'pointer';

      // Call button text
      const buttonText = new Text({ text: "Call", style: { fontSize: 10, fill: 0xffffff } });
      buttonText.x = -35;
      buttonText.y = y + this.floorHeight + 8;

      button.on('pointerdown', () => this.callElevator(i));

      this.container.addChild(button);
      this.container.addChild(buttonText);
    }

    // Elevator shaft
    building.rect(0, 40, this.elevatorWidth + 10, this.config.floors * this.floorHeight);
    building.stroke({ width: 2, color: 0x333333 });

    this.container.addChild(building);
  }

  private drawElevator(): void {
    this.updateElevatorPosition();
    this.container.addChild(this.elevator);

    this.elevatorText.x = 10;
    this.elevatorText.y = -30;
    this.elevator.addChild(this.elevatorText);
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

    // Add people button
    const addPeopleBtn = new Graphics();
    addPeopleBtn.rect(controlsX, controlsY + 90, 120, 30);
    addPeopleBtn.fill(0xFF9800);
    addPeopleBtn.eventMode = 'static';
    addPeopleBtn.cursor = 'pointer';

    const addPeopleText = new Text({
      text: "Add 5 People",
      style: { fontSize: 12, fill: 0xffffff }
    });
    addPeopleText.x = controlsX + 15;
    addPeopleText.y = controlsY + 98;

    addPeopleBtn.on('pointerdown', () => this.addPeople(5));

    this.container.addChild(addPeopleBtn);
    this.container.addChild(addPeopleText);

    this.addAutoBtns(controlsX, controlsY);

    // Info text
    const infoText = new Text({
      text: `Capacity: ${this.config.capacity}\nFloors: ${this.config.floors}`,
      style: { fontSize: 12, fill: 0xaaaaaa }
    });
    infoText.x = controlsX;
    infoText.y = controlsY + 180;
    this.container.addChild(infoText);
  }

  private updateElevatorPosition(): void {
    const y = (this.config.floors - 1 - this.currentFloor) * this.floorHeight;

    this.elevator.clear();
    this.elevator.rect(5, y + 45, this.elevatorWidth, this.elevatorHeight);
    this.elevator.fill(0xFF5722);
    this.elevator.stroke({ width: 2, color: 0xffffff });

    let movingStatus = 'Stopped';
    if (this.isMoving) {
      movingStatus = this.targetFloor > this.currentFloor ? 'Up' : 'Down';
    }

    this.elevatorText.text = `Floor: ${parseFloat(this.currentFloor.toFixed(2))}`;
    this.elevatorText.text += `\nMoving direction: ${movingStatus}`;
    this.elevatorText.text += `\nCapacity: ${this.peopleInElevator.length}/${this.config.capacity}`;
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

  private addPeople(count: number): void {
    for (let i = 0; i < count; i++) {
      const currentFloor = Math.floor(Math.random() * this.config.floors);
      let targetFloor = Math.floor(Math.random() * this.config.floors);

      // Ensure the target is different from the current
      while (targetFloor === currentFloor) {
        targetFloor = Math.floor(Math.random() * this.config.floors);
      }

      const person: Person = {
        currentFloor,
        targetFloor,
        sprite: new Graphics(),
        inElevator: false,
        direction: (() => {
          return targetFloor > currentFloor ? 1 : -1;
        })()
      };

      this.people.push(person);
      this.container.addChild(person.sprite);
      this.drawPerson(person);
    }
  }

  private drawPerson(person: Person): void {
    person.sprite.clear();

    if (person.inElevator) {
      // Person in elevator
      const index = this.peopleInElevator.indexOf(person);
      const y = (this.config.floors - 1 - this.currentFloor) * this.floorHeight;
      person.sprite.circle(15 + (index % 4) * 18, y + 55 + Math.floor(index / 4) * 15, 5);
      person.sprite.fill(person.direction === 1 ? this.peopleUpColor : this.peopleDownColor);
    } else {
      // Person waiting on a floor
      const y = (this.config.floors - 1 - person.currentFloor) * this.floorHeight;
      const waitingOnFloor = this.people.filter(p => p.currentFloor === person.currentFloor && !p.inElevator);
      const index = waitingOnFloor.indexOf(person);

      person.sprite.circle(100 + (index % 5) * 18, y + this.floorHeight - 10, 5);
      person.sprite.fill(person.direction === 1 ? this.peopleUpColor : this.peopleDownColor);
    }

    person.sprite.stroke({ width: 1, color: 0x000000 });
  }

  private update(): void {
    if (this.isMoving) {
      const direction = this.targetFloor > this.currentFloor ? 1 : -1;
      const distance = Math.abs(this.targetFloor - this.currentFloor);

      if (distance > 0) {
        // Move towards a target floor
        const step = this.config.elevatorSpeed / this.floorHeight;
        this.currentFloor += direction * step;

        // Snap to the floor when close enough
        if (Math.abs(this.currentFloor - this.targetFloor) < step) {
          this.currentFloor = this.targetFloor;
          this.isMoving = false;
          this.onFloorReached();
        }

        this.updateElevatorPosition();
      } else {
        this.isMoving = false;
      }

      // Update people in the elevator
      this.peopleInElevator.forEach(person => {
        this.drawPerson(person);
      });
    }
  }

  private onFloorReached(): void {
    const floor = Math.round(this.currentFloor);

    // Let people out
    const peopleLeaving = this.peopleInElevator.filter(p => p.targetFloor === floor);
    peopleLeaving.forEach(person => {
      const index = this.peopleInElevator.indexOf(person);
      if (index > -1) {
        this.peopleInElevator.splice(index, 1);
      }
      const personIndex = this.people.indexOf(person);
      if (personIndex > -1) {
        this.people.splice(personIndex, 1);
      }
      this.container.removeChild(person.sprite);
    });

    // Let people in
    const peopleWaiting = this.people.filter(p => p.currentFloor === floor && !p.inElevator);
    const spotsAvailable = this.config.capacity - this.peopleInElevator.length;
    const peopleBoarding = peopleWaiting.slice(0, spotsAvailable);

    peopleBoarding.forEach(person => {
      person.inElevator = true;
      this.peopleInElevator.push(person);
      this.drawPerson(person);

      // Auto-set target to their destination
      if (this.peopleInElevator.length === 1) {
        this.setTargetFloor(person.targetFloor);
      }
    });

    // Redraw waiting people
    this.people.filter(p => !p.inElevator).forEach(p => this.drawPerson(p));

    // If in continuous mode, find the next destination
    if (this.continuousMode) {
      setTimeout(() => this.findNextDestination(), 500); // Small delay before moving to the next floor
    }
  }

  private findNextDestination(): void {
    if (!this.continuousMode) return;

    // Case 1: Drop off people in the elevator
    if (this.peopleInElevator.length > 0) {
      // Find the closest target floor for people in the elevator
      const targets = this.peopleInElevator.map(p => p.targetFloor);
      const closest = this.findClosestFloor(targets);
      if (closest !== null && closest !== Math.round(this.currentFloor)) {
        this.setTargetFloor(closest);
        return;
      }
    }

    // Case 2: Pick up waiting people
    const waitingFloors = [...new Set(this.people.filter(p => !p.inElevator).map(p => p.currentFloor))];
    if (waitingFloors.length > 0) {
      const closest = this.findClosestFloor(waitingFloors);
      if (closest !== null && closest !== Math.round(this.currentFloor)) {
        this.setTargetFloor(closest);
        return;
      }
    }

    // No one to pick up or drop off - waiting for manual call
  }

  private findClosestFloor(floors: number[]): number | null {
    if (floors.length === 0) return null;

    const current = Math.round(this.currentFloor);
    let closest = floors[0];
    let minDistance = Math.abs(floors[0] - current);

    for (const floor of floors) {
      const distance = Math.abs(floor - current);
      if (distance < minDistance && distance > 0) {
        minDistance = distance;
        closest = floor;
      }
    }

    return closest;
  }

  private addAutoBtns(controlsX: number, controlsY: number): void {
    // Continuous mode toggle button
    const continuousBtn = new Graphics();
    continuousBtn.rect(controlsX, controlsY + 130, 160, 30);
    continuousBtn.fill(0x9C27B0);
    continuousBtn.eventMode = 'static';
    continuousBtn.cursor = 'pointer';

    const continuousText = new Text({
      text: "Auto Elevator Mode: OFF",
      style: { fontSize: 12, fill: 0xffffff }
    });
    continuousText.x = controlsX + 10;
    continuousText.y = controlsY + 138;

    continuousBtn.on('pointerdown', () => {
      this.continuousMode = !this.continuousMode;
      continuousText.text = this.continuousMode ? "Auto Elevator Mode: ON" : "Auto Elevator Mode: OFF";
      continuousBtn.clear();
      continuousBtn.rect(controlsX, controlsY + 130, 160, 30);
      continuousBtn.fill(this.continuousMode ? 0x4CAF50 : 0x9C27B0);

      if (this.continuousMode) {
        this.findNextDestination();
      }
    });

    this.container.addChild(continuousBtn);
    this.container.addChild(continuousText);
  }
}
