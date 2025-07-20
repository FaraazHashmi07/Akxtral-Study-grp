import React from 'react';
import { getEmojiDisplayProps } from '../../utils/emojiUtils';

interface EmojiTextProps {
  content: string;
  className?: string;
}

export const EmojiText: React.FC<EmojiTextProps> = ({ content, className = '' }) => {
  const emojiProps = getEmojiDisplayProps(content);
  
  return (
    <span 
      className={`${emojiProps.className} ${className}`.trim()}
      style={emojiProps.style}
      dangerouslySetInnerHTML={{ __html: emojiProps.content }}
    />
  );
};
