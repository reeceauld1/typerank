# TypeLadder - Features & Roadmap

## Current Features ✅

### Typing Test
- Real-time WPM and accuracy tracking
- Color-coded character feedback (green = correct, red = incorrect)
- Test modes: Time (10s, 30s, 60s) and Words (10, 25, 50)
- Visual results screen with WPM, accuracy, and raw WPM
- Automatic test completion when time/word limit is reached

### XP & Leveling System
- Dynamic XP calculation based on WPM and accuracy
- Difficulty multipliers for longer tests
- Progressive leveling formula (each level requires more XP)
- Level progress bar showing XP to next level
- Test history with XP earned per test

### Profile & Stats
- Total tests completed
- Total XP and current level
- Personal best WPM for all 6 test modes
- Recent test history (last 5 tests shown, 100 stored)
- Real-time stats in navbar

### Milestone Bonuses
Bonus XP for exceptional performance:
- 100 WPM on 10s test = +100 XP
- 80 WPM on 30s test = +150 XP
- 70 WPM on 60s test = +200 XP
- 100 WPM on 10 words = +100 XP
- 90 WPM on 25 words = +150 XP
- 80 WPM on 50 words = +200 XP

## Roadmap 🚀

### Phase 1: Backend & Database
- [ ] Set up backend API (Node.js/Express or similar)
- [ ] Create database schema (users, test_results, leaderboards, challenges)
- [ ] User authentication (registration, login, JWT tokens)
- [ ] API endpoints for saving test results
- [ ] API endpoints for fetching user stats
- [ ] Replace localStorage with API calls

### Phase 2: Leaderboards
- [ ] Create Leaderboards page
- [ ] Global rankings for each test mode (6 separate leaderboards)
- [ ] Time-based filters (all-time, monthly, weekly, daily)
- [ ] Pagination for large leaderboards
- [ ] User's rank display
- [ ] Top 100 users per leaderboard

### Phase 3: Challenges System
- [ ] Daily challenges based on user skill level
- [ ] Weekly challenges with bigger rewards
- [ ] Challenge types:
  - Target WPM goals
  - Minimum accuracy requirements
  - Number of tests to complete
  - Specific test modes
- [ ] Challenge expiration system
- [ ] Active challenges display on homepage
- [ ] Challenge completion notifications
- [ ] Bonus XP rewards for challenges

### Phase 4: Enhanced Features
- [ ] Detailed statistics page with graphs
- [ ] WPM progression over time chart
- [ ] Accuracy trends
- [ ] Most common mistakes
- [ ] Practice mode with custom word lists
- [ ] Quote mode (type famous quotes)
- [ ] Custom test duration/word count
- [ ] Keyboard heatmap showing most used keys

### Phase 5: Social Features
- [ ] User profiles (public/private)
- [ ] Follow/friends system
- [ ] Compare stats with friends
- [ ] Share test results
- [ ] Achievements/badges system
- [ ] User comments on leaderboards

### Phase 6: Customization
- [ ] Custom color themes
- [ ] Font selection
- [ ] Text size options
- [ ] Sound effects (optional)
- [ ] Smooth/instant caret modes
- [ ] Different word lists (common, advanced, programming)

## Technical Improvements

### Performance
- [ ] Add React.memo for heavy components
- [ ] Optimize re-renders
- [ ] Lazy load pages
- [ ] Code splitting

### UX Enhancements
- [ ] Loading states
- [ ] Error handling with toast notifications
- [ ] Keyboard shortcuts (Ctrl+R to restart, etc.)
- [ ] Mobile responsive design
- [ ] PWA support (offline mode)
- [ ] Dark/light theme toggle

### Testing
- [ ] Unit tests for utilities
- [ ] Component tests
- [ ] E2E tests for critical flows
- [ ] Performance monitoring

## XP Formula Details

### Base XP Calculation
```
baseXP = (WPM × Accuracy) / 100
```

### Difficulty Multipliers
- 10s / 10 words: 1.0x
- 30s / 25 words: 1.2x
- 60s / 50 words: 1.5x

### Level Progression
```
XP for level N+1 = 100 × (N+1)^1.5
```

Examples:
- Level 1→2: 100 XP
- Level 2→3: ~282 XP
- Level 3→4: ~520 XP
- Level 4→5: ~810 XP
- Level 10→11: ~3,162 XP

## API Endpoints (To Be Implemented)

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Test Results
- `POST /api/tests` - Save test result
- `GET /api/tests/me` - Get my test history
- `GET /api/tests/stats` - Get my statistics

### Leaderboards
- `GET /api/leaderboards/:mode/:value` - Get leaderboard (e.g., time/30)
- `GET /api/leaderboards/:mode/:value/rank` - Get my rank

### Challenges
- `GET /api/challenges/active` - Get active challenges
- `POST /api/challenges/:id/complete` - Mark challenge complete
- `GET /api/challenges/history` - Get completed challenges

### User
- `GET /api/users/:id` - Get user profile
- `PATCH /api/users/me` - Update profile
- `GET /api/users/:id/stats` - Get user stats
