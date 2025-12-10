# CI/CD Workflows Documentation

This document describes the GitHub Actions workflows configured for the You-me-Expenses project.

## 📋 Overview

The project uses multiple GitHub Actions workflows to ensure code quality, security, and automated deployment:

- **Frontend CI** - Linting, testing, and building the React frontend
- **Backend CI** - Building and testing the .NET backend
- **Full Test Suite** - Comprehensive testing across both frontend and backend
- **Security Scanning** - Vulnerability scanning for dependencies and code
- **Docker Build** - Building and testing Docker images
- **Deploy Frontend** - Automated deployment to GitHub Pages

## 🔄 Workflow Details

### 1. Frontend CI (`frontend-ci.yml`)

**Triggers:**
- Push to `main` or `develop` branches (frontend changes only)
- Pull requests to `main` or `develop` (frontend changes only)

**Jobs:**
- **Lint & Format Check**: Runs ESLint and Prettier format checks
- **Test**: Runs frontend tests with coverage reporting
- **Build**: Builds the frontend application and uploads artifacts

**Features:**
- Node.js 18 with npm caching
- Code coverage upload to Codecov
- Build artifacts retention (7 days)
- Automatic cancellation of duplicate runs

### 2. Backend CI (`backend-ci.yml`)

**Triggers:**
- Push to `main` or `develop` branches (backend changes only)
- Pull requests to `main` or `develop` (backend changes only)

**Jobs:**
- **Build**: Builds the .NET solution with NuGet package caching
- **Test**: Runs backend tests with coverage and test result reporting
- **Security Scan**: Checks for vulnerable NuGet packages

**Features:**
- .NET 8.0 SDK
- NuGet package caching for faster builds
- Test result publishing with annotations
- Code coverage upload to Codecov
- Build artifacts retention (7 days)

### 3. Full Test Suite (`full-test-suite.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Manual workflow dispatch

**Jobs:**
- **Frontend Tests**: Runs frontend test suite with coverage
- **Backend Tests**: Runs backend test suite with coverage
- **Test Summary**: Aggregates and reports test results

**Features:**
- Parallel execution of frontend and backend tests
- Comprehensive test result summary
- Coverage reporting for both components
- Always runs to completion (even if tests fail)

### 4. Security Scanning (`security-scan.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Weekly schedule (Mondays at 00:00 UTC)
- Manual workflow dispatch

**Jobs:**
- **Frontend Security Scan**: Runs `npm audit` for vulnerability detection
- **Backend Security Scan**: Checks for vulnerable NuGet packages
- **CodeQL Analysis**: Static code analysis for security issues

**Features:**
- Automated vulnerability scanning
- Weekly scheduled scans
- CodeQL analysis for JavaScript and C#
- Security scan results artifact retention (30 days)

### 5. Docker Build (`docker-build.yml`)

**Triggers:**
- Push to `main` or `develop` branches (Dockerfile or .csproj changes)
- Pull requests to `main` or `develop` (Dockerfile or .csproj changes)
- Manual workflow dispatch

**Jobs:**
- **Build Docker Image**: Builds the backend Docker image with caching
- **Test Docker Image**: Verifies the Docker image runs correctly

**Features:**
- Docker Buildx for advanced build features
- GitHub Actions cache for Docker layers
- Container runtime testing
- Loads image for testing without pushing

### 6. Deploy Frontend (`deploy-frontend.yml`)

**Triggers:**
- Push to `main` branch (frontend changes only)
- Manual workflow dispatch

**Jobs:**
- **CI Checks**: Runs linting and tests before deployment
- **Build**: Builds the frontend with production environment variables
- **Deploy**: Deploys to GitHub Pages

**Features:**
- Deployment gates (tests must pass)
- Production environment variable configuration
- GitHub Pages deployment
- Only runs on `main` branch

## 🔐 Required Secrets

The following GitHub Secrets must be configured in your repository:

### Frontend Secrets
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key
- `VITE_BACKEND_API_URL` - Backend API URL

### Optional Secrets
- Codecov token (for detailed coverage reports)
- Docker Hub credentials (if pushing images)

## 📊 Coverage Reporting

Code coverage is automatically uploaded to Codecov for both frontend and backend:
- Frontend coverage: JavaScript/TypeScript files
- Backend coverage: C# files
- Coverage flags: `frontend` and `backend`

## 🚀 Best Practices

1. **Path-based Triggers**: Workflows only run when relevant files change, saving CI minutes
2. **Concurrency Control**: Duplicate runs are automatically cancelled
3. **Caching**: NuGet packages and npm dependencies are cached for faster builds
4. **Artifact Retention**: Build artifacts are retained for 7 days, security scans for 30 days
5. **Timeout Protection**: All jobs have timeout limits to prevent hanging workflows
6. **Deployment Gates**: Deployments only proceed after tests pass

## 🔧 Maintenance

### Updating Workflows
- Workflows use pinned action versions for stability
- Update actions periodically using Dependabot
- Test workflow changes in feature branches first

### Monitoring
- Check workflow runs in the GitHub Actions tab
- Review failed workflows and fix issues promptly
- Monitor security scan results weekly

### Dependabot
- Automated dependency updates are configured via `.github/dependabot.yml`
- Updates run weekly on Mondays
- Pull requests are automatically created for dependency updates

## 📝 Workflow Status Badges

You can add status badges to your README:

```markdown
![Frontend CI](https://github.com/username/repo/workflows/Frontend%20CI/badge.svg)
![Backend CI](https://github.com/username/repo/workflows/Backend%20CI/badge.svg)
![Full Test Suite](https://github.com/username/repo/workflows/Full%20Test%20Suite/badge.svg)
```

## 🐛 Troubleshooting

### Workflow Not Running
- Check if file paths match the `paths` filter
- Verify branch names match (`main` or `develop`)
- Check workflow file syntax in the Actions tab

### Tests Failing
- Review test output in the workflow logs
- Check for environment-specific issues
- Verify all dependencies are properly installed

### Deployment Issues
- Ensure all required secrets are configured
- Check GitHub Pages settings in repository settings
- Verify build artifacts are being created

### Security Scan Failures
- Review vulnerability reports in workflow artifacts
- Update vulnerable packages
- Consider using `continue-on-error: true` for non-critical scans

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Codecov Documentation](https://docs.codecov.com/)
- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)

