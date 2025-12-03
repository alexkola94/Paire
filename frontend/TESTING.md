# Testing Guide

Comprehensive testing guide for You & Me Expenses application.

## 🧪 Testing Stack

- **Vitest** - Fast, Vite-native test runner
- **React Testing Library** - Testing React components
- **Jest DOM** - Custom matchers for DOM assertions
- **User Event** - Simulating user interactions

## 🚀 Running Tests

### Run All Tests
```bash
npm test
```

### Watch Mode (recommended for development)
```bash
npm test -- --watch
```

### Run Tests with UI
```bash
npm run test:ui
```

### Generate Coverage Report
```bash
npm run test:coverage
```

### Run Specific Test File
```bash
npm test -- ErrorBoundary.test
```

### Run Tests Matching Pattern
```bash
npm test -- --grep="should render"
```

## 📁 Test Structure

```
frontend/src/tests/
├── setup.js                  # Test configuration
├── components/               # Component tests
│   ├── ErrorBoundary.test.jsx
│   ├── Toast.test.jsx
│   └── Layout.test.jsx
├── pages/                    # Page tests
│   ├── Dashboard.test.jsx
│   ├── Login.test.jsx
│   └── Expenses.test.jsx
├── services/                 # Service tests
│   ├── api.test.js
│   └── supabase.test.js
└── utils/                    # Utility tests
    └── formatCurrency.test.js
```

## ✍️ Writing Tests

### Component Test Example

```javascript
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MyComponent from './MyComponent'

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('should handle user interaction', async () => {
    const user = userEvent.setup()
    render(<MyComponent />)
    
    const button = screen.getByRole('button')
    await user.click(button)
    
    expect(screen.getByText('Clicked!')).toBeInTheDocument()
  })
})
```

### Service Test Example

```javascript
import { describe, it, expect, vi } from 'vitest'
import { myService } from './myService'

describe('myService', () => {
  it('should fetch data correctly', async () => {
    const mockData = { id: 1, name: 'Test' }
    
    // Mock the API call
    vi.spyOn(myService, 'getData').mockResolvedValue(mockData)
    
    const result = await myService.getData()
    
    expect(result).toEqual(mockData)
  })
})
```

## 🎯 Testing Best Practices

### 1. Test User Behavior, Not Implementation

```javascript
// ❌ Bad - testing implementation
expect(component.state.count).toBe(1)

// ✅ Good - testing behavior
expect(screen.getByText('Count: 1')).toBeInTheDocument()
```

### 2. Use Semantic Queries

```javascript
// ❌ Bad
screen.getByTestId('submit-button')

// ✅ Good
screen.getByRole('button', { name: /submit/i })
```

### 3. Test Accessibility

```javascript
it('should be accessible', () => {
  render(<MyForm />)
  
  expect(screen.getByLabelText('Email')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument()
})
```

### 4. Clean Up After Tests

```javascript
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
```

### 5. Mock External Dependencies

```javascript
// Mock Supabase
vi.mock('../services/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: { signIn: vi.fn() }
  }
}))
```

## 📊 Code Coverage

### View Coverage Report
```bash
npm run test:coverage
```

Coverage reports are generated in `coverage/` directory.

### Coverage Goals
- **Statements**: 80%+
- **Branches**: 75%+
- **Functions**: 80%+
- **Lines**: 80%+

### What to Test

✅ **Do Test:**
- Component rendering
- User interactions
- Form submissions
- Data fetching
- Error handling
- Edge cases
- Utility functions

❌ **Don't Test:**
- Third-party libraries
- Implementation details
- Styling (unless critical)
- Supabase internals

## 🧩 Common Testing Patterns

### Testing Async Operations

```javascript
it('should load data', async () => {
  render(<MyComponent />)
  
  // Wait for data to load
  await waitFor(() => {
    expect(screen.getByText('Loaded!')).toBeInTheDocument()
  })
})
```

### Testing Forms

```javascript
it('should submit form', async () => {
  const user = userEvent.setup()
  const onSubmit = vi.fn()
  
  render(<MyForm onSubmit={onSubmit} />)
  
  await user.type(screen.getByLabelText('Email'), 'test@example.com')
  await user.type(screen.getByLabelText('Password'), 'password123')
  await user.click(screen.getByRole('button', { name: /submit/i }))
  
  expect(onSubmit).toHaveBeenCalledWith({
    email: 'test@example.com',
    password: 'password123'
  })
})
```

### Testing Error States

```javascript
it('should show error message', async () => {
  // Mock API to throw error
  vi.spyOn(api, 'getData').mockRejectedValue(new Error('Failed'))
  
  render(<MyComponent />)
  
  await waitFor(() => {
    expect(screen.getByText(/error/i)).toBeInTheDocument()
  })
})
```

### Testing Loading States

```javascript
it('should show loading spinner', () => {
  render(<MyComponent loading={true} />)
  expect(screen.getByRole('status')).toBeInTheDocument()
})
```

## 🐛 Debugging Tests

### Run in Debug Mode
```bash
npm test -- --inspect-brk
```

### Use screen.debug()
```javascript
import { screen } from '@testing-library/react'

it('should render', () => {
  render(<MyComponent />)
  screen.debug() // Prints the DOM
})
```

### Log Queries
```javascript
import { logRoles } from '@testing-library/react'

it('should render', () => {
  const { container } = render(<MyComponent />)
  logRoles(container) // Shows all available roles
})
```

## 📝 Test Checklist

Before pushing code, ensure:

- [ ] All tests pass
- [ ] New features have tests
- [ ] Bug fixes have regression tests
- [ ] Coverage is maintained/improved
- [ ] No skipped tests (.skip)
- [ ] No focused tests (.only)
- [ ] Tests are readable and clear
- [ ] Mocks are cleaned up

## 🎓 Learning Resources

- [Vitest Docs](https://vitest.dev)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

## 🆘 Troubleshooting

### Tests are slow
- Use `vi.mock()` for heavy imports
- Mock Supabase calls
- Use fake timers for delays

### Tests fail randomly
- Check for async race conditions
- Use `waitFor()` for async operations
- Clean up side effects in `afterEach()`

### Can't find element
- Use `screen.debug()` to see DOM
- Check if element renders asynchronously
- Verify query is correct (role, label, text)

---

**Happy Testing! 🎉**

Remember: Good tests give you confidence to refactor and add features!

