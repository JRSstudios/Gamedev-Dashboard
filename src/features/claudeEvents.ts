/** Opens the Claude dialog from anywhere; App listens for this event. */
export const askClaude = (preset: 'research' | 'suggest' | 'unity') => window.dispatchEvent(new CustomEvent('gd-claude', { detail: { preset } }))
