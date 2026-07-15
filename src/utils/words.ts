// Word lists for the typing test, in three nested sizes (each smaller
// list is a strict prefix/subset of the next), all lowercase, unique, no
// single-letter entries. WORDS_300 is Fry's First 300 Instant Words (a
// well-known most-common-English-words list). WORDS_1000 and WORDS_2500
// extend it with the next most frequent words from a subtitle-derived
// English frequency corpus, cross-checked against a general dictionary and
// name/place-name lists to screen out character names, place names, and
// corpus artifacts that would otherwise leak in from that source.
export const WORDS_300 = [
  'the', 'of', 'and', 'to', 'in', 'is', 'you', 'that', 'it', 'he',
  'was', 'for', 'on', 'are', 'as', 'with', 'his', 'they', 'at', 'be',
  'this', 'have', 'from', 'or', 'one', 'had', 'by', 'word', 'but', 'not',
  'what', 'all', 'were', 'we', 'when', 'your', 'can', 'said', 'there', 'use',
  'each', 'which', 'she', 'do', 'how', 'their', 'if', 'will', 'up', 'other',
  'about', 'out', 'many', 'then', 'them', 'these', 'so', 'some', 'her', 'would',
  'make', 'like', 'him', 'into', 'time', 'has', 'look', 'two', 'more', 'write',
  'go', 'see', 'number', 'no', 'way', 'could', 'people', 'my', 'than', 'first',
  'water', 'been', 'call', 'who', 'oil', 'its', 'now', 'find', 'long', 'down',
  'day', 'did', 'get', 'come', 'made', 'may', 'part', 'over', 'new', 'sound',
  'take', 'only', 'little', 'work', 'know', 'place', 'year', 'live', 'me', 'back',
  'give', 'most', 'very', 'after', 'thing', 'our', 'just', 'name', 'good', 'sentence',
  'man', 'think', 'say', 'great', 'where', 'help', 'through', 'much', 'before', 'line',
  'right', 'too', 'mean', 'old', 'any', 'same', 'tell', 'boy', 'follow', 'came',
  'want', 'show', 'also', 'around', 'form', 'three', 'small', 'set', 'put', 'end',
  'does', 'another', 'well', 'large', 'must', 'big', 'even', 'such', 'because', 'turn',
  'here', 'why', 'ask', 'went', 'men', 'read', 'need', 'land', 'different', 'home',
  'us', 'move', 'try', 'kind', 'hand', 'picture', 'again', 'change', 'off', 'play',
  'spell', 'air', 'away', 'animal', 'house', 'point', 'page', 'letter', 'mother', 'answer',
  'found', 'study', 'still', 'learn', 'should', 'area', 'world', 'high', 'every', 'near',
  'add', 'food', 'between', 'own', 'below', 'country', 'plant', 'last', 'school', 'father',
  'keep', 'tree', 'never', 'start', 'city', 'earth', 'eye', 'light', 'thought', 'head',
  'under', 'story', 'saw', 'left', 'few', 'while', 'along', 'might', 'close', 'something',
  'seem', 'next', 'hard', 'open', 'example', 'begin', 'life', 'always', 'those', 'both',
  'paper', 'together', 'got', 'group', 'often', 'run', 'important', 'until', 'children', 'side',
  'feet', 'car', 'mile', 'night', 'walk', 'white', 'sea', 'began', 'grow', 'took',
  'river', 'four', 'carry', 'state', 'once', 'book', 'hear', 'stop', 'without', 'second',
  'later', 'miss', 'idea', 'enough', 'eat', 'face', 'watch', 'far', 'native', 'really',
  'almost', 'let', 'above', 'girl', 'sometimes', 'mountain', 'cut', 'young', 'talk', 'soon',
  'list', 'song', 'being', 'leave', 'family', 'body', 'music', 'color', 'stand', 'sun',
];

