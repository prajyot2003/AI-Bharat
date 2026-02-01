# Navixa Design System

## Design Philosophy

Navixa employs a modern, dark-first design system that emphasizes clarity, accessibility, and professional aesthetics. The design balances sophisticated visual elements with functional usability, creating an environment that feels both cutting-edge and approachable for career development.

### Core Principles

- **Dark-First Design**: Primary dark theme with high contrast for reduced eye strain during extended learning sessions
- **Gradient Accents**: Strategic use of gradients to create visual hierarchy and brand identity
- **Minimalist Aesthetics**: Clean, uncluttered interfaces that focus attention on content
- **Responsive Excellence**: Mobile-first approach ensuring optimal experience across all devices
- **Accessibility Priority**: WCAG compliant design with proper contrast ratios and keyboard navigation

## Visual Identity

### Brand Colors

#### Primary Palette
```css
/* Background Hierarchy */
--zinc-950: #09090b    /* Primary background */
--zinc-900: #18181b    /* Secondary background */
--zinc-800: #27272a    /* Tertiary background */

/* Text Hierarchy */
--white: #ffffff       /* Primary text */
--zinc-400: #a1a1aa    /* Secondary text */
--zinc-500: #71717a    /* Tertiary text */
--zinc-600: #52525b    /* Placeholder text */

/* Border System */
--white-10: rgba(255, 255, 255, 0.1)   /* Primary borders */
--white-5: rgba(255, 255, 255, 0.05)   /* Subtle borders */
```

#### Accent Colors
```css
/* Brand Gradients */
--blue-gradient: linear-gradient(to right, #3b82f6, #06b6d4)
--purple-gradient: linear-gradient(to right, #8b5cf6, #ec4899)
--emerald-gradient: linear-gradient(to right, #10b981, #06b6d4)

/* Semantic Colors */
--blue-500: #3b82f6     /* Primary actions */
--emerald-500: #10b981  /* Success states */
--purple-500: #8b5cf6   /* AI/Premium features */
--orange-500: #f97316   /* Warnings/Highlights */
--red-500: #ef4444      /* Errors/Destructive */
```

### Typography

#### Font System
- **Primary Font**: Inter (Google Fonts)
- **Fallback**: system-ui, -apple-system, sans-serif
- **Characteristics**: Clean, modern, highly legible at all sizes

#### Type Scale
```css
/* Headings */
.text-4xl { font-size: 2.25rem; line-height: 2.5rem; }    /* Hero titles */
.text-3xl { font-size: 1.875rem; line-height: 2.25rem; }  /* Page titles */
.text-2xl { font-size: 1.5rem; line-height: 2rem; }       /* Section titles */
.text-xl { font-size: 1.25rem; line-height: 1.75rem; }    /* Subsection titles */
.text-lg { font-size: 1.125rem; line-height: 1.75rem; }   /* Large body */

/* Body Text */
.text-base { font-size: 1rem; line-height: 1.5rem; }      /* Default body */
.text-sm { font-size: 0.875rem; line-height: 1.25rem; }   /* Small body */
.text-xs { font-size: 0.75rem; line-height: 1rem; }       /* Captions */
```

#### Font Weights
- **font-bold (700)**: Headings, important labels
- **font-semibold (600)**: Subheadings, emphasis
- **font-medium (500)**: Navigation, buttons
- **font-normal (400)**: Body text, descriptions

## Layout System

### Grid & Spacing

#### Container System
```css
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

/* Responsive breakpoints */
@media (min-width: 768px) { padding: 0 2rem; }
@media (min-width: 1024px) { padding: 0 4rem; }
```

#### Spacing Scale
```css
/* Tailwind spacing system */
.space-1 { margin/padding: 0.25rem; }   /* 4px */
.space-2 { margin/padding: 0.5rem; }    /* 8px */
.space-4 { margin/padding: 1rem; }      /* 16px */
.space-6 { margin/padding: 1.5rem; }    /* 24px */
.space-8 { margin/padding: 2rem; }      /* 32px */
.space-12 { margin/padding: 3rem; }     /* 48px */
```

