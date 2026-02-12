
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
  
  // Visibility toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showAdminCode, setShowAdminCode] = useState(false);
  
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
          setError('Invalid credentials');
        }
      } else {
        if (users.some(u => u.username === username)) {
          setError('User already exists');
        } else {
          // Verify admin code
          const newUser: User = { 
            username, 
            passwordHash, 
            role: adminCode === '1234' ? UserRole.ADMIN : UserRole.USER, 
            points: 0, 
            memberSince: new Date().toLocaleDateString() 
          };
          await db.saveUser(newUser);
          onLogin(newUser);
          navigate('/dashboard');
        }
      }
    } catch (err) {
      setError('System error: ' + (err instanceof Error ? err.message : 'Unknown error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-6 bg-[#eef1f5] dark:bg-gray-950">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 border border-gray-300 dark:border-gray-800 relative">
        <div className="bg-primary-600 p-10 text-white text-center">
          <div className="w-20 h-20 bg-white/20 rounded-[2rem] flex items-center justify-center text-4xl mx-auto mb-6 backdrop-blur-xl border border-white/20 shadow-lg">
            <i className={`fa-solid ${isLogin ? 'fa-fingerprint' : 'fa-user-plus'}`}></i>
          </div>
          <h2 className="text-4xl font-black tracking-tight">{isLogin ? 'Welcome' : 'Join Us'}</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-10 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-red-200 flex items-center gap-2 animate-in shake duration-300">
              <i className="fa-solid fa-circle-exclamation"></i> {error}
            </div>
          )}
          
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">{t('username')}</label>
            <input 
              type="text" 
              required 
              value={username} 
              onChange={(e) => setUsername(e.target.value)} 
              className="w-full px-6 py-4 rounded-[1.25rem] bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 focus:border-primary-500 focus:bg-white dark:focus:bg-gray-800 outline-none transition-all font-black text-gray-900 dark:text-white" 
            />
          </div>

          <div className="space-y-1.5 relative">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">{t('password')}</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"}
                required 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="w-full px-6 py-4 pr-14 rounded-[1.25rem] bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 focus:border-primary-500 focus:bg-white dark:focus:bg-gray-800 outline-none transition-all font-black text-gray-900 dark:text-white" 
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-600 transition-colors p-1"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <i className={`fa-solid ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>

          {!isLogin && (
            <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-300 relative">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 flex items-center gap-2">
                <i className="fa-solid fa-shield-halved text-primary-500"></i> Admin Code
              </label>
              <div className="relative">
                <input 
                  type={showAdminCode ? "text" : "password"}
                  value={adminCode} 
                  onChange={(e) => setAdminCode(e.target.value)} 
                  placeholder="Optional"
                  className="w-full px-6 py-4 pr-14 rounded-[1.25rem] bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 focus:border-primary-500 focus:bg-white dark:focus:bg-gray-800 outline-none transition-all font-black placeholder:text-gray-300 dark:placeholder:text-gray-600 text-gray-900 dark:text-white" 
                />
                <button 
                  type="button"
                  onClick={() => setShowAdminCode(!showAdminCode)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary-600 transition-colors p-1"
                  aria-label={showAdminCode ? "Hide admin code" : "Show admin code"}
                >
                  <i className={`fa-solid ${showAdminCode ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>
          )}

          <button 
            type="submit" 
            disabled={isLoading} 
            className="w-full bg-primary-600 hover:bg-primary-700 text-white py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 mt-4"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              isLogin ? t('signIn') : t('createAccount')
            )}
          </button>

          <button 
            type="button" 
            onClick={() => setIsLogin(!isLogin)} 
            className="w-full text-center text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-primary-600 transition-colors mt-2"
          >
            {isLogin ? t('signupPrompt') : t('signinPrompt')}
          </button>

          {/* Storage Status Indicator */}
          <div className="flex justify-center pt-2">
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border transition-colors ${
              db.isOnline() 
              ? 'bg-green-50 text-green-600 border-green-200' 
              : 'bg-amber-50 text-amber-600 border-amber-200'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${db.isOnline() ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`}></div>
              {db.isOnline() ? 'Cloud Storage Active' : 'Local Storage Mode'}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
