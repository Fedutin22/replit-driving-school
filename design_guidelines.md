# Driving School Web Application - Design Guidelines

## Design Approach

**Selected Framework**: Modern SaaS Application Design
- Inspired by Linear's clean typography and Notion's organized layouts
- Material Design principles for data-heavy components
- Professional, trustworthy aesthetic suitable for educational institutions

## Typography System

### Font Families
- **Primary**: Inter or similar geometric sans-serif for interface text
- **Headings**: Same as primary for consistency, varied by weight
- **Monospace**: JetBrains Mono for certificate IDs, codes

### Type Scale
- **Display (H1)**: text-4xl font-bold (course titles, page headers)
- **Heading (H2)**: text-2xl font-semibold (section headers, card titles)
- **Heading (H3)**: text-xl font-semibold (subsections, table headers)
- **Body Large**: text-base font-medium (primary actions, emphasis)
- **Body**: text-sm (standard interface text, forms, tables)
- **Caption**: text-xs (helper text, metadata, timestamps)

## Layout System

### Spacing Primitives
Use Tailwind units: **2, 3, 4, 6, 8, 12, 16** for consistent rhythm
- Micro spacing (component internals): p-2, gap-3
- Standard spacing (between elements): p-4, gap-4, mb-6
- Section spacing: p-8, py-12, gap-8
- Page margins: p-6 (mobile), p-8 (desktop)

### Grid Structure
- **Dashboard layouts**: 12-column responsive grid
- **Sidebar navigation**: Fixed 256px width (w-64) on desktop, collapsible on mobile
- **Main content**: max-w-7xl mx-auto for optimal reading/scanning
- **Cards/Tables**: Full width within content area with proper spacing

### Application Shell
```
┌─────────────────────────────────────┐
│ Top Navigation Bar (h-16)          │
├────────┬────────────────────────────┤
│ Side   │ Main Content Area          │
│ Nav    │ (max-w-7xl, centered)      │
│ (w-64) │                            │
│        │                            │
└────────┴────────────────────────────┘
```

## Component Library

### Navigation
- **Top Bar**: Full-width header with logo, user menu, notifications icon
- **Sidebar**: Vertical nav with icon+label, collapsible groups, active state indication
- **Breadcrumbs**: Show hierarchy (Course > Topic > Test) with text-sm
- **Role indicator**: Subtle badge showing current role in top bar

### Data Display
- **Tables**: Striped rows for readability, sticky headers, sortable columns
  - Cell padding: px-4 py-3
  - Header: font-semibold with subtle bottom border
  - Action columns: Right-aligned with icon buttons
- **Cards**: Rounded corners (rounded-lg), shadow-sm, p-6
  - Grid layouts: grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6
- **Stats/KPIs**: Large numbers with labels, 3-4 column grid on dashboard
- **Progress indicators**: Linear progress bars showing course/test completion

### Forms
- **Input Fields**: Consistent height (h-10), rounded-md, with labels above
  - Labels: text-sm font-medium mb-2
  - Inputs: px-3 py-2 border focus:ring-2
- **Buttons**: 
  - Primary: px-4 py-2 rounded-md font-medium
  - Secondary: Similar with outline style
  - Icon buttons: Square (w-10 h-10) for tables/toolbars
- **Form Groups**: Space between fields with mb-6
- **Multi-step forms**: Progress stepper at top, consistent forward/back navigation

### Interactive Elements
- **Question Bank Editor**: Two-column layout - question list (left) + details panel (right)
- **Test Taking UI**: Clean, distraction-free with question numbers sidebar
- **Dropdown menus**: Slide-down animation, shadow-lg, max height with scroll
- **Modals**: Centered overlay with backdrop, max-w-2xl, p-6
- **Toasts**: Fixed position top-right for notifications

### Scheduling Components
- **Calendar view**: Week/day grid with time slots
- **Session cards**: Compact display with course, instructor, time, capacity
- **Registration buttons**: Show capacity status (seats available/full)

### Certificates
- **Preview**: A4-proportioned container with formal layout
- **Download button**: Prominent with PDF icon
- **Verification ID**: Monospace font, copyable text

## Responsive Behavior

### Breakpoints
- Mobile: Base styles (stack vertically)
- Tablet (md:768px): 2-column grids, visible sidebar toggle
- Desktop (lg:1024px): Full layouts, persistent sidebar, 3+ column grids

### Mobile Adaptations
- Sidebar becomes slide-out drawer
- Tables scroll horizontally or card-based on small screens
- Form elements full-width on mobile
- Touch-friendly hit areas (min h-12 for buttons)

## Special Considerations

### Role-Based UI
- Same components, conditional rendering of action buttons
- Admin: Full CRUD controls visible
- Instructor: Edit own courses/sessions, view assigned students
- Student: Read-only with registration/test-taking actions
- Use subtle role badges/indicators in header

### Accessibility
- Semantic HTML throughout (nav, main, section, article)
- ARIA labels for icon-only buttons
- Form labels properly associated with inputs
- Keyboard navigation support for all interactive elements
- Focus states clearly visible (ring-2 with appropriate offset)

### Performance Patterns
- Lazy load tables with pagination (20-50 rows per page)
- Virtual scrolling for large question banks
- Optimistic UI updates for common actions
- Loading skeletons for data-heavy views

## Animation Guidelines

**Minimal and purposeful only:**
- Page transitions: Simple fade (150ms)
- Dropdowns/modals: Slide/fade (200ms ease-out)
- Success states: Subtle scale pulse on completion
- NO decorative animations, NO scroll-triggered effects

## Images

**Use sparingly in application UI:**
- **User avatars**: Circular, 32px (lists) to 64px (profiles)
- **Course thumbnails**: 16:9 aspect ratio in course cards
- **Certificate header**: School logo placement (max-h-16)
- **Empty states**: Simple illustrations for "no data" states

**NO hero images** - this is an application, not a marketing site.