# QA Test Planner — Canonical Examples

Full worked examples of test cases across common scenarios.

---

## Example: Login Flow Test Case

```markdown
## TC-LOGIN-001: Valid User Login

**Priority:** P0 (Critical)
**Type:** Functional
**Estimated Time:** 2 minutes

### Objective
Verify users can successfully login with valid credentials

### Preconditions
- User account exists (test@example.com / Test123!)
- User is not already logged in
- Browser cookies cleared

### Test Steps
1. Navigate to https://app.example.com/login
   **Expected:** Login page displays with email and password fields

2. Enter email: test@example.com
   **Expected:** Email field accepts input

3. Enter password: Test123!
   **Expected:** Password field shows masked characters

4. Click "Login" button
   **Expected:**
   - Loading indicator appears
   - User redirected to /dashboard
   - Welcome message shown: "Welcome back, Test User"
   - Avatar/profile image displayed in header

### Post-conditions
- User session created
- Auth token stored
- Analytics event logged

### Edge Cases to Consider
- TC-LOGIN-002: Invalid password
- TC-LOGIN-003: Non-existent email
- TC-LOGIN-004: SQL injection attempt
- TC-LOGIN-005: Very long password
```

---

## Example: Responsive Design Test Case

```markdown
## TC-UI-045: Mobile Navigation Menu

**Priority:** P1 (High)
**Type:** UI/Responsive
**Devices:** Mobile (iPhone, Android)

### Objective
Verify navigation menu works correctly on mobile devices

### Preconditions
- Access from mobile device or responsive mode
- Viewport width: 375px (iPhone SE) to 428px (iPhone Pro Max)

### Test Steps
1. Open homepage on mobile device
   **Expected:** Hamburger menu icon visible (top-right)

2. Tap hamburger icon
   **Expected:**
   - Menu slides in from right
   - Overlay appears over content
   - Close (X) button visible

3. Tap menu item
   **Expected:** Navigate to section, menu closes

4. Compare against Figma mobile design [link]
   **Expected:**
   - Menu width: 280px
   - Slide animation: 300ms ease-out
   - Overlay opacity: 0.5, color #000000
   - Font size: 16px, line-height 24px

### Breakpoints to Test
- 375px (iPhone SE)
- 390px (iPhone 14)
- 428px (iPhone 14 Pro Max)
- 360px (Galaxy S21)
```
