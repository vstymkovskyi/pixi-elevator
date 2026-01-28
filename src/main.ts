import { Application } from "pixi.js";
import { ElevatorSystem } from "./app";

// Configuration
let ELEVATOR_CONFIG = {
  floors: 10, // Number of floors (can be changed)
  capacity: 4, // Maximum people capacity (can be changed)
  elevatorSpeed: 1
};

let app: Application;
let elevatorSystem: ElevatorSystem | null = null;
let floorsInput: HTMLInputElement | null = null;
let capacityInput: HTMLInputElement | null = null;
let speedInput: HTMLInputElement | null = null;

async function initializeElevator() {
  // Get input values
  floorsInput = document.getElementById("floors-input") as HTMLInputElement;
  capacityInput = document.getElementById("capacity-input") as HTMLInputElement;
  speedInput = document.getElementById("speed-input") as HTMLInputElement;

  if (floorsInput && capacityInput) {
    ELEVATOR_CONFIG.floors = parseInt(floorsInput.value) || 10;
    ELEVATOR_CONFIG.capacity = parseInt(capacityInput.value) || 4;
    ELEVATOR_CONFIG.elevatorSpeed = parseInt(speedInput.value) || 4;
  }

  // Clear previous instance if exists
  if (elevatorSystem && app) {
    app.stage.removeChildren();
  }

  // Create or reinitialize the application
  if (!app) {
    app = new Application();
    await app.init({ background: "#1a1a1a", width: 800, height: 700 });
    document.getElementById("pixi-container")!.appendChild(app.canvas);
  }

  // Calculate dynamic height based on floors
  const canvasHeight = Math.max(700, ELEVATOR_CONFIG.floors * 60 + 150); // height of the floor
  app.renderer.resize(600, canvasHeight);

  // Create a new elevator system with updated config
  elevatorSystem = new ElevatorSystem(app, ELEVATOR_CONFIG);
}

(async () => {
  const floors = document.getElementById("floors-input") as HTMLInputElement;
  const capacity = document.getElementById("capacity-input") as HTMLInputElement;
  const speed = document.getElementById("speed-input") as HTMLInputElement;

  floors.value = ELEVATOR_CONFIG.floors.toString();
  capacity.value = ELEVATOR_CONFIG.capacity.toString();
  speed.value = ELEVATOR_CONFIG.elevatorSpeed.toString();

  // Initialize with default values
  await initializeElevator();

  // Add an event listener to the Apply button
  const applyButton = document.getElementById("apply-config");
  if (applyButton) {
    applyButton.addEventListener("click", async () => {
      await initializeElevator();
    });
  }

  // Allow pressing Enter in input fields to apply
  const floorsInput = document.getElementById("floors-input");
  const capacityInput = document.getElementById("capacity-input");
  const speedInput = document.getElementById("speed-input");

  [floorsInput, capacityInput, speedInput].forEach(input => {
    input?.addEventListener("keypress", async (e) => {
      if (e.key === "Enter") {
        await initializeElevator();
      }
    });
  });
})();
