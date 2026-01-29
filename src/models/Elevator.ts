import { Container, Graphics, Text } from "pixi.js";
import { Tween, Easing } from "@tweenjs/tween.js";

import {IConfig, IElevator, IPerson} from "../interfaces/IConfig.ts";

export class Elevator implements IElevator {
    public currentFloor: number;
    public isMoving: boolean = false;
    public capacity: number;

    public container: Container;
    public infoText: Text;
    private box: Graphics;
    private config: IConfig;

    private readonly width = 80;
    private readonly height = 50;

    constructor(config: IConfig) {
        this.config = config;
        this.capacity = config.capacity;
        this.currentFloor = config.floors; // Start at top usually

        this.container = new Container();

        this.box = new Graphics();
        this.drawBox();
        this.container.addChild(this.box);

        this.infoText = new Text({ text: "", style: { fontSize: 12, fill: 0xffffff } });
        this.infoText.position.set(100, -80);

        this.updateStatus(0); // init status
    }

    private drawBox(): void {
        this.box.clear();
        this.box.rect(0, 0, this.width, this.height);
        this.box.fill(0xFF5722);
        this.box.stroke({ width: 2, color: 0xffffff });
        this.box.pivot.set(-5, -6);
    }

    public updateStatus(targetFloor: number, peopleCount: number = 0): void {
        let movingStatus = 'Stopped';
        if (this.isMoving) {
            movingStatus = targetFloor > this.currentFloor ? 'Up' : 'Down';
        }

        this.infoText.text = `Floor: ${parseFloat(this.currentFloor.toFixed(2))}`;
        this.infoText.text += `\nMoving direction: ${movingStatus}`;
        this.infoText.text += `\nCapacity: ${peopleCount}/${this.capacity}`;
    }

    public moveTo(floor: number, force: boolean = false): Promise<void> {
        if (this.isMoving && !force) return Promise.resolve();

        const targetY = (this.config.floors - floor) * (this.height + 10); // 10 is padding

        if (force) {
            this.currentFloor = floor;
            this.container.position.y = targetY;
            this.updateStatus(floor);
            return Promise.resolve();
        }

        return new Promise<void>((resolve) => {
            new Tween(this.container)
                .to({ y: targetY }, this.config.elevatorSpeed) // Speed is set in the config
                .easing(Easing.Quadratic.In)
                .onStart(() => {
                    this.isMoving = true;
                    this.updateStatus(floor);
                })
                .onUpdate(() => {
                    // Approximate current floor for display
                    const progress = this.container.y / (this.height + 10);
                    this.currentFloor = this.config.floors - progress;
                    this.updateStatus(floor); // Update text dynamically
                })
                .onComplete(() => {
                    this.isMoving = false;
                    this.currentFloor = floor;
                    this.updateStatus(floor);
                    resolve();
                })
                .start();
        });
    }

    public addPerson(person: IPerson): void {
        this.container.addChild(person.view);
    }

    public removePerson(person: IPerson): void {
        this.container.removeChild(person.view);
    }
}
