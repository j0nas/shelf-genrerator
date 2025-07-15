# Clean XState Architecture

This project has been refactored to use a clean XState-based architecture that eliminates timing issues, state synchronization bugs, and provides reliable 3D divider interactions.

## Architecture Overview

### 🎯 Core Principles
- **Single Source of Truth**: XState manages all divider state
- **Pure Functions**: View is a function of state
- **Event-Driven**: Input events → State transitions → View updates
- **Predictable**: No side effects, easy to test and debug

### 📁 File Structure

#### Core Architecture Files
- `divider-state-machine.ts` - Complete state machine with all business logic
- `shelf-renderer.ts` - Pure 3D renderer (state → visuals)
- `input-controller.ts` - Clean input handling (DOM → state events)
- `divider-system.ts` - Main controller that orchestrates components

#### Application Files
- `main.ts` - Application entry point using clean architecture
- `types.ts` - TypeScript interfaces and types
- `cutlist-generator.ts` - Cut list generation (unchanged)
- `ui.ts` - UI components (unchanged)
- `dom-utils.ts` - DOM utility functions

#### Legacy Files (for reference)
- `shelf-generator-legacy.ts` - Old ShelfGenerator class (backup)

## State Machine States

```
normal → hovering → selected → preparingDrag → dragging
   ↑         ↓         ↓            ↓            ↓
   ←─────────┴─────────┴────────────┴────────────┘
```

### State Descriptions
- **normal**: Default state, shows ghost dividers on hover
- **hovering**: Mouse over existing divider, shows highlight
- **selected**: Divider selected, shows selection highlight
- **preparingDrag**: Mouse down on selected divider, waiting for movement
- **dragging**: Actively dragging a divider

## Key Events

### Mouse Events
- `MOUSE_MOVE` - Updates ghost dividers and hover states
- `CLICK_EMPTY_SPACE` - Adds new divider where ghost is shown
- `CLICK_DIVIDER` - Selects existing divider
- `CLICK_DELETE` - Deletes selected divider
- `CLICK_ELSEWHERE` - Deselects current divider
- `MOUSE_DOWN` / `MOUSE_UP` - Drag interaction

### System Events
- `UPDATE_SHELF_CONFIG` - Updates shelf dimensions/settings
- `ADD_EXISTING_DIVIDER` - Loads existing dividers
- `RESET` - Clears all dividers

## Benefits Achieved

### ✅ Bug Fixes
- **Invisible Vertical Dividers**: Fixed by proper state management
- **Timing Issues**: Eliminated with pure state → view updates
- **State Synchronization**: Single source of truth prevents conflicts
- **Undefined Property Errors**: Type-safe state machine

### ✅ Reliability Improvements
- **Predictable Behavior**: Pure state transitions
- **Easy Debugging**: State machine visualizer support
- **No Race Conditions**: Event-driven architecture
- **Consistent Updates**: Atomic state changes

### ✅ Developer Experience
- **Testable**: State machine can be unit tested
- **Debuggable**: Clear state flow and event logs
- **Maintainable**: Separation of concerns
- **Extensible**: Easy to add new features

## Usage

### Adding Dividers
- **Horizontal**: Click in center area of shelf
- **Vertical**: Click near left/right edges of shelf
- **Smart Prioritization**: System shows appropriate ghost based on mouse position

### Interacting with Dividers
- **Select**: Click on existing divider
- **Drag**: Click and drag selected divider
- **Delete**: Right-click or press Delete/Backspace on selected divider
- **Deselect**: Click elsewhere or press Escape

### Configuration
- All shelf settings (dimensions, materials, etc.) trigger `UPDATE_SHELF_CONFIG`
- State machine automatically recalculates constraints and ghost positions
- 3D scene updates automatically based on state changes

## Debugging

### Browser Console
```javascript
// Inspect current state
app.getSystemState()

// Get state machine state
app.dividerSystem.getState()

// Get all dividers
app.getCurrentDividers()

// Enable debug mode
app.toggleDebugMode()
```

### State Machine Debugging
- All state transitions are logged to console
- Debug mode shows additional context information
- XState visualizer tools can be used for advanced debugging

## Testing

The state machine can be tested independently of the 3D view:

```javascript
import { createDividerSystemService } from './divider-state-machine.js';

const machine = createDividerSystemService();
machine.start();

// Test adding dividers
machine.send({ type: 'UPDATE_SHELF_CONFIG', config: testConfig });
machine.send({ type: 'CLICK_EMPTY_SPACE', positionX: 0, positionY: 36 });

// Verify state
const state = machine.getSnapshot();
assert(state.context.horizontalDividers.length === 1);
```

## Migration Notes

The clean architecture is fully backward compatible:
- All existing UI controls work unchanged
- Cut list generation works with new divider system
- PDF export works with new divider system
- Reset functionality works with new state machine

Legacy code has been moved to `*-legacy.ts` files for reference but is no longer used.