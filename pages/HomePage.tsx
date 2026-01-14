
import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../context/LanguageContext';

const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const howItWorksRef = useRef<HTMLElement>(null);

  const scrollToHow = (e: React.MouseEvent) => {
    e.preventDefault();
    if (howItWorksRef.current) {
      // Offset for fixed header (h-16 = 64px) + extra padding for aesthetics
      const headerOffset = 80;
      const elementPosition = howItWorksRef.current.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const steps = [
    { 
      icon: 'fa-paper-plane', 
      title: t('step2Title'), 
      text: t('step2Text'),
      color: 'from-blue-500 to-primary-600',
      path: '/submit'
    },
    { 
      icon: 'fa-trophy', 
      title: t('step3Title'), 
      text: t('step3Text'),
      color: 'from-amber-400 to-orange-600',
      path: '/dashboard'
    }
  ];

  return (
    <div className="animate-in fade-in duration-500">
      {/* Hero Section */}
      <section className="relative h-[90vh] min-h-[700px] flex items-center overflow-hidden">
        {/* Background Image Container */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?q=80&w=2070&auto=format&fit=crop" 
            className="w-full h-full object-cover brightness-[75%] contrast-[1.1]" 
            alt="Modern City Infrastructure" 
          />
          {/* Gradients for Text Legibility */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/20 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-gray-50 dark:to-gray-900"></div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10 text-white">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-primary-600/90 backdrop-blur-md text-white text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full mb-8 shadow-xl border border-white/20 animate-in slide-in-from-left-4 duration-700">
              <i className="fa-solid fa-tower-broadcast animate-pulse"></i>
              Community Power • Report Navi
            </div>
            <h1 className="text-6xl md:text-8xl font-black mb-8 leading-tight drop-shadow-2xl">
              {t('heroTitle')}
            </h1>
            <p className="text-xl md:text-2xl text-gray-100 mb-12 leading-relaxed font-bold max-w-2xl drop-shadow-lg">
              {t('heroSub')}
            </p>
            <div className="flex flex-wrap gap-5">
              <Link to="/submit" className="bg-primary-600 hover:bg-primary-700 text-white px-10 py-5 rounded-2xl text-xl font-black shadow-2xl transition-all hover:-translate-y-2 hover:shadow-primary-500/50 flex items-center gap-3 active:scale-95">
                <i className="fa-solid fa-paper-plane"></i>
                {t('startReporting')}
              </Link>
              <button 
                onClick={scrollToHow}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-xl text-white border-2 border-white/30 px-10 py-5 rounded-2xl text-xl font-black transition-all hover:-translate-y-1 active:scale-95"
              >
                {t('learnMore')}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section 
        id="how" 
        ref={howItWorksRef}
        className="py-24 bg-white dark:bg-gray-900 transition-colors"
      >
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-black mb-6">{t('howItWorks')}</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto mb-20 text-lg font-medium">
            {t('howItWorksSub')}
          </p>
          
          <div className="grid md:grid-cols-2 gap-16 max-w-5xl mx-auto">
            {steps.map((step, i) => (
              <Link 
                key={i} 
                to={step.path}
                className="group relative p-10 rounded-[3rem] bg-gray-50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-800 transition-all shadow-sm hover:shadow-2xl hover:-translate-y-2 border border-transparent hover:border-gray-100 dark:hover:border-gray-700 block text-left"
              >
                <div className={`w-20 h-20 bg-gradient-to-br ${step.color} rounded-3xl shadow-xl flex items-center justify-center text-white text-3xl mb-8 transform group-hover:rotate-6 transition-transform`}>
                  <i className={`fa-solid ${step.icon}`}></i>
                </div>
                <h3 className="text-2xl font-black mb-6">{step.title}</h3>
                <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed">{step.text}</p>
                <div className="mt-8 text-primary-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2">
                  Go to {step.title} <i className="fa-solid fa-arrow-right"></i>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-20 bg-primary-600 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-10 left-10 w-64 h-64 bg-white rounded-full blur-3xl"></div>
            <div className="absolute bottom-10 right-10 w-96 h-96 bg-white rounded-full blur-3xl"></div>
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center text-white">
            <div>
              <div className="text-5xl font-black mb-2">12K+</div>
              <div className="text-primary-100 text-sm font-bold uppercase tracking-widest">Reports Filed</div>
            </div>
            <div>
              <div className="text-5xl font-black mb-2">8,500</div>
              <div className="text-primary-100 text-sm font-bold uppercase tracking-widest">Fixed Issues</div>
            </div>
            <div>
              <div className="text-5xl font-black mb-2">4.5K</div>
              <div className="text-primary-100 text-sm font-bold uppercase tracking-widest">Active Users</div>
            </div>
            <div>
              <div className="text-5xl font-black mb-2">24/7</div>
              <div className="text-primary-100 text-sm font-bold uppercase tracking-widest">Monitoring</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
