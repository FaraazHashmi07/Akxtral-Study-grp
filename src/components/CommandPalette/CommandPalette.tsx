import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, ArrowRight, Hash, Users, Calendar, FileText, Plus, Settings } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useCommunityStore } from '../../store/communityStore';

interface CommandItem {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  action: () => void;
  category: 'navigation' | 'actions' | 'search';
}

export const CommandPalette: React.FC = () => {
  const {
    setCommandPaletteOpen,
    setActiveSection,
    openModal,
    activeCommunityId
  } = useUIStore();
  const { joinedCommunities, setActiveCommunity } = useCommunityStore();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const commands: CommandItem[] = [
    // Navigation commands
    {
      id: 'dashboard',
      title: 'Go to Dashboard',
      description: 'View community overview and analytics',
      icon: <Hash className="w-4 h-4" />,
      action: () => {
        setActiveSection('dashboard');
        setCommandPaletteOpen(false);
      },
      category: 'navigation'
    },
    {
      id: 'chat',
      title: 'Go to Chat',
      description: 'Join community discussions',
      icon: <Hash className="w-4 h-4" />,
      action: () => {
        setActiveSection('chat');
        setCommandPaletteOpen(false);
      },
      category: 'navigation'
    },
    {
      id: 'resources',
      title: 'Go to Resources',
      description: 'Browse shared files and materials',
      icon: <FileText className="w-4 h-4" />,
      action: () => {
        setActiveSection('resources');
        setCommandPaletteOpen(false);
      },
      category: 'navigation'
    },
    {
      id: 'calendar',
      title: 'Go to Calendar',
      description: 'View events and study sessions',
      icon: <Calendar className="w-4 h-4" />,
      action: () => {
        setActiveSection('calendar');
        setCommandPaletteOpen(false);
      },
      category: 'navigation'
    },
    // Action commands
    {
      id: 'create-community',
      title: 'Create Community',
      description: 'Start a new study community',
      icon: <Plus className="w-4 h-4" />,
      action: () => {
        openModal('createCommunity');
        setCommandPaletteOpen(false);
      },
      category: 'actions'
    },
    {
      id: 'discover-communities',
      title: 'Discover Communities',
      description: 'Find and join study communities',
      icon: <Search className="w-4 h-4" />,
      action: () => {
        openModal('discoverCommunities');
        setCommandPaletteOpen(false);
      },
      category: 'actions'
    },
    {
      id: 'user-settings',
      title: 'User Settings',
      description: 'Manage your account and preferences',
      icon: <Settings className="w-4 h-4" />,
      action: () => {
        openModal('userSettings');
        setCommandPaletteOpen(false);
      },
      category: 'actions'
    },
    // Community commands
    ...joinedCommunities.map(community => ({
      id: `community-${community.id}`,
      title: `Go to ${community.name}`,
      description: `Switch to ${community.name} community`,
      icon: <Users className="w-4 h-4" />,
      action: () => {
        setActiveCommunity(community);
        setCommandPaletteOpen(false);
      },
      category: 'navigation' as const
    }))
  ];

  const filteredCommands = commands.filter(command =>
    command.title.toLowerCase().includes(query.toLowerCase()) ||
    command.description.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev =>
            prev < filteredCommands.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev =>
            prev > 0 ? prev - 1 : filteredCommands.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [filteredCommands, selectedIndex]);

  const groupedCommands = filteredCommands.reduce((acc, command) => {
    if (!acc[command.category]) {
      acc[command.category] = [];
    }
    acc[command.category].push(command);
    return acc;
  }, {} as Record<string, CommandItem[]>);

  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0 }}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl mx-4"
      onClick={(e) => e.stopPropagation()}
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

      {/* Commands */}
      <div className="max-h-96 overflow-y-auto">
        {Object.keys(groupedCommands).length > 0 ? (
          <div className="p-2">
            {Object.entries(groupedCommands).map(([category, commands]) => (
              <div key={category} className="mb-4 last:mb-0">
                <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  {category}
                </div>
                {commands.map((command, index) => {
                  const globalIndex = filteredCommands.indexOf(command);
                  return (
                    <motion.button
                      key={command.id}
                      className={`w-full flex items-center p-3 rounded-lg text-left transition-colors ${
                        globalIndex === selectedIndex
                          ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                      onClick={command.action}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="mr-3">{command.icon}</div>
                      <div className="flex-1">
                        <div className="font-medium">{command.title}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {command.description}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    </motion.button>
                  );
                })}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No commands found</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="flex items-center space-x-1">
              <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded">↑</kbd>
              <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded">↓</kbd>
              <span>to navigate</span>
            </span>
            <span className="flex items-center space-x-1">
              <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded">↵</kbd>
              <span>to select</span>
            </span>
          </div>
          <span className="flex items-center space-x-1">
            <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-600 rounded">esc</kbd>
            <span>to close</span>
          </span>
        </div>
      </div>
    </motion.div>
  );
};