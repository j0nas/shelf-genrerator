import { createDividerService } from './divider-state-machine.js';

// Note: Visual debugger temporarily disabled to fix import issues
// We'll re-enable it once basic XState is working

// Test the state machine
export function testStateMachine(): any {
  console.log('🎯 Testing XState Divider State Machine');
  
  const service = createDividerService();
  
  // Log all state transitions
  service.onTransition((state, event) => {
    console.log(`State: ${state.value} | Event: ${event.type}`);
    console.log('Context:', state.context);
  });
  
  // Start the service
  service.start();
  
  // Test some transitions
  console.log('\n--- Testing State Transitions ---');
  
  console.log('1. Hover divider');
  service.send({ type: 'HOVER_DIVIDER', divider: { id: 'test-1' } });
  
  console.log('2. Click divider (select)');
  service.send({ type: 'CLICK_DIVIDER', divider: { id: 'test-1' } });
  
  console.log('3. Mouse down (prepare drag)');
  service.send({ type: 'MOUSE_DOWN', position: { x: 100, y: 100 } });
  
  console.log('4. Mouse up (cancel drag, back to selected)');
  service.send({ type: 'MOUSE_UP' });
  
  console.log('5. Click elsewhere (deselect)');
  service.send({ type: 'CLICK_ELSEWHERE' });
  
  console.log('\n--- Test Complete ---\n');
  
  return service;
}