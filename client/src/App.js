import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import ImpersonationBanner from './components/ImpersonationBanner';
import PrivateRoute from './components/PrivateRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Discover from './pages/Discover';
import Connections from './pages/Connections';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import Calendar from './pages/Calendar';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Navbar />
          <ImpersonationBanner />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            <Route
              path="/discover"
              element={
                <PrivateRoute>
                  <Discover />
                </PrivateRoute>
              }
            />

            <Route
              path="/connections"
              element={
                <PrivateRoute>
                  <Connections />
                </PrivateRoute>
              }
            />

            <Route
              path="/connections/matches"
              element={
                <PrivateRoute>
                  <Connections />
                </PrivateRoute>
              }
            />

            <Route
              path="/connections/messages"
              element={
                <PrivateRoute>
                  <Connections />
                </PrivateRoute>
              }
            />

            {/* Redirect old routes to new Connections page */}
            <Route path="/matches" element={<Navigate to="/connections/matches" replace />} />
            <Route path="/messages" element={<Navigate to="/connections/messages" replace />} />

            <Route
              path="/chat/:matchId"
              element={
                <PrivateRoute>
                  <Chat />
                </PrivateRoute>
              }
            />

            <Route
              path="/calendar"
              element={
                <PrivateRoute>
                  <Calendar />
                </PrivateRoute>
              }
            />

            <Route
              path="/profile"
              element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
