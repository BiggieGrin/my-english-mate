// TypeScript interfaces for Learning Board components

export interface Card {
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

export interface Lesson {
  id: string;
  title: string;
  description: string;
  topic: string;
  cards: Card[];
  timelineEvents?: TimelineEvent[];
}

export interface TimelineEvent {
  id: string;
  time: string;
  action: string;
  type: 'continuous' | 'sudden'; // continuous = cloud, sudden = lightning bolt
  description: string;
}

export interface WordBankItem {
  word: string;
  definition: string;
  timesUsed: number;
  level: 'seed' | 'sprout' | 'plant' | 'tree'; // growth stages
}

export interface SuggestionChip {
  id: string;
  text: string;
  icon: string;
}

export interface LearningBoardState {
  cards: Card[];
  wordBank: WordBankItem[];
  curiosityCount: number;
  sessionStartTime: Date;
}
