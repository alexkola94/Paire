# Form Layout Improvements Plan

## Problem Statement
On desktop view, form items are "mushed up" - too close together with insufficient spacing and poor visual hierarchy.

## Goals
1. Improve spacing between form fields on desktop
2. Use grid layouts for related fields
3. Better visual hierarchy and grouping
4. Maintain mobile/tablet responsiveness
5. Improve readability and user experience

## Implementation Plan

### Phase 1: Core Layout Components ✅
- [x] Create FormLayout component for responsive grids
- [x] Update FormSection with better desktop spacing
- [x] Add desktop-specific spacing rules

### Phase 2: Form Field Spacing
- [ ] Increase spacing between form groups on desktop (24px → 32px)
- [ ] Add consistent padding to form sections (32px on desktop)
- [ ] Improve spacing in form rows (two-column layouts)

### Phase 3: Visual Hierarchy
- [ ] Add visual separators between major sections
- [ ] Improve label sizing and spacing
- [ ] Better grouping of related fields

### Phase 4: Grid Layouts
- [ ] Two-column layout for Amount + Category on desktop
- [ ] Two-column layout for related fields (e.g., split transaction fields)
- [ ] Full-width for important fields (description, tags)

### Phase 5: Component-Specific Improvements
- [ ] Update CurrencyInput spacing
- [ ] Update CategorySelector spacing
- [ ] Update DateInput spacing
- [ ] Update all form components with consistent spacing

## Desktop Layout Specifications

### Spacing Scale (Desktop)
- Form section padding: 32px (xl)
- Form section margin-bottom: 48px (xl * 1.5)
- Form group margin-bottom: 32px (xl)
- Form row gap: 24px (lg)
- Form content gap: 32px (xl)

### Grid Layouts
- **Basic Info Section**: 2 columns (Amount + Category), Date full-width
- **Additional Details**: Single column (Description, Tags, File Upload)
- **Advanced Features**: Single column (Recurring, Split)

### Responsive Breakpoints
- Mobile: < 768px - Single column, compact spacing
- Tablet: 768px - 1023px - Two columns where appropriate
- Desktop: ≥ 1024px - Optimized layouts with increased spacing

## Status
✅ Phase 1: Core Layout Components - Completed
🔄 Phase 2: Form Field Spacing - In Progress

