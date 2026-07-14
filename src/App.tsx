import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.js';
import { UserProvider } from './context/UserContext.js';
import { FriendsProvider } from './context/FriendsContext.js';
import Navbar from './components/Navbar.js';
import Home from './pages/Home.js';
import Profile from './pages/Profile.js';
import Challenges from './pages/Challenges.js';
import Friends from './pages/Friends.js';
import UserProfile from './pages/UserProfile.js';

function App() {
  return (
    <BrowserRouter>
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
              </Routes>
            </div>
          </FriendsProvider>
        </UserProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
