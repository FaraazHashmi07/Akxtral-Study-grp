import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, MessageCircle, Send } from 'lucide-react';
import { format } from 'date-fns';
import { QuestionAnswer } from '../../types';
import { useChatStore } from '../../store/chatStore';
import { MessageReactions } from './MessageReactions';

interface QuestionAnswersProps {
  answers: QuestionAnswer[];
  messageId: string;
  communityId: string;
}

export const QuestionAnswers: React.FC<QuestionAnswersProps> = ({
  answers,
  messageId,
  communityId
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [newAnswer, setNewAnswer] = useState('');
  const [showAnswerInput, setShowAnswerInput] = useState(false);
  const { addQuestionAnswer } = useChatStore();

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAnswer.trim()) return;

    try {
      await addQuestionAnswer(messageId, newAnswer);
      setNewAnswer('');
      setShowAnswerInput(false);
    } catch (error) {
      console.error('Failed to add answer:', error);
    }
  };

  return (
    <div className="mt-3 border-l-2 border-green-200 dark:border-green-800 pl-4">
      {/* Answers header */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center space-x-2 text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
        >
          <MessageCircle className="w-4 h-4" />
          <span>{answers.length} answer{answers.length !== 1 ? 's' : ''}</span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
        
        <button
          onClick={() => setShowAnswerInput(!showAnswerInput)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
        >
          Add Answer
        </button>
      </div>

      {/* Answer input */}
      <AnimatePresence>
        {showAnswerInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-3"
          >
            <form onSubmit={handleSubmitAnswer} className="space-y-2">
              <textarea
                value={newAnswer}
                onChange={(e) => setNewAnswer(e.target.value)}
                placeholder="Write your answer..."
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white resize-none"
                rows={3}
              />
              <div className="flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowAnswerInput(false);
                    setNewAnswer('');
                  }}
                  className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newAnswer.trim()}
                  className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-3 h-3" />
                  <span>Answer</span>
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Answers list */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            {answers.map((answer) => (
              <motion.div
                key={answer.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800"
              >
                <div className="flex items-center space-x-2 mb-2">
                  <span className="font-medium text-green-800 dark:text-green-200 text-sm">
                    {answer.authorName}
                  </span>
                  <span className="text-xs text-green-600 dark:text-green-400">
                    {format(answer.createdAt, 'MMM d, HH:mm')}
                  </span>
                </div>
                <p className="text-sm text-green-900 dark:text-green-100 leading-relaxed">
                  {answer.content}
                </p>
                {answer.reactions && answer.reactions.length > 0 && (
                  <div className="mt-2">
                    <MessageReactions 
                      reactions={answer.reactions}
                      onReaction={() => {}} // TODO: Implement answer reactions
                      currentUserId=""
                    />
                  </div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
