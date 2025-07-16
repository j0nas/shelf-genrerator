/**
 * Subdivision Ghost Bug Regression Test for XState Architecture
 *
 * This test ensures that ghost dividers work correctly after adding dividers,
 * specifically preventing the bug where ghosts would disappear in subdivided sections.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { createDividerSystemService } from "../js/divider-state-machine.js";

// Test configuration matching the original bug scenario
const testShelfConfig = {
  width: 91,
  height: 183,
  depth: 30,
  materialThickness: 1.8,
};

function createTestService() {
  const service = createDividerSystemService();
  service.start();

  service.send({
    type: "UPDATE_SHELF_CONFIG",
    config: testShelfConfig,
  });

  return service;
}

function getState(service: any) {
  return service.getSnapshot();
}

function getContext(service: any) {
  return getState(service).context;
}

describe("Subdivision Ghost Bug Regression Tests", () => {
  let service: any;

  beforeEach(() => {
    service = createTestService();
  });

  it("host dividers should work after placing first divider", () => {
    // Step 1: Verify empty shelf works
    service.send({
      type: "MOUSE_MOVE",
      x: 100,
      y: 100,
      positionY: 36, // Middle of empty shelf
      positionX: 0,
    });

    let context = getContext(service);
    expect(context.ghostDivider).not.toBeNull();
    expect(context.ghostDivider.visible).toBe(true);
    console.log("✅ Empty shelf ghost works");

    // Step 2: Add first horizontal divider
    service.send({
      type: "CLICK_EMPTY_SPACE",
      positionY: 36,
      positionX: 0,
    });

    context = getContext(service);
    expect(context.horizontalDividers.length).toBe(1);
    console.log("✅ First divider added");

    // Step 3: Test ghost in bottom section (below the divider)
    const bottomSectionPosition = 18; // Half of 36
    service.send({
      type: "MOUSE_MOVE",
      x: 100,
      y: 80,
      positionY: bottomSectionPosition,
      positionX: 0,
    });

    context = getContext(service);
    expect(context.ghostDivider).not.toBeNull();
    expect(context.ghostDivider.visible).toBe(true);
    expect(context.ghostDivider.type).toBe("horizontal");
    console.log("✅ Bottom section ghost appears");

    // Step 4: Test ghost in top section (above the divider)
    const topSectionPosition = 54; // 36 + (72-36)/2
    service.send({
      type: "MOUSE_MOVE",
      x: 100,
      y: 60,
      positionY: topSectionPosition,
      positionX: 0,
    });

    context = getContext(service);
    expect(context.ghostDivider).not.toBeNull();
    expect(context.ghostDivider.visible).toBe(true);
    expect(context.ghostDivider.type).toBe("horizontal");
  });

  it("ghosts should work with multiple dividers", () => {
    // Add first divider
    service.send({
      type: "MOUSE_MOVE",
      x: 100,
      y: 100,
      positionY: 24,
      positionX: 0,
    });
    service.send({
      type: "CLICK_EMPTY_SPACE",
      positionY: 24,
      positionX: 0,
    });

    // Add second divider
    service.send({
      type: "MOUSE_MOVE",
      x: 100,
      y: 120,
      positionY: 48,
      positionX: 0,
    });
    service.send({
      type: "CLICK_EMPTY_SPACE",
      positionY: 48,
      positionX: 0,
    });

    let context = getContext(service);
    expect(context.horizontalDividers.length).toBe(2);

    // Test ghost between dividers
    service.send({
      type: "MOUSE_MOVE",
      x: 100,
      y: 110,
      positionY: 36, // Between 24 and 48
      positionX: 0,
    });

    context = getContext(service);
    expect(context.ghostDivider).not.toBeNull();
    expect(context.ghostDivider.visible).toBe(true);
    expect(context.ghostDivider.canAdd).toBe(true);

    // Test ghost in bottom section
    service.send({
      type: "MOUSE_MOVE",
      x: 100,
      y: 90,
      positionY: 12, // Below first divider
      positionX: 0,
    });

    context = getContext(service);
    expect(context.ghostDivider).not.toBeNull();
    expect(context.ghostDivider.visible).toBe(true);

    // Test ghost in top section
    service.send({
      type: "MOUSE_MOVE",
      x: 100,
      y: 130,
      positionY: 60, // Above second divider
      positionX: 0,
    });

    context = getContext(service);
    expect(context.ghostDivider).not.toBeNull();
    expect(context.ghostDivider.visible).toBe(true);
  });

  it("metric mode subdivisions should work", () => {
    // Test with different metric config
    const metricConfig = {
      width: 91.5,
      height: 183.0,
      depth: 30.5,
      materialThickness: 1.9,
    };

    service.send({
      type: "UPDATE_SHELF_CONFIG",
      config: metricConfig,
    });

    // Add divider at middle
    const middlePosition = 91.44; // Middle in cm
    service.send({
      type: "MOUSE_MOVE",
      x: 100,
      y: 100,
      positionY: middlePosition,
      positionX: 0,
    });
    service.send({
      type: "CLICK_EMPTY_SPACE",
      positionY: middlePosition,
      positionX: 0,
    });

    let context = getContext(service);
    expect(context.horizontalDividers.length).toBe(1);

    // Test bottom section
    const bottomPosition = middlePosition * 0.5;
    service.send({
      type: "MOUSE_MOVE",
      x: 100,
      y: 80,
      positionY: bottomPosition,
      positionX: 0,
    });

    context = getContext(service);
    expect(context.ghostDivider).not.toBeNull();
    expect(context.ghostDivider.visible).toBe(true);
    expect(context.ghostDivider.position).toBeCloseTo(bottomPosition);
  });

  it("rapid mouse movements should not break ghosts", () => {
    // Add a divider first
    service.send({
      type: "MOUSE_MOVE",
      x: 100,
      y: 100,
      positionY: 36,
      positionX: 0,
    });
    service.send({
      type: "CLICK_EMPTY_SPACE",
      positionY: 36,
      positionX: 0,
    });

    // Simulate rapid mouse movements between sections
    const testPositions = [
      18, // Bottom section
      27, // Still bottom section
      45, // Top section
      54, // Still top section
      9, // Bottom section again
      63, // Top section again
      12, // Bottom section again
    ];

    let successCount = 0;

    testPositions.forEach((position, index) => {
      service.send({
        type: "MOUSE_MOVE",
        x: 100 + index, // Vary x slightly
        y: 100 + index,
        positionY: position,
        positionX: 0,
      });

      const context = getContext(service);
      if (context.ghostDivider && context.ghostDivider.visible) {
        successCount++;
      }
    });

    expect(successCount).toBeGreaterThan(testPositions.length * 0.8); // At least 80% success
  });

  it("vertical dividers should work in subdivided sections", () => {
    // Add horizontal divider
    service.send({
      type: "MOUSE_MOVE",
      x: 100,
      y: 100,
      positionY: 91,
      positionX: 0,
    });
    service.send({
      type: "CLICK_EMPTY_SPACE",
      positionY: 91,
      positionX: 0,
    });

    // Test vertical ghost in bottom section
    service.send({
      type: "MOUSE_MOVE",
      x: 50,
      y: 80,
      positionY: 46, // Bottom section of 91cm divided shelf
      positionX: -30, // Near left edge, bottom section - adjusted for metric
    });

    let context = getContext(service);
    expect(context.ghostDivider).not.toBeNull();
    expect(context.ghostDivider.type).toBe("vertical");
    expect(context.ghostDivider.visible).toBe(true);

    // Test vertical ghost in top section
    service.send({
      type: "MOUSE_MOVE",
      x: 250,
      y: 60,
      positionY: 137, // Top section of 91cm divided shelf
      positionX: 30, // Near right edge, top section - adjusted for metric
    });

    context = getContext(service);
    expect(context.ghostDivider).not.toBeNull();
    expect(context.ghostDivider.type).toBe("vertical");
    expect(context.ghostDivider.visible).toBe(true);
  });

  it("ghost state should be clean after interactions", () => {
    // Add divider and create ghost
    service.send({
      type: "MOUSE_MOVE",
      x: 100,
      y: 100,
      positionY: 36,
      positionX: 0,
    });
    service.send({
      type: "CLICK_EMPTY_SPACE",
      positionY: 36,
      positionX: 0,
    });

    // Create ghost in subdivided section
    service.send({
      type: "MOUSE_MOVE",
      x: 100,
      y: 80,
      positionY: 18,
      positionX: 0,
    });

    let context = getContext(service);
    expect(context.ghostDivider).not.toBeNull();

    // Select divider (should hide ghost)
    const divider = context.horizontalDividers[0];
    service.send({ type: "CLICK_DIVIDER", divider });

    context = getContext(service);
    expect(context.ghostDivider).toBeNull();

    // Deselect and verify ghost works again
    service.send({ type: "CLICK_ELSEWHERE" });

    service.send({
      type: "MOUSE_MOVE",
      x: 100,
      y: 80,
      positionY: 18,
      positionX: 0,
    });

    context = getContext(service);
    expect(context.ghostDivider).not.toBeNull();
    expect(context.ghostDivider.visible).toBe(true);
  });
});
