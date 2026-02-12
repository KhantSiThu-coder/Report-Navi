
import React, { useState, useEffect } from 'react';
import { User, Report, ReportStatus } from '../types';
import { db } from '../services/databaseService';
import { useTranslation } from '../context/LanguageContext';

interface DashboardPageProps {
  user: User;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ user }) => {
  const { t } = useTranslation();
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState<'all' | 'mine'>('all');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  useEffect(() => {
    refreshReports();
  }, []);

  const refreshReports = async () => {
    setIsLoading(true);
    try {
      const data = await db.getReports();
      setReports(data);
    } catch (err) {
      console.error("Failed to fetch reports", err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredReports = reports.filter(r => 
    filter === 'all' ? true : r.user === user.username
  );

  const stats = {
    total: reports.length,
    verified: reports.filter(r => r.status === ReportStatus.VERIFIED || r.status === ReportStatus.RESOLVED).length,
    resolved: reports.filter(r => r.status === ReportStatus.RESOLVED).length,
    points: user.points
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day} ${hours}:${minutes}`;
    } catch (e) {
      return dateStr;
    }
  };

  const handleDelete = async (reportId: string) => {
    try {
      const reportToDelete = reports.find(r => r.id === reportId);
      if (reportToDelete) {
        await db.addActivity({
          id: Date.now().toString() + Math.random(),
          username: user.username,
          type: 'delete',
          targetTitle: reportToDelete.title,
          pointsChange: 0,
          date: new Date().toISOString()
        });
      }

      setSelectedReport(null);
      setIsConfirmingDelete(false);
      setReports(prev => prev.filter(r => r.id !== reportId));
      await db.deleteReport(reportId);
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Error: Could not delete report. Please try again.");
      refreshReports();
    }
  };

  const isUrl = (str: string) => {
    try {
      return str.startsWith('http://') || str.startsWith('https://') || str.includes('maps.google.com') || str.includes('goo.gl/maps');
    } catch (_) {
      return false;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black mb-1">{t('communityDashboard')}</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium">{t('realTimeMonitor')}</p>
        </div>
        
        <div className="flex bg-gray-300/30 dark:bg-gray-800 p-1.5 rounded-2xl w-fit border border-gray-300 dark:border-gray-700">
          <button 
            type="button"
            onClick={() => setFilter('all')}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${filter === 'all' ? 'bg-white dark:bg-gray-700 shadow-md text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t('allReports')}
          </button>
          <button 
            type="button"
            onClick={() => setFilter('mine')}
            className={`px-5 py-2 rounded-xl text-sm font-bold transition-all ${filter === 'mine' ? 'bg-white dark:bg-gray-700 shadow-md text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {t('mySubmissions')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {[
          { label: t('totalReports'), val: stats.total, icon: 'fa-folder-open', color: 'bg-blue-500' },
          { label: t('verified'), val: stats.verified, icon: 'fa-check-circle', color: 'bg-green-500' },
          { label: t('resolved'), val: stats.resolved, icon: 'fa-circle-check', color: 'bg-purple-500' },
          { label: t('myPoints'), val: stats.points, icon: 'fa-star', color: 'bg-amber-500' }
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] shadow-sm border border-gray-300 dark:border-gray-800 hover:shadow-lg transition-all group">
            <div className={`w-12 h-12 ${stat.color} text-white rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
              <i className={`fa-solid ${stat.icon} text-lg`}></i>
            </div>
            <div className="text-3xl font-black mb-1">{stat.val}</div>
            <div className="text-gray-400 dark:text-gray-500 text-[10px] font-black uppercase tracking-widest">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        {isLoading ? (
           <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="w-14 h-14 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="font-black text-gray-400 uppercase tracking-widest text-xs">Loading data layer...</p>
           </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-24 bg-white dark:bg-gray-900 rounded-[3rem] border-2 border-dashed border-gray-300 dark:border-gray-800 shadow-sm">
            <div className="text-gray-200 dark:text-gray-800 text-7xl mb-6"><i className="fa-solid fa-clipboard-list"></i></div>
            <h3 className="text-2xl font-black mb-2">{t('noReportsFound')}</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-xs mx-auto">{t('beFirstReport')}</p>
          </div>
        ) : (
          filteredReports.map(report => (
            <div 
              key={report.id} 
              onClick={() => setSelectedReport(report)}
              className="group bg-white dark:bg-gray-900 p-5 rounded-[2.5rem] shadow-md border border-gray-300 dark:border-gray-800 hover:border-primary-500 dark:hover:border-primary-500 hover:shadow-xl transition-all cursor-pointer flex flex-col sm:flex-row gap-6 items-center"
            >
              <div className="relative w-full sm:w-56 h-36 overflow-hidden rounded-[1.5rem] shadow-inner bg-gray-100 dark:bg-gray-950">
                <img src={report.thumbnail || 'https://picsum.photos/300/200?random=' + report.id} className="w-full h-full object-cover transition-transform group-hover:scale-105" alt="Report" />
                <div className="absolute top-3 right-3 flex flex-col gap-1.5 items-end">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg backdrop-blur-md shadow-lg ${
                    report.status === ReportStatus.PENDING ? 'bg-amber-500/90 text-white' :
                    report.status === ReportStatus.VERIFIED ? 'bg-blue-500/90 text-white' :
                    report.status === ReportStatus.RESOLVED ? 'bg-green-500/90 text-white' :
                    'bg-gray-500/90 text-white'
                  }`}>
                    {report.status}
                  </span>
                </div>
              </div>
              
              <div className="flex-grow text-center sm:text-left">
                <div className="text-[10px] font-black text-primary-600 uppercase tracking-[0.2em] mb-2">{t(report.category.toLowerCase() as any) || report.category}</div>
                <h3 className="text-2xl font-black mb-3 group-hover:text-primary-600 transition-colors">{report.title}</h3>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-sm font-bold text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1.5"><i className="fa-solid fa-location-dot text-primary-500"></i> {report.location.substring(0, 20)}...</span>
                  <span className="flex items-center gap-1.5"><i className="fa-solid fa-calendar opacity-50"></i> {formatDate(report.date).split(' ')[0]}</span>
                  <span className="flex items-center gap-1.5"><i className="fa-solid fa-user-circle opacity-50"></i> {report.user}</span>
                </div>
              </div>

              <div className="hidden sm:block">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-primary-600 group-hover:text-white group-hover:border-primary-600 transition-all shadow-sm">
                  <i className="fa-solid fa-chevron-right text-lg"></i>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Modal is unchanged functionally, but background contrast improved */}
      {selectedReport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setSelectedReport(null)}></div>
          <div className="bg-white dark:bg-gray-900 w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl relative z-10 overflow-hidden flex flex-col border border-gray-300 dark:border-gray-800 animate-in zoom-in duration-300">
            <div className="p-8 border-b border-gray-200 dark:border-gray-800 flex justify-between items-start">
               <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-primary-600 mb-1">{selectedReport.category}</div>
                  <h2 className="text-3xl font-black">{selectedReport.title}</h2>
               </div>
               <button onClick={() => setSelectedReport(null)} className="p-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 rounded-2xl transition-all"><i className="fa-solid fa-xmark text-xl"></i></button>
            </div>
            <div className="flex-grow overflow-y-auto p-10 space-y-8">
              <div className="bg-gray-50 dark:bg-gray-950 p-4 rounded-3xl border border-gray-200 dark:border-gray-800">
                <p className="text-lg font-medium leading-relaxed">{selectedReport.description}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {selectedReport.files.map((f, i) => (
                  <img key={i} src={f.url} className="w-full h-64 object-cover rounded-3xl border border-gray-200 dark:border-gray-800 shadow-sm" alt="Evidence" />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
