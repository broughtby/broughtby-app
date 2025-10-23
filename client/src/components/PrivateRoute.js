import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PrivateRoute = ({ children, requireBrand, requireAmbassador }) => {
  const { isAuthenticated, isBrand, isAmbassador, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  if (requireBrand && !isBrand) {
    return <Navigate to="/" />;
  }

  if (requireAmbassador && !isAmbassador) {
    return <Navigate to="/" />;
  }

  return children;
};

export default PrivateRoute;
