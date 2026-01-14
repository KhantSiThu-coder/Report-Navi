
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
        // Log the deletion action before removing the report
        await db.addActivity({
          id: Date.now().toString() + Math.random(),
          username: user.username,
          type: 'delete',
          targetTitle: reportToDelete.title,
          pointsChange: 0,
          date: new Date().toISOString()
        });
      }

      // 1. UI First: Close modal and remove from list immediately
      setSelectedReport(null);
      setIsConfirmingDelete(false);
      setReports(prev => prev.filter(r => r.id !== reportId));
      
      // 2. Then perform the background deletion
      await db.deleteReport(reportId);
      console.log("Deleted report successfully:", reportId);
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Error: Could not delete report. Please try again.");
      // Rollback UI state if DB operation fails
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
        
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl w-fit">
          <button 
            type="button"
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filter === 'all' ? 'bg-white dark:bg-gray-700 shadow-md text-primary-600' : 'text-gray-500'}`}
          >
            {t('allReports')}
          </button>
          <button 
            type="button"
            onClick={() => setFilter('mine')}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${filter === 'mine' ? 'bg-white dark:bg-gray-700 shadow-md text-primary-600' : 'text-gray-500'}`}
          >
            {t('mySubmissions')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {[
          { label: t('totalReports'), val: stats.total, icon: 'fa-folder-open', color: 'bg-blue-500' },
          { label: t('verified'), val: stats.verified, icon: 'fa-check-circle', color: 'bg-green-500' },
          { label: t('resolved'), val: stats.resolved, icon: 'fa-circle-check', color: 'bg-purple-500' },
          { label: t('myPoints'), val: stats.points, icon: 'fa-star', color: 'bg-amber-500' }
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
            <div className={`w-10 h-10 ${stat.color} text-white rounded-xl flex items-center justify-center mb-4 shadow-lg`}>
              <i className={`fa-solid ${stat.icon}`}></i>
            </div>
            <div className="text-2xl font-black">{stat.val}</div>
            <div className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {isLoading ? (
           <div className="flex flex-col items-center justify-center py-20 gap-4">
              <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="font-bold text-gray-500">Loading infrastructure data...</p>
           </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
            <div className="text-gray-400 text-5xl mb-4"><i className="fa-solid fa-clipboard-list"></i></div>
            <h3 className="text-xl font-bold mb-2">{t('noReportsFound')}</h3>
            <p className="text-gray-500 dark:text-gray-400">{t('beFirstReport')}</p>
          </div>
        ) : (
          filteredReports.map(report => (
            <div 
              key={report.id} 
              onClick={() => {
                setSelectedReport(report);
                setIsConfirmingDelete(false);
              }}
              className="group bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 hover:border-primary-500 dark:hover:border-primary-500 transition-all cursor-pointer flex flex-col sm:flex-row gap-6 items-center"
            >
              <div className="relative w-full sm:w-48 h-32 overflow-hidden rounded-2xl">
                <img src={report.thumbnail || 'https://picsum.photos/300/200?random=' + report.id} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="Report" />
                <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                  <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg backdrop-blur-md shadow-lg ${
                    report.status === ReportStatus.PENDING ? 'bg-amber-500/90 text-white' :
                    report.status === ReportStatus.VERIFIED ? 'bg-blue-500/90 text-white' :
                    report.status === ReportStatus.RESOLVED ? 'bg-green-500/90 text-white' :
                    'bg-gray-500/90 text-white'
                  }`}>
                    {report.status}
                  </span>
                  {report.files && report.files.length > 1 && (
                    <span className="bg-black/50 text-white text-[9px] px-1.5 py-0.5 rounded-md backdrop-blur-sm font-bold">
                      <i className="fa-solid fa-images mr-1"></i> {report.files.length}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex-grow text-center sm:text-left">
                <div className="text-xs font-bold text-primary-600 uppercase tracking-widest mb-1">{t(report.category.toLowerCase() as any) || report.category}</div>
                <h3 className="text-xl font-black mb-2">{report.title}</h3>
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-sm text-gray-500 dark:text-gray-400">
                  <span className="flex items-center gap-1.5 overflow-hidden text-ellipsis max-w-[200px] whitespace-nowrap">
                    <i className="fa-solid fa-location-dot text-primary-500"></i> {report.location}
                  </span>
                  <span className="flex items-center gap-1.5"><i className="fa-solid fa-calendar text-gray-400"></i> {formatDate(report.date)}</span>
                  <span className="flex items-center gap-1.5 font-semibold text-gray-700 dark:text-gray-300"><i className="fa-solid fa-user text-gray-400"></i> {report.user}</span>
                </div>
              </div>

              <div className="hidden sm:block">
                <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-primary-600 group-hover:text-white transition-all shadow-inner">
                  <i className="fa-solid fa-chevron-right"></i>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedReport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-md animate-in fade-in duration-300"
            onClick={() => setSelectedReport(null)}
          ></div>
          <div className="bg-white dark:bg-gray-800 w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col animate-in zoom-in duration-300" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 p-6 sm:p-8 flex items-center justify-between border-b border-gray-100 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md z-20">
              <div>
                <span className="bg-primary-600 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg mb-2 inline-block text-white">
                  {t(selectedReport.category.toLowerCase() as any) || selectedReport.category}
                </span>
                <h2 className="text-2xl sm:text-3xl font-black">{selectedReport.title}</h2>
              </div>
              <div className="flex items-center gap-3">
                {selectedReport.user === user.username && selectedReport.status === ReportStatus.PENDING && (
                  isConfirmingDelete ? (
                    <div className="flex items-center gap-2 animate-in slide-in-from-right-2 duration-200">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mr-2">{t('areYouSure')}</span>
                      <button 
                        onClick={() => handleDelete(selectedReport.id)}
                        className="bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl shadow-md transition-all active:scale-95"
                      >
                        {t('yes')}
                      </button>
                      <button 
                        onClick={() => setIsConfirmingDelete(false)}
                        className="bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl shadow-md transition-all active:scale-95"
                      >
                        {t('no')}
                      </button>
                    </div>
                  ) : (
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsConfirmingDelete(true);
                      }}
                      className="p-3 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl transition-all shadow-sm active:scale-95 flex items-center gap-2 font-bold group"
                    >
                      <i className="fa-solid fa-trash-can transition-transform group-hover:rotate-12"></i>
                      <span className="hidden sm:inline">{t('deleteReport')}</span>
                    </button>
                  )
                )}
                {!isConfirmingDelete && (
                  <button 
                    type="button"
                    onClick={() => setSelectedReport(null)}
                    className="w-12 h-12 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-2xl flex items-center justify-center transition-all"
                  >
                    <i className="fa-solid fa-xmark text-xl"></i>
                  </button>
                )}
              </div>
            </div>

            <div className="flex-grow overflow-y-auto p-6 sm:p-10 space-y-10 custom-scrollbar">
              <div className="space-y-4">
                <h4 className="font-black text-gray-400 uppercase tracking-widest text-xs flex items-center gap-2">
                  <i className="fa-solid fa-images"></i> Media Evidence ({selectedReport.files?.length || 0})
                </h4>
                <div className="flex flex-col gap-8">
                  {selectedReport.files && selectedReport.files.length > 0 ? (
                    selectedReport.files.map((file, i) => (
                      <div key={i} className="bg-gray-50 dark:bg-gray-900 rounded-3xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700 p-2">
                         {file.type.startsWith('video') ? (
                           <video src={file.url} controls className="w-full h-auto max-h-[80vh] rounded-2xl shadow-inner bg-black" />
                         ) : (
                           <img src={file.url} className="w-full h-auto max-h-[80vh] object-contain rounded-2xl shadow-inner bg-black/5" alt={`Evidence ${i}`} />
                         )}
                      </div>
                    ))
                  ) : (
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-3xl p-10 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700">
                      <i className="fa-solid fa-image text-4xl mb-3"></i>
                      <p className="font-bold">No Media Available</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                 <div className="space-y-6">
                    <div>
                      <h4 className="font-black text-gray-400 uppercase tracking-widest text-xs mb-3 flex items-center gap-2">
                        <i className="fa-solid fa-align-left"></i> {t('description')}
                      </h4>
                      <p className="text-gray-600 dark:text-gray-300 leading-relaxed font-medium text-lg">
                        {selectedReport.description}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-black text-gray-400 uppercase tracking-widest text-xs mb-3 flex items-center gap-2">
                        <i className="fa-solid fa-location-arrow"></i> {t('location')}
                      </h4>
                      {isUrl(selectedReport.location) ? (
                        <a 
                          href={selectedReport.location} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-6 py-3 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-black text-lg rounded-2xl hover:bg-primary-600 hover:text-white transition-all shadow-sm break-all"
                        >
                          <i className="fa-solid fa-map-location-dot"></i>
                          Open in Google Maps
                        </a>
                      ) : (
                        <p className="text-gray-600 dark:text-gray-300 font-black text-lg">
                          {selectedReport.location}
                        </p>
                      )}
                    </div>
                 </div>

                 <div className="space-y-4">
                    <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-3xl flex justify-between items-center">
                      <div>
                        <div className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">{t('status')}</div>
                        <div className={`font-black text-xl ${
                          selectedReport.status === ReportStatus.PENDING ? 'text-amber-500' :
                          selectedReport.status === ReportStatus.VERIFIED ? 'text-blue-500' :
                          'text-green-500'
                        }`}>{selectedReport.status}</div>
                      </div>
                      <i className="fa-solid fa-circle-notch text-3xl opacity-20"></i>
                    </div>
                    
                    <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-3xl">
                      <div className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">{t('date')}</div>
                      <div className="font-black text-xl">{formatDate(selectedReport.date)}</div>
                    </div>

                    <div className="p-6 bg-primary-50 dark:bg-primary-900/10 rounded-3xl border border-primary-100 dark:border-primary-900/20">
                      <div className="text-primary-600 dark:text-primary-400 text-[10px] font-black uppercase tracking-widest mb-1">Reporter</div>
                      <div className="font-black text-xl flex items-center gap-2">
                        <i className="fa-solid fa-user-circle"></i>
                        {selectedReport.user}
                      </div>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
