# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

### Changed

### Fixed

### Documentation


## [2.2.0] - 2026-03-11

### Added
- Dashboard: Enhanced recent transactions and analytics widgets backed by the updated analytics service.
- Mobile app: QuickFill experience and improved receipts flow to speed up capturing expenses on the go.

### Changed
- Analytics: Refactored analytics service and controller to power dashboard, recent transactions, and partner insights more efficiently.
- Recurring Bills & Transactions: Updated backend services and frontend pages to keep recurring bills, expenses, and receipts in sync with improved UX and styling.
- Dashboard, Expenses, Loans, Receipts, and Recurring Bills pages: Refined layouts, empty states, and styling to better match the Paire design system.

### Fixed
- Transactions: Corrected handling of recurring bill instances and related analytics to ensure accurate summaries.
- Various UI fixes across loans and recurring bills pages for more consistent spacing and alignment.

### Documentation
- Bumped backend API and frontend app versions to 2.2.0 and updated public-facing docs accordingly.


## [2.1.1] - 2026-01-28
### Fixed
- **react-window**: Added `src/utils/reactWindow.js` shim so `FixedSizeList` works in both Vite dev (pre-bundle) and production build (UMD dist). Expenses and AllTransactions now import from the shim; namespace import handles named vs default export shape.
- **PackingPage**: Corrected `AddItemModal` closing from `})` to `}` so the build parses correctly.

### Changed
- Expenses and AllTransactions pages import `FixedSizeList` via `../utils/reactWindow` instead of directly from `react-window`.
- `optimizeDeps.include` in Vite config includes `react-window` for consistent pre-bundling.
- Backend API version aligned to 2.1.1 (YouAndMeExpensesAPI.csproj).

## [2.1.0] - 2025-12-30
### Added
- New Landing Page with modern glassmorphism design.
- Public Statistics API endpoint (`/api/public/stats`) for real-time platform stats.
- Integrated real-time stats (Active Users, Transactions, Money Saved) into the landing page.
- Comprehensive Greek translations for the Landing Page.

### Changed
- Updated root route (`/`) to show Landing Page for unauthenticated users, redirecting to Dashboard only when logged in.
- Updated footer copyright to dynamically display the current year.

### Removed
- Removed "Works offline" claim from landing page mobile features.

## [2.0.1] - 2025-12-25
### Changed
- Bumped version to 2.0.1
## [2.0.0] - 2025-12-26
### Added
- Initial versioning implementation.
- Automated version bumping script.
- Version display in backend and frontend.
