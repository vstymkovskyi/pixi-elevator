import {
    Application,
    Graphics,
    Text,
    Container,
    UPDATE_PRIORITY,
} from "pixi.js";
import {Tween, Easing, update} from "@tweenjs/tween.js";
import {IConfig} from "./interfaces/IConfig";
import {Elevator} from "./models/Elevator.ts";
import {Person} from "./models/Person.ts";

const random = (min: number, max: number): number => {
  if ((min % 1 > 0) || (max % 1 > 0)) {
    throw Error("Function does not support numbers with fractions. For number below 1 use randomBelowOne instead");
  }

  return Math.floor(Math.random() * (max - min + 1)) + min;
};

export class ElevatorSystem {
    private app: Application;
    private config: IConfig;

    // Containers
    private mainContainer: Container;
    private personsContainer: Container;

    // Systems
    private elevator: Elevator;

    // State
    private targetFloor: number = 0;
    private people: Person[] = [];
    private peopleInElevator: Person[] = [];

    // Settings / Modes
    private continuousElevatorMode: boolean = false;
    private continuousAddPeople: boolean = false;
    private nextAddPeopleTime: number = 0;
    private floorHeight: number = 60;

    constructor(app: Application, ELEVATOR_CONFIG: IConfig) {
        this.app = app;
        this.config = ELEVATOR_CONFIG;

        this.initTween();

        this.mainContainer = new Container();
        this.mainContainer.position.set(150, 100);
        app.stage.addChild(this.mainContainer);

        this.personsContainer = new Container();
        this.personsContainer.zIndex = 5;
        this.personsContainer.position.set(100, 10);
        this.mainContainer.addChild(this.personsContainer);

        // Init Elevator Class
        this.elevator = new Elevator(this.config);

        this.init();
    }

    private initTween(): void {
        this.app.ticker.add(
            () => update(this.app.ticker.lastTime),
            this,
            UPDATE_PRIORITY.HIGH,
        );
    }

    private init(): void {
        this.drawBuilding();

        // Add an elevator container to the main view
        this.mainContainer.addChild(this.elevator.container);
        this.mainContainer.addChild(this.elevator.infoText);

        this.drawControls();

        // Init state
        this.elevator.moveTo(1, true);

        setTimeout(async () => {
          await this.addPeople(8);
          if (this.continuousElevatorMode && !this.elevator.isMoving && this.people.length) {
            setTimeout(async () => await this.findNextDestination(), 900);
          }
        }, 100);
        this.app.ticker.add(() => this.update());
    }

    // Helper for tweening generic elements (like people walking)
    private moveElement(
        element: Container,
        to: { x: number },
        duration: number = 500,
        easing = Easing.Linear.None(),
    ) {
        return new Promise<void>((resolve) => {
            new Tween(element)
                .to(to, duration)
                .easing(easing)
                .onComplete(() => resolve())
                .start();
        });
    }

    private drawBuilding(): void {
        const buildingEl = new Container();
        const shaft = new Graphics();

        // Shaft outline
        shaft.rect(0, 0, 90, this.config.floors * this.floorHeight);
        shaft.stroke({ width: 2, color: 0x333333 });
        buildingEl.addChild(shaft);

        for (let i = 0; i <= this.config.floors; i++) {
          const line = new Graphics();
          line.rect(0, 0, 200, 2).fill(0x555555);
          line.y = i * this.floorHeight;
          buildingEl.addChild(line);

          // Add floor numbers and buttons (except top floor line)
          if (i < this.config.floors) {
            this.addFloorUI(buildingEl, i);
          }
        }
        this.mainContainer.addChild(buildingEl);
    }

  private addFloorUI(parent: Container, index: number): void {
    const floorEl = new Container();
    const floorLevel = this.config.floors - index;
    const yPos = (index * this.floorHeight) + this.floorHeight / 2;

    // Floor number
    const floorText = new Text({
      text: `Floor ${floorLevel}`,
      style: { fontSize: 14, fill: 0xcccccc }
    });
    floorText.anchor.set(0.5);
    floorEl.addChild(floorText);
    floorEl.position.set(-100, yPos);

    // Call btn
    const btn = new Graphics().rect(-15, -10, 30, 20).fill(0x4CAF50);
    btn.position.set(60, 0);
    btn.eventMode = 'static';
    btn.cursor = 'pointer';
    btn.on('pointerdown', () => this.setTargetFloor(floorLevel));

    const btnTxt = new Text({ text: "Call", style: { fontSize: 10, fill: 0xffffff } });
    btnTxt.anchor.set(0.5);
    btn.addChild(btnTxt);

    floorEl.addChild(btn);
    parent.addChild(floorEl);
  }

