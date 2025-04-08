import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/login/login';
import SignupPage from './pages/signup/signup';
import Dashboard from './pages/dashboard/dashboard';
import Access from './pages/access/access';
import Approve from './pages/approve/approve';
import Emergency from './pages/emergency/emergency';
import NotFound from './pages/notfound/notfound';
import { account } from './../appwriteConfig';

const App = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication status on app load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Try to get the current account from Appwrite
        const currentAccount = await account.get();
        setIsAuthenticated(true);
      } catch (error) {
        // If there's an error, user is not authenticated
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Protected route component
  const ProtectedRoute = ({ children }) => {
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-black">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-300"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return <Navigate to="/login" />;
    }

    return children;
  };

  // Authentication route component (redirect if already logged in)
  const AuthRoute = ({ children }) => {
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-black">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-300"></div>
        </div>
      );
    }

    if (isAuthenticated) {
      return <Navigate to="/dashboard" />;
    }

    return children;
  };

  return (
    <Router>
      <Routes>
        {/* Root path redirects to login */}
        <Route 
          path="/" 
          element={
            isLoading ? (
              <div className="min-h-screen flex items-center justify-center bg-black">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-300"></div>
              </div>
            ) : isAuthenticated ? (
              <Navigate to="/dashboard" />
            ) : (
              <Navigate to="/access" />
            )
          }
        />

        <Route path='/access' element={<Access />}/>
        <Route path='/emergency' element={<Emergency />}/>
        <Route path='/approve' element={<Approve />}/>

        {/* Auth routes */}
        <Route 
          path="/login" 
          element={
            <AuthRoute>
              <LoginPage />
            </AuthRoute>
          } 
        />
        <Route 
          path="/signup" 
          element={
            <AuthRoute>
              <SignupPage />
            </AuthRoute>
          } 
        />

        {/* Protected routes */}
        <Route 
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />

        {/* 404 Not Found */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
};

export default App;