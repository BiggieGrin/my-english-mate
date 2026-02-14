import { LearningBoard } from '@/components/LearningBoard';
import { Lesson } from '@/components/LearningBoard/types';

const DEMO_LESSON: Lesson = {
  id: 'lesson-1',
  title: 'English Tenses Timeline',
  description: 'Master English verb tenses with visual learning',
  topic: 'Grammar',
  cards: [
    {
      id: 'card-1',
      content: 'Simple Past',
      category: 'Grammar',
      englishText: 'I ate breakfast this morning',
      translation: 'אכלתי ארוחת בוקר הבוקר הזה',
      pronunciation: 'I ate breakfast this morning',
      funFact:
        'Simple past is used for completed actions at a specific time in the past.',
    },
    {
      id: 'card-2',
      content: 'Present Progressive',
      category: 'Grammar',
      englishText: 'I am eating breakfast now',
      translation: 'אני אוכל ארוחת בוקר עכשיו',
      pronunciation: 'I am eating breakfast now',
      funFact:
        'Present progressive describes actions happening at the moment of speaking.',
    },
    {
      id: 'card-3',
      content: 'Future Tense',
      category: 'Grammar',
      englishText: 'I will eat breakfast tomorrow',
      translation: 'אני אאכל ארוחת בוקר מחר',
      pronunciation: 'I will eat breakfast tomorrow',
      funFact: 'Future tense is used for actions that will happen after now.',
    },
    {
      id: 'card-4',
      content: 'Vocabulary: Breakfast',
      category: 'Vocabulary',
      englishText: 'Scrambled eggs',
      translation: 'ביצים מערבבות',
      pronunciation: 'Scrambled eggs',
      funFact: 'Popular breakfast food in many English-speaking countries.',
    },
    {
      id: 'card-5',
      content: 'Pronunciation',
      category: 'Pronunciation',
      englishText: 'Probably',
      translation: 'כנראה',
      pronunciation: 'PROB-uh-bly',
      funFact:
        'Many English speakers mispronounce this word by saying "probly".',
    },
    {
      id: 'card-6',
      content: 'Useful Phrase',
      category: 'Phrase',
      englishText: "What's your favorite food?",
      translation: 'מה הספר שלך אתה אוהב אכול?',
      pronunciation: "Whats your favorite food",
      funFact:
        'This is one of the most common conversation starters in English.',
    },
  ],
  timelineEvents: [
    {
      id: 'event-1',
      time: 'Past',
      action: 'Simple Past',
      type: 'sudden',
      description: 'Actions completed in the past: "I went to school"',
    },
    {
      id: 'event-2',
      time: 'Present',
      action: 'Present Continuous',
      type: 'continuous',
      description:
        'Actions happening right now: "I am studying English"',
    },
    {
      id: 'event-3',
      time: 'Future',
      action: 'Future Tense',
      type: 'sudden',
      description: 'Actions planned for the future: "I will travel next summer"',
    },
  ],
};

export default function LearningBoardDemo() {
  const handleCardInteraction = (cardId: string) => {
    console.log(`Card interaction: ${cardId}`);
  };

  const handleAIQuery = (query: string) => {
    console.log(`AI Query: ${query}`);
  };

  return (
    <LearningBoard
      lesson={DEMO_LESSON}
      onCardInteraction={handleCardInteraction}
      onAIQuery={handleAIQuery}
    />
  );
}