export const WORDS_1000 = [
  'the', 'of', 'and', 'to', 'in', 'is', 'you', 'that', 'it', 'he',
  'was', 'for', 'on', 'are', 'as', 'with', 'his', 'they', 'at', 'be',
  'this', 'have', 'from', 'or', 'one', 'had', 'by', 'word', 'but', 'not',
  'what', 'all', 'were', 'we', 'when', 'your', 'can', 'said', 'there', 'use',
  'each', 'which', 'she', 'do', 'how', 'their', 'if', 'will', 'up', 'other',
  'about', 'out', 'many', 'then', 'them', 'these', 'so', 'some', 'her', 'would',
  'make', 'like', 'him', 'into', 'time', 'has', 'look', 'two', 'more', 'write',
  'go', 'see', 'number', 'no', 'way', 'could', 'people', 'my', 'than', 'first',
  'water', 'been', 'call', 'who', 'oil', 'its', 'now', 'find', 'long', 'down',
  'day', 'did', 'get', 'come', 'made', 'may', 'part', 'over', 'new', 'sound',
  'take', 'only', 'little', 'work', 'know', 'place', 'year', 'live', 'me', 'back',
  'give', 'most', 'very', 'after', 'thing', 'our', 'just', 'name', 'good', 'sentence',
  'man', 'think', 'say', 'great', 'where', 'help', 'through', 'much', 'before', 'line',
  'right', 'too', 'mean', 'old', 'any', 'same', 'tell', 'boy', 'follow', 'came',
  'want', 'show', 'also', 'around', 'form', 'three', 'small', 'set', 'put', 'end',
  'does', 'another', 'well', 'large', 'must', 'big', 'even', 'such', 'because', 'turn',
  'here', 'why', 'ask', 'went', 'men', 'read', 'need', 'land', 'different', 'home',
  'us', 'move', 'try', 'kind', 'hand', 'picture', 'again', 'change', 'off', 'play',
  'spell', 'air', 'away', 'animal', 'house', 'point', 'page', 'letter', 'mother', 'answer',
  'found', 'study', 'still', 'learn', 'should', 'area', 'world', 'high', 'every', 'near',
  'add', 'food', 'between', 'own', 'below', 'country', 'plant', 'last', 'school', 'father',
  'keep', 'tree', 'never', 'start', 'city', 'earth', 'eye', 'light', 'thought', 'head',
  'under', 'story', 'saw', 'left', 'few', 'while', 'along', 'might', 'close', 'something',
  'seem', 'next', 'hard', 'open', 'example', 'begin', 'life', 'always', 'those', 'both',
  'paper', 'together', 'got', 'group', 'often', 'run', 'important', 'until', 'children', 'side',
  'feet', 'car', 'mile', 'night', 'walk', 'white', 'sea', 'began', 'grow', 'took',
  'river', 'four', 'carry', 'state', 'once', 'book', 'hear', 'stop', 'without', 'second',
  'later', 'miss', 'idea', 'enough', 'eat', 'face', 'watch', 'far', 'native', 'really',
  'almost', 'let', 'above', 'girl', 'sometimes', 'mountain', 'cut', 'young', 'talk', 'soon',
  'list', 'song', 'being', 'leave', 'family', 'body', 'music', 'color', 'stand', 'sun',
  'oh', 'yes', 'going', 'an', 'okay', 'hey', 'please', 'sorry', 'am', 'thank',
  'doing', 'sure', 'anything', 'nothing', 'sir', 'god', 'uh', 'maybe', 'won', 'better',
  'everything', 'told', 'things', 'years', 'money', 'ever', 'feel', 'guys', 'lot', 'done',
  'hello', 'nice', 'believe', 'someone', 'fine', 'thanks', 'wanted', 'coming', 'ok', 'course',
  'stay', 'dad', 'happened', 'wrong', 'bad', 'today', 'listen', 'understand', 'remember', 'kill',
  'talking', 'getting', 'care', 'looking', 'woman', 'hi', 'dead', 'mind', 'friend', 'best',
  'mom', 'hell', 'morning', 'trying', 'yourself', 'real', 'baby', 'room', 'already', 'seen',
  'actually', 'huh', 'heard', 'ready', 'called', 'used', 'knew', 'hold', 'door', 'brother',
  'pretty', 'bit', 'yet', 'whole', 'since', 'wife', 'days', 'guess', 'tomorrow', 'matter',
  'meet', 'bring', 'tonight', 'everyone', 'ah', 'alone', 'myself', 'gone', 'um', 'saying',
  'phone', 'looks', 'problem', 'friends', 'ago', 'anyone', 'killed', 'lost', 'police', 'excuse',
  'business', 'wants', 'says', 'true', 'die', 'heart', 'worry', 'having', 'probably', 'beautiful',
  'doctor', 'sit', 'thinking', 'working', 'person', 'kids', 'late', 'stuff', 'exactly', 'death',
  'minute', 'pay', 'crazy', 'forget', 'everybody', 'kid', 'gave', 'happen', 'damn', 'five',
  'drink', 'knows', 'whatever', 'eyes', 'shut', 'hit', 'taking', 'easy', 'times', 'check',
  'hands', 'minutes', 'deal', 'means', 'inside', 'makes', 'asked', 'somebody', 'mine', 'making',
  'afraid', 'sleep', 'dear', 'quite', 'anyway', 'party', 'fun', 'against', 'comes', 'shall',
  'daughter', 'least', 'waiting', 'hurt', 'wish', 'moment', 'fight', 'week', 'husband', 'girls',
  'rest', 'married', 'fire', 'game', 'nobody', 'though', 'started', 'sister', 'supposed', 'child',
  'goes', 'hours', 'speak', 'women', 'behind', 'truth', 'blood', 'able', 'lady', 'anymore',
  'playing', 'gets', 'shot', 'reason', 'trouble', 'break', 'war', 'trust', 'met', 'office',
  'question', 'brought', 'yours', 'welcome', 'wow', 'couple', 'half', 'died', 'cool', 'free',
  'either', 'seems', 'power', 'whoa', 'bye', 'buy', 'telling', 'tried', 'front', 'team',
  'gun', 'boys', 'send', 'news', 'stupid', 'bed', 'hurry', 'full', 'months', 'save',
  'become', 'hate', 'outside', 'needs', 'dog', 'clear', 'order', 'fact', 'lord', 'captain',
  'six', 'hot', 'funny', 'black', 'alive', 'pick', 'feeling', 'living', 'ahead', 'lose',
  'plan', 'dinner', 'sighs', 'sort', 'leaving', 'running', 'boss', 'alright', 'promise', 'taken',
  'safe', 'ma', 'sent', 'hour', 'anybody', 'perfect', 'lives', 'special', 'parents', 'himself',
  'perhaps', 'sounds', 'serious', 'sick', 'company', 'ha', 'scared', 'uncle', 'poor', 'past',
  'possible', 'shoot', 'touch', 'top', 'laughs', 'cannot', 'asking', 'control', 'human', 'drive',
  'hair', 'luck', 'murder', 'happens', 'ten', 'daddy', 'finally', 'chuckles', 'fast', 'cold',
  'laughing', 'words', 'hospital', 'street', 'hang', 'dance', 'meeting', 'till', 'others', 'catch',
  'sense', 'lie', 'evening', 'master', 'known', 'dream', 'million', 'voice', 'sweet', 'rather',
  'felt', 'sign', 'somewhere', 'bet', 'longer', 'calling', 'worked', 'quiet', 'looked', 'less',
  'pull', 'beat', 'careful', 'coffee', 'return', 'secret', 'weeks', 'date', 'seeing', 'fall',
  'given', 'ooh', 'fault', 'straight', 'takes', 'future', 'gentlemen', 'loved', 'changed', 'road',
  'calm', 'wonderful', 'mad', 'turned', 'drop', 'ladies', 'step', 'absolutely', 'early', 'explain',
  'clean', 'piece', 'yesterday', 'throw', 'wonder', 'questions', 'speaking', 'darling', 'dude', 'giving',
  'president', 'quick', 'moving', 'figure', 'strong', 'none', 'amazing', 'ones', 'works', 'act',
  'needed', 'weird', 'law', 'worried', 'report', 'goodbye', 'missing', 'choice', 'happening', 'chief',
  'wedding', 'strange', 'general', 'pain', 'kidding', 'decided', 'pass', 'tired', 'class', 'officer',
  'kept', 'worse', 'busy', 'eh', 'mistake', 'kiss', 'court', 'building', 'finish', 'during',
  'age', 'ship', 'caught', 'meant', 'sell', 'dark', 'watching', 'system', 'suppose', 'evidence',
  'movie', 'ride', 'completely', 'mouth', 'totally', 'birthday', 'tv', 'forgive', 'born', 'imagine',
  'information', 'instead', 'definitely', 'security', 'certainly', 'film', 'month', 'lying', 'unless', 'train',
  'seven', 'wear', 'clothes', 'hotel', 'christmas', 'attack', 'round', 'expect', 'sing', 'terrible',
  'bag', 'history', 'blue', 'broke', 'station', 'seriously', 'forever', 'except', 'thinks', 'message',
  'entire', 'table', 'talked', 'across', 'lovely', 'handle', 'middle', 'paid', 'protect', 'using',
  'floor', 'ran', 'swear', 'spend', 'situation', 'ring', 'anywhere', 'dangerous', 'york', 'army',
  'lead', 'bought', 'finished', 'fair', 'fool', 'attention', 'club', 'simple', 'interesting', 'space',
  'test', 'box', 'single', 'sitting', 'marriage', 'join', 'fear', 'peace', 'forgot', 'force',
  'short', 'normal', 'present', 'enjoy', 'crime', 'horse', 'ground', 'american', 'count', 'charge',
  'lunch', 'radio', 'idiot', 'ball', 'surprise', 'key', 'boat', 'quickly', 'gold', 'bar',
  'fish', 'wearing', 'crying', 'accident', 'government', 'eight', 'fell', 'cover', 'certain', 'interested',
  'deep', 'agree', 'problems', 'detective', 'prison', 'stick', 'offer', 'difficult', 'smart', 'personal',
  'record', 'stopped', 'hide', 'whether', 'bank', 'relax', 'public', 'afternoon', 'brain', 'fix',
  'proud', 'tea', 'service', 'screaming', 'forward', 'angry', 'soul', 'fighting', 'agent', 'blow',
  'dress', 'missed', 'scene', 'killing', 'standing', 'saved', 'mm', 'respect', 'killer', 'ice',
  'mess', 'tough', 'feels', 'church', 'sad', 'cell', 'drunk', 'share', 'camera', 'within',
  'card', 'fly', 'girlfriend', 'laugh', 'smell', 'broken', 'mum', 'honest', 'starting', 'calls',
  'spent', 'third', 'english', 'visit', 'mama', 'judge', 'window', 'hungry', 'dare', 'relationship',
  'moved', 'prove', 'private', 'wall', 'seat', 'position', 'lieutenant', 'realize', 'especially', 'machine',
  'walking', 'pleasure', 'bloody', 'college', 'involved', 'cry', 'became', 'lived', 'impossible', 'obviously',
  'neither', 'accept', 'boyfriend', 'besides', 'queen', 'teacher', 'cops', 'sake', 'loves', 'teach',
  'apartment', 'upset', 'green', 'liked', 'cute', 'evil', 'professor', 'contact', 'joke', 'cop',
  'huge', 'holy', 'store', 'jail', 'likes', 'lawyer', 'doubt', 'continue', 'appreciate', 'shop',
  'driving', 'congratulations', 'wrote', 'village', 'quit', 'field', 'wine', 'decision', 'south', 'sleeping',
  'slow', 'laughter', 'island', 'glass', 'beginning', 'cash', 'dying', 'hundred', 'whose', 'difference',
  'plane', 'push', 'continues', 'singing', 'eating', 'north', 'gift', 'truck', 'putting', 'board',
  'grab', 'beer', 'stuck', 'magic', 'support', 'rules', 'grunts', 'partner', 'reach', 'wind',
];

