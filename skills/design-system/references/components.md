# Component Architecture

Atomic Design taxonomy, component API design principles, and an inventory of what belongs at each level. For complete TypeScript implementations, see `component-examples.md`.

---

## Atomic Design Methodology

**Atoms → Molecules → Organisms → Templates → Pages**

### Atoms (Primitive Components)

Basic building blocks that can't be broken down further.

**Examples:** Button, Input, Label, Icon, Badge, Avatar, Checkbox, Radio, Select, Divider, Spinner.

**Button Props Contract:**
```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}
```

See `component-examples.md` for the complete Button implementation with variants, sizes, loading state, and Tailwind styling.

### Molecules (Simple Compositions)

Groups of atoms that function together.

**Examples:** SearchBar (Input + Button), FormField (Label + Input + ErrorMessage), Card (Container + Title + Content + Actions), Alert (Icon + Message + CloseButton), Toast, Breadcrumb.

**FormField Props Contract:**
```typescript
interface FormFieldProps {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}
```

See `component-examples.md` for FormField, Card (compound component pattern), Input with validation states, and more.

### Organisms (Complex Compositions)

Complex UI components made of molecules and atoms.

**Examples:** Navigation Bar, Product Card Grid, User Profile Section, Modal Dialog, Table with sort/select/paginate, Sidebar.

### Templates (Page Layouts)

Page-level structures that define content placement — not content itself.

**Examples:**
- Dashboard Layout (Sidebar + Header + Main Content)
- Marketing Page Layout (Hero + Features + Footer)
- Settings Page Layout (Tabs + Content Panels)
- Auth Layout (Centered card + branding panel)

### Pages (Specific Instances)

Actual pages with real content — where templates get hydrated with data.

---

## Component API Design

### 1. Predictable Prop Names

```typescript
// Good: consistent naming across components
<Button variant="primary" size="md" />
<Input variant="outlined" size="md" />

// Bad: inconsistent
<Button type="primary" sizeMode="md" />
<Input style="outlined" inputSize="md" />
```

### 2. Sensible Defaults

```typescript
// Good: provides defaults
interface ButtonProps {
  variant?: 'primary' | 'secondary';  // default: primary
  size?: 'sm' | 'md' | 'lg';          // default: md
}

// Bad: everything required, nothing optional
interface ButtonProps {
  variant: 'primary' | 'secondary';
  size: 'sm' | 'md' | 'lg';
  color: string;
  padding: string;
}
```

### 3. Composition Over Configuration

```typescript
// Good: composable via subcomponents
<Card>
  <Card.Header>
    <Card.Title>Title</Card.Title>
  </Card.Header>
  <Card.Body>Content</Card.Body>
  <Card.Footer>Actions</Card.Footer>
</Card>

// Bad: too many boolean/content props
<Card
  title="Title"
  content="Content"
  footerContent="Actions"
  hasHeader={true}
  hasFooter={true}
/>
```

### 4. Polymorphic Components

Allow components to render as different HTML elements:

```typescript
<Button as="a" href="/login">Login</Button>
<Button as="button" onClick={handleClick}>Click Me</Button>
```

See `component-examples.md` for the complete polymorphic component TypeScript pattern (generics, `AsProp`, `PolymorphicRef`).

### 5. Forward Refs

Always forward refs for atoms so consumers can integrate with focus management, form libraries, tooltips, and measurement hooks.

### 6. Controlled vs Uncontrolled

Atoms that hold state (Input, Select, Checkbox) should support both:

```typescript
<Input defaultValue="hello" />           // uncontrolled
<Input value={v} onChange={setV} />      // controlled
```
