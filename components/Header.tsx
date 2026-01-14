
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User, UserRole, Language } from '../types';
import { useTranslation } from '../context/LanguageContext';

interface HeaderProps {
  user: User | null;
  onLogout: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  language: Language;
  onToggleLanguage: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, onLogout, isDarkMode, onToggleTheme, language, onToggleLanguage }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();
  const { t } = useTranslation();

  const navLinks = [
    { path: '/', label: t('home'), icon: 'fa-house' },
    ...(user ? [
      { path: '/dashboard', label: t('dashboard'), icon: 'fa-chart-line' },
      { path: '/profile', label: t('profile'), icon: 'fa-user' },
      { path: '/submit', label: t('report'), icon: 'fa-plus-circle' },
    ] : []),
    ...(user?.role === UserRole.ADMIN ? [
      { path: '/admin', label: t('admin'), icon: 'fa-shield-halved' }
    ] : [])
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-50 transition-colors shadow-sm">
      <div className="container mx-auto px-4 h-full flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white shadow-lg">
            <i className="fa-solid fa-map-location-dot text-sm"></i>
          </div>
          <span className="font-bold text-xl tracking-tight hidden sm:block">Report Navi</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(link => (
            <Link 
              key={link.path} 
              to={link.path}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive(link.path) 
                ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/20' 
                : 'text-gray-600 dark:text-gray-300 hover:text-primary-600 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button 
            onClick={onToggleLanguage}
            className="px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-colors text-xs font-bold border border-gray-200 dark:border-gray-600"
            title="Switch Language"
          >
            {language === 'en' ? 'JP' : 'EN'}
          </button>

          <button 
            onClick={onToggleTheme}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300"
            title="Toggle theme"
          >
            <i className={`fa-solid ${isDarkMode ? 'fa-sun' : 'fa-moon'}`}></i>
          </button>

          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end mr-2">
                <span className="text-xs font-semibold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full dark:bg-primary-900/30">
                  {user.points} {t('points')}
                </span>
              </div>
              <Link to="/profile">
                {user.profilePic ? (
                  <img src={user.profilePic} className="w-8 h-8 rounded-full object-cover border-2 border-primary-600" alt="Avatar" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 font-bold border-2 border-primary-600">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </Link>
              <button 
                onClick={onLogout}
                className="hidden sm:block text-sm text-gray-600 dark:text-gray-300 hover:text-red-500 font-medium"
              >
                {t('logout')}
              </button>
            </div>
          ) : (
            <Link 
              to="/login"
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-1.5 rounded-full text-sm font-bold transition-all shadow-md active:scale-95"
            >
              {t('login')}
            </Link>
          )}

          <button 
            className="md:hidden p-2 text-gray-600 dark:text-gray-300"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <i className={`fa-solid ${isMenuOpen ? 'fa-xmark' : 'fa-bars'} text-xl`}></i>
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-xl py-4 flex flex-col items-center gap-2">
          {navLinks.map(link => (
            <Link 
              key={link.path} 
              to={link.path}
              onClick={() => setIsMenuOpen(false)}
              className={`w-[90%] px-4 py-3 rounded-xl flex items-center gap-3 text-lg font-semibold ${
                isActive(link.path) 
                ? 'text-primary-600 bg-primary-50 dark:bg-primary-900/20' 
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <i className={`fa-solid ${link.icon} w-6 text-center`}></i>
              {link.label}
            </Link>
          ))}
          {user && (
             <button 
              onClick={() => { onLogout(); setIsMenuOpen(false); }}
              className="w-[90%] px-4 py-3 rounded-xl flex items-center gap-3 text-lg font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10"
            >
              <i className="fa-solid fa-right-from-bracket w-6 text-center"></i>
              {t('logout')}
            </button>
          )}
        </div>
      )}
    </header>
  );
};

export default Header;
