# SMEwise Component Library - Usage Examples

## 🧩 Shared Components

### Button

#### Variants

```tsx
import Button from './components/shared/Button';

// Primary (default)
<Button variant="primary">
  Primary Action
</Button>

// Secondary
<Button variant="secondary">
  Secondary Action
</Button>

// Outline
<Button variant="outline">
  Outline Button
</Button>

// Ghost
<Button variant="ghost">
  Ghost Button
</Button>

// Danger
<Button variant="danger">
  Delete
</Button>
```

#### Sizes

```tsx
// Small
<Button size="sm">Small</Button>

// Medium (default)
<Button size="md">Medium</Button>

// Large
<Button size="lg">Large</Button>
```

#### With Icons

```tsx
import { ArrowRight, Download, Sparkles } from 'lucide-react';

// Left icon
<Button leftIcon={<Sparkles size={18} />}>
  Generate
</Button>

// Right icon
<Button rightIcon={<ArrowRight size={18} />}>
  Continue
</Button>

// Both
<Button 
  leftIcon={<Download size={18} />}
  rightIcon={<ArrowRight size={18} />}
>
  Download Report
</Button>
```

#### States

```tsx
// Loading
<Button isLoading>
  Generating...
</Button>

// Disabled
<Button disabled>
  Disabled
</Button>

// Full width
<Button fullWidth>
  Full Width Button
</Button>
```

#### Complete Example

```tsx
<Button
  variant="primary"
  size="lg"
  isLoading={isGenerating}
  leftIcon={<Sparkles size={20} />}
  onClick={handleGenerate}
  fullWidth
>
  Generate All Insights
</Button>
```

---

### Card

#### Basic Usage

```tsx
import Card from './components/shared/Card';

<Card>
  <p>Basic card content</p>
</Card>
```

#### Variants

```tsx
// Default
<Card variant="default">
  Default card with border and shadow
</Card>

// Elevated
<Card variant="elevated">
  Elevated card with larger shadow
</Card>

// Bordered
<Card variant="bordered">
  Card with thicker border
</Card>

// Glass
<Card variant="glass">
  Glass morphism effect
</Card>
```

#### Padding

```tsx
// No padding
<Card padding="none">Content</Card>

// Small
<Card padding="sm">Content</Card>

// Medium (default)
<Card padding="md">Content</Card>

// Large
<Card padding="lg">Content</Card>
```

#### Hover Effect

```tsx
<Card hover>
  Lifts on hover
</Card>
```

#### With Sub-components

```tsx
import Card, { CardHeader, CardBody, CardFooter } from './components/shared/Card';
import Button from './components/shared/Button';

<Card variant="elevated" padding="lg" hover>
  <CardHeader 
    title="Card Title"
    subtitle="Card subtitle or description"
    action={<Button size="sm">Action</Button>}
  />
  <CardBody>
    <p>Main card content goes here</p>
  </CardBody>
  <CardFooter>
    <Button variant="outline">Cancel</Button>
    <Button variant="primary">Confirm</Button>
  </CardFooter>
</Card>
```

#### Complete Example

```tsx
import { TrendingUp } from 'lucide-react';

<Card variant="elevated" padding="lg" hover>
  <CardHeader>
    <div className="flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center">
        <TrendingUp size={20} />
      </div>
      <div>
        <h3 className="text-lg font-semibold text-neutral-900">
          Revenue Projection
        </h3>
        <p className="text-sm text-neutral-600">
          Next 12 months
        </p>
      </div>
    </div>
  </CardHeader>
  <CardBody className="mt-4">
    <div className="text-3xl font-bold text-neutral-900">
      RM 120,000
    </div>
    <p className="text-sm text-success-600 mt-1">
      ↑ 25% from current
    </p>
  </CardBody>
  <CardFooter className="mt-4 pt-4 border-t border-neutral-200">
    <Button variant="outline" size="sm">
      View Details
    </Button>
  </CardFooter>
</Card>
```

---

### Badge

#### Variants

```tsx
import Badge from './components/shared/Badge';

// Default
<Badge variant="default">Default</Badge>

// Primary
<Badge variant="primary">Primary</Badge>

// Success
<Badge variant="success">Success</Badge>

// Warning
<Badge variant="warning">Warning</Badge>

// Error
<Badge variant="error">Error</Badge>

// Info
<Badge variant="info">Info</Badge>
```

#### Sizes

```tsx
// Small
<Badge size="sm">Small</Badge>

// Medium (default)
<Badge size="md">Medium</Badge>

// Large
<Badge size="lg">Large</Badge>
```

#### With Dot

```tsx
<Badge variant="success" dot>
  Active
</Badge>

<Badge variant="warning" dot>
  Pending
</Badge>

<Badge variant="error" dot>
  Offline
</Badge>
```

#### Usage Examples