    private drawControls(): void {
        const controlsContainer = new Container();
        const startX = 220;
        let startY = 60;

        const title = new Text({text: "Floor Buttons:", style: {fontSize: 14, fill: 0xffffff, fontWeight: "bold"}});
        title.position.set(startX, startY);
        controlsContainer.addChild(title);
        startY += 30;

        for (let i = this.config.floors - 1; i >= 0; i--) {
            const button = new Graphics();
            const col = (this.config.floors - 1 - i) % 5;
            const row = Math.floor((this.config.floors - 1 - i) / 5);
            const x = startX + col * 35;
            const y = startY + row * 35;

            button.rect(x, y, 30, 30).fill(0x2196F3);
            button.eventMode = "static";
            button.cursor = "pointer";
            button.on("pointerdown", () => this.setTargetFloor(i + 1));

            const txt = new Text({text: `${i + 1}`, style: {fontSize: 12, fill: 0xffffff}});
            txt.position.set(x + (i < 9 ? 11 : 7), y + 9);

            controlsContainer.addChild(button);
            controlsContainer.addChild(txt);
        }

        // Add People Button
        const addBtn = new Graphics();
        addBtn.rect(startX, startY + 90, 120, 30).fill(0xFF9800);
        addBtn.eventMode = "static";
        addBtn.cursor = "pointer";
        addBtn.on("pointerdown", () => this.addPeople(5));

        const addTxt = new Text({text: "Add 5 People", style: {fontSize: 12, fill: 0xffffff}});
        addTxt.position.set(startX + 15, startY + 98);

        controlsContainer.addChild(addBtn, addTxt);

        // Auto buttons helper
        this.addAutoBtns(controlsContainer, startX, startY);
        this.mainContainer.addChild(controlsContainer);
    }

    private async setTargetFloor(floor: number): Promise<void> {
      if (floor < 1 || floor > this.config.floors) return;

      if (floor >= 1 && floor <= this.config.floors && floor !== this.elevator.currentFloor) {
          this.targetFloor = floor;
          await this.elevator.moveTo(floor);
          await this.onFloorReached();
      }
    }

    private async addPeople(count: number): Promise<void> {
      for (let i = 0; i < count; i++) {
        const currentFloor = random(1, this.config.floors);
        let targetFloor = random(1, this.config.floors);
        while (targetFloor === currentFloor) targetFloor = random(1, this.config.floors);

        const person = new Person(currentFloor, targetFloor);
        this.people.push(person);
        this.personsContainer.addChild(person.view);

        await this.renderPersonOnFloor(person);
      }
    }

    private async renderPersonOnFloor(person: Person): Promise<void> {
        const waitingOnFloor = this.people.filter(p => p.currentFloor === person.currentFloor && !p.inElevator);
        const index = waitingOnFloor.indexOf(person);

        person.redraw(this.config.floors, this.floorHeight, index);

        // Set the initial position off-screen or at queue start
        person.view.x = 400;

        // Move to the queue position
        await this.moveElement(person.view, {x: (index % 5) * 18}, 800);
    }

    private async update(): Promise<void> {
      // Continuous Logic
      if (this.continuousAddPeople && Date.now() >= this.nextAddPeopleTime) {
          this.addPeople(1);
          this.nextAddPeopleTime = Date.now() + (Math.random() * 6 + 4) * 1000;
      }

      // Update elevator status text for people count
      if (this.elevator.isMoving) {
          this.elevator.updateStatus(this.targetFloor, this.peopleInElevator.length);
      }

      // // if no people left waiting and check with delay
      if (this.continuousElevatorMode &&
          this.continuousAddPeople &&
          !this.elevator.isMoving && this.people.length &&
          this.peopleInElevator.length === 0
      ) {
        setTimeout(async () => await this.findNextDestination(), 900); // Small delay before moving to the next floor
      }
    }

