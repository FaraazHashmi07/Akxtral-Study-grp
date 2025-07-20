/**
 * Utility functions for emoji handling and display
 */

/**
 * Enhances text content by wrapping emojis in spans with proper styling
 * This ensures emojis display consistently across different browsers and devices
 */
export const enhanceEmojiDisplay = (text: string): string => {
  // Regex to match emoji characters (Unicode ranges for emojis)
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{238C}-\u{2454}]|[\u{20D0}-\u{20FF}]/gu;
  
  return text.replace(emojiRegex, (emoji) => {
    return `<span class="emoji" style="font-family: 'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif; font-size: 1.1em; line-height: 1;">${emoji}</span>`;
  });
};

/**
 * Checks if a string contains only emojis (for large emoji display)
 */
export const isOnlyEmojis = (text: string): boolean => {
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{238C}-\u{2454}]|[\u{20D0}-\u{20FF}]/gu;
  const withoutEmojis = text.replace(emojiRegex, '').trim();
  return withoutEmojis === '' && text.trim() !== '';
};

/**
 * Counts the number of emojis in a string
 */
export const countEmojis = (text: string): number => {
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F900}-\u{1F9FF}]|[\u{1F018}-\u{1F270}]|[\u{238C}-\u{2454}]|[\u{20D0}-\u{20FF}]/gu;
  const matches = text.match(emojiRegex);
  return matches ? matches.length : 0;
};

/**
 * Get the appropriate CSS class and style for emoji display
 */
export const getEmojiDisplayProps = (content: string) => {
  const emojiCount = countEmojis(content);
  const onlyEmojis = isOnlyEmojis(content);

  // If message contains only 1-3 emojis, display them larger
  if (onlyEmojis && emojiCount <= 3) {
    return {
      className: "emoji-large",
      style: {
        fontSize: '2.5em',
        lineHeight: '1.2',
        fontFamily: "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif"
      },
      content: content
    };
  }

  // Regular message with enhanced emoji display
  return {
    className: "",
    style: {},
    content: enhanceEmojiDisplay(content)
  };
};