### Navigation Architecture

#### Desktop Navigation
- **Fixed top navigation** with backdrop blur
- **Horizontal layout** with icon + text labels
- **Active state indicators** with color changes
- **Hover effects** with smooth transitions

#### Mobile Navigation
- **Fixed bottom navigation** for thumb accessibility
- **Icon-first design** with minimal text labels
- **Touch-optimized targets** (minimum 44px)
- **Visual feedback** for active states

## Component Design System

### Buttons

#### Primary Button
```css
.btn-primary {
  background: linear-gradient(to right, #3b82f6, #06b6d4);
  color: white;
  padding: 0.75rem 2rem;
  border-radius: 0.75rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 25px rgba(59, 130, 246, 0.3);
}
```

#### Secondary Button
```css
.btn-secondary {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: white;
  padding: 0.75rem 2rem;
  border-radius: 0.75rem;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.1);
}
```

### Cards

#### Standard Card
```css
.card {
  background: #18181b;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1rem;
  padding: 1.5rem;
  transition: all 0.3s ease;
}

.card:hover {
  border-color: rgba(59, 130, 246, 0.3);
  transform: translateY(-2px);
}
```

#### Feature Card
```css
.feature-card {
  background: linear-gradient(135deg, #18181b 0%, #27272a 100%);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 1.5rem;
  padding: 2rem;
  position: relative;
  overflow: hidden;
}

.feature-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
}
```

### Forms

#### Input Fields
```css
.input {
  background: #09090b;
  border: 1px solid #27272a;
  border-radius: 0.75rem;
  padding: 0.75rem 1rem;
  color: white;
  font-size: 1rem;
  transition: all 0.2s ease;
}

.input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.input::placeholder {
  color: #52525b;
}
```

#### Textarea
```css
.textarea {
  background: #09090b;
  border: 1px solid #27272a;
  border-radius: 0.75rem;
  padding: 1rem;
  color: white;
  resize: vertical;
  min-height: 120px;
}
```

## Animation & Interactions

### Motion Design Principles

#### Easing Functions
```css
/* Standard transitions */
.ease-smooth { transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); }
.ease-bounce { transition-timing-function: cubic-bezier(0.68, -0.55, 0.265, 1.55); }
.ease-spring { transition-timing-function: cubic-bezier(0.175, 0.885, 0.32, 1.275); }
```

#### Animation Durations
- **Fast (150ms)**: Hover states, button presses
- **Standard (300ms)**: Card transitions, modal appearances
- **Slow (500ms)**: Page transitions, complex animations

### Framer Motion Patterns

#### Page Transitions
```typescript
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
};

const pageTransition = {
  duration: 0.3,
  ease: "easeInOut"
};
```

#### Stagger Animations
```typescript
const containerVariants = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const itemVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 }
};
```

## Responsive Design

### Breakpoint System
```css
/* Mobile First Approach */
/* xs: 0px - 639px (default) */
/* sm: 640px+ */
@media (min-width: 640px) { /* Small tablets */ }

/* md: 768px+ */
@media (min-width: 768px) { /* Tablets */ }

/* lg: 1024px+ */
@media (min-width: 1024px) { /* Small desktops */ }

/* xl: 1280px+ */
@media (min-width: 1280px) { /* Large desktops */ }
```

### Layout Adaptations

#### Mobile (< 768px)
- **Bottom navigation** for primary actions
- **Single column layouts** for content
- **Larger touch targets** (minimum 44px)
- **Simplified interactions** with reduced complexity

#### Tablet (768px - 1023px)
- **Hybrid navigation** with both top and bottom elements
- **Two-column layouts** where appropriate
- **Optimized for both portrait and landscape**