    private async onFloorReached(): Promise<void> {
      const floor = Math.round(this.elevator.currentFloor);

      // People leaving
      const peopleLeaving = this.peopleInElevator.filter(p => p.targetFloor === floor);

      await Promise.all(peopleLeaving.map(async (person) => {
          // Animate out
          await this.moveElement(person.view, {x: 600});

          // Remove from logic
          this.peopleInElevator = this.peopleInElevator.filter(p => p !== person);
          this.people = this.people.filter(p => p !== person);
          this.elevator.removePerson(person);
      }));

      this.elevator.updateStatus(floor, this.peopleInElevator.length);

      // Determine Direction
      let direction = 0;
      const targetsAbove = this.peopleInElevator.some(p => p.targetFloor > floor);
      const targetsBelow = this.peopleInElevator.some(p => p.targetFloor < floor);

      if (targetsAbove) direction = 1;
      else if (targetsBelow) direction = -1;
      else {
          // Logic for picking up new people based on a majority
          const waiting = this.people.filter(p => p.currentFloor === floor && !p.inElevator);
          if (waiting.length > 0) {
              const goingUp = waiting.filter(p => p.direction === 1).length;
              direction = goingUp >= waiting.length / 2 ? 1 : -1;
          }
      }

      // People Boarding
      const peopleBoarding = this.people.filter(p =>
          p.currentFloor === floor &&
          !p.inElevator &&
          (direction === 0 || p.direction === direction)
      );

      // Fill until capacity
      const spots = this.config.capacity - this.peopleInElevator.length;
      const toBoard = peopleBoarding.slice(0, spots);

      for (const person of toBoard) {
          // Simple animation to "walk" into elevator x-space
          await this.moveElement(person.view, {x: person.view.x - 50}, 300);

          person.inElevator = true;
          this.personsContainer.removeChild(person.view);
          this.elevator.addPerson(person); // Adds to elevator container
          this.peopleInElevator.push(person);

          // Position inside the elevator box
          const idx = this.peopleInElevator.length - 1;
          person.redraw(this.config.floors, this.floorHeight, idx);

          // Manual positioning relative to elevator container
          person.view.x = 15 + (idx % 4) * 18;
          person.view.y = 15 + Math.floor(idx / 4) * 20;
      }

      this.elevator.updateStatus(floor, this.peopleInElevator.length);

      // Continue Auto Mode
      if (this.continuousElevatorMode) {
          setTimeout(() => this.findNextDestination(), 500);
      }
    }

    private async findNextDestination(): Promise<void> {
      if (!this.continuousElevatorMode || this.elevator.isMoving) return;

      // Logic remains same: prioritize drop-off, then pick-up
      const current = Math.round(this.elevator.currentFloor);
      let target = null;
      let minDist = Infinity;

      // Check inside
      if (this.peopleInElevator.length > 0) {
        for (const p of this.peopleInElevator) {
          const dist = Math.abs(p.targetFloor - current);
          if (dist < minDist && dist > 0) {
            minDist = dist;
            target = p.targetFloor;
          }
        }
      }
      // Check outside if empty or convenient
      else {
        const waitingFloors = [...new Set(this.people.filter(p => !p.inElevator).map(p => p.currentFloor))];
        for (const f of waitingFloors) {
          const dist = Math.abs(f - current);
          if (dist < minDist && dist > 0) {
            minDist = dist;
            target = f;
          }
        }
      }

      if (target !== null) {
          await this.setTargetFloor(target);
      }
    }

    private addAutoBtns(parent: Container, x: number, y: number): void {
      // Helper to reduce clutter
      const createBtn = (offsetY: number, text: string, defaultState: boolean, stateCallback: () => boolean) => {
        const btn = new Graphics();
        let isActive = defaultState;
        btn.rect(x, y + offsetY, 160, 30).fill(isActive ? 0x4CAF50 : 0x9C27B0);
        btn.eventMode = "static";

        btn.cursor = "pointer";
        const txt = new Text({text: text + (isActive ? ": ON" : ": OFF"), style: {fontSize: 12, fill: 0xffffff}});
        txt.position.set(x + 10, y + offsetY + 8);

        btn.on("pointerdown", () => {
            isActive = stateCallback();
            btn.clear().rect(x, y + offsetY, 160, 30).fill(isActive ? 0x4CAF50 : 0x9C27B0);
            txt.text = text + (isActive ? ": ON" : ": OFF");
        });
        parent.addChild(btn, txt);
      };

    createBtn(130, "Auto Elevator", this.continuousElevatorMode, () => {
        this.continuousElevatorMode = !this.continuousElevatorMode;
        if (this.continuousElevatorMode) this.findNextDestination();
        return this.continuousElevatorMode;
  });

    createBtn(170, "Auto Add People", this.continuousAddPeople, () => {
        this.continuousAddPeople = !this.continuousAddPeople;
        if (this.continuousAddPeople) {
            this.addPeople(1);
            this.nextAddPeopleTime = Date.now() + 4000;
        }
        return this.continuousAddPeople;
    });
  }
}