export const WORDS_2500 = [
  'the', 'of', 'and', 'to', 'in', 'is', 'you', 'that', 'it', 'he',
  'was', 'for', 'on', 'are', 'as', 'with', 'his', 'they', 'at', 'be',
  'this', 'have', 'from', 'or', 'one', 'had', 'by', 'word', 'but', 'not',
  'what', 'all', 'were', 'we', 'when', 'your', 'can', 'said', 'there', 'use',
  'each', 'which', 'she', 'do', 'how', 'their', 'if', 'will', 'up', 'other',
  'about', 'out', 'many', 'then', 'them', 'these', 'so', 'some', 'her', 'would',
  'make', 'like', 'him', 'into', 'time', 'has', 'look', 'two', 'more', 'write',
  'go', 'see', 'number', 'no', 'way', 'could', 'people', 'my', 'than', 'first',
  'water', 'been', 'call', 'who', 'oil', 'its', 'now', 'find', 'long', 'down',
  'day', 'did', 'get', 'come', 'made', 'may', 'part', 'over', 'new', 'sound',
  'take', 'only', 'little', 'work', 'know', 'place', 'year', 'live', 'me', 'back',
  'give', 'most', 'very', 'after', 'thing', 'our', 'just', 'name', 'good', 'sentence',
  'man', 'think', 'say', 'great', 'where', 'help', 'through', 'much', 'before', 'line',
  'right', 'too', 'mean', 'old', 'any', 'same', 'tell', 'boy', 'follow', 'came',
  'want', 'show', 'also', 'around', 'form', 'three', 'small', 'set', 'put', 'end',
  'does', 'another', 'well', 'large', 'must', 'big', 'even', 'such', 'because', 'turn',
  'here', 'why', 'ask', 'went', 'men', 'read', 'need', 'land', 'different', 'home',
  'us', 'move', 'try', 'kind', 'hand', 'picture', 'again', 'change', 'off', 'play',
  'spell', 'air', 'away', 'animal', 'house', 'point', 'page', 'letter', 'mother', 'answer',
  'found', 'study', 'still', 'learn', 'should', 'area', 'world', 'high', 'every', 'near',
  'add', 'food', 'between', 'own', 'below', 'country', 'plant', 'last', 'school', 'father',
  'keep', 'tree', 'never', 'start', 'city', 'earth', 'eye', 'light', 'thought', 'head',
  'under', 'story', 'saw', 'left', 'few', 'while', 'along', 'might', 'close', 'something',
  'seem', 'next', 'hard', 'open', 'example', 'begin', 'life', 'always', 'those', 'both',
  'paper', 'together', 'got', 'group', 'often', 'run', 'important', 'until', 'children', 'side',
  'feet', 'car', 'mile', 'night', 'walk', 'white', 'sea', 'began', 'grow', 'took',
  'river', 'four', 'carry', 'state', 'once', 'book', 'hear', 'stop', 'without', 'second',
  'later', 'miss', 'idea', 'enough', 'eat', 'face', 'watch', 'far', 'native', 'really',
  'almost', 'let', 'above', 'girl', 'sometimes', 'mountain', 'cut', 'young', 'talk', 'soon',
  'list', 'song', 'being', 'leave', 'family', 'body', 'music', 'color', 'stand', 'sun',
  'oh', 'yes', 'going', 'an', 'okay', 'hey', 'please', 'sorry', 'am', 'thank',
  'doing', 'sure', 'anything', 'nothing', 'sir', 'god', 'uh', 'maybe', 'won', 'better',
  'everything', 'told', 'things', 'years', 'money', 'ever', 'feel', 'guys', 'lot', 'done',
  'hello', 'nice', 'believe', 'someone', 'fine', 'thanks', 'wanted', 'coming', 'ok', 'course',
  'stay', 'dad', 'happened', 'wrong', 'bad', 'today', 'listen', 'understand', 'remember', 'kill',
  'talking', 'getting', 'care', 'looking', 'woman', 'hi', 'dead', 'mind', 'friend', 'best',
  'mom', 'hell', 'morning', 'trying', 'yourself', 'real', 'baby', 'room', 'already', 'seen',
  'actually', 'huh', 'heard', 'ready', 'called', 'used', 'knew', 'hold', 'door', 'brother',
  'pretty', 'bit', 'yet', 'whole', 'since', 'wife', 'days', 'guess', 'tomorrow', 'matter',
  'meet', 'bring', 'tonight', 'everyone', 'ah', 'alone', 'myself', 'gone', 'um', 'saying',
  'phone', 'looks', 'problem', 'friends', 'ago', 'anyone', 'killed', 'lost', 'police', 'excuse',
  'business', 'wants', 'says', 'true', 'die', 'heart', 'worry', 'having', 'probably', 'beautiful',
  'doctor', 'sit', 'thinking', 'working', 'person', 'kids', 'late', 'stuff', 'exactly', 'death',
  'minute', 'pay', 'crazy', 'forget', 'everybody', 'kid', 'gave', 'happen', 'damn', 'five',
  'drink', 'knows', 'whatever', 'eyes', 'shut', 'hit', 'taking', 'easy', 'times', 'check',
  'hands', 'minutes', 'deal', 'means', 'inside', 'makes', 'asked', 'somebody', 'mine', 'making',
  'afraid', 'sleep', 'dear', 'quite', 'anyway', 'party', 'fun', 'against', 'comes', 'shall',
  'daughter', 'least', 'waiting', 'hurt', 'wish', 'moment', 'fight', 'week', 'husband', 'girls',
  'rest', 'married', 'fire', 'game', 'nobody', 'though', 'started', 'sister', 'supposed', 'child',
  'goes', 'hours', 'speak', 'women', 'behind', 'truth', 'blood', 'able', 'lady', 'anymore',
  'playing', 'gets', 'shot', 'reason', 'trouble', 'break', 'war', 'trust', 'met', 'office',
  'question', 'brought', 'yours', 'welcome', 'wow', 'couple', 'half', 'died', 'cool', 'free',
  'either', 'seems', 'power', 'whoa', 'bye', 'buy', 'telling', 'tried', 'front', 'team',
  'gun', 'boys', 'send', 'news', 'stupid', 'bed', 'hurry', 'full', 'months', 'save',
  'become', 'hate', 'outside', 'needs', 'dog', 'clear', 'order', 'fact', 'lord', 'captain',
  'six', 'hot', 'funny', 'black', 'alive', 'pick', 'feeling', 'living', 'ahead', 'lose',
  'plan', 'dinner', 'sighs', 'sort', 'leaving', 'running', 'boss', 'alright', 'promise', 'taken',
  'safe', 'ma', 'sent', 'hour', 'anybody', 'perfect', 'lives', 'special', 'parents', 'himself',
  'perhaps', 'sounds', 'serious', 'sick', 'company', 'ha', 'scared', 'uncle', 'poor', 'past',
  'possible', 'shoot', 'touch', 'top', 'laughs', 'cannot', 'asking', 'control', 'human', 'drive',
  'hair', 'luck', 'murder', 'happens', 'ten', 'daddy', 'finally', 'chuckles', 'fast', 'cold',
  'laughing', 'words', 'hospital', 'street', 'hang', 'dance', 'meeting', 'till', 'others', 'catch',
  'sense', 'lie', 'evening', 'master', 'known', 'dream', 'million', 'voice', 'sweet', 'rather',
  'felt', 'sign', 'somewhere', 'bet', 'longer', 'calling', 'worked', 'quiet', 'looked', 'less',
  'pull', 'beat', 'careful', 'coffee', 'return', 'secret', 'weeks', 'date', 'seeing', 'fall',
  'given', 'ooh', 'fault', 'straight', 'takes', 'future', 'gentlemen', 'loved', 'changed', 'road',
  'calm', 'wonderful', 'mad', 'turned', 'drop', 'ladies', 'step', 'absolutely', 'early', 'explain',
  'clean', 'piece', 'yesterday', 'throw', 'wonder', 'questions', 'speaking', 'darling', 'dude', 'giving',
  'president', 'quick', 'moving', 'figure', 'strong', 'none', 'amazing', 'ones', 'works', 'act',
  'needed', 'weird', 'law', 'worried', 'report', 'goodbye', 'missing', 'choice', 'happening', 'chief',
  'wedding', 'strange', 'general', 'pain', 'kidding', 'decided', 'pass', 'tired', 'class', 'officer',
  'kept', 'worse', 'busy', 'eh', 'mistake', 'kiss', 'court', 'building', 'finish', 'during',
  'age', 'ship', 'caught', 'meant', 'sell', 'dark', 'watching', 'system', 'suppose', 'evidence',
  'movie', 'ride', 'completely', 'mouth', 'totally', 'birthday', 'tv', 'forgive', 'born', 'imagine',
  'information', 'instead', 'definitely', 'security', 'certainly', 'film', 'month', 'lying', 'unless', 'train',
  'seven', 'wear', 'clothes', 'hotel', 'christmas', 'attack', 'round', 'expect', 'sing', 'terrible',
  'bag', 'history', 'blue', 'broke', 'station', 'seriously', 'forever', 'except', 'thinks', 'message',
  'entire', 'table', 'talked', 'across', 'lovely', 'handle', 'middle', 'paid', 'protect', 'using',
  'floor', 'ran', 'swear', 'spend', 'situation', 'ring', 'anywhere', 'dangerous', 'york', 'army',
  'lead', 'bought', 'finished', 'fair', 'fool', 'attention', 'club', 'simple', 'interesting', 'space',
  'test', 'box', 'single', 'sitting', 'marriage', 'join', 'fear', 'peace', 'forgot', 'force',
  'short', 'normal', 'present', 'enjoy', 'crime', 'horse', 'ground', 'american', 'count', 'charge',
  'lunch', 'radio', 'idiot', 'ball', 'surprise', 'key', 'boat', 'quickly', 'gold', 'bar',
  'fish', 'wearing', 'crying', 'accident', 'government', 'eight', 'fell', 'cover', 'certain', 'interested',
  'deep', 'agree', 'problems', 'detective', 'prison', 'stick', 'offer', 'difficult', 'smart', 'personal',
  'record', 'stopped', 'hide', 'whether', 'bank', 'relax', 'public', 'afternoon', 'brain', 'fix',
  'proud', 'tea', 'service', 'screaming', 'forward', 'angry', 'soul', 'fighting', 'agent', 'blow',
  'dress', 'missed', 'scene', 'killing', 'standing', 'saved', 'mm', 'respect', 'killer', 'ice',
  'mess', 'tough', 'feels', 'church', 'sad', 'cell', 'drunk', 'share', 'camera', 'within',
  'card', 'fly', 'girlfriend', 'laugh', 'smell', 'broken', 'mum', 'honest', 'starting', 'calls',
  'spent', 'third', 'english', 'visit', 'mama', 'judge', 'window', 'hungry', 'dare', 'relationship',
  'moved', 'prove', 'private', 'wall', 'seat', 'position', 'lieutenant', 'realize', 'especially', 'machine',
  'walking', 'pleasure', 'bloody', 'college', 'involved', 'cry', 'became', 'lived', 'impossible', 'obviously',
  'neither', 'accept', 'boyfriend', 'besides', 'queen', 'teacher', 'cops', 'sake', 'loves', 'teach',
  'apartment', 'upset', 'green', 'liked', 'cute', 'evil', 'professor', 'contact', 'joke', 'cop',
  'huge', 'holy', 'store', 'jail', 'likes', 'lawyer', 'doubt', 'continue', 'appreciate', 'shop',
  'driving', 'congratulations', 'wrote', 'village', 'quit', 'field', 'wine', 'decision', 'south', 'sleeping',
  'slow', 'laughter', 'island', 'glass', 'beginning', 'cash', 'dying', 'hundred', 'whose', 'difference',
  'plane', 'push', 'continues', 'singing', 'eating', 'north', 'gift', 'truck', 'putting', 'board',
  'grab', 'beer', 'stuck', 'magic', 'support', 'rules', 'grunts', 'partner', 'reach', 'wind',
  'colonel', 'immediately', 'seconds', 'thousand', 'gives', 'experience', 'cheers', 'victim', 'upon', 'computer',
  'planet', 'promised', 'bus', 'dirty', 'search', 'staying', 'dreams', 'arrest', 'holding', 'suddenly',
  'usually', 'lots', 'shoes', 'jump', 'rid', 'yo', 'knock', 'owe', 'worst', 'aunt',
  'patient', 'kitchen', 'aah', 'fat', 'passed', 'final', 'summer', 'listening', 'escape', 'everywhere',
  'moon', 'arms', 'turns', 'address', 'ow', 'match', 'gasps', 'grand', 'yep', 'shh',
  'nervous', 'choose', 'themselves', 'decide', 'mate', 'drinking', 'press', 'bother', 'foot', 'blame',
  'drugs', 'type', 'rings', 'mission', 'named', 'heaven', 'picked', 'race', 'risk', 'books',
  'further', 'action', 'allowed', 'orders', 'learned', 'arrived', 'otherwise', 'pictures', 'fit', 'smoke',
  'favor', 'played', 'notice', 'awesome', 'smile', 'director', 'guard', 'spot', 'surprised', 'innocent',
  'narrator', 'herself', 'feelings', 'enemy', 'battle', 'ourselves', 'dollars', 'allow', 'nine', 'department',
  'guilty', 'apart', 'earlier', 'duty', 'suit', 'legs', 'hero', 'destroy', 'stage', 'bunch',
  'according', 'chicken', 'bigger', 'grunting', 'low', 'helping', 'admit', 'closed', 'names', 'witness',
  'upstairs', 'arm', 'steal', 'kick', 'twice', 'cross', 'ways', 'indeed', 'gas', 'keeping',
  'energy', 'pregnant', 'waste', 'helped', 'fired', 'favorite', 'taste', 'locked', 'places', 'writing',
  'brothers', 'starts', 'sold', 'silly', 'mention', 'build', 'throat', 'hole', 'figured', 'track',
  'ringing', 'lock', 'leg', 'hiding', 'seemed', 'breakfast', 'engine', 'written', 'complete', 'video',
  'applause', 'however', 'pressure', 'fresh', 'weapon', 'stole', 'burn', 'reading', 'crowd', 'treat',
  'roll', 'double', 'spirit', 'danger', 'cost', 'empty', 'level', 'memory', 'itself', 'acting',
  'interest', 'nose', 'plans', 'following', 'bathroom', 'built', 'closer', 'band', 'groans', 'apparently',
  'excited', 'losing', 'animals', 'flight', 'nature', 'raise', 'pop', 'client', 'bomb', 'neck',
  'suspect', 'warm', 'extra', 'bottle', 'heavy', 'dogs', 'wild', 'ridiculous', 'simply', 'showed',
  'shooting', 'keeps', 'camp', 'guns', 'medical', 'shame', 'hoping', 'whom', 'majesty', 'flowers',
  'famous', 'asleep', 'beauty', 'driver', 'keys', 'rain', 'awful', 'local', 'deserve', 'stone',
  'consider', 'weekend', 'wondering', 'plenty', 'willing', 'pants', 'sweetheart', 'skin', 'excellent', 'beach',
  'beg', 'responsible', 'military', 'cheering', 'opportunity', 'common', 'bottom', 'german', 'whoever', 'cook',
  'walked', 'papers', 'justice', 'commander', 'drug', 'main', 'knife', 'devil', 'necessary', 'although',
  'princess', 'lights', 'flying', 'knowing', 'clearly', 'hat', 'agreed', 'corner', 'code', 'note',
  'due', 'correct', 'apologize', 'language', 'stars', 'faster', 'cars', 'folks', 'fellow', 'several',
  'grandma', 'shows', 'leader', 'leaves', 'restaurant', 'east', 'shouting', 'blind', 'ghost', 'cup',
  'gotten', 'tight', 'conversation', 'tells', 'lies', 'nor', 'pulled', 'hanging', 'speed', 'stories',
  'health', 'advice', 'held', 'murdered', 'beyond', 'rule', 'hardly', 'possibly', 'inspector', 'cousin',
  'trial', 'emergency', 'ought', 'somehow', 'hearing', 'states', 'account', 'spoke', 'file', 'understood',
  'tape', 'milk', 'powerful', 'weapons', 'practice', 'manager', 'pardon', 'vote', 'national', 'career',
  'minister', 'super', 'taught', 'biggest', 'plays', 'natural', 'dancing', 'copy', 'plus', 'cake',
  'freedom', 'among', 'breath', 'operation', 'crew', 'challenge', 'market', 'meat', 'towards', 'bringing',
  'dropped', 'student', 'lied', 'strength', 'size', 'breathe', 'monster', 'loud', 'photo', 'aw',
  'nearly', 'sight', 'greatest', 'games', 'bridge', 'dressed', 'arrested', 'horrible', 'coach', 'planning',
  'checked', 'breaking', 'noticed', 'fantastic', 'screams', 'serve', 'ideas', 'investigation', 'center', 'older',
  'pack', 'soldiers', 'nonsense', 'doc', 'project', 'training', 'trick', 'prepared', 'science', 'united',
  'travel', 'incredible', 'grandpa', 'paying', 'character', 'teeth', 'criminal', 'chinese', 'truly', 'honestly',
  'bro', 'survive', 'target', 'feed', 'nurse', 'fake', 'records', 'breathing', 'sweetie', 'numbers',
  'suicide', 'belong', 'whoo', 'perfectly', 'forgotten', 'remain', 'original', 'papa', 'onto', 'concerned',
  'credit', 'ugh', 'invited', 'discuss', 'research', 'easier', 'view', 'chair', 'hurts', 'strike',
  'fill', 'condition', 'nowhere', 'sheriff', 'turning', 'brown', 'recognize', 'heads', 'audience', 'jealous',
  'pretend', 'society', 'finding', 'shirt', 'comfortable', 'meaning', 'guest', 'pieces', 'dry', 'letting',
  'aye', 'female', 'release', 'cards', 'pray', 'unfortunately', 'balls', 'destroyed', 'ended', 'universe',
  'prepare', 'opinion', 'movies', 'soldier', 'program', 'heat', 'usual', 'ticket', 'stolen', 'prefer',
  'aware', 'surely', 'male', 'base', 'matters', 'lift', 'lab', 'command', 'proof', 'cream',
  'selling', 'believed', 'create', 'afford', 'sunday', 'total', 'dumb', 'threw', 'birth', 'created',
  'realized', 'british', 'noise', 'nuts', 'students', 'birds', 'social', 'brilliant', 'bodies', 'tie',
  'opened', 'ours', 'bucks', 'mister', 'ugly', 'focus', 'opens', 'exist', 'followed', 'draw',
  'purpose', 'letters', 'opening', 'bullet', 'lately', 'stayed', 'falling', 'season', 'ends', 'suggest',
  'distance', 'responsibility', 'whenever', 'issue', 'thousands', 'process', 'sword', 'shower', 'weak', 'lonely',
  'happiness', 'tiny', 'desk', 'pool', 'property', 'forced', 'settle', 'indistinct', 'weight', 'received',
  'gang', 'bite', 'friday', 'disappeared', 'interview', 'expecting', 'surgery', 'horses', 'babe', 'ancient',
  'handsome', 'saturday', 'staff', 'lines', 'unit', 'gentleman', 'introduce', 'fate', 'split', 'recently',
  'expected', 'ordered', 'slowly', 'alarm', 'member', 'slept', 'signed', 'enter', 'spanish', 'garden',
  'brings', 'brave', 'pig', 'model', 'finger', 'medicine', 'access', 'failed', 'flat', 'easily',
  'discovered', 'based', 'screw', 'insane', 'cares', 'weather', 'fingers', 'san', 'path', 'soft',
  'harm', 'style', 'community', 'sees', 'basically', 'signal', 'nope', 'spare', 'speech', 'covered',
  'shake', 'loose', 'snow', 'russian', 'lake', 'bright', 'roof', 'sending', 'paint', 'remind',
  'pal', 'post', 'sugar', 'heading', 'streets', 'damage', 'silence', 'doors', 'success', 'wet',
  'amount', 'members', 'manage', 'safety', 'returned', 'harder', 'fbi', 'block', 'showing', 'chef',
  'contract', 'dig', 'chest', 'drinks', 'buried', 'trade', 'journey', 'stomach', 'changes', 'details',
  'thoughts', 'divorce', 'funeral', 'football', 'reality', 'theory', 'gosh', 'ruined', 'gate', 'spread',
  'japanese', 'sudden', 'coat', 'sooner', 'cheese', 'spring', 'ears', 'castle', 'hidden', 'cos',
  'personally', 'artist', 'exciting', 'permission', 'expensive', 'tickets', 'barely', 'eggs', 'regret', 'lesson',
  'lover', 'bread', 'subject', 'legal', 'growing', 'ill', 'mood', 'owner', 'caused', 'beeping',
  'points', 'dating', 'loss', 'secretary', 'revenge', 'likely', 'rent', 'connection', 'assistant', 'reasons',
  'yelling', 'painting', 'trees', 'doctors', 'rush', 'foreign', 'rough', 'murderer', 'century', 'nights',
  'pair', 'runs', 'pocket', 'farm', 'bike', 'obvious', 'ate', 'grew', 'professional', 'goodness',
  'parts', 'university', 'square', 'grandfather', 'genius', 'cases', 'ruin', 'winter', 'tongue', 'memories',
  'da', 'buying', 'cancer', 'clock', 'ocean', 'liar', 'tour', 'thief', 'bleep', 'rights',
  'including', 'competition', 'planned', 'boring', 'victims', 'mentioned', 'bones', 'bless', 'warning', 'knocking',
  're', 'crash', 'bedroom', 'lower', 'silver', 'groaning', 'madame', 'defense', 'results', 'toilet',
  'event', 'complicated', 'shape', 'priest', 'cheap', 'romantic', 'downstairs', 'invite', 'tears', 'avoid',
  'reached', 'higher', 'familiar', 'telephone', 'burning', 'filled', 'airport', 'jobs', 'grown', 'giant',
  'insurance', 'woods', 'scare', 'pleased', 'period', 'political', 'player', 'stops', 'secrets', 'repeat',
  'photos', 'finds', 'statement', 'younger', 'humans', 'delicious', 'particular', 'proper', 'belongs', 'attacked',
  'bath', 'hired', 'site', 'knowledge', 'led', 'guests', 'celebrate', 'map', 'horn', 'eventually',
  'pity', 'powers', 'ashamed', 'assume', 'glasses', 'rise', 'fixed', 'request', 'officers', 'pounds',
  'data', 'carefully', 'per', 'depends', 'jury', 'waited', 'positive', 'attorney', 'direction', 'families',
  'forces', 'location', 'walls', 'useless', 'saving', 'speaks', 'fought', 'meal', 'deliver', 'answers',
  'changing', 'scary', 'millions', 'offered', 'regular', 'carrying', 'official', 'jacket', 'switch', 'grave',
  'role', 'odd', 'faces', 'becomes', 'closes', 'badly', 'tall', 'confused', 'affair', 'television',
  'shock', 'raised', 'panting', 'pizza', 'image', 'clears', 'golden', 'patients', 'watched', 'committed',
  'suffer', 'wherever', 'plate', 'appear', 'chocolate', 'clever', 'hm', 'shots', 'dealing', 'trap',
  'charges', 'bang', 'poison', 'drove', 'yourselves', 'headed', 'babies', 'yellow', 'soup', 'mystery',
  'picking', 'sat', 'wound', 'traffic', 'courage', 'indian', 'rat', 'terms', 'italian', 'checking',
  'disease', 'managed', 'winner', 'council', 'appointment', 'monday', 'crack', 'threat', 'physical', 'nation',
  'source', 'chose', 'healthy', 'victory', 'stood', 'kicked', 'disgusting', 'palace', 'shopping', 'neighborhood',
  'march', 'lips', 'midnight', 'advantage', 'pure', 'aside', 'jerk', 'mail', 'effect', 'freak',
  'screwed', 'enemies', 'awake', 'chuckling', 'vacation', 'violence', 'grandmother', 'modern', 'firm', 'prime',
  'heh', 'touched', 'talent', 'piano', 'license', 'cooking', 'honour', 'concern', 'moves', 'available',
  'factory', 'gods', 'value', 'central', 'union', 'mirror', 'studio', 'media', 'taxi', 'dies',
  'iron', 'hearts', 'desire', 'songs', 'monkey', 'pride', 'pills', 'miracle', 'swim', 'burned',
  'smells', 'joking', 'bleeding', 'hook', 'beating', 'protection', 'treatment', 'ear', 'metal', 'disappear',
  'grateful', 'extremely', 'treasure', 'rescue', 'capable', 'passing', 'chatter', 'result', 'suffering', 'sisters',
  'laid', 'governor', 'guards', 'text', 'literally', 'remove', 'becoming', 'performance', 'stronger', 'rate',
  'deeply', 'scream', 'desert', 'vehicle', 'illegal', 'pulling', 'throwing', 'unbelievable', 'zero', 'curious',
  'bone', 'tied', 'edge', 'load', 'mountains', 'boom', 'former', 'holiday', 'riding', 'scoffs',
  'hundreds', 'bags', 'stealing', 'appears', 'arrive', 'remains', 'decent', 'issues', 'tip', 'fail',
  'claim', 'friendship', 'desperate', 'dramatic', 'refuse', 'solve', 'theme', 'loving', 'properly', 'dragon',
  'mostly', 'directly', 'surface', 'false', 'cast', 'junior', 'hunting', 'silent', 'thou', 'egg',
  'punch', 'woke', 'intelligence', 'borrow', 'winning', 'falls', 'popular', 'escaped', 'witch', 'convinced',
  'warn', 'announcer', 'champagne', 'dust', 'someday', 'fallen', 'stranger', 'presence', 'tear', 'internet',
  'therefore', 'technology', 'tires', 'toast', 'wise', 'americans', 'notes', 'smoking', 'precious', 'rooms',
  'coast', 'treated', 'material', 'released', 'uniform', 'hated', 'considered', 'exchange', 'steps', 'convince',
  'beast', 'cow', 'files', 'signs', 'drag', 'cab', 'hung', 'carried', 'ordinary', 'successful',
  'mistakes', 'houses', 'chattering', 'brains', 'creature', 'fourth', 'separate', 'cleaning', 'shift', 'exact',
  'goal', 'expert', 'served', 'direct', 'score', 'marks', 'twenty', 'receive', 'series', 'section',
  'pilot', 'darkness', 'sale', 'destiny', 'cure', 'spoken', 'armed', 'rare', 'grade', 'juice',
  'wide', 'tower', 'solution', 'schedule', 'explosion', 'wheel', 'cigarette', 'fruit', 'blew', 'talks',
  'sacrifice', 'range', 'button', 'reports', 'prisoner', 'pie', 'effort', 'youth', 'pot', 'eaten',
  'knees', 'garage', 'parking', 'ambulance', 'staring', 'chances', 'circumstances', 'sin', 'progress', 'unusual',
  'county', 'stairs', 'campaign', 'vision', 'reporter', 'equipment', 'moments', 'mass', 'alien', 'trapped',
  'helps', 'route', 'defend', 'nasty', 'tests', 'magazine', 'rocks', 'dump', 'rude', 'searching',
  'clue', 'connected', 'amen', 'pushed', 'zone', 'senior', 'closing', 'freeze', 'emperor', 'incident',
  'snake', 'actor', 'newspaper', 'leading', 'friendly', 'chosen', 'engaged', 'charming', 'anger', 'spending',
  'learning', 'spy', 'sharp', 'warrant', 'elevator', 'kingdom', 'squad', 'shoulder', 'wave', 'highness',
  'kinds', 'fishing', 'sometime', 'attitude', 'negative', 'screen', 'workers', 'bored', 'cameras', 'similar',
  'understanding', 'beeps', 'chain', 'bull', 'gasping', 'fully', 'collect', 'gorgeous', 'passion', 'writer',
  'empire', 'international', 'curse', 'hire', 'bastards', 'puts', 'leads', 'blows', 'sons', 'estate',
  'customers', 'gunshot', 'device', 'troops', 'hug', 'design', 'movement', 'thunder', 'object', 'loser',
  'sobbing', 'politics', 'despite', 'alcohol', 'climb', 'clients', 'conference', 'provide', 'seek', 'witnesses',
  'earn', 'trash', 'valley', 'fashion', 'episode', 'prize', 'previously', 'sports', 'wanting', 'debt',
  'wishes', 'wire', 'thee', 'circle', 'approach', 'stock', 'facts', 'remembered', 'percent', 'normally',
  'tail', 'joined', 'education', 'bravo', 'library', 'wings', 'growling', 'thrown', 'tank', 'exhales',
  'authority', 'current', 'failure', 'nightmare', 'hitting', 'knocked', 'studying', 'agency', 'apple', 'border',
  'rope', 'duck', 'reputation', 'confidence', 'beloved', 'lack', 'actual', 'skills', 'films', 'mental',
  'salt', 'flesh', 'secure', 'highly', 'federal', 'sand', 'emotional', 'setting', 'senator', 'services',
  'robbery', 'hates', 'fed', 'reward', 'theater', 'commit', 'entirely', 'extraordinary', 'ships', 'opposite',
  'parties', 'stands', 'chat', 'events', 'mummy', 'slip', 'disappointed', 'settled', 'begins', 'alert',
  'detail', 'pink', 'fellas', 'accepted', 'background', 'garbage', 'panic', 'minds', 'belt', 'blowing',
  'agreement', 'pushing', 'ability', 'tiger', 'whispering', 'culture', 'saint', 'task', 'solid', 'intend',
  'district', 'gee', 'custody', 'ignore', 'naturally', 'useful', 'attempt', 'abandoned', 'cutting', 'kissed',
  'guarantee', 'barking', 'gather', 'policy', 'violent', 'maid', 'embarrassing', 'childhood', 'wasting', 'bow',
  'chick', 'disaster', 'revolution', 'online', 'demon', 'heavily', 'coincidence', 'perform', 'thin', 'terrific',
  'crown', 'identity', 'virgin', 'impressive', 'windows', 'potential', 'guitar', 'committee', 'dozen', 'delivery',
  'advance', 'quietly', 'teaching', 'latest', 'hurting', 'swing', 'capital', 'counting', 'dirt', 'whistle',
  'hits', 'urgent', 'threatened', 'behavior', 'mixed', 'stays', 'assure', 'explanation', 'wins', 'unique',
  'chasing', 'billion', 'production', 'slave', 'agents', 'lets', 'cruel', 'mask', 'behave', 'bury',
  'massive', 'pathetic', 'species', 'approaching', 'loan', 'struggle', 'dish', 'trusted', 'jumped', 'firing',
  'channel', 'stopping', 'asks', 'swimming', 'daily', 'basement', 'quarter', 'bound', 'navy', 'article',
  'guide', 'accused', 'transfer', 'guts', 'quality', 'fella', 'greater', 'damned', 'couch', 'cheer',
  'shoe', 'title', 'shy', 'punishment', 'clicks', 'closet', 'fever', 'coward', 'flash', 'impressed',
  'siren', 'prisoners', 'sides', 'bowl', 'supply', 'sensitive', 'hopefully', 'rolling', 'dollar', 'tone',
  'voices', 'cheating', 'confess', 'demand', 'museum', 'unknown', 'drama', 'suspicious', 'adult', 'frightened',
  'warned', 'steady', 'kills', 'crossed', 'particularly', 'sandwich', 'laws', 'joint', 'bullets', 'package',
  'trained', 'thursday', 'boots', 'possibility', 'civil', 'germans', 'baseball', 'express', 'miserable', 'refused',
];

