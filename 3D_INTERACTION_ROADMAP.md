# 3D Direct Manipulation Roadmap for Shelf Generator

## Vision
Transform the shelf generator from traditional left-panel controls to direct 3D manipulation with **smart sectioning** - where users can split existing sections at their center points by hovering and clicking directly on the 3D model.

## Current State
- Left panel with "Add Horizontal Divider" button
- Divider controls in sidebar with position sliders
- Basic 3D raycasting and debug mode implemented ✅

## Target State - Smart Sectioning Approach
- **Smart positioning**: Hover any section → ghost divider appears at section's center
- **Binary tree logic**: Each divider splits its section into two equal parts
- **No arbitrary positioning**: Always meaningful, centered splits
- **Intuitive workflow**: Empty shelf → center split → each half can be split → recursive
- Hover existing dividers → highlight + "×" button for removal
- Left panel becomes pure configuration (materials, dimensions, etc.)
- Divider-specific controls appear contextually

---

## Implementation Phases

### Phase 1: Foundation - 3D Mouse Interaction ✅ COMPLETED
**Goal:** Establish basic 3D mouse position detection and coordinate system

**Tasks:**
- [x] Add raycasting setup to ShelfGenerator class
- [x] Create method to convert 3D world coordinates to shelf interior space
- [x] Add mouse move event listener to 3D canvas
- [x] Add debug mode to visualize raycast intersections
- [x] Add UI toggle for debug mode
- [x] Test coordinate conversion accuracy across different camera angles

**Files modified:**
- `js/shelf-generator.js` - Added raycasting, coordinate conversion, debug visualization
- `js/main.js` - Added mouse events and debug toggle
- `index.html` - Added debug button to viewer controls

**Success criteria:**
- ✅ Console logs accurate Y-position in shelf interior space when hovering
- ✅ Debug mode shows red sphere at intersection points
- ✅ Unit conversion works (metric/imperial)
- ✅ Works consistently across all camera views (front, side, top, iso)

---

### Phase 2: Smart Section Detection & Ghost Dividers ✅ COMPLETED
**Goal:** Detect which section mouse is hovering and show ghost divider at section center

**Tasks:**
- [x] Implement section detection logic (which space between existing dividers)
- [x] Calculate center point of hovered section
- [x] Create ghost divider material (transparent, distinct color)
- [x] Show ghost divider at section center when hovering
- [x] Handle edge case: empty shelf (show ghost at overall center)
- [x] Hide ghost when hovering existing dividers or outside shelf

**Smart Sectioning Logic:**
- ✅ Empty shelf → ghost at vertical center
- ✅ With dividers → detect which section mouse is in, show ghost at that section's center
- ✅ Minimum section height enforcement (prevent tiny unusable spaces)

**Files modified:**
- `js/shelf-generator.js` - Section detection, ghost divider rendering, virtual plane raycasting
- `js/main.js` - Section calculation helpers

**Success criteria:**
- ✅ Ghost divider appears at center of hovered section
- ✅ Works with 0, 1, 2+ existing dividers
- ✅ Ghost disappears when hovering outside shelf
- ✅ Prevents creation of sections smaller than minimum usable height

**Key Technical Breakthrough:**
- Resolved coordinate system issues by implementing virtual plane raycasting
- Ghost divider now appears accurately when hovering anywhere in empty shelf interior
- Proper coordinate conversion between 3D world space and shelf interior units

**Implementation Details:**
- Virtual plane positioned at front face of shelf interior (not visible to user)
- Raycasting against plane provides accurate 3D intersection points
- Coordinate conversion: World Y → Shelf Interior Y → Current Units (metric/imperial)
- Debug logging cleaned up (only shows when debug mode is enabled)
- Smart sectioning works with empty shelves and shelves with existing dividers

---

### Phase 3: Hover State for Existing Dividers ⏳ NEXT PHASE
**Goal:** Visual feedback when hovering existing dividers

**Tasks:**
- [ ] Detect when hovering existing horizontal dividers
- [ ] Add highlight material/effect for hovered dividers
- [ ] Show visual indication that divider can be removed
- [ ] Handle hover conflicts (ghost vs existing divider)
- [ ] Add smooth transitions between hover states

**Files to modify:**
- `js/shelf-generator.js` - Divider hover detection and highlighting

**Success criteria:**
- Existing dividers highlight when hovered
- Clear visual distinction between "add" and "remove" hover states
- No z-fighting or visual glitches
- Hover states work with colored compartments

---

