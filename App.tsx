
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { User, UserRole, AuthState, Language } from './types';
import { db } from './services/databaseService';
import { translations, TranslationKeys } from './services/translations';
import { LanguageContext } from './context/LanguageContext';

// Components
import Header from './components/Header';
import Footer from './components/Footer';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import SubmitPage from './pages/SubmitPage';
import AdminPage from './pages/AdminPage';
import HomePage from './pages/HomePage';

const App: React.FC = () => {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    isAuthenticated: false,
    isLoading: true
  });
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });

  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('language') as Language) || 'en';
  });

  useEffect(() => {
    const savedUser = sessionStorage.getItem('active_user');
    if (savedUser) {
      const userData: User = JSON.parse(savedUser);
      setAuthState({ user: userData, isAuthenticated: true, isLoading: false });
    } else {
      setAuthState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);
  
  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'jp' : 'en');
  };

  const login = (user: User) => {
    sessionStorage.setItem('active_user', JSON.stringify(user));
    setAuthState({ user, isAuthenticated: true, isLoading: false });
  };

  const logout = () => {
    sessionStorage.removeItem('active_user');
    setAuthState({ user: null, isAuthenticated: false, isLoading: false });
  };

  const updateUser = (updatedUser: User) => {
    db.saveUser(updatedUser);
    sessionStorage.setItem('active_user', JSON.stringify(updatedUser));
    setAuthState(prev => ({ ...prev, user: updatedUser }));
  };

  const t = (key: TranslationKeys): string => {
    return translations[language][key] || key;
  };

  if (authState.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      <Router>
        <div className="flex flex-col min-h-screen font-sans">
          <Header 
            user={authState.user} 
            onLogout={logout} 
            isDarkMode={isDarkMode} 
            onToggleTheme={toggleDarkMode}
            language={language}
            onToggleLanguage={toggleLanguage}
          />
          
          <main className="flex-grow pt-16">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={
                authState.isAuthenticated ? <Navigate to="/dashboard" /> : <LoginPage onLogin={login} />
              } />
              
              <Route path="/dashboard" element={
                authState.isAuthenticated ? <DashboardPage user={authState.user!} /> : <Navigate to="/login" />
              } />
              <Route path="/profile" element={
                authState.isAuthenticated ? <ProfilePage user={authState.user!} onUpdateUser={updateUser} /> : <Navigate to="/login" />
              } />
              <Route path="/submit" element={
                authState.isAuthenticated ? <SubmitPage user={authState.user!} /> : <Navigate to="/login" />
              } />
              <Route path="/admin" element={
                authState.isAuthenticated && authState.user?.role === UserRole.ADMIN 
                  ? <AdminPage currentUser={authState.user!} /> 
                  : <Navigate to="/dashboard" />
              } />
            </Routes>
          </main>
          
          <Footer />
        </div>
      </Router>
    </LanguageContext.Provider>
  );
};

export default App;
