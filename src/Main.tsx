// Main.tsx
import React from 'react';
import { useAuth } from './context/AuthContext';
import Login from './login';
import App from './MainApp'; // your real app

const Main: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return isAuthenticated ? <App /> : <Login />;
};

export default Main;