#### Desktop (1024px+)
- **Top navigation** with full feature access
- **Multi-column layouts** for efficient space usage
- **Hover states** and advanced interactions
- **Keyboard navigation** support

## Accessibility Standards

### Color Contrast
- **Text on background**: Minimum 4.5:1 ratio (WCAG AA)
- **Large text**: Minimum 3:1 ratio
- **Interactive elements**: Minimum 3:1 ratio for borders/states

### Focus Management
```css
.focus-visible {
  outline: 2px solid #3b82f6;
  outline-offset: 2px;
  border-radius: 0.25rem;
}
```

### Screen Reader Support
- **Semantic HTML** structure with proper headings
- **ARIA labels** for interactive elements
- **Alt text** for all images and icons
- **Skip links** for keyboard navigation

## Icon System

### Lucide React Icons
- **Consistent style**: 24px default size, 1.5px stroke width
- **Semantic usage**: Icons match their contextual meaning
- **Accessibility**: Proper aria-labels and role attributes

#### Common Icon Patterns
```typescript
// Navigation icons
<LayoutDashboard className="h-5 w-5" />
<BrainCircuit className="h-5 w-5" />
<Briefcase className="h-5 w-5" />

// Action icons
<ArrowRight className="h-4 w-4" />
<Check className="h-4 w-4" />
<X className="h-4 w-4" />

// Status icons
<Loader2 className="h-4 w-4 animate-spin" />
<Sparkles className="h-4 w-4" />
<Trophy className="h-6 w-6" />
```

## Special Features

### Gradient System
```css
/* Brand gradients */
.gradient-brand { background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); }
.gradient-success { background: linear-gradient(135deg, #10b981 0%, #06b6d4 100%); }
.gradient-warning { background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%); }

/* Text gradients */
.text-gradient {
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

### Backdrop Effects
```css
.backdrop-blur {
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.glass-effect {
  background: rgba(24, 24, 27, 0.8);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

### Custom Scrollbars
```css
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #09090b;
}

::-webkit-scrollbar-thumb {
  background: #27272a;
  border-radius: 9999px;
}

::-webkit-scrollbar-thumb:hover {
  background: #3f3f46;
}
```

## Print Styles

### Resume Printing
```css
@media print {
  .no-print { display: none !important; }
  
  body {
    background: white !important;
    color: black !important;
  }
  
  .print-optimize {
    transform: none !important;
    box-shadow: none !important;
    border-radius: 0 !important;
  }
}
```

## Performance Considerations

### CSS Optimization
- **Tailwind CSS purging** removes unused styles
- **Critical CSS inlining** for above-the-fold content
- **CSS custom properties** for dynamic theming
- **Minimal custom CSS** leveraging Tailwind utilities

### Animation Performance
- **GPU acceleration** using transform and opacity
- **Reduced motion** respect for user preferences
- **Intersection Observer** for scroll-triggered animations
- **Framer Motion** optimizations for smooth 60fps animations

## Implementation Guidelines

### Component Structure
```typescript
// Standard component pattern
interface ComponentProps {
  className?: string;
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary';
}

export function Component({ className, children, variant = 'primary' }: ComponentProps) {
  return (
    <div className={cn(
      'base-styles',
      variant === 'primary' && 'primary-styles',
      variant === 'secondary' && 'secondary-styles',
      className
    )}>
      {children}
    </div>
  );
}
```

### Utility Class Patterns
```typescript
// Use cn() utility for conditional classes
const buttonClasses = cn(
  'base-button-styles',
  isLoading && 'loading-styles',
  disabled && 'disabled-styles',
  variant === 'primary' && 'primary-styles'
);
```

### Design Token Usage
- **Consistent spacing** using Tailwind's spacing scale
- **Color system** adherence for brand consistency
- **Typography scale** for proper hierarchy
- **Border radius** consistency across components

---

*This design system serves as the foundation for Navixa's visual identity and should be referenced for all UI development to ensure consistency and quality across the platform.*