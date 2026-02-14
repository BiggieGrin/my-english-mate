# Learning Board Component

A comprehensive, interactive learning interface for the English language app targeting Israeli kids and teens. Built with React, Framer Motion, and Tailwind CSS.

## Features

### 1. **Bento Grid Layout**
- Responsive grid-based layout
- Central visual anchor with dynamic cards
- Modern playful aesthetic with glassmorphism

### 2. **Knowledge Nugget Cards**
- Draggable, interactive cards with spring animations
- Categories: Grammar, Vocabulary, Pronunciation, Phrase, Fun Fact
- Features:
  - Colorful category badges
  - Pronunciation button with Web Speech API
  - "Did you know?" toggle for fun facts
  - Pop-in entry animation with spring bounce

### 3. **Magic Input Component**
- Fixed-bottom floating input bar
- AI-powered suggestion chips:
  - "Give me a joke in English"
  - "Explain like I am 5"
  - "Show me a timeline"
  - "Make it visual"
- Loading state with animated sparkles
- Smooth transitions and hover effects

### 4. **Visual Anchor Component**
- **Timeline Mode**: Display grammar progression with:
  - ☁️ Clouds for continuous actions
  - ⚡ Lightning bolts for sudden actions
  - Animated event cards with descriptions
- **Word Web Mode**: Visualize word connections and relationships

### 5. **Gamification Elements**

#### Curiosity Streak Counter
- 🔥 Tracks questions asked
- Glows and animates when streak > 3
- Top-right corner display

#### Word Bank Sidebar
- 📚 Collects learned words during the session
- Growth stages: Seed → Sprout → Plant → Tree
- Shows word definition and usage count
- Color-coded growth indicators
- Smooth animation on word addition

### 6. **Responsive Design**
- Mobile-friendly layout
- Tailwind CSS responsive utilities
- Adjusts card grid and sidebar for smaller screens

## Component Structure

```
LearningBoard/
├── index.tsx              # Main component & layout
├── types.ts              # TypeScript interfaces
├── KnowledgeNugget.tsx   # Card component
├── MagicInput.tsx        # AI input interface
├── VisualAnchor.tsx      # Timeline/Word Web visualization
└── Gamification.tsx      # Streak & Word Bank components
```

## TypeScript Interfaces

### Card
```typescript
interface Card {
  id: string;
  content: string;
  category: 'Grammar' | 'Vocabulary' | 'Pronunciation' | 'Phrase' | 'Fun Fact';
  englishText: string;
  translation?: string;
  pronunciation?: string;
  funFact?: string;
  x?: number;
  y?: number;
}
```

### Lesson
```typescript
interface Lesson {
  id: string;
  title: string;
  description: string;
  topic: string;
  cards: Card[];
  timelineEvents?: TimelineEvent[];
}
```

### WordBankItem
```typescript
interface WordBankItem {
  word: string;
  definition: string;
  timesUsed: number;
  level: 'seed' | 'sprout' | 'plant' | 'tree';
}
```

## Usage Example

```tsx
import { LearningBoard } from '@/components/LearningBoard';
import { Lesson } from '@/components/LearningBoard/types';

const lesson: Lesson = {
  id: 'lesson-1',
  title: 'English Tenses',
  description: 'Master verb tenses',
  topic: 'Grammar',
  cards: [
    {
      id: 'card-1',
      content: 'Simple Past',
      category: 'Grammar',
      englishText: 'I ate breakfast',
      translation: 'אכלתי ארוחת בוקר',
      pronunciation: 'I ate breakfast',
      funFact: 'Simple past is for completed actions...'
    }
  ]
};

export default function MyLesson() {
  return (
    <LearningBoard
      lesson={lesson}
      onCardInteraction={(cardId) => console.log(cardId)}
      onAIQuery={(query) => console.log(query)}
    />
  );
}
```

## Animations & Effects

### Framer Motion Features
- **Card Pop-in**: Scale from 0 with rotate and spring physics
- **Drag Interaction**: Smooth dragging with scale feedback
- **Timeline Events**: Staggered appearance with horizontal slide-in
- **Word Growth**: Animated progress bars as words level up
- **Curiosity Streak**: Pulsing/bouncing animation when active
- **Loading State**: Rotating sparkle animation

### CSS Effects
- **Glassmorphism**: `backdrop-blur-md` with white opacity
- **Gradients**: Linear and radial gradients for depth
- **Shadows**: Layered shadows for elevation
- **Rounded Corners**: Consistent `rounded-3xl` for playful feel

## Customization

### Color Scheme
Easily customize colors by modifying the Tailwind classes:
```tsx
// In KnowledgeNugget.tsx
const categoryColors = {
  Grammar: 'from-blue-400 to-blue-500',
  Vocabulary: 'from-pink-400 to-pink-500',
  // ... customize here
};
```

### Suggestion Chips
Add custom prompts:
```tsx
const customSuggestions = [
  {
    id: '1',
    text: 'Your custom prompt',
    icon: '🎯'
  }
];

<MagicInput suggestedPrompts={customSuggestions} />
```

## RTL Support

The component supports RTL (Hebrew) text direction:
- Input direction: `dir="auto"` for dynamic LTR/RTL
- Timeline layout: Alternates left-right for balanced design
- Card flex: Uses `flex-row` and `flex-row-reverse`

## Accessibility

- Semantic HTML structure
- ARIA labels on interactive elements
- Keyboard navigation support
- Focus states on buttons
- Color contrast compliance

## Performance Considerations

- Uses `AnimatePresence` with `mode="popLayout"` for efficient animations
- Lazy rendering of off-screen cards
- Memoization of card handlers
- Framer Motion's GPU-accelerated transforms

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Dependencies

- React 18+
- Framer Motion 11+
- Tailwind CSS 3+
- lucide-react 0.263+

## Future Enhancements

- [ ] Persistent word bank storage
- [ ] Spaced repetition integration
- [ ] Advanced drag-and-drop (organizing cards)
- [ ] Export learning progress
- [ ] Voice recording for pronunciation
- [ ] AI-powered word recommendations
- [ ] Leaderboard integration
- [ ] Social sharing features
