import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Command, ArrowRight, Hash, Users, Calendar, FileText } from 'lucide-react';
import { useAppStore } from '../../store/appStore';

interface Command {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ComponentType<any>;
  action: () => void;
  category: string;
}

const mockCommands: Command[] = [
  {
    id: '1',
    title: 'Go to Dashboard',
    subtitle: 'Navigate to main dashboard',
    icon: Hash,
    action: () => console.log('Navigate to dashboard'),
    category: 'Navigation'
  },
  {
    id: '2',
    title: 'Open React Study Group',
    subtitle: '24 members • 3 unread',
    icon: Users,
    action: () => console.log('Open React group'),
    category: 'Groups'
  },
  {
    id: '3',
    title: 'View Calendar',
    subtitle: 'Upcoming events and meetings',
    icon: Calendar,
    action: () => console.log('Open calendar'),
    category: 'Navigation'
  },
  {
    id: '4',
    title: 'Search Resources',
    subtitle: 'Find study materials and documents',
    icon: FileText,
    action: () => console.log('Search resources'),
    category: 'Resources'
  }
];

export const CommandPalette: React.FC = () => {
  const { showCommandPalette, toggleCommandPalette } = useAppStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredCommands = mockCommands.filter(command =>
    command.title.toLowerCase().includes(query.toLowerCase()) ||
    command.subtitle?.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showCommandPalette) {
        if (e.key === 'Escape') {
          toggleCommandPalette();
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
        } else if (e.key === 'Enter') {
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
            toggleCommandPalette();
          }
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleCommandPalette();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showCommandPalette, selectedIndex, filteredCommands, toggleCommandPalette]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  if (!showCommandPalette) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-20"
        onClick={toggleCommandPalette}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        >
          {/* Search Input */}
          <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-700">
            <Search className="w-5 h-5 text-gray-400 mr-3" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search for commands, groups, resources..."
              className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 outline-none"
              autoFocus
            />
            <div className="flex items-center space-x-1 text-xs text-gray-400">
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">⌘</kbd>
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">K</kbd>
            </div>
          </div>

          {/* Results */}
          <div className="max-h-96 overflow-y-auto">
            {filteredCommands.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No results found for "{query}"</p>
              </div>
            ) : (
              <div className="py-2">
                {Object.entries(
                  filteredCommands.reduce((acc, command) => {
                    if (!acc[command.category]) acc[command.category] = [];
                    acc[command.category].push(command);
                    return acc;
                  }, {} as Record<string, Command[]>)
                ).map(([category, commands]) => (
                  <div key={category}>
                    <div className="px-4 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      {category}
                    </div>
                    {commands.map((command, index) => {
                      const globalIndex = filteredCommands.indexOf(command);
                      return (
                        <motion.button
                          key={command.id}
                          whileHover={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
                          onClick={() => {
                            command.action();
                            toggleCommandPalette();
                          }}
                          className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                            selectedIndex === globalIndex
                              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                              : 'text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          <div className="flex items-center space-x-3">
                            <command.icon className="w-5 h-5" />
                            <div>
                              <p className="font-medium">{command.title}</p>
                              {command.subtitle && (
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                  {command.subtitle}
                                </p>
                              )}
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 opacity-50" />
                        </motion.button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1">
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-600 rounded border">↑↓</kbd>
                <span>Navigate</span>
              </div>
              <div className="flex items-center space-x-1">
                <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-600 rounded border">↵</kbd>
                <span>Select</span>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-gray-600 rounded border">esc</kbd>
              <span>Close</span>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};