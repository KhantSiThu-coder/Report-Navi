
import React, { useState, useEffect } from 'react';
import { User, Report, ReportStatus } from '../types';
import { db } from '../services/databaseService';
import { useTranslation } from '../context/LanguageContext';

interface AdminPageProps {
  currentUser: User;
}

const AdminPage: React.FC<AdminPageProps> = ({ currentUser }) => {
  const { t } = useTranslation();
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState({ pending: 0, verified: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  
  const [confirmingAction, setConfirmingAction] = useState<{ 
    reportId: string, 
    status: ReportStatus,
    type: 'verify' | 'decline' | 'resolve'
  } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await db.getReports();
      setReports(data);
      setStats({
        pending: data.filter(r => r.status === ReportStatus.PENDING).length,
        verified: data.filter(r => r.status === ReportStatus.VERIFIED || r.status === ReportStatus.RESOLVED).length
      });
    } catch (err) {
      console.error("Admin fetch error", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusUpdate = async (reportId: string, reporterUsername: string, newStatus: ReportStatus) => {
    const report = reports.find(r => r.id === reportId);
    if (!report) return;

    // Security check: Admins cannot verify their own reports
    if (report.user === currentUser.username) {
      alert("System Integrity Alert: You cannot verify or update your own reports.");
      return;
    }

    await db.updateReport(reportId, { status: newStatus });
    
    let pts = 0;
    if (newStatus === ReportStatus.VERIFIED) {
      pts = 50;
      const users = await db.getUsers();
      const user = users.find(u => u.username === reporterUsername);
      if (user) {
        user.points += pts; 
        await db.saveUser(user);
      }
    }

    let type: 'verify' | 'resolve' | 'decline' = 'verify';
    if (newStatus === ReportStatus.RESOLVED) type = 'resolve';
    if (newStatus === ReportStatus.DECLINED) type = 'decline';

    await db.addActivity({
      id: Date.now().toString() + Math.random(),
      username: reporterUsername,
      type: type,
      targetTitle: report.title,
      pointsChange: pts,
      date: new Date().toISOString()
    });

    setConfirmingAction(null);
    setSelectedReport(null); // Close modal if open
    fetchData();
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleString();
    } catch (e) {
      return dateStr;
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
    <div className="container mx-auto px-4 py-8 animate-in zoom-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-black mb-2">{t('adminControl')}</h1>
          <p className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-xs">{t('adminSub')}</p>
        </div>
        
        <div className={`px-4 py-2 rounded-2xl font-black text-xs flex items-center gap-2 border-2 ${
          db.isOnline() ? 'bg-green-50 text-green-600 border-green-100' : 'bg-amber-50 text-amber-600 border-amber-100'
        }`}>
          <div className={`w-2 h-2 rounded-full animate-pulse ${db.isOnline() ? 'bg-green-500' : 'bg-amber-500'}`}></div>
          {db.isOnline() ? 'CLOUD DATABASE CONNECTED' : 'LOCAL STORAGE MODE'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        <div className="bg-amber-50 dark:bg-amber-900/10 p-6 rounded-3xl border border-amber-100 dark:border-amber-900/30">
          <div className="text-amber-600 font-black text-3xl mb-1">{stats.pending}</div>
          <div className="text-amber-800 dark:text-amber-400 text-xs font-bold uppercase tracking-widest">{t('pendingReview')}</div>
        </div>
        <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-3xl border border-blue-100 dark:border-blue-900/30">
          <div className="text-blue-600 font-black text-3xl mb-1">{stats.verified}</div>
          <div className="text-blue-800 dark:text-blue-400 text-xs font-bold uppercase tracking-widest">{t('successVerified')}</div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className="overflow-x-auto">
          {isLoading ? (
             <div className="p-20 text-center font-bold text-gray-400">{t('loadingSystem')}</div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-400">{t('reporter')}</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-400">{t('issue')}</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-400">{t('status')}</th>
                  <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-gray-400 text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {reports.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-20 text-center text-gray-400 font-bold">{t('noReportsSystem')}</td>
                  </tr>
                ) : (
                  reports.map(report => (
                    <tr 
                      key={report.id} 
                      onClick={() => setSelectedReport(report)}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="font-black text-primary-600 flex items-center gap-2">
                          {report.user}
                          {report.user === currentUser.username && (
                            <span className="text-[9px] bg-primary-100 text-primary-600 px-1.5 py-0.5 rounded-md font-black uppercase">You</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold">{report.title}</div>
                        <div className="text-xs text-gray-400">{t(report.category.toLowerCase() as any) || report.category}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${
                          report.status === ReportStatus.PENDING ? 'bg-amber-100 text-amber-700' :
                          report.status === ReportStatus.VERIFIED ? 'bg-blue-100 text-blue-700' :
                          report.status === ReportStatus.RESOLVED ? 'bg-green-100 text-green-700' :
                          report.status === ReportStatus.DECLINED ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {report.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end h-10 min-w-[200px]" onClick={(e) => e.stopPropagation()}>
                          {report.user === currentUser.username ? (
                            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 italic">
                              <i className="fa-solid fa-user-shield"></i>
                              {t('selfSubmitted')}
                            </div>
                          ) : confirmingAction?.reportId === report.id ? (
                            <div className="flex items-center gap-2 animate-in slide-in-from-right-2 duration-300">
                              <span className={`text-[10px] font-black uppercase tracking-widest animate-pulse ${confirmingAction.type === 'decline' ? 'text-red-500' : 'text-green-500'}`}>
                                {t('areYouSure')}
                              </span>
                              <button 
                                onClick={() => handleStatusUpdate(report.id, report.user, confirmingAction.status)}
                                className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl shadow-lg transition-all active:scale-90 ${
                                  confirmingAction.type === 'decline' ? 'bg-red-600 text-white' : 
                                  confirmingAction.type === 'verify' ? 'bg-green-600 text-white' :
                                  'bg-primary-600 text-white'
                                }`}
                              >
                                {t('yes')}
                              </button>
                              <button 
                                onClick={() => setConfirmingAction(null)}
                                className="bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all active:scale-90"
                              >
                                {t('no')}
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              {report.status === ReportStatus.PENDING && (
                                <>
                                  <button 
                                    onClick={() => setConfirmingAction({ reportId: report.id, status: ReportStatus.VERIFIED, type: 'verify' })}
                                    className="bg-green-100 hover:bg-green-600 text-green-700 hover:text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl transition-all active:scale-95"
                                  >
                                    {t('verify')}
                                  </button>
                                  <button 
                                    onClick={() => setConfirmingAction({ reportId: report.id, status: ReportStatus.DECLINED, type: 'decline' })}
                                    className="bg-red-100 hover:bg-red-600 text-red-700 hover:text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl transition-all active:scale-95"
                                  >
                                    {t('decline')}
                                  </button>
                                </>
                              )}
                              {report.status === ReportStatus.VERIFIED && (
                                <button 
                                  onClick={() => setConfirmingAction({ reportId: report.id, status: ReportStatus.RESOLVED, type: 'resolve' })}
                                  className="bg-primary-100 hover:bg-primary-600 text-primary-700 hover:text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl transition-all active:scale-95"
                                >
                                  {t('markResolved')}
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Admin Detailed Report Modal */}
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
                <button 
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  className="w-12 h-12 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-2xl flex items-center justify-center transition-all"
                >
                  <i className="fa-solid fa-xmark text-xl"></i>
                </button>
              </div>
            </div>

            <div className="flex-grow overflow-y-auto p-6 sm:p-10 space-y-10 custom-scrollbar">
              {/* Action Bar for Admin inside Modal */}
              {selectedReport.user !== currentUser.username && (
                <div className="p-6 bg-primary-50 dark:bg-primary-900/10 rounded-3xl border-2 border-primary-200 dark:border-primary-800/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-center sm:text-left">
                    <h4 className="font-black text-primary-800 dark:text-primary-300">Admin Actions Required</h4>
                    <p className="text-xs text-primary-600 dark:text-primary-400 font-bold">Review evidence and verify report validity.</p>
                  </div>
                  
                  {confirmingAction?.reportId === selectedReport.id ? (
                    <div className="flex items-center gap-3 animate-in slide-in-from-right-4 duration-300">
                      <span className={`font-black uppercase tracking-widest text-sm animate-pulse ${confirmingAction.type === 'decline' ? 'text-red-500' : 'text-green-500'}`}>
                        {t('areYouSure')}
                      </span>
                      <button 
                        onClick={() => handleStatusUpdate(selectedReport.id, selectedReport.user, confirmingAction.status)}
                        className={`px-8 py-3 rounded-2xl font-black text-sm shadow-xl transition-all active:scale-95 ${
                          confirmingAction.type === 'decline' ? 'bg-red-600 text-white' : 
                          confirmingAction.type === 'verify' ? 'bg-green-600 text-white' :
                          'bg-primary-600 text-white'
                        }`}
                      >
                        {t('yes')}
                      </button>
                      <button 
                        onClick={() => setConfirmingAction(null)}
                        className="bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 px-8 py-3 rounded-2xl font-black text-sm shadow-md transition-all active:scale-95"
                      >
                        {t('no')}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {selectedReport.status === ReportStatus.PENDING && (
                        <>
                          <button 
                            onClick={() => setConfirmingAction({ reportId: selectedReport.id, status: ReportStatus.VERIFIED, type: 'verify' })}
                            className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-2xl font-black text-sm transition-all shadow-lg active:scale-95"
                          >
                            {t('verify')}
                          </button>
                          <button 
                            onClick={() => setConfirmingAction({ reportId: selectedReport.id, status: ReportStatus.DECLINED, type: 'decline' })}
                            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-2xl font-black text-sm transition-all shadow-lg active:scale-95"
                          >
                            {t('decline')}
                          </button>
                        </>
                      )}
                      {selectedReport.status === ReportStatus.VERIFIED && (
                        <button 
                          onClick={() => setConfirmingAction({ reportId: selectedReport.id, status: ReportStatus.RESOLVED, type: 'resolve' })}
                          className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-2xl font-black text-sm transition-all shadow-lg active:scale-95"
                        >
                          {t('markResolved')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

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

                    <div className="p-6 bg-gray-100 dark:bg-gray-700/50 rounded-3xl">
                      <div className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">Reporter</div>
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

export default AdminPage;
