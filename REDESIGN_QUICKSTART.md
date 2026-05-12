# SMEwise Redesign - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### 1. Install Dependencies

The redesign uses `lucide-react` for icons (already installed):

```bash
npm install
```

### 2. Switch to Redesigned App

Update `client/src/main.tsx`:

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.redesigned'  // ← Change this line
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

### 3. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` to see the redesigned app!

---

## 📁 What's New

### New Files Created

```
client/src/
├── styles/
│   └── design-system.css              # Design tokens
├── components/
│   ├── shared/                        # Reusable components
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── EmptyState.tsx
│   │   ├── LoadingState.tsx
│   │   └── ErrorState.tsx
│   ├── hero/
│   │   └── HeroSection.tsx            # Landing hero
│   ├── profile/
│   │   └── ProfileWizard.tsx          # Multi-step form
│   ├── dashboard/
│   │   └── InsightsDashboard.tsx      # Bento grid
│   └── assistant/
│       └── AIAssistantPanel.tsx       # Always-visible chat
└── App.redesigned.tsx                 # New main app
```

### Modified Files

- `client/src/index.css` - Imports design system
- `client/tailwind.config.js` - New color palette
- `client/package.json` - Added lucide-react

### Preserved Files

- `client/src/App.tsx` - Original app (unchanged)
- All existing components - Still work with new design system

---

## 🎨 Design System Quick Reference

### Colors

```tsx
// Primary (Blue) - Main actions
className="bg-primary-600 text-white"
className="text-primary-600"

// Accent (Teal) - Secondary actions
className="bg-accent-600 text-white"

// Neutral (Gray) - Text and backgrounds
className="bg-neutral-50"      // Light background
className="text-neutral-900"   // Dark text
className="text-neutral-600"   // Secondary text

// Semantic
className="text-success-600"   // Green
className="text-warning-600"   // Orange/Yellow
className="text-error-600"     // Red
```

### Typography

```tsx
className="text-4xl font-bold"     // Hero heading
className="text-2xl font-semibold" // Section heading
className="text-lg font-semibold"  // Card title
className="text-base"              // Body text
className="text-sm text-neutral-600" // Secondary text
```

### Spacing

```tsx
className="p-6"      // Card padding
className="gap-6"    // Grid gap
className="mb-8"     // Section margin
className="space-y-4" // Vertical spacing
```

### Shadows & Borders

```tsx
className="shadow-lg"           // Elevated card
className="rounded-2xl"         // Large radius
className="border border-neutral-200" // Subtle border
```

---

## 🧩 Component Usage

### Button

```tsx
import Button from './components/shared/Button';

// Primary action
<Button variant="primary" size="lg">
  Get Started
</Button>

// With icon
<Button 
  variant="secondary"
  leftIcon={<Icon />}
  onClick={handleClick}
>
  Continue
</Button>

// Loading state
<Button isLoading>Generating...</Button>
```

### Card

```tsx
import Card, { CardHeader, CardBody, CardFooter } from './components/shared/Card';

<Card variant="elevated" padding="lg" hover>
  <CardHeader 
    title="Card Title"
    subtitle="Description"
    action={<Button size="sm">Action</Button>}
  />
  <CardBody>
    <p>Content here</p>
  </CardBody>
  <CardFooter>
    <Button variant="outline">Learn More</Button>
  </CardFooter>
</Card>
```

### Badge

```tsx
import Badge from './components/shared/Badge';

<Badge variant="success" dot>Active</Badge>
<Badge variant="warning">Attention</Badge>
```

### Empty State

```tsx
import EmptyState from './components/shared/EmptyState';

<EmptyState
  icon={<Icon size={48} />}
  title="No data yet"
  description="Complete your profile to see insights"
  action={{
    label: "Get Started",
    onClick: handleAction
  }}
/>
```

---

## 📱 Responsive Design

### Breakpoints

```tsx
// Mobile first approach
<div className="
  grid 
  grid-cols-1          // Mobile: 1 column
  md:grid-cols-2       // Tablet: 2 columns
  lg:grid-cols-3       // Desktop: 3 columns
  gap-6
">
```

### Show/Hide by Screen Size

