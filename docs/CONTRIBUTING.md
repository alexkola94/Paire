# Contributing Guide

Thank you for considering contributing to You & Me Expenses! This is a personal project, but contributions are welcome.

## 🎯 Ways to Contribute

- **Report bugs** - Found an issue? Let us know!
- **Suggest features** - Have an idea? Share it!
- **Improve documentation** - Help others understand the project
- **Submit code** - Fix bugs or add features

## 🐛 Reporting Bugs

When reporting a bug, please include:

1. **Description** - Clear description of the bug
2. **Steps to reproduce** - How to trigger the bug
3. **Expected behavior** - What should happen
4. **Actual behavior** - What actually happens
5. **Screenshots** - If applicable
6. **Environment**:
   - Browser and version
   - Operating system
   - Device (desktop/mobile)

## 💡 Suggesting Features

Feature requests are welcome! Please include:

1. **Use case** - Why is this feature needed?
2. **Description** - What should the feature do?
3. **Mockups** - Visual examples if applicable
4. **Priority** - How important is this?

## 🔧 Development Process

### 1. Fork & Clone

```bash
# Fork the repository on GitHub
# Then clone your fork
git clone https://github.com/YOUR_USERNAME/you-me-expenses.git
cd you-me-expenses
```

### 2. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/bug-description
```

### 3. Make Changes

- Follow existing code style
- Add comments for complex logic
- Keep mobile responsiveness in mind
- Test on multiple browsers
- Ensure smooth transitions/animations

### 4. Test Your Changes

```bash
# Frontend
cd frontend
npm run dev
# Test manually in browser
```

### 5. Commit

```bash
git add .
git commit -m "feat: add new feature"
# or
git commit -m "fix: resolve issue with..."
```

**Commit Message Format:**
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting)
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

### 6. Push & Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

## 📝 Code Style Guidelines

### React/JavaScript

```javascript
// Use functional components
function MyComponent() {
  // Use hooks
  const [state, setState] = useState(initial)
  
  // Add comments for complex logic
  // Handle edge cases
  
  return <div>...</div>
}

// Named exports for components
export default MyComponent
```

### CSS

```css
/* Use CSS variables from index.css */
.my-class {
  color: var(--primary);
  padding: var(--spacing-md);
  border-radius: var(--radius-md);
  transition: var(--transition);
}

/* Mobile-first responsive design */
.my-class {
  /* Mobile styles first */
}

@media (min-width: 768px) {
  /* Tablet styles */
}

@media (min-width: 1024px) {
  /* Desktop styles */
}
```

### C# (.NET)

```csharp
// Use XML comments for public APIs
/// <summary>
/// Description of the method
/// </summary>
/// <param name="param">Parameter description</param>
/// <returns>Return value description</returns>
public async Task<Result> MethodName(string param)
{
    // Implementation
}
```

## ✅ Checklist Before Submitting

- [ ] Code follows existing style
- [ ] Comments added for complex logic
- [ ] Tested on desktop and mobile
- [ ] Tested on Chrome, Firefox, Safari
- [ ] No console errors
- [ ] Responsive design maintained
- [ ] Smooth transitions work
- [ ] Theme colors used consistently
- [ ] Translation keys added (if needed)
- [ ] Documentation updated (if needed)

## 🎨 Design Guidelines

### Colors

Use existing color variables from `frontend/src/styles/index.css`:
- Primary: `var(--primary)` - Main brand color
- Success: `var(--success-dark)` - Positive actions
- Error: `var(--error-dark)` - Destructive actions
- Text: `var(--text-primary)`, `var(--text-secondary)`

### Spacing

Use spacing variables:
- `var(--spacing-xs)` - 4px
- `var(--spacing-sm)` - 8px
- `var(--spacing-md)` - 16px
- `var(--spacing-lg)` - 24px
- `var(--spacing-xl)` - 32px

### Typography

Use semantic HTML and existing font sizes:
- Headings: `<h1>` through `<h6>`
- Body: `<p>` tags
- Labels: `<label>` tags

### Accessibility

- Use semantic HTML
- Add `aria-label` for icon buttons
- Ensure keyboard navigation works
- Maintain good color contrast
- Test with screen readers if possible

## 🌍 Adding Translations

To add a new language:

1. Create `frontend/src/i18n/locales/[lang].json`
2. Copy structure from `en.json`
3. Translate all strings
4. Import in `frontend/src/i18n/config.js`
5. Add language button in `Profile.jsx`

## 🧪 Testing

Currently, the project uses manual testing. Please test:

- All CRUD operations (Create, Read, Update, Delete)
- File uploads
- Authentication flow
- Language switching
- Responsive design
- Cross-browser compatibility

## 📚 Resources

- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [Supabase Documentation](https://supabase.com/docs)
- [MDN Web Docs](https://developer.mozilla.org)

## 🤝 Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Accept constructive criticism
- Focus on what's best for the project

## 📧 Questions?

If you have questions:
- Open an issue for discussion
- Check existing issues and PRs
- Review the documentation

## 🎉 Thank You!

Every contribution, no matter how small, is appreciated! Whether it's fixing a typo, improving documentation, or adding a feature - thank you for making this project better!

---

**Happy Contributing! 🚀**

