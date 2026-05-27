import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import Admin from './pages/Admin';
import SmsCampaigns from './pages/SmsCampaigns';
import SmsCampaignForm from './pages/SmsCampaignForm';
import SmsCampaignDetail from './pages/SmsCampaignDetail';
import BrandSmsCampaigns from './pages/BrandSmsCampaigns';
import BrandSmsCampaignDetail from './pages/BrandSmsCampaignDetail';
import PublicSubmission from './pages/PublicSubmission';
import PhotosLayout from './pages/photos/PhotosLayout';
import PhotosLanding from './pages/photos/PhotosLanding';
import PhotosSignup from './pages/photos/PhotosSignup';
import PhotosLogin from './pages/photos/PhotosLogin';
import { useAuth } from './context/AuthContext';
import Inquiries from './pages/Inquiries';
import InquiryResponsesView from './pages/InquiryResponsesView';

const SmsCampaignsRoleSwitch = () => {
  const { isAdmin, user } = useAuth();
  if (isAdmin) return <SmsCampaigns />;
  if (user?.role === 'brand') return <BrandSmsCampaigns />;
  return <Navigate to="/" />;
};

const SmsCampaignDetailRoleSwitch = () => {
  const { isAdmin, user } = useAuth();
  if (isAdmin) return <SmsCampaignDetail />;
  if (user?.role === 'brand') return <BrandSmsCampaignDetail />;
  return <Navigate to="/" />;
};

// Routes that should render without the BroughtBy ambassador navbar:
// - /c/* (public customer-facing photo submission)
// - /photos/* (standalone BroughtBy Photos product — has its own navbar)
function AppChrome({ children }) {
  const location = useLocation();
  const path = location.pathname;
  if (path.startsWith('/c/') || path.startsWith('/photos')) return children;
  return (
    <>
      <Navbar />
      <ImpersonationBanner />
      {children}
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <AppChrome>
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
              path="/inquiries"
              element={
                <PrivateRoute>
                  <Inquiries />
                </PrivateRoute>
              }
            />

            <Route
              path="/inquiries/:inquiryId/responses"
              element={
                <PrivateRoute>
                  <InquiryResponsesView />
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

            <Route
              path="/admin"
              element={
                <PrivateRoute>
                  <Admin />
                </PrivateRoute>
              }
            />

            <Route
              path="/sms-campaigns"
              element={
                <PrivateRoute>
                  <SmsCampaignsRoleSwitch />
                </PrivateRoute>
              }
            />
            <Route
              path="/sms-campaigns/new"
              element={
                <PrivateRoute>
                  <SmsCampaignForm />
                </PrivateRoute>
              }
            />
            <Route
              path="/sms-campaigns/:id"
              element={
                <PrivateRoute>
                  <SmsCampaignDetailRoleSwitch />
                </PrivateRoute>
              }
            />
            <Route
              path="/sms-campaigns/:id/edit"
              element={
                <PrivateRoute>
                  <SmsCampaignForm />
                </PrivateRoute>
              }
            />

            <Route path="/c/:eventCode" element={<PublicSubmission />} />

            {/* BroughtBy Photos — standalone product */}
            <Route path="/photos" element={<PhotosLayout><PhotosLanding /></PhotosLayout>} />
            <Route path="/photos/signup" element={<PhotosLayout><PhotosSignup /></PhotosLayout>} />
            <Route path="/photos/login" element={<PhotosLayout><PhotosLogin /></PhotosLayout>} />
            <Route
              path="/photos/campaigns"
              element={
                <PrivateRoute>
                  <PhotosLayout><BrandSmsCampaigns /></PhotosLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/photos/campaigns/new"
              element={
                <PrivateRoute>
                  <PhotosLayout><SmsCampaignForm /></PhotosLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/photos/campaigns/:id"
              element={
                <PrivateRoute>
                  <PhotosLayout><BrandSmsCampaignDetail /></PhotosLayout>
                </PrivateRoute>
              }
            />
            <Route
              path="/photos/campaigns/:id/edit"
              element={
                <PrivateRoute>
                  <PhotosLayout><SmsCampaignForm /></PhotosLayout>
                </PrivateRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          </AppChrome>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
