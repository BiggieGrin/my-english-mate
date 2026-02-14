import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Volume2, Lightbulb, Grip2 } from 'lucide-react';
import { Card as CardType } from './types';

interface KnowledgeNuggetProps {
  card: CardType;
  onPronounce?: () => void;
  isDragging?: boolean;
}

const categoryColors = {
  Grammar: 'from-blue-400 to-blue-500',
  Vocabulary: 'from-pink-400 to-pink-500',
  Pronunciation: 'from-purple-400 to-purple-500',
  Phrase: 'from-yellow-400 to-yellow-500',
  'Fun Fact': 'from-green-400 to-green-500',
};

const categoryTextColors = {
  Grammar: 'text-blue-600',
  Vocabulary: 'text-pink-600',
  Pronunciation: 'text-purple-600',
  Phrase: 'text-yellow-600',
  'Fun Fact': 'text-green-600',
};

export const KnowledgeNugget = ({
  card,
  onPronounce,
  isDragging,
}: KnowledgeNuggetProps) => {
  const [showFunFact, setShowFunFact] = useState(false);

  return (
    <motion.div
      drag
      dragElastic={0.2}
      whileHover={{ scale: 1.05 }}
      whileDrag={{ scale: 1.1, opacity: 0.8 }}
      initial={{ scale: 0, rotate: -10 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 20,
      }}
      className={`${
        isDragging ? 'z-50' : 'z-10'
      } bg-white/70 backdrop-blur-md rounded-3xl p-6 shadow-lg border border-white/20 cursor-grab active:cursor-grabbing max-w-xs`}
    >
      {/* Header with Category and Drag Handle */}
      <div className="flex items-start justify-between mb-3">
        <span
          className={`inline-block px-3 py-1 rounded-full text-sm font-bold text-white bg-gradient-to-r ${
            categoryColors[card.category]
          }`}
        >
          {card.category}
        </span>
        <Grip2 className="w-4 h-4 text-gray-400 opacity-50" />
      </div>

      {/* Main Content */}
      <div className="space-y-3">
        <h3 className="text-xl font-bold text-gray-800 font-teacher">
          {card.englishText}
        </h3>

        {card.translation && (
          <p className="text-sm text-gray-600 dir-auto">
            {card.translation}
          </p>
        )}

        {/* Pronunciation Button */}
        {card.pronunciation && (
          <button
            onClick={onPronounce}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-white bg-gradient-to-r ${
              categoryColors[card.category]
            } hover:shadow-lg transition-all`}
          >
            <Volume2 className="w-4 h-4" />
            <span className="text-sm font-medium">Pronounce</span>
          </button>
        )}
      </div>

      {/* Fun Fact Toggle */}
      {card.funFact && (
        <motion.div className="mt-4 pt-4 border-t border-white/20">
          <button
            onClick={() => setShowFunFact(!showFunFact)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
          >
            <Lightbulb className="w-4 h-4 text-yellow-500" />
            <span>Did you know?</span>
          </button>

          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{
              opacity: showFunFact ? 1 : 0,
              height: showFunFact ? 'auto' : 0,
            }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <p className="mt-2 text-sm text-gray-600 italic">
              {card.funFact}
            </p>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
};
