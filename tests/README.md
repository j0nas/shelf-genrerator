# Ghost Divider Tests

This test suite ensures the subdivision ghost bug never returns. The bug occurred when ghost dividers stopped appearing in subdivided sections after placing the first horizontal divider.

## Test Structure

### `ghost-divider.test.js`
Comprehensive tests covering:
- **Ghost Divider Lifecycle**: Creation, cleanup, and disposal
- **Unit Conversion**: Imperial/metric coordinate system consistency  
- **Section Detection**: Subdivision logic and bounds checking
- **Integration**: Real-world subdivision scenarios

### `subdivision-bug-regression.test.js`
Specific regression test that reproduces the exact bug scenario:
1. Empty shelf ghost works
2. Add first horizontal divider
3. Test ghost appears in bottom section ("red area")
4. Test ghost appears in top section ("blue area")
5. Test ghost survives shelf updates
6. Test metric mode subdivisions
7. Test rapid mouse movements

## Running Tests

```bash
# Run all tests
npm test

# Run only ghost divider tests
npm run test:ghost

# Run only regression test
npm run test:regression

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode during development
npm run test:watch

# Run tests with verbose output (for CI)
npm run test:ci

# Open test UI
npm run test:ui
```

## Test Coverage

The tests cover these critical areas:

### Ghost Divider Lifecycle
- ✅ Ghost creation and Three.js mesh setup
- ✅ Addition to scene graph (`shelfGroup`)
- ✅ Visibility state management
- ✅ Proper cleanup and disposal
- ✅ Memory leak prevention

### Unit Conversion Issues
- ✅ Imperial mode positioning (no conversion)
- ✅ Metric mode positioning (no conversion to inches)
- ✅ Scene coordinate system consistency
- ✅ `shelfToWorldPosition()` vs `getShelfInteriorIntersection()` alignment

### Section Detection Logic
- ✅ Empty shelf section detection
- ✅ Subdivided section bounds calculation  
- ✅ `canAdd` logic for minimum section heights
- ✅ Section index assignment
- ✅ Out-of-bounds position handling

### Specific Bug Scenarios
- ✅ First divider placement
- ✅ Bottom section ghost ("red area")
- ✅ Top section ghost ("blue area")  
- ✅ Ghost persistence through shelf updates
- ✅ Metric mode subdivisions
- ✅ Rapid mouse movement handling

## Critical Test Cases

### The Original Bug
```javascript
// This exact scenario was broken:
1. Empty shelf: ✅ Ghost works
2. Add divider at middle: ✅ Divider added
3. Hover bottom section: ❌ No ghost (WAS BROKEN)
4. Hover top section: ❌ No ghost (WAS BROKEN)
```

### Root Cause Tested
The bug was caused by ghost divider lifecycle issues:
- `updateShelf()` called `cleanupInteractionState()`
- `cleanupInteractionState()` called `hideGhostDivider()`
- `updateShelf()` cleared `shelfGroup.children` (disposing ghost)
- `this.ghostDivider` still pointed to disposed object
- `updateGhostDivider()` tried to show disposed object

### Prevention Strategy
Tests verify:
1. **Proper cleanup**: `cleanupGhostDivider()` fully disposes and nulls ghost
2. **Fresh creation**: New ghost created after cleanup
3. **Scene graph integrity**: Ghost properly added to new `shelfGroup`
4. **Unit consistency**: No coordinate system mismatches

## Failure Indicators

If any test fails, it likely means:

### Ghost Creation Tests Fail
- Three.js setup issues
- Material/geometry problems
- Scene graph issues

### Unit Conversion Tests Fail  
- Coordinate system regression
- Metric/imperial conversion bugs
- Position calculation errors

### Section Detection Tests Fail
- Subdivision logic broken
- Bounds calculation errors
- `canAdd` logic issues

### Regression Tests Fail
- **THE BUG IS BACK** - immediate investigation needed
- Lifecycle management broken
- Scene updates causing disposal issues

## Debugging Failed Tests

### Enable Debug Logging
The tests include ghost debugging. Look for console output:
```
🧪 Testing empty shelf ghost...
✅ Empty shelf ghost works
🧪 Adding first horizontal divider...
✅ Divider added at position 35.25"
🧪 Testing bottom section (red area)...
✅ Bottom section detected: index=0, canAdd=true
✅ Bottom section ghost appears at Y=18.38
```

### Check Test Assumptions
- Verify mock DOM elements are correct
- Check Three.js mocks are complete
- Ensure coordinate system assumptions hold

### Investigation Steps
1. Run regression test first: `npm run test:regression`
2. If it fails, the original bug is back
3. Check ghost lifecycle tests: `npm run test:ghost`
4. Look for recent changes to:
   - `updateShelf()` method
   - `cleanupInteractionState()` method  
   - `shelfToWorldPosition()` method
   - `detectHoveredSection()` method
   - `updateGhostDivider()` method

## Adding New Tests

When adding features that interact with ghost dividers:

1. **Add unit tests** to `ghost-divider.test.js`
2. **Add integration test** to verify the feature works with subdivisions  
3. **Test both imperial and metric modes**
4. **Test edge cases** (small sections, boundary conditions)
5. **Test cleanup scenarios** (shelf updates, state changes)

The goal is to make this bug impossible to reintroduce without breaking tests.