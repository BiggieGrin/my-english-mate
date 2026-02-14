import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Sparkles, Loader2 } from 'lucide-react';
import { SuggestionChip } from './types';

interface MagicInputProps {
  onSubmit: (input: string, suggestion?: string) => void;
  isLoading?: boolean;
  suggestedPrompts?: SuggestionChip[];
}

const defaultSuggestions: SuggestionChip[] = [
  {
    id: '1',
    text: 'Give me a joke in English',
    icon: '😂',
  },
  {
    id: '2',
    text: 'Explain like I am 5',
    icon: '👧',
  },
  {
    id: '3',
    text: 'Show me a timeline',
    icon: '📅',
  },
  {
    id: '4',
    text: 'Make it visual',
    icon: '🎨',
  },
];

export const MagicInput = ({
  onSubmit,
  isLoading = false,
  suggestedPrompts,
}: MagicInputProps) => {
  const [input, setInput] = useState('');
  const [selectedSuggestion, setSelectedSuggestion] = useState<string | null>(
    null
  );

  const suggestions = suggestedPrompts || defaultSuggestions;

  const handleSubmit = () => {
    if (!input.trim() && !selectedSuggestion) return;

    if (selectedSuggestion) {
      const suggestion = suggestions.find((s) => s.id === selectedSuggestion);
      onSubmit(input || suggestion?.text || '', suggestion?.text);
      setSelectedSuggestion(null);
    } else {
      onSubmit(input);
    }

    setInput('');
  };

  const handleSuggestionClick = (suggestionId: string) => {
    const suggestion = suggestions.find((s) => s.id === suggestionId);
    if (suggestion) {
      onSubmit(suggestion.text, suggestion.text);
      setSelectedSuggestion(null);
    }
  };

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-0 left-0 right-0 z-40 bg-gradient-to-t from-[#f2f1ec] to-[#f2f1ec]/80 backdrop-blur-md border-t-4 border-dashed border-blue-300 px-4 py-6"
    >
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Suggestion Chips */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap gap-2 justify-center"
        >
          {suggestions.map((chip) => (
            <motion.button
              key={chip.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSuggestionClick(chip.id)}
              className="px-4 py-2 rounded-full bg-white/70 backdrop-blur-sm border border-white/20 text-sm font-medium text-gray-700 hover:bg-white/90 transition-all shadow-sm"
            >
              <span className="mr-2">{chip.icon}</span>
              {chip.text}
            </motion.button>
          ))}
        </motion.div>

        {/* Magic Input Bar */}
        <div className="flex items-center gap-3 bg-white/70 backdrop-blur-md rounded-full px-6 py-3 shadow-lg border border-white/20">
          <input
            type="text"
            placeholder="Ask me anything about English..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !isLoading) handleSubmit();
            }}
            disabled={isLoading}
            className="flex-1 bg-transparent text-lg font-teacher focus:outline-none placeholder:text-gray-400 disabled:opacity-60"
            dir="auto"
          />

          {isLoading ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              className="flex items-center gap-2 text-blue-500"
            >
              <Sparkles className="w-5 h-5" />
              <Loader2 className="w-5 h-5 animate-spin" />
            </motion.div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSubmit}
              disabled={!input.trim()}
              className="p-2 rounded-full bg-gradient-to-r from-blue-400 to-blue-500 text-white hover:shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
};
