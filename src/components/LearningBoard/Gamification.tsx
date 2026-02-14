import React from 'react';
import { motion } from 'framer-motion';
import { Flame, Leaf, Sprout, Trees } from 'lucide-react';
import { WordBankItem } from './types';

interface WordBankProps {
  words: WordBankItem[];
  isExpanded?: boolean;
  onToggle?: () => void;
}

const levelIcons = {
  seed: Leaf,
  sprout: Sprout,
  plant: Trees,
  tree: Trees,
};

const levelColors = {
  seed: 'from-gray-400 to-gray-500',
  sprout: 'from-green-300 to-green-400',
  plant: 'from-green-400 to-green-500',
  tree: 'from-green-600 to-green-700',
};

export const WordBank = ({
  words,
  isExpanded = false,
  onToggle,
}: WordBankProps) => {
  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="fixed right-0 top-0 h-full w-80 bg-gradient-to-b from-white/80 to-white/70 backdrop-blur-md border-l border-white/20 z-30 flex flex-col shadow-lg"
    >
      {/* Header */}
      <div className="p-6 border-b border-white/20">
        <h2 className="text-xl font-bold text-gray-800 mb-2">📚 Word Bank</h2>
        <p className="text-sm text-gray-600">
          {words.length} word{words.length !== 1 ? 's' : ''} collected
        </p>
      </div>

      {/* Words Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {words.map((word, index) => {
          const IconComponent = levelIcons[word.level];
          const colorClass = levelColors[word.level];

          return (
            <motion.div
              key={`${word.word}-${index}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.05, x: 5 }}
              className={`bg-gradient-to-r ${colorClass} rounded-2xl p-4 text-white shadow-md cursor-pointer group`}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-bold text-sm group-hover:text-white/90 transition">
                  {word.word}
                </h3>
                <IconComponent className="w-4 h-4 opacity-70" />
              </div>
              <p className="text-xs text-white/80 mb-2">{word.definition}</p>
              <div className="flex items-center gap-2">
                {/* Growth Indicator */}
                <div className="flex-1 h-1.5 bg-white/30 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-white/80"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${
                        word.level === 'seed'
                          ? 25
                          : word.level === 'sprout'
                          ? 50
                          : word.level === 'plant'
                          ? 75
                          : 100
                      }%`,
                    }}
                    transition={{ duration: 0.6 }}
                  />
                </div>
                <span className="text-xs font-semibold text-white/80">
                  ×{word.timesUsed}
                </span>
              </div>
            </motion.div>
          );
        })}

        {words.length === 0 && (
          <div className="flex items-center justify-center h-32 text-gray-400">
            <p className="text-center text-sm">
              Words you learn will appear here 🌱
            </p>
          </div>
        )}
      </div>

      {/* Footer Stats */}
      <div className="p-4 border-t border-white/20 bg-white/50">
        <div className="text-xs text-gray-600">
          <p>
            🌳 Trees:{' '}
            <span className="font-bold text-green-600">
              {words.filter((w) => w.level === 'tree').length}
            </span>
          </p>
          <p>
            🌱 Seeds:{' '}
            <span className="font-bold text-gray-600">
              {words.filter((w) => w.level === 'seed').length}
            </span>
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export const CuriosityStreak = ({ count }: { count: number }) => {
  const isBurning = count > 3;

  return (
    <motion.div
      initial={{ scale: 0, rotate: -180 }}
      animate={{ scale: 1, rotate: 0 }}
      className="absolute top-6 right-6 z-40"
    >
      <motion.div
        animate={isBurning ? { scale: [1, 1.2, 1], rotate: [0, 5, -5, 0] } : {}}
        transition={{ duration: 0.6, repeat: Infinity }}
        className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-white shadow-lg ${
          isBurning
            ? 'bg-gradient-to-r from-orange-400 to-red-500'
            : 'bg-gradient-to-r from-blue-400 to-blue-500'
        }`}
      >
        <span
          className={`text-2xl ${
            isBurning ? 'animate-bounce' : ''
          }`}
        >
          🔥
        </span>
        <span>{count}</span>
      </motion.div>
    </motion.div>
  );
};