```tsx
// Hide on mobile, show on desktop
<div className="hidden lg:block">
  Desktop only
</div>

// Show on mobile, hide on desktop
<div className="lg:hidden">
  Mobile only
</div>
```

---

## 🔍 Testing Checklist

### Visual Testing
- [ ] Check mobile (375px)
- [ ] Check tablet (768px)
- [ ] Check desktop (1440px)
- [ ] Test in Chrome
- [ ] Test in Firefox
- [ ] Test in Safari

### Functional Testing
- [ ] Complete profile wizard
- [ ] Generate insights
- [ ] Chat with AI assistant
- [ ] Navigate between sections
- [ ] Test error states

### Accessibility
- [ ] Tab through all interactive elements
- [ ] Check focus indicators
- [ ] Test with screen reader
- [ ] Verify color contrast

---

## 🐛 Common Issues & Solutions

### Issue: Icons not showing
**Solution:** Make sure lucide-react is installed:
```bash
npm install lucide-react --workspace=client
```

### Issue: Styles not applying
**Solution:** Restart dev server after Tailwind config changes:
```bash
# Stop server (Ctrl+C)
npm run dev
```

### Issue: Design system CSS not loading
**Solution:** Check that `index.css` imports it:
```css
@import './styles/design-system.css';
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Issue: Components not found
**Solution:** Check import paths are correct:
```tsx
import Button from './components/shared/Button';
// Not: import Button from 'components/shared/Button';
```

---

## 📚 Documentation

- **Full Design Plan:** `REDESIGN_PLAN.md`
- **Implementation Guide:** `REDESIGN_IMPLEMENTATION.md`
- **UX Improvements:** `UX_IMPROVEMENTS_SUMMARY.md`
- **This Guide:** `REDESIGN_QUICKSTART.md`

---

## 🎯 Key Features to Try

1. **Hero Section**
   - Clear value proposition
   - Three benefit cards
   - Trust indicators

2. **Profile Wizard**
   - Multi-step form
   - Progress indicator
   - Visual fund slider
   - Review before submit

3. **Insights Dashboard**
   - Bento grid layout
   - Priority-based sizing
   - Quick actions
   - Generate all button

4. **AI Assistant**
   - Fixed right panel (desktop)
   - Bottom drawer (mobile)
   - Suggested prompts
   - Context awareness

---

## 🚢 Deployment

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

### Environment Variables

Make sure these are set:
```env
ANTHROPIC_API_KEY=sk-ant-...
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
```

---

## 🤝 Contributing

### Adding a New Component

1. Create in `client/src/components/shared/`
2. Use TypeScript
3. Follow existing patterns
4. Export as default
5. Add to this guide

### Modifying Design System

1. Update `client/src/styles/design-system.css`
2. Update `client/tailwind.config.js` if needed
3. Document changes
4. Test across all components

---

## 💡 Tips

### Use the Design System
- Don't create custom colors - use the palette
- Don't create custom spacing - use the scale
- Don't create custom shadows - use the tokens

### Keep Components Small
- One responsibility per component
- Extract reusable parts
- Use composition over props

### Follow Conventions
- TypeScript for all new code
- Functional components with hooks
- Props interfaces exported
- Descriptive variable names

---

## 🎓 Learning Resources

### Tailwind CSS
- [Tailwind Docs](https://tailwindcss.com/docs)
- [Tailwind UI](https://tailwindui.com/)

### React Patterns
- [React Docs](https://react.dev/)
- [React TypeScript Cheatsheet](https://react-typescript-cheatsheet.netlify.app/)

### Design Systems
- [Design Systems Handbook](https://www.designbetter.co/design-systems-handbook)
- [Component Gallery](https://component.gallery/)

---

## ✅ Next Steps

1. ✅ Install dependencies
2. ✅ Switch to redesigned app
3. ✅ Start dev server
4. ✅ Explore new components
5. ✅ Test user flows
6. ✅ Gather feedback
7. ✅ Iterate and improve

---

## 🆘 Need Help?

1. Check the documentation files
2. Review component source code
3. Test in isolation
4. Ask for clarification

---

**Happy coding! 🎉**