```tsx
// Status indicator
<div className="flex items-center gap-2">
  <span>Server Status:</span>
  <Badge variant="success" dot>Online</Badge>
</div>

// Count badge
<div className="relative">
  <Button variant="ghost">
    Notifications
  </Button>
  <Badge 
    variant="error" 
    size="sm"
    className="absolute -top-1 -right-1"
  >
    3
  </Badge>
</div>

// Category tags
<div className="flex gap-2">
  <Badge variant="primary">Marketing</Badge>
  <Badge variant="info">Finance</Badge>
  <Badge variant="success">Operations</Badge>
</div>
```

---

### Empty State

#### Basic Usage

```tsx
import EmptyState from './components/shared/EmptyState';
import { Inbox } from 'lucide-react';

<EmptyState
  icon={<Inbox size={48} />}
  title="No messages yet"
  description="When you receive messages, they'll appear here"
/>
```

#### With Action

```tsx
<EmptyState
  icon={<FileText size={48} />}
  title="No documents generated"
  description="Generate your first business document to get started"
  action={{
    label: "Generate Document",
    onClick: handleGenerate
  }}
/>
```

#### Complete Examples

```tsx
// Before profile completion
<EmptyState
  icon={<Building2 size={48} />}
  title="Complete your business profile"
  description="Tell us about your business to unlock personalized insights and recommendations"
  action={{
    label: "Start Profile",
    onClick: () => scrollToProfile()
  }}
/>

// No data state
<EmptyState
  icon={<BarChart3 size={48} />}
  title="No analytics data yet"
  description="Analytics will appear here once you start using the platform"
/>

// Error state
<EmptyState
  icon={<AlertCircle size={48} />}
  title="Unable to load data"
  description="There was a problem loading your data. Please try again."
  action={{
    label: "Retry",
    onClick: handleRetry
  }}
/>
```

---

### Loading State

#### Variants

```tsx
import LoadingState from './components/shared/LoadingState';

// Spinner (centered)
<LoadingState variant="spinner" />

// Spinner with message
<LoadingState 
  variant="spinner" 
  message="Generating insights..."
/>

// Pulse dots
<LoadingState variant="pulse" />

// Pulse with message
<LoadingState 
  variant="pulse" 
  message="Processing..."
/>

// Skeleton (default)
<LoadingState variant="skeleton" />

// Skeleton with message
<LoadingState 
  variant="skeleton" 
  message="Loading content..."
/>
```

#### Usage Examples

```tsx
// In a card
<Card>
  <CardHeader title="Revenue Projection" />
  <CardBody>
    {isLoading ? (
      <LoadingState variant="skeleton" />
    ) : (
      <div>Content here</div>
    )}
  </CardBody>
</Card>

// Full page loading
<div className="min-h-screen flex items-center justify-center">
  <LoadingState 
    variant="spinner" 
    message="Loading your dashboard..."
  />
</div>

// Inline loading
<div className="flex items-center gap-2">
  <LoadingState variant="pulse" />
  <span>Generating...</span>
</div>
```

---

### Error State

#### Basic Usage

```tsx
import ErrorState from './components/shared/ErrorState';

<ErrorState
  message="Unable to load data. Please try again."
/>
```

#### With Custom Title

```tsx
<ErrorState
  title="Connection Error"
  message="We couldn't connect to the server. Please check your internet connection and try again."
/>
```

#### With Retry

```tsx
<ErrorState
  title="Failed to Generate"
  message="There was a problem generating your insights. Please try again."
  onRetry={handleRetry}
/>
```

#### Complete Examples

```tsx
// In a card
<Card>
  <CardHeader title="Marketing Strategy" />
  <CardBody>
    {error ? (
      <ErrorState
        message="Failed to load marketing strategy"
        onRetry={handleRetry}
      />
    ) : (
      <div>Content here</div>
    )}
  </CardBody>
</Card>

// Full page error
<div className="min-h-screen flex items-center justify-center">
  <ErrorState
    title="Something went wrong"
    message="We encountered an unexpected error. Our team has been notified."
    onRetry={handleRetry}
  />
</div>

// API error
<ErrorState
  title="API Error"
  message={error.message || "An error occurred while fetching data"}
  onRetry={() => refetch()}
/>
```

---

## 🎨 Layout Patterns

### Bento Grid

```tsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {/* Large card (spans 2 columns on lg) */}
  <div className="lg:col-span-2 lg:row-span-2">
    <Card variant="elevated" padding="lg" hover>
      <CardHeader title="Priority Card" />
      <CardBody>Large content area</CardBody>
    </Card>
  </div>

  {/* Regular cards */}
  <Card variant="elevated" padding="lg" hover>
    <CardHeader title="Card 1" />
    <CardBody>Content</CardBody>
  </Card>

  <Card variant="elevated" padding="lg" hover>
    <CardHeader title="Card 2" />
    <CardBody>Content</CardBody>
  </Card>

  <Card variant="elevated" padding="lg" hover>
    <CardHeader title="Card 3" />
    <CardBody>Content</CardBody>
  </Card>
</div>
```

