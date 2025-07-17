# Claude Development Notes

## Important Guidelines

- **Always wait for user verification before committing changes** - previous instances showed that fixes weren't always complete on first attempt, so user testing is essential before finalizing commits.

## Testing Strategy

- **Focus tests on core business logic** - distance calculations, positioning algorithms, state machine logic
- **Avoid DOM-dependent tests** - DOM manipulation and visual rendering are better tested manually
- **Use unit tests for mathematical correctness** - verify distance calculations, collision detection, coordinate transformations