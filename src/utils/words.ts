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