### Form Layout

```tsx
<form onSubmit={handleSubmit} className="space-y-6">
  {/* Single column */}
  <div>
    <label className="block text-sm font-semibold text-neutral-900 mb-1.5">
      Company Name *
    </label>
    <input
      type="text"
      className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-500"
    />
  </div>

  {/* Two columns */}
  <div className="grid md:grid-cols-2 gap-6">
    <div>
      <label className="block text-sm font-semibold text-neutral-900 mb-1.5">
        Industry *
      </label>
      <input type="text" className="..." />
    </div>
    <div>
      <label className="block text-sm font-semibold text-neutral-900 mb-1.5">
        City *
      </label>
      <input type="text" className="..." />
    </div>
  </div>

  {/* Actions */}
  <div className="flex justify-between">
    <Button variant="ghost" type="button">
      Cancel
    </Button>
    <Button variant="primary" type="submit">
      Submit
    </Button>
  </div>
</form>
```

### Dashboard Layout

```tsx
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
  {/* Header */}
  <div className="flex items-center justify-between mb-8">
    <div>
      <h2 className="text-3xl font-bold text-neutral-900 mb-2">
        Dashboard
      </h2>
      <p className="text-neutral-600">
        Overview of your business
      </p>
    </div>
    <Button variant="primary" leftIcon={<Plus />}>
      New Item
    </Button>
  </div>

  {/* Content */}
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {/* Cards */}
  </div>
</div>
```

---

## 🎯 Common Patterns

### Metric Card

```tsx
import { TrendingUp } from 'lucide-react';

<Card variant="elevated" padding="lg">
  <div className="flex items-start justify-between">
    <div>
      <p className="text-sm font-medium text-neutral-600">
        Total Revenue
      </p>
      <p className="text-3xl font-bold text-neutral-900 mt-2">
        RM 120,000
      </p>
      <p className="text-sm text-success-600 mt-1 flex items-center gap-1">
        <TrendingUp size={16} />
        <span>25% from last month</span>
      </p>
    </div>
    <div className="w-10 h-10 rounded-xl bg-primary-100 text-primary-600 flex items-center justify-center">
      <DollarSign size={20} />
    </div>
  </div>
</Card>
```

### Action Card

```tsx
<Card variant="elevated" padding="lg" hover>
  <div className="flex items-center gap-4">
    <div className="w-12 h-12 rounded-xl bg-accent-100 text-accent-600 flex items-center justify-center shrink-0">
      <FileText size={24} />
    </div>
    <div className="flex-1 min-w-0">
      <h3 className="text-lg font-semibold text-neutral-900">
        Generate Document
      </h3>
      <p className="text-sm text-neutral-600 mt-1">
        Create business plans, reports, and more
      </p>
    </div>
    <Button variant="outline" size="sm">
      Start
    </Button>
  </div>
</Card>
```

### Status Card

```tsx
<Card variant="elevated" padding="lg">
  <div className="flex items-center justify-between mb-4">
    <h3 className="text-lg font-semibold text-neutral-900">
      Business Status
    </h3>
    <Badge variant="success" dot>Active</Badge>
  </div>
  <div className="space-y-3">
    <div className="flex justify-between text-sm">
      <span className="text-neutral-600">Profile</span>
      <span className="font-medium text-neutral-900">Complete</span>
    </div>
    <div className="flex justify-between text-sm">
      <span className="text-neutral-600">Documents</span>
      <span className="font-medium text-neutral-900">3 Generated</span>
    </div>
    <div className="flex justify-between text-sm">
      <span className="text-neutral-600">Last Updated</span>
      <span className="font-medium text-neutral-900">2 hours ago</span>
    </div>
  </div>
</Card>
```

---

## 💡 Tips

### Composition

Prefer composition over complex props:

```tsx
// ❌ Avoid
<Card 
  title="Title"
  subtitle="Subtitle"
  action={<Button>Action</Button>}
  footer={<Button>Footer</Button>}
/>

// ✅ Better
<Card>
  <CardHeader title="Title" subtitle="Subtitle" action={<Button>Action</Button>} />
  <CardBody>Content</CardBody>
  <CardFooter><Button>Footer</Button></CardFooter>
</Card>
```

### Consistent Spacing

Use the spacing scale:

```tsx
// ❌ Avoid
<div className="mt-[13px] mb-[27px]">

// ✅ Better
<div className="mt-3 mb-6">  // 12px, 24px
```

### Semantic Colors

Use semantic color names:

```tsx
// ❌ Avoid
<Badge className="bg-green-500">Success</Badge>

// ✅ Better
<Badge variant="success">Success</Badge>
```

---

**For more examples, see the component source code in `client/src/components/shared/`**
