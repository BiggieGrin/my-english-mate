import React from 'react';
import { motion } from 'framer-motion';
import { Cloud, Zap, ArrowRight } from 'lucide-react';
import { TimelineEvent } from './types';

interface VisualAnchorProps {
  title: string;
  type: 'timeline' | 'word-web';
  timelineEvents?: TimelineEvent[];
  wordWebData?: Array<{ word: string; connections: string[] }>;
}

export const VisualAnchor = ({
  title,
  type,
  timelineEvents = [],
  wordWebData = [],
}: VisualAnchorProps) => {
  if (type === 'timeline') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'spring', stiffness: 100 }}
        className="w-full bg-white/70 backdrop-blur-md rounded-3xl p-8 shadow-lg border border-white/20"
      >
        <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center">
          {title}
        </h2>

        {/* Timeline */}
        <div className="relative space-y-8">
          {/* Center Line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-1 bg-gradient-to-b from-blue-400 to-blue-600 -translate-x-1/2" />

          {/* Timeline Events */}
          {timelineEvents.map((event, index) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: index % 2 === 0 ? -50 : 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`flex ${
                index % 2 === 0 ? 'flex-row' : 'flex-row-reverse'
              } gap-8 items-center`}
            >
              {/* Content */}
              <div className="flex-1">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200"
                >
                  <p className="text-sm font-bold text-blue-600 mb-2">
                    {event.time}
                  </p>
                  <h3 className="text-lg font-bold text-gray-800 mb-2">
                    {event.action}
                  </h3>
                  <p className="text-gray-600">{event.description}</p>
                </motion.div>
              </div>

              {/* Icon in Center */}
              <div className="flex-shrink-0 relative z-10">
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className={`w-10 h-10 rounded-full ${
                    event.type === 'continuous'
                      ? 'bg-gradient-to-br from-blue-400 to-blue-500'
                      : 'bg-gradient-to-br from-yellow-400 to-red-500'
                  } flex items-center justify-center text-white shadow-lg`}
                >
                  {event.type === 'continuous' ? (
                    <Cloud className="w-6 h-6" />
                  ) : (
                    <Zap className="w-6 h-6" />
                  )}
                </motion.div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    );
  }

  // Word Web Type
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 100 }}
      className="w-full bg-white/70 backdrop-blur-md rounded-3xl p-8 shadow-lg border border-white/20"
    >
      <h2 className="text-2xl font-bold text-gray-800 mb-8 text-center">
        {title}
      </h2>

      {/* Word Web Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {wordWebData.map((node, index) => (
          <motion.div
            key={index}
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ delay: index * 0.1, type: 'spring' }}
            className="relative"
          >
            {/* Central Node */}
            <motion.div
              whileHover={{ scale: 1.1 }}
              className="bg-gradient-to-br from-pink-400 to-pink-500 rounded-2xl p-6 text-center text-white shadow-lg cursor-pointer"
            >
              <p className="font-bold text-lg">{node.word}</p>
            </motion.div>

            {/* Connection Lines and Related Words */}
            {node.connections.map((connection, cIdx) => (
              <motion.div
                key={cIdx}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 + cIdx * 0.1 }}
                className="absolute mt-6 flex items-center gap-2 text-sm"
                style={{
                  top: '100%',
                  left: `${30 + cIdx * 20}%`,
                }}
              >
                <ArrowRight className="w-3 h-3 text-gray-400" />
                <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full font-medium">
                  {connection}
                </span>
              </motion.div>
            ))}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
