
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-8 transition-colors">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary-600 rounded flex items-center justify-center text-white text-xs">
              <i className="fa-solid fa-map-location-dot"></i>
            </div>
            <span className="font-bold text-gray-900 dark:text-white">Report Navi</span>
          </div>
          
          <p className="text-gray-500 dark:text-gray-400 text-sm text-center md:text-left">
            &copy; {new Date().getFullYear()} Report Navi Team. Building safer cities together.
          </p>

          <div className="flex items-center">
            <a 
              href="https://click.ecc.ac.jp/ecc/khant_si_thu/portfolio/" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-gray-500 dark:text-gray-400 hover:text-primary-600 transition-all flex items-center gap-2 font-black text-sm group"
            >
              <i className="fa-solid fa-user-tie transition-transform group-hover:scale-110"></i>
              <span>Portfolio</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
