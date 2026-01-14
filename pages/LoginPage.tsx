
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, UserRole } from '../types';
import { db } from '../services/databaseService';
import { hashPassword } from '../services/cryptoService';
import { useTranslation } from '../context/LanguageContext';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const { t } = useTranslation();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const users = await db.getUsers();
      const passwordHash = await hashPassword(password, username);

      if (isLogin) {
        const user = users.find(u => u.username === username && u.passwordHash === passwordHash);
        if (user) {
          onLogin(user);
          navigate('/dashboard');
        } else {
          setError('Invalid username or password.');
        }
      } else {
        if (users.some(u => u.username === username)) {
          setError('Username already exists.');
          setIsLoading(false);
          return;
        }

        const role = adminCode === '1234' ? UserRole.ADMIN : UserRole.USER;
        const newUser: User = {
          username,
          passwordHash,
          role,
          points: 0,
          memberSince: new Date().toLocaleDateString(),
        };

        await db.saveUser(newUser);
        onLogin(newUser);
        navigate('/dashboard');
      }
    } catch (err) {
      console.error(err);
      setError('An error occurred during authentication.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in duration-300">
        <div className="bg-primary-600 p-8 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-4 backdrop-blur-md">
            <i className={`fa-solid ${isLogin ? 'fa-lock' : 'fa-user-plus'}`}></i>
          </div>
          <h2 className="text-3xl font-black">{isLogin ? t('welcomeBack') : t('createAccount')}</h2>
          <div className="mt-2 text-xs font-bold text-primary-200 uppercase tracking-widest">
            {db.isOnline() ? '● Cloud Storage Active' : '○ Local Storage Active'}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-5">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-500 p-3 rounded-xl text-sm font-semibold border border-red-100 dark:border-red-900/30 flex items-center gap-2">
              <i className="fa-solid fa-circle-exclamation"></i>
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">{t('username')}</label>
            <div className="relative">
              <i className="fa-solid fa-user absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input 
                type="text" 
                required 
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 outline-none focus:ring-2 focus:ring-primary-500 transition-all font-bold"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">{t('password')}</label>
            <div className="relative">
              <i className="fa-solid fa-key absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
              <input 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 outline-none focus:ring-2 focus:ring-primary-500 transition-all font-bold"
              />
            </div>
          </div>

          {!isLogin && (
            <div className="space-y-1 animate-in slide-in-from-top-2 duration-300">
              <label className="text-sm font-bold text-gray-400 uppercase tracking-widest">Admin Code</label>
              <div className="relative">
                <i className="fa-solid fa-shield absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"></i>
                <input 
                  type="password" 
                  value={adminCode}
                  onChange={(e) => setAdminCode(e.target.value)}
                  placeholder="Optional"
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 outline-none focus:ring-2 focus:ring-primary-500 transition-all font-bold"
                />
              </div>
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoading}
            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-black py-4 rounded-2xl shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-4"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              isLogin ? t('signIn') : t('createAccount')
            )}
          </button>

          <div className="text-center mt-6">
            <button 
              type="button"
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="text-primary-600 dark:text-primary-400 font-bold hover:underline"
            >
              {isLogin ? t('signupPrompt') : t('signinPrompt')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
