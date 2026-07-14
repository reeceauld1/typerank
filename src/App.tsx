import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.js';
import { UserProvider } from './context/UserContext.js';
import { FriendsProvider } from './context/FriendsContext.js';
import { SettingsProvider } from './context/SettingsContext.js';
import Navbar from './components/Navbar.js';
import Home from './pages/Home.js';
import Profile from './pages/Profile.js';
import Challenges from './pages/Challenges.js';
import Friends from './pages/Friends.js';
import UserProfile from './pages/UserProfile.js';
import Settings from './pages/Settings.js';
import Leaderboard from './pages/Leaderboard.js';
import ResetPassword from './pages/ResetPassword.js';

function App() {
  return (
    <BrowserRouter>
      <SettingsProvider>
        <AuthProvider>
          <UserProvider>
            <FriendsProvider>
              <div className="min-h-screen flex flex-col">
                <Navbar />
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/challenges" element={<Challenges />} />
                  <Route path="/friends" element={<Friends />} />
                  <Route path="/u/:username" element={<UserProfile />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/leaderboard" element={<Leaderboard />} />
                  <Route path="/reset-password" element={<ResetPassword />} />
                </Routes>
              </div>
            </FriendsProvider>
          </UserProvider>
        </AuthProvider>
      </SettingsProvider>
    </BrowserRouter>
  );
}

export default App;
