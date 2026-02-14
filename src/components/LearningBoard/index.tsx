import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { KnowledgeNugget } from './KnowledgeNugget';
import { MagicInput } from './MagicInput';
import { VisualAnchor } from './VisualAnchor';
import { WordBank, CuriosityStreak } from './Gamification';
import { Card as CardType, Lesson, WordBankItem, TimelineEvent } from './types';

interface LearningBoardProps {
  lesson: Lesson;
  onCardInteraction?: (cardId: string) => void;
  onAIQuery?: (query: string) => void;
}

export const LearningBoard = ({
  lesson,
  onCardInteraction,
  onAIQuery,
}: LearningBoardProps) => {
  const [cards, setCards] = useState<CardType[]>(lesson.cards);
  const [wordBank, setWordBank] = useState<WordBankItem[]>([]);
  const [curiosityCount, setCuriosityCount] = useState(0);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [wordBankExpanded, setWordBankExpanded] = useState(false);

  const handleAIQuery = useCallback(
    async (query: string) => {
      setIsLoadingAI(true);
      setCuriosityCount((prev) => prev + 1);

      try {
        onAIQuery?.(query);
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Add random word to word bank for demo
        const demoWords = [
          'Serendipity',
          'Ephemeral',
          'Eloquent',
          'Paradigm',
          'Ubiquitous',
        ];
        const randomWord =
          demoWords[Math.floor(Math.random() * demoWords.length)];

        setWordBank((prev) => {
          const existing = prev.find((w) => w.word === randomWord);
          if (existing) {
            return prev.map((w) =>
              w.word === randomWord
                ? {
                    ...w,
                    timesUsed: w.timesUsed + 1,
                    level:
                      w.timesUsed >= 5
                        ? 'tree'
                        : w.timesUsed >= 3
                        ? 'plant'
                        : w.timesUsed >= 1
                        ? 'sprout'
                        : 'seed',
                  }
                : w
            );
          }
          return [
            ...prev,
            {
              word: randomWord,
              definition: 'A newly learned English word',
              timesUsed: 1,
              level: 'seed',
            },
          ];
        });
      } finally {
        setIsLoadingAI(false);
      }
    },
    [onAIQuery]
  );

  const handlePronounce = (cardId: string) => {
    const card = cards.find((c) => c.id === cardId);
    if (card?.pronunciation) {
      // Use Web Speech API or external service
      const utterance = new SpeechSynthesisUtterance(card.pronunciation);
      utterance.lang = 'en-US';
      speechSynthesis.speak(utterance);
    }
  };

  // Bento Grid Layout
  const gridItems = [
    { id: 'streak', span: 'col-span-1 row-span-1' },
    { id: 'word-bank', span: 'col-span-1 row-span-2' },
    { id: 'visual-anchor', span: 'col-span-2 row-span-2' },
    { id: 'cards-grid', span: 'col-span-3 row-span-3' },
  ];

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-[#f2f1ec] to-blue-50/50 p-6">
      {/* Bento Grid Layout */}
      <div className="grid grid-cols-4 gap-6 auto-rows-[200px] max-w-7xl mx-auto">
        {/* Curiosity Streak - Top Right */}
        <motion.div className="col-span-1 row-span-1">
          <CuriosityStreak count={curiosityCount} />
        </motion.div>

        {/* Visual Anchor - Central Tile */}
        <motion.div className="col-span-2 row-span-2">
          <VisualAnchor
            title={lesson.title}
            type="timeline"
            timelineEvents={
              lesson.timelineEvents || [
                {
                  id: '1',
                  time: 'Past',
                  action: 'Simple Past',
                  type: 'sudden',
                  description: 'Completed actions',
                },
                {
                  id: '2',
                  time: 'Present',
                  action: 'Present Progressive',
                  type: 'continuous',
                  description: 'Actions happening now',
                },
                {
                  id: '3',
                  time: 'Future',
                  action: 'Will/Going to',
                  type: 'sudden',
                  description: 'Future plans',
                },
              ]
            }
          />
        </motion.div>

        {/* Knowledge Cards Grid - Main Area */}
        <motion.div className="col-span-3 row-span-3 overflow-y-auto bg-white/40 backdrop-blur-sm rounded-3xl p-6 border border-white/20">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            Learning Cards
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence mode="popLayout">
              {cards.map((card) => (
                <motion.div
                  key={card.id}
                  layout
                  exit={{ scale: 0, opacity: 0 }}
                  onClick={() => onCardInteraction?.(card.id)}
                >
                  <KnowledgeNugget
                    card={card}
                    onPronounce={() => handlePronounce(card.id)}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      {/* Word Bank Sidebar */}
      {wordBank.length > 0 && (
        <WordBank words={wordBank} isExpanded={wordBankExpanded} />
      )}

      {/* Magic Input - Bottom Fixed */}
      <MagicInput
        onSubmit={handleAIQuery}
        isLoading={isLoadingAI}
      />
    </div>
  );
};

export default LearningBoard;
