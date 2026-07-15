// Common English words for typing test
const commonWords = [
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have',
  'it', 'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at',
  'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she',
  'or', 'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what',
  'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me',
  'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take',
  'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other',
  'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also',
  'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way',
  'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us',
  'is', 'was', 'are', 'been', 'has', 'had', 'were', 'said', 'did', 'having',
  'may', 'should', 'could', 'own', 'same', 'through', 'where', 'much', 'before', 'right',
  'too', 'means', 'old', 'any', 'same', 'tell', 'boy', 'follow', 'came', 'show',
  'every', 'good', 'me', 'give', 'our', 'under', 'name', 'very', 'through', 'just',
  'form', 'sentence', 'great', 'think', 'say', 'help', 'low', 'line', 'differ', 'turn',
  'cause', 'much', 'mean', 'before', 'move', 'right', 'boy', 'old', 'too', 'same',
  'she', 'all', 'there', 'when', 'up', 'use', 'your', 'way', 'about', 'many',
  'then', 'them', 'write', 'would', 'like', 'so', 'these', 'her', 'long', 'make',
  'thing', 'see', 'him', 'two', 'has', 'look', 'more', 'day', 'could', 'go',
  'come', 'did', 'number', 'sound', 'no', 'most', 'people', 'my', 'over', 'know'
];

const NO_REPEAT_WINDOW = 20;

export function generateWords(count: number): string[] {
  const words: string[] = [];
  for (let i = 0; i < count; i++) {
    const recentWindow = words.slice(Math.max(0, words.length - NO_REPEAT_WINDOW));
    let candidate: string;
    let attempts = 0;
    do {
      candidate = commonWords[Math.floor(Math.random() * commonWords.length)];
      attempts++;
    } while (recentWindow.includes(candidate) && attempts < 50);
    words.push(candidate);
  }
  return words;
}

export function generateText(wordCount: number): string {
  return generateWords(wordCount).join(' ');
}

// A fixed (never extended mid-test) word list needs enough words that
// nobody runs out before a `seconds`-long timer does — sized for a
// generous 200wpm ceiling, floored at 100 words so short/preset durations
// keep the same amount of text they always had. Only used for duels (see
// generateDuelWordList below) — solo time mode extends its list on the fly
// instead of pre-generating for the whole duration, since for a long
// custom duration that could mean thousands of words rendered at once,
// which made every keystroke re-render the entire list and lag badly.
// Duels can't do that (both players need the identical text up front), so
// their custom duration is capped lower client-side (see Duel.tsx) to keep
// this from producing a similarly huge list.
export function wordsNeededForDuration(seconds: number): number {
  return Math.max(100, Math.ceil((seconds / 60) * 200));
}

// Duels share one fixed word list between both players, generated up front
// (unlike solo time mode, it's never extended mid-test). Words mode just
// needs exactly `value` words; time mode uses the safety sizing above.
export function generateDuelWordList(mode: 'words' | 'time', value: number): string {
  if (mode === 'words') return generateText(value);
  return generateText(wordsNeededForDuration(value));
}
