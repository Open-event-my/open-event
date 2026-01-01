# Testing Checklist for Feature Implementation

Use this checklist when implementing new features or making changes to existing code.

## Pre-Implementation

- [ ] Reviewed existing test patterns in similar features
- [ ] Checked `vitest.config.ts` for test configuration
- [ ] Reviewed `src/test/setup.ts` for available mocks and setup
- [ ] Identified similar test files to use as examples

## Implementation

- [ ] Code follows existing patterns and conventions
- [ ] Code is testable (no tight coupling, uses dependency injection)
- [ ] Functions are pure where possible
- [ ] Components accept props for easy mocking

## Post-Implementation Testing

### Step 1: Verify Existing Tests Still Pass

- [ ] Ran `npm run test:run`
- [ ] All existing tests pass
- [ ] Fixed any broken tests (if applicable)

### Step 2: Write Tests for New Code

**For Components:**

- [ ] Created `ComponentName.test.tsx` in same directory
- [ ] Tested basic rendering
- [ ] Tested user interactions (clicks, form submissions, etc.)
- [ ] Tested edge cases (empty states, error states, loading states)
- [ ] Tested accessibility (using `getByRole`, `getByLabelText`)
- [ ] Mocked external dependencies (icons, APIs, etc.)

**For Utilities/Hooks:**

- [ ] Created `utilityName.test.ts` in same directory
- [ ] Tested all public functions/methods
- [ ] Tested edge cases (null, undefined, empty strings, boundary values)
- [ ] Tested error handling

**For Business Logic:**

- [ ] Tested all code paths
- [ ] Tested validation logic
- [ ] Tested error scenarios

### Step 3: Run All Tests

- [ ] Ran `npm run test:run`
- [ ] All new tests pass
- [ ] No regressions in existing tests
- [ ] Fixed any failing tests

### Step 4: Code Quality Checks

- [ ] Ran `npm run lint`
- [ ] Fixed all linting errors
- [ ] Ran `npm run build` (type check)
- [ ] Fixed all TypeScript errors

### Step 5: Coverage (Optional)

- [ ] Ran `npm run test:coverage`
- [ ] Reviewed coverage report
- [ ] Coverage >80% for new code (or justified lower coverage)
- [ ] Critical paths are covered

### Step 6: E2E Tests (For Critical Flows)

- [ ] Identified if E2E tests are needed
- [ ] Created E2E test file in `e2e/` directory
- [ ] Tested complete user journey
- [ ] Ran `npm run test:e2e`
- [ ] All E2E tests pass

## Test Quality Checklist

- [ ] Tests are readable and well-named
- [ ] Tests use descriptive `it()` descriptions
- [ ] Related tests are grouped with `describe()` blocks
- [ ] Tests use `beforeEach`/`afterEach` for setup/cleanup
- [ ] Tests are independent (can run in any order)
- [ ] Tests test behavior, not implementation details
- [ ] Tests use accessibility-first queries (`getByRole`, `getByLabelText`)
- [ ] External dependencies are properly mocked
- [ ] Test data is realistic and covers edge cases

## Final Verification

- [ ] All unit tests pass: `npm run test:run` ✅
- [ ] All E2E tests pass: `npm run test:e2e` ✅ (if applicable)
- [ ] Linter passes: `npm run lint` ✅
- [ ] Type check passes: `npm run build` ✅
- [ ] Code is ready for review/commit

## Quick Command Reference

```bash
# Run all unit tests
npm run test:run

# Run tests in watch mode
npm test

# Run with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run E2E with UI
npm run test:e2e:ui

# Lint code
npm run lint

# Type check
npm run build
```

## Notes

- Keep this checklist handy when implementing features
- Check off items as you complete them
- Don't skip steps - each one catches different types of issues
- When in doubt, refer to `docs/AGENT_TESTING_GUIDE.md` for detailed guidance
