import {
  Application,
  Graphics,
  Text,
  Container,
  UPDATE_PRIORITY,
} from "pixi.js";
import { Tween, Easing, update } from "@tweenjs/tween.js";

import { Person } from "./models/Person";
import { Config  } from "./models/Config";

const random = (min: number, max: number): number => {
  if ((min % 1 > 0) || (max % 1 > 0)) {
    throw Error("Function does not support numbers with fractions. For number below 1 use randomBelowOne instead");
  }

  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export class ElevatorSystem {
  private app: Application;
  private config: Config;
  private container: Container;
  private elevator: Container;
  private persons: Container;
  private elevatorText: Text;
  private currentFloor: number = 10;
  private targetFloor: number = 0;
  private isMoving: boolean = false;
  private people: Person[] = [];
  private peopleInElevator: Person[] = [];
  private continuousElevatorMode: boolean = false;
  private continuousAddPeople: boolean = false;
  private peopleUpColor: number = 0x4096ee;
  private peopleDownColor: number = 0x4CAF50;
  private elevatorWidth: number = 80;
  private elevatorHeight: number = 50;
  private floorHeight: number = 60;
  private nextAddPeopleTime: number = 0;
  private addPeopleInterval: number = 0;

  constructor(app: Application, ELEVATOR_CONFIG: Config) {
    this.app = app;
    this.initTween();
    this.config = ELEVATOR_CONFIG;
    this.container = new Container();
    this.persons = new Container();

    this.container.position.x = 150;
    this.container.position.y = 100;
    app.stage.addChild(this.container);

    this.container.addChild(this.persons);
    this.persons.zIndex = 5;
    this.persons.position.x = 100;
    this.persons.position.y = 10;

    this.elevator = new Container();
    this.elevatorText = new Text({ text: "", style: { fontSize: 12, fill: 0xffffff } });

    this.init();
  }

  private initTween(): void {
    //Initialize tween update to do this together with pixi.js render
    this.app.ticker.add(
        () => {
          update(this.app.ticker.lastTime);
        },
        this,
        UPDATE_PRIORITY.HIGH,
    );
  }

  private movePerson(
      element: Container,
      to: { x: number },
      duration: number = 500,
      easing = Easing.Linear.None(),
  ) {
    return new Promise<void>((resolve) => {
      new Tween(element)
          .to(to, duration)
          .easing(easing)
          .onStart(() => {
          })
          .onUpdate((changed: { x: number; }) => {
            element.position.x = changed.x;
          })
          .onComplete(() => {
            element.position.x = to.x;
            this.updateElevatorStatus();
            resolve();
          })
          .start();
    });
  }

  private moveElevator(floor: number, force: boolean = false) {
    if (this.isMoving) {
      return;
    }

    const moveTo = {y: (this.config.floors - floor) * (this.elevatorHeight + 10)};
    if (force) {
      this.currentFloor = floor;
      this.updateElevatorStatus();
      this.elevator.position.y = moveTo.y;
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      new Tween(this.elevator)
        .to(moveTo, 800)
          .easing(Easing.Quadratic.In)
          .onStart(() => {
            this.isMoving = true;
            this.updateElevatorStatus();
          })
          .onUpdate((changed: { y: number }) => {
            this.elevator.position.y = changed.y;
          })
          .onComplete(() => {
            this.isMoving = false;
            this.currentFloor = floor;
            this.updateElevatorStatus();
            resolve();
          })
          .start();
    });
  }

  private init(): void {
    this.drawBuilding();
    this.drawElevator();
    this.drawControls();

    this.moveElevator(1, true);
    // Delay adding people until next frame
    setTimeout(() => this.addPeople(6), 100); // Add some random people

    this.app.ticker.add(() => this.update());
  }

  private drawBuilding(): void {
    // Draw building structure
    const buildingEl = new Container();

    // Elevator shaft
    const building = new Graphics();
    building.rect(0, 0, this.elevatorWidth + 10, this.config.floors * this.floorHeight);
    building.stroke({ width: 2, color: 0x333333 });

    buildingEl.addChild(building);

    for (let i = 0; i < this.config.floors; i++) {
      // building.rect(0, 40, 200, 2);
      const buildingHorizontal = new Graphics();
      buildingHorizontal.rect(0, 0, 200, 2);
      buildingHorizontal.fill(0x555555);
      buildingHorizontal.endFill();
      buildingEl.addChild(buildingHorizontal);
      buildingHorizontal.y = (i + 1) * this.floorHeight;

      const floorEl = new Container();
      buildingEl.addChild(floorEl);
      floorEl.x = -100;
      floorEl.y = ((i + 1) * this.floorHeight) - this.floorHeight / 2;

      const y = (this.config.floors - 1 - i) * this.floorHeight;

      // Floor line
      // building.rect(0, y + 40 + this.floorHeight, 200, 2);
      building.rect(0, 0, 200, 2);
      building.fill(0x555555);

      // Floor number
      const floorText = new Text({
        text: `Floor ${this.config.floors - i}`,
        style: { fontSize: 14, fill: 0xcccccc }
      });
      // floorText.x = -100;
      // floorText.y = y + this.floorHeight / 2 + 35;
      floorText.anchor.x = 0.5;
      floorText.anchor.y = 0.5;
      floorEl.addChild(floorText);

      // Call button
      const button = new Graphics();
      button.rect(-15, -10, 30, 20);
      button.fill(0x4CAF50);
      button.eventMode = 'static';
      button.cursor = 'pointer';
      button.position.x = 60;

      // Call button text
      const buttonText = new Text({ text: "Call", style: { fontSize: 10, fill: 0xffffff } });
      buttonText.anchor.x = 0.5;
      buttonText.anchor.y = 0.5;

      button.on('pointerdown', () => this.callElevator(i));

      button.addChild(buttonText);
      floorEl.addChild(button);
    }

    this.container.addChild(buildingEl);
  }

  private drawElevator(): void {
    this.createElevator();
    this.container.addChild(this.elevator);

    this.updateElevatorStatus();

    this.elevatorText.x = 10;
    this.elevatorText.y = -70;
    this.container.addChild(this.elevatorText);
  }

  private updateElevatorStatus(): void {
    let movingStatus = 'Stopped';
    if (this.isMoving) {
      movingStatus = this.targetFloor > this.currentFloor ? 'Up' : 'Down';
    }
    this.elevatorText.text = `Floor: ${parseFloat(this.currentFloor.toFixed(2))}`;
    this.elevatorText.text += `\nMoving direction: ${movingStatus}`;
    this.elevatorText.text += `\nCapacity: ${this.peopleInElevator.length}/${this.config.capacity}`;
  }

  private drawControls(): void {
    const controlsContainer = new Container();
    const controlsX = 220;
    let controlsY = 60;

    const controlsTitle = new Text({
      text: "Floor Buttons:",
      style: { fontSize: 14, fill: 0xffffff, fontWeight: 'bold' }
    });
    controlsTitle.x = controlsX;
    controlsTitle.y = controlsY;
    controlsContainer.addChild(controlsTitle);

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

      const btnText = new Text({ text: `${i+1}`, style: { fontSize: 12, fill: 0xffffff } });
      btnText.x = controlsX + col * 35 + (i < 10 ? 11 : 7);
      btnText.y = controlsY + row * 35 + 9;

      button.on('pointerdown', () => this.setTargetFloor(i + 1));

      controlsContainer.addChild(button);
      controlsContainer.addChild(btnText);
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

    controlsContainer.addChild(addPeopleBtn);
    controlsContainer.addChild(addPeopleText);

    // Info text
    const infoText = new Text({
      text: `Capacity: ${this.config.capacity}\nFloors: ${this.config.floors}`,
      style: { fontSize: 12, fill: 0xaaaaaa }
    });
    infoText.x = controlsX;
    infoText.y = controlsY + 220;
    controlsContainer.addChild(infoText);

    this.addAutoBtns(controlsContainer, controlsX, controlsY);

    this.container.addChild(controlsContainer);
  }

  private createElevator(): void {
    const elevatorEl = new Graphics();
    elevatorEl.clear();
    elevatorEl.rect(0, 0, this.elevatorWidth, this.elevatorHeight);
    elevatorEl.fill(0xFF5722);
    elevatorEl.stroke({ width: 2, color: 0xffffff });
    elevatorEl.endFill();
    this.elevator.addChild(elevatorEl);
    this.elevator.pivot.x = -5;
    this.elevator.pivot.y = -6;
  }

  private callElevator(floor: number): void {
    this.setTargetFloor(floor);
  }

  private async setTargetFloor(floor: number): Promise<void> {
    if (floor >= 0 && floor <= this.config.floors && floor !== this.currentFloor) {

      this.targetFloor = floor;
      await this.moveElevator(floor);

      await this.onFloorReached();
    }
  }

  private addPeople(count: number): void {
    for (let i = 0; i < count; i++) {
      const currentFloor = random(1, this.config.floors);
      let targetFloor = random(1, this.config.floors);

      // Ensure the target is different from the current
      while (targetFloor === currentFloor) {
        targetFloor = random(1, this.config.floors);
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
      this.persons.addChild(person.sprite);
      this.drawPerson(person);
    }
  }

  private drawPerson(person: Person): void {
    person.sprite.clear();
    // Remove all children (including old text) before redrawing
    person.sprite.removeChildren();

    // Add target floor text inside the icon
    const floorText = new Text({
      text: `${person.targetFloor}`,
      style: { fontSize: 10, fill: 0xffffff, fontWeight: 'bold' }
    });
    let xPos;
    let yPos;

    if (person.inElevator) {
      // Person in elevator
      const index = this.peopleInElevator.indexOf(person);
      const y = (this.config.floors - 1 - this.currentFloor) * this.floorHeight;
      xPos = 15 + (index % 4) * 18;
      yPos = y + this.floorHeight - 10 + Math.floor(index / 4) * 20;
      person.sprite
          .roundRect(xPos, yPos, 15, 20, 2)
          .fill(person.direction === 1 ? this.peopleUpColor : this.peopleDownColor);

    } else {
      // Person waiting on a floor
      const waitingOnFloor = this.people.filter(p => p.currentFloor === person.currentFloor && !p.inElevator);
      const index = waitingOnFloor.indexOf(person);

      const y = (this.config.floors - person.currentFloor) * this.floorHeight;
      xPos = (index % 5) * 18;
      yPos = y + 20;

      // Draw rectangle
      person.sprite
          .roundRect(-7, -10, 14, 20, 2)
          .fill(person.direction === 1 ? this.peopleUpColor : this.peopleDownColor);
      person.sprite.position.x = 400;
      person.sprite.position.y = yPos;
    }

    floorText.anchor.x = 0.5;
    floorText.anchor.y = 0.5;
    person.sprite.addChild(floorText);

    this.movePerson(person.sprite, {x: xPos}, 800);
  }

  private update(): void {
    // Handle continuous people addition
    if (this.continuousAddPeople) {
      const currentTime = Date.now();
      if (currentTime >= this.nextAddPeopleTime) {
        this.addPeople(1);

        // Schedule the next addition between 4-10 seconds
        this.addPeopleInterval = (Math.random() * 6 + 4) * 1000; // 4000-10000 ms
        this.nextAddPeopleTime = currentTime + this.addPeopleInterval;
      }
    }

    if (this.continuousElevatorMode && this.people.length > 0) {
      // If in continuous mode, find the next destination
      // setTimeout(() => this.findNextDestination(), 500); // Small delay before moving to the next floor
    }
  }

  private async onFloorReached(): Promise<void> {
    const floor = this.currentFloor;

    // Let people out - animate them leaving to the right
    const peopleLeaving = this.peopleInElevator.filter(p => p.targetFloor === floor);

    const promisesList = peopleLeaving
        .map(async (person) => {
          await this.movePerson(person.sprite, { x: 600 });
          const index = this.peopleInElevator.indexOf(person);
          if (index > -1) {
            this.peopleInElevator.splice(index, 1);
          }
          const personIndex = this.people.indexOf(person);
          if (personIndex > -1) {
            this.people.splice(personIndex, 1);
          }
          this.elevator.removeChild(person.sprite);
        });

    await Promise.all(promisesList);

    // Determine elevator's direction
    let elevatorDirection = 0; // 0 = not determined yet, 1 = up, -1 = down

    // Check if there are people in the elevator needing to go up or down
    const targetsAbove = this.peopleInElevator.filter(p => p.targetFloor > floor).length;
    const targetsBelow = this.peopleInElevator.filter(p => p.targetFloor < floor).length;

    if (targetsAbove > 0) {
      elevatorDirection = 1; // Continue going up
    } else if (targetsBelow > 0) {
      elevatorDirection = -1; // Continue going down
    } else {
      // Elevator is empty - determine a direction based on waiting people
      const peopleWaitingHere = this.people.filter(p => p.currentFloor === floor && !p.inElevator);
      const peopleGoingUp = peopleWaitingHere.filter(p => p.direction === 1).length;
      const peopleGoingDown = peopleWaitingHere.filter(p => p.direction === -1).length;

      // Pick one direction - prioritize up, then down
      if (peopleGoingUp > 0) {
        elevatorDirection = 1; // Pick up people going up
      } else if (peopleGoingDown > 0) {
        elevatorDirection = -1; // Pick up people going down
      }
      // else elevatorDirection stays 0 (no one waiting)
    }

    // Let people in - only those going in the same direction as the elevator
    const peopleWaiting = this.people.filter(p => {
      if (p.currentFloor !== floor || p.inElevator) return false;

      // Only pick up people going in the same direction as the elevator
      if (elevatorDirection === 1 && p.direction === 1) return true;
      if (elevatorDirection === -1 && p.direction === -1) return true;

      return false;
    });

    const spotsAvailable = this.config.capacity - this.peopleInElevator.length;
    const peopleBoarding = peopleWaiting.slice(0, spotsAvailable);

    // Board people sequentially to avoid race conditions
    for (let i = 0; i < peopleBoarding.length; i++) {
      const person = peopleBoarding[i];

      // Double-check capacity before boarding each person
      if (this.peopleInElevator.length >= this.config.capacity) {
        break;
      }

      await this.movePerson(person.sprite, { x: person.sprite.x - 50 });

      this.elevator.addChild(person.sprite);

      // Use the current elevator count, not the loop index
      const currentPositionIndex = this.peopleInElevator.length;
      const _shift = 15;
      person.sprite.position.x = 15 * (currentPositionIndex % 4) + _shift + 3;
      person.sprite.position.y = 15 + Math.floor(currentPositionIndex / 4) * 20;

      person.inElevator = true;
      this.peopleInElevator.push(person);

      // Auto-set a target to their destination if this is the first person
      if (this.peopleInElevator.length === 1 && this.continuousElevatorMode) {
        // Will be handled by findNextDestination
      }
    }

    // uncomment if all people in the elevator should be delivered
    // if (!this.continuousElevatorMode && !peopleBoarding.length && this.peopleInElevator.length > 0) {
      // this.setTargetFloor(this.peopleInElevator[0].targetFloor);
    // }

    // If in continuous mode, find the next destination
    if (this.continuousElevatorMode) {
      setTimeout(() => this.findNextDestination(), 500); // Small delay before moving to the next floor
    }
  }

  private async findNextDestination(): Promise<void> {
    if (!this.continuousElevatorMode) return;

    // Case 1: Drop off people in the elevator
    if (this.peopleInElevator.length > 0) {
      // Find the closest target floor for people in the elevator
      const targets = this.peopleInElevator.map(p => p.targetFloor);
      const closest = this.findClosestFloor(targets);
      if (closest !== null && closest !== Math.round(this.currentFloor)) {
        await this.setTargetFloor(closest);
        return;
      }
    }

    // Case 2: Pick up waiting people
    const waitingFloors = [...new Set(this.people.filter(p => !p.inElevator).map(p => p.currentFloor))];
    if (waitingFloors.length > 0) {
      const closest = this.findClosestFloor(waitingFloors);
      if (closest !== null && closest !== Math.round(this.currentFloor)) {
        await this.setTargetFloor(closest);
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

  private addAutoBtns(parentEl: Container, controlsX: number, controlsY: number): void {
    // Continuous mode toggle button
    const continuousElevatorBtn = new Graphics();
    continuousElevatorBtn.rect(controlsX, controlsY + 130, 160, 30);
    continuousElevatorBtn.fill(0x9C27B0);
    continuousElevatorBtn.eventMode = 'static';
    continuousElevatorBtn.cursor = 'pointer';

    const continuousElevatorText = new Text({
      text: "Auto Elevator Mode: OFF",
      style: { fontSize: 12, fill: 0xffffff }
    });
    continuousElevatorText.x = controlsX + 10;
    continuousElevatorText.y = controlsY + 138;

    continuousElevatorBtn.on('pointerdown', () => {
      this.continuousElevatorMode = !this.continuousElevatorMode;
      continuousElevatorText.text = this.continuousElevatorMode ? "Auto Elevator Mode: ON" : "Auto Elevator Mode: OFF";
      continuousElevatorBtn.clear();
      continuousElevatorBtn.rect(controlsX, controlsY + 130, 160, 30);
      continuousElevatorBtn.fill(this.continuousElevatorMode ? 0x4CAF50 : 0x9C27B0);

      if (this.continuousElevatorMode) {
        this.findNextDestination();
      }
    });

    parentEl.addChild(continuousElevatorBtn);
    parentEl.addChild(continuousElevatorText);

    // Continuous add people button
    const continuousPeopleBtn = new Graphics();
    continuousPeopleBtn.rect(controlsX, controlsY + 170, 160, 30);
    continuousPeopleBtn.fill(0x9C27B0);
    continuousPeopleBtn.eventMode = 'static';
    continuousPeopleBtn.cursor = 'pointer';

    const continuousPeopleText = new Text({
      text: "Auto Add People: OFF",
      style: { fontSize: 12, fill: 0xffffff }
    });
    continuousPeopleText.x = controlsX + 10;
    continuousPeopleText.y = controlsY + 178;

    continuousPeopleBtn.on('pointerdown', () => {
      this.continuousAddPeople = !this.continuousAddPeople;
      continuousPeopleText.text = this.continuousAddPeople ? "Auto Add People: ON" : "Auto Add People: OFF";
      continuousPeopleBtn.clear();
      continuousPeopleBtn.rect(controlsX, controlsY + 170, 160, 30);
      continuousPeopleBtn.fill(this.continuousAddPeople ? 0x4CAF50 : 0x9C27B0);

      if (this.continuousAddPeople) {
        // Initialize timer - add people immediately and schedule next
        this.addPeople(1);
        this.addPeopleInterval = (Math.random() * 6 + 4) * 1000; // 4-10 seconds
        this.nextAddPeopleTime = Date.now() + this.addPeopleInterval;
      } else {
        // Reset timer when turned off
        this.nextAddPeopleTime = 0;
        this.addPeopleInterval = 0;
      }
    });

    parentEl.addChild(continuousPeopleBtn);
    parentEl.addChild(continuousPeopleText);
  }
}