### Phase 4: 3D UI Buttons ✓ Depends on Phase 3
**Goal:** Add floating UI buttons in 3D space

**Tasks:**
- [ ] Create 3D button geometries ("+" and "×")
- [ ] Position buttons to follow mouse/hover target
- [ ] Handle button visibility based on camera angle/distance
- [ ] Add button hover effects (scale, color change)
- [ ] Ensure buttons don't interfere with shelf geometry

**Files to modify:**
- `js/shelf-generator.js` - 3D button creation and positioning
- Consider new file: `js/3d-ui-elements.js`

**Success criteria:**
- "+" button appears near mouse when hovering empty space
- "×" button appears on hovered existing dividers
- Buttons are clearly visible from all camera angles
- Buttons have appropriate hover feedback

---

### Phase 5: Click Interactions ✓ Depends on Phase 4
**Goal:** Make buttons functional - add/remove dividers via 3D clicks

**Tasks:**
- [ ] Add click event detection on 3D buttons
- [ ] Implement addDividerAt3DPosition(yPosition) method
- [ ] Implement removeDividerAt3DPosition(dividerId) method
- [ ] Sync 3D changes with left panel configuration
- [ ] Handle edge cases (clicking between buttons and geometry)

**Files to modify:**
- `js/shelf-generator.js` - Click detection and divider management
- `js/main.js` - Integration with existing divider logic

**Success criteria:**
- Clicking "+" button adds divider at correct position
- Clicking "×" button removes correct divider
- Left panel updates immediately to reflect changes
- No duplicate or phantom dividers

---

### Phase 6: Enhanced UX Polish ✓ Depends on Phase 5
**Goal:** Smooth out the experience with smart behaviors

**Tasks:**
- [ ] Add minimum spacing constraints (prevent dividers too close together)
- [ ] Smart positioning (snap to useful increments, avoid tiny spaces)
- [ ] Add undo/redo for 3D operations
- [ ] Improve mobile/touch support for 3D interactions
- [ ] Add keyboard shortcuts (ESC to cancel ghost divider)

**Files to modify:**
- `js/shelf-generator.js` - Smart positioning logic
- `js/main.js` - Undo/redo and keyboard handling

**Success criteria:**
- Dividers can't be placed too close to existing ones
- Position snapping feels natural and helpful
- Touch devices have alternative interaction method
- All interactions feel polished and responsive

---

### Phase 7: Contextual Configuration ✓ Depends on Phase 6
**Goal:** Replace left panel divider list with contextual popups

**Tasks:**
- [ ] Add click-to-configure mode for existing dividers
- [ ] Create floating configuration panel for selected divider
- [ ] Show vertical divider controls contextually
- [ ] Position adjustment via direct drag or input field
- [ ] Update left panel to remove divider list section

**Files to modify:**
- `js/main.js` - Remove divider list rendering
- `js/shelf-generator.js` - Contextual UI panels
- `styles.css` - Floating panel styles

**Success criteria:**
- Clicking existing divider opens configuration popup
- Configuration changes update 3D model immediately
- Left panel is cleaner with just global settings
- No confusion about where to configure things

---

## Technical Considerations

### Performance
- Raycasting on every mouse move - need efficient intersection detection
- Ghost divider updates - minimize geometry creation/destruction
- Button positioning - cache calculations where possible

### Browser Compatibility  
- Three.js raycasting works on all modern browsers
- Touch events need special handling for mobile
- Consider fallback to left panel on very old browsers

### Edge Cases
- Very thin shelves (depth < 6 inches)
- Extreme camera angles (looking from below)
- Rapid mouse movements
- Multiple dividers in close proximity

### User Testing Points
- After Phase 2: Is ghost divider intuitive?
- After Phase 5: Can users successfully add/remove dividers?
- After Phase 7: Is the new workflow clearly better than the old one?

---

## Success Metrics

**Usability:**
- Can new users add their first divider without instructions?
- Time to create a 3-divider shelf configuration
- Error rate (accidentally adding/removing dividers)

**Technical:**
- Smooth 60fps interaction even with complex shelves
- Accurate positioning across all camera views
- No visual glitches or z-fighting

**Completeness:**
- All existing functionality preserved
- No regression in cut list generation
- Mobile users have equivalent workflow

---

## Rollback Plan
Each phase builds incrementally. If any phase proves too complex or problematic:
1. Keep working phases enabled
2. Disable problematic phase
3. Fall back to left panel for missing functionality
4. Document lessons learned for future attempt

The beauty of this approach is that even Phase 2 alone (ghost divider preview) would be a significant UX improvement over the current system.