export type WordListSize = '300' | '1000' | '2500';

export const WORD_LIST_OPTIONS: { id: WordListSize; label: string }[] = [
  { id: '300', label: '300 words' },
  { id: '1000', label: '1000 words' },
  { id: '2500', label: '2500 words' },
];

function getWordPool(size: WordListSize): readonly string[] {
  if (size === '1000') return WORDS_1000;
  if (size === '2500') return WORDS_2500;
  return WORDS_300;
}

const NO_REPEAT_WINDOW = 20;

function buildWordList(count: number, pool: readonly string[], random: () => number): string[] {
  const words: string[] = [];
  for (let i = 0; i < count; i++) {
    const recentWindow = words.slice(Math.max(0, words.length - NO_REPEAT_WINDOW));
    let candidate: string;
    let attempts = 0;
    do {
      candidate = pool[Math.floor(random() * pool.length)];
      attempts++;
    } while (recentWindow.includes(candidate) && attempts < 50);
    words.push(candidate);
  }
  return words;
}

export function generateWords(count: number, size: WordListSize): string[] {
  return buildWordList(count, getWordPool(size), Math.random);
}

export function generateText(wordCount: number, size: WordListSize): string {
  return generateWords(wordCount, size).join(' ');
}

// A small deterministic PRNG (mulberry32) — ranked matches need both
// players' clients to independently produce the exact same word list from
// a single server-generated seed (see ranked_matches.word_seed), since
// unlike duels, neither client knows in advance who they'll be paired
// with, so the usual "one client generates it, the RPC just stores it"
// approach doesn't work here. Math.random() isn't seedable, hence this.
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Ranked matches are always the fixed 30-second time format — same sizing
// logic as wordsNeededForDuration below, always drawn from the 300-word
// pool (same rationale as generateDuelWordList: no per-user word-list-size
// choice for competitive formats).
export function generateSeededWordList(seed: number): string {
  const random = mulberry32(seed);
  return buildWordList(wordsNeededForDuration(30), WORDS_300, random).join(' ');
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
// Always drawn from the 300-word list — duels don't expose a word-list-size
// choice the way solo tests do.
export function generateDuelWordList(mode: 'words' | 'time', value: number): string {
  if (mode === 'words') return generateText(value, '300');
  return generateText(wordsNeededForDuration(value), '300');
}
