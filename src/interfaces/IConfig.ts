import { Container } from "pixi.js";

export interface IConfig {
    floors: number;
    capacity: number;
    elevatorSpeed: number;
}

export interface IPerson {
    currentFloor: number;
    targetFloor: number;
    direction: number; // 1 up, -1 down
    inElevator: boolean;
    view: Container;

    redraw(floors: number, floorHeight: number, slotIndex: number): void;
}

export interface IElevator {
    currentFloor: number;
    isMoving: boolean;
    capacity: number;

    moveTo(floor: number, force?: boolean): Promise<void>;
    addPerson(person: IPerson): void;
    removePerson(person: IPerson): void;
    updateStatus(targetFloor: number): void;
}