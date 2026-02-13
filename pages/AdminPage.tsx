
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
  
  // State for the "Yes/No" confirmation popup
  const [confirmingAction, setConfirmingAction] = useState<{ 
    reportId: string, 
    reporterUsername: string,
    status: ReportStatus,
    type: 'verify' | 'decline' | 'resolve'
  } | null>(null);

  useEffect(() => {
    fetchData();

    // High speed Postgres CDC subscription - Updates specific rows in state instantly
    const channel = db.subscribeToReports(
      (newReport) => setReports(prev => [newReport, ...prev]),
      (updatedReport) => {
        setReports(prev => prev.map(r => r.id === updatedReport.id ? updatedReport : r));
        // Update the modal if it's currently showing the modified report
        setSelectedReport(prev => prev?.id === updatedReport.id ? updatedReport : prev);
      },
      (deletedId) => {
        setReports(prev => prev.filter(r => r.id !== deletedId));
        if (selectedReport?.id === deletedId) setSelectedReport(null);
      }
    );

    return () => {
      channel?.unsubscribe();
    };
  }, [selectedReport?.id]);

  // Recalculate stats whenever reports change
  useEffect(() => {
    setStats({
      pending: reports.filter(r => r.status === ReportStatus.PENDING).length,
      verified: reports.filter(r => r.status === ReportStatus.VERIFIED || r.status === ReportStatus.RESOLVED).length
    });
  }, [reports]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await db.getReports();
      setReports(data);
    } catch (err) {
      console.error("Admin fetch error", err);
    } finally {
      setIsLoading(false);
    }
  };

  const executeStatusUpdate = async () => {
    if (!confirmingAction) return;

    const { reportId, reporterUsername, status: newStatus } = confirmingAction;
    const report = reports.find(r => r.id === reportId);
    if (!report) return;

    // Optimistic Update
    setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: newStatus } : r));

    try {
      await db.updateReport(reportId, { status: newStatus });
      
      let pts = 0;
      if (newStatus === ReportStatus.VERIFIED) {
        pts = 50;
        await db.updateUserPoints(reporterUsername, pts);
      }

      await db.addActivity({
        id: Date.now().toString() + Math.random(),
        username: reporterUsername,
        type: confirmingAction.type,
        targetTitle: report.title,
        pointsChange: pts,
        date: new Date().toISOString()
      });
    } catch (err) {
      console.error("Update failed:", err);
      fetchData(); // Re-sync state on failure
    }

    setConfirmingAction(null);
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
          <p className="text-gray-500 dark:text-gray-400 font-black uppercase tracking-widest text-xs">{t('adminSub')}</p>
        </div>
        
        <div className={`px-5 py-2.5 rounded-2xl font-black text-xs flex items-center gap-2 border-2 ${
          db.isOnline() ? 'bg-green-50 text-green-600 border-green-100' : 'bg-amber-50 text-amber-600 border-amber-100'
        }`}>
          <div className={`w-2 h-2 rounded-full animate-pulse ${db.isOnline() ? 'bg-green-500' : 'bg-amber-500'}`}></div>
          {db.isOnline() ? 'DIRECT CLOUD SYNC ACTIVE' : 'LOCAL MODE'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm transition-transform hover:-translate-y-1">
          <div className="text-amber-500 font-black text-4xl mb-2">{stats.pending}</div>
          <div className="text-gray-400 text-[10px] font-black uppercase tracking-widest">{t('pendingReview')}</div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-700 shadow-sm transition-transform hover:-translate-y-1">
          <div className="text-primary-600 font-black text-4xl mb-2">{stats.verified}</div>
          <div className="text-gray-400 text-[10px] font-black uppercase tracking-widest">{t('successVerified')}</div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-[3rem] shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className="overflow-x-auto">
          {isLoading && reports.length === 0 ? (
             <div className="p-24 text-center font-black text-gray-400 uppercase tracking-widest text-xs animate-pulse">Syncing Database Node...</div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700">
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">{t('reporter')}</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">{t('issue')}</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">{t('status')}</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {reports.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-24 text-center text-gray-400 font-black uppercase tracking-widest text-xs">{t('noReportsSystem')}</td>
                  </tr>
                ) : (
                  reports.map(report => (
                    <tr 
                      key={report.id} 
                      onClick={() => setSelectedReport(report)}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group"
                    >
                      <td className="px-8 py-5">
                        <div className="font-black text-primary-600 flex items-center gap-2">
                          {report.user}
                          {report.user === currentUser.username && (
                            <span className="text-[9px] bg-primary-100 text-primary-600 px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter">You</span>
                          )}
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="font-black text-gray-900 dark:text-white group-hover:text-primary-600 transition-colors">{report.title}</div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase">{t(report.category.toLowerCase() as any) || report.category}</div>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border shadow-sm ${
                          report.status === ReportStatus.PENDING ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          report.status === ReportStatus.DECLINED ? 'bg-red-50 text-red-700 border-red-200' :
                          'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {report.status}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          {report.user !== currentUser.username && report.status === ReportStatus.PENDING && (
                            <>
                              <button 
                                onClick={() => setConfirmingAction({ reportId: report.id, reporterUsername: report.user, status: ReportStatus.VERIFIED, type: 'verify' })}
                                className="bg-green-600 hover:bg-green-700 text-white text-[9px] font-black uppercase px-4 py-2 rounded-xl shadow-md active:scale-95 transition-all"
                              >
                                {t('verify')}
                              </button>
                              <button 
                                onClick={() => setConfirmingAction({ reportId: report.id, reporterUsername: report.user, status: ReportStatus.DECLINED, type: 'decline' })}
                                className="bg-red-600 hover:bg-red-700 text-white text-[9px] font-black uppercase px-4 py-2 rounded-xl shadow-md active:scale-95 transition-all"
                              >
                                {t('decline')}
                              </button>
                            </>
                          )}
                          {report.status === ReportStatus.VERIFIED && (
                            <button 
                              onClick={() => setConfirmingAction({ reportId: report.id, reporterUsername: report.user, status: ReportStatus.RESOLVED, type: 'resolve' })}
                              className="bg-primary-600 hover:bg-primary-700 text-white text-[9px] font-black uppercase px-4 py-2 rounded-xl shadow-md active:scale-95 transition-all"
                            >
                              {t('markResolved')}
                            </button>
                          )}
                          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-400 group-hover:bg-primary-600 group-hover:text-white transition-all ml-2">
                             <i className="fa-solid fa-chevron-right text-[10px]"></i>
                          </div>
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

      {/* ADMIN DETAIL MODAL */}
      {selectedReport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-md animate-in fade-in duration-300"
            onClick={() => setSelectedReport(null)}
          ></div>
          <div className="bg-white dark:bg-gray-800 w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col animate-in zoom-in duration-300 border border-gray-100 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 p-6 sm:p-8 flex items-center justify-between border-b border-gray-100 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md z-20">
              <div>
                <span className="bg-primary-600 text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg mb-2 inline-block text-white shadow-lg">
                  {t(selectedReport.category.toLowerCase() as any) || selectedReport.category}
                </span>
                <h2 className="text-2xl sm:text-3xl font-black">{selectedReport.title}</h2>
              </div>
              <button 
                type="button"
                onClick={() => setSelectedReport(null)}
                className="w-12 h-12 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-2xl flex items-center justify-center transition-all shadow-sm active:scale-95"
              >
                <i className="fa-solid fa-xmark text-xl"></i>
              </button>
            </div>

            <div className="flex-grow overflow-y-auto p-6 sm:p-10 space-y-10 custom-scrollbar">
              {/* Review Actions Inside Modal */}
              {selectedReport.user !== currentUser.username && (
                <div className="p-6 bg-primary-50 dark:bg-primary-900/10 rounded-3xl border border-primary-200 dark:border-primary-800/30 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
                  <div className="text-center sm:text-left">
                    <h4 className="font-black text-primary-800 dark:text-primary-300 text-lg">Report Verification</h4>
                    <p className="text-xs text-primary-600 dark:text-primary-400 font-bold uppercase tracking-widest">Perform admin oversight after evidence review</p>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {selectedReport.status === ReportStatus.PENDING && (
                      <>
                        <button 
                          onClick={() => setConfirmingAction({ reportId: selectedReport.id, reporterUsername: selectedReport.user, status: ReportStatus.VERIFIED, type: 'verify' })}
                          className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-2xl font-black text-sm shadow-xl shadow-green-600/20 transition-all active:scale-95"
                        >
                          {t('verify')}
                        </button>
                        <button 
                          onClick={() => setConfirmingAction({ reportId: selectedReport.id, reporterUsername: selectedReport.user, status: ReportStatus.DECLINED, type: 'decline' })}
                          className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 rounded-2xl font-black text-sm shadow-xl shadow-red-600/20 transition-all active:scale-95"
                        >
                          {t('decline')}
                        </button>
                      </>
                    )}
                    {selectedReport.status === ReportStatus.VERIFIED && (
                      <button 
                        onClick={() => setConfirmingAction({ reportId: selectedReport.id, reporterUsername: selectedReport.user, status: ReportStatus.RESOLVED, type: 'resolve' })}
                        className="bg-primary-600 hover:bg-primary-700 text-white px-10 py-3 rounded-2xl font-black text-sm shadow-xl shadow-primary-600/20 transition-all active:scale-95"
                      >
                        {t('markResolved')}
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <h4 className="font-black text-gray-400 uppercase tracking-widest text-xs flex items-center gap-2">
                  <i className="fa-solid fa-images"></i> Media Evidence ({selectedReport.files?.length || 0})
                </h4>
                <div className="flex flex-col gap-8">
                  {selectedReport.files && selectedReport.files.length > 0 ? (
                    selectedReport.files.map((file, i) => (
                      <div key={i} className="bg-gray-50 dark:bg-gray-900 rounded-[2rem] overflow-hidden shadow-md border border-gray-100 dark:border-gray-700 p-2">
                         {file.type.startsWith('video') ? (
                           <video src={file.url} controls className="w-full h-auto max-h-[80vh] rounded-[1.5rem] shadow-inner bg-black" />
                         ) : (
                           <img src={file.url} className="w-full h-auto max-h-[80vh] object-contain rounded-[1.5rem] shadow-inner bg-black/5" alt={`Evidence ${i}`} />
                         )}
                      </div>
                    ))
                  ) : (
                    <div className="bg-gray-50 dark:bg-gray-900 rounded-3xl p-16 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 dark:border-gray-700">
                      <i className="fa-solid fa-image text-5xl mb-4 opacity-20"></i>
                      <p className="font-black uppercase tracking-widest text-xs">No Visual Evidence Provided</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-10 pb-10">
                 <div className="space-y-8">
                    <div>
                      <h4 className="font-black text-gray-400 uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
                        <i className="fa-solid fa-align-left text-primary-500"></i> {t('description')}
                      </h4>
                      <p className="text-gray-700 dark:text-gray-200 leading-relaxed font-bold text-xl whitespace-pre-wrap">
                        {selectedReport.description}
                      </p>
                    </div>
                    
                    <div>
                      <h4 className="font-black text-gray-400 uppercase tracking-widest text-xs mb-4 flex items-center gap-2">
                        <i className="fa-solid fa-location-arrow text-primary-500"></i> {t('location')}
                      </h4>
                      {isUrl(selectedReport.location) ? (
                        <a 
                          href={selectedReport.location} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-3 px-8 py-4 bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 font-black text-lg rounded-2xl hover:bg-primary-600 hover:text-white transition-all shadow-sm break-all group"
                        >
                          <i className="fa-solid fa-map-location-dot group-hover:scale-110 transition-transform"></i>
                          View Detailed Coordinates
                        </a>
                      ) : (
                        <p className="text-gray-700 dark:text-gray-200 font-black text-xl">
                          {selectedReport.location}
                        </p>
                      )}
                    </div>
                 </div>

                 <div className="space-y-4">
                    <div className="p-8 bg-gray-50 dark:bg-gray-900 rounded-[2rem] flex justify-between items-center border border-gray-100 dark:border-gray-700 shadow-inner">
                      <div>
                        <div className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">{t('status')}</div>
                        <div className={`font-black text-2xl ${
                          selectedReport.status === ReportStatus.PENDING ? 'text-amber-500' :
                          selectedReport.status === ReportStatus.VERIFIED ? 'text-blue-500' :
                          'text-green-500'
                        }`}>{selectedReport.status}</div>
                      </div>
                      <div className="w-12 h-12 rounded-2xl bg-white dark:bg-gray-800 flex items-center justify-center shadow-sm">
                        <i className="fa-solid fa-shield-halved text-primary-500 opacity-40"></i>
                      </div>
                    </div>
                    
                    <div className="p-8 bg-gray-50 dark:bg-gray-900 rounded-[2rem] border border-gray-100 dark:border-gray-700 shadow-inner">
                      <div className="text-gray-400 text-[10px] font-black uppercase tracking-widest mb-1">{t('date')}</div>
                      <div className="font-black text-2xl">{formatDate(selectedReport.date)}</div>
                    </div>

                    <div className="p-8 bg-primary-50 dark:bg-primary-900/10 rounded-[2rem] border border-primary-100 dark:border-primary-900/20 shadow-sm">
                      <div className="text-primary-600 dark:text-primary-400 text-[10px] font-black uppercase tracking-widest mb-1">Reporter</div>
                      <div className="font-black text-2xl flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-600 text-white flex items-center justify-center text-sm">
                          {selectedReport.user.charAt(0).toUpperCase()}
                        </div>
                        {selectedReport.user}
                      </div>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* YES / NO CONFIRMATION OVERLAY */}
      {confirmingAction && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
            onClick={() => setConfirmingAction(null)}
          ></div>
          <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-[3rem] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in duration-300 border border-gray-100 dark:border-gray-700">
            <div className={`p-10 text-white text-center ${
              confirmingAction.type === 'verify' ? 'bg-green-600' : 
              confirmingAction.type === 'decline' ? 'bg-red-600' : 
              'bg-primary-600'
            }`}>
              <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center text-4xl mx-auto mb-6 backdrop-blur-md shadow-lg">
                <i className={`fa-solid ${
                  confirmingAction.type === 'verify' ? 'fa-check-double' : 
                  confirmingAction.type === 'decline' ? 'fa-circle-xmark' : 
                  'fa-circle-check'
                }`}></i>
              </div>
              <h3 className="text-2xl font-black mb-1">{t('areYouSure')}</h3>
              <p className="text-white/70 font-black text-[10px] uppercase tracking-[0.2em]">
                Confirm: {confirmingAction.type} status
              </p>
            </div>
            
            <div className="p-10 space-y-6">
              <p className="text-center text-gray-500 dark:text-gray-400 font-bold leading-relaxed">
                Updating this report will sync across the community dashboard and award points to the reporter.
              </p>
              
              <div className="flex gap-4">
                <button 
                  onClick={executeStatusUpdate}
                  className={`flex-1 py-4 rounded-2xl text-white font-black text-sm transition-all active:scale-95 shadow-xl ${
                    confirmingAction.type === 'verify' ? 'bg-green-600 shadow-green-500/30' : 
                    confirmingAction.type === 'decline' ? 'bg-red-600 shadow-red-500/30' : 
                    'bg-primary-600 shadow-primary-500/30'
                  }`}
                >
                  {t('yes')}
                </button>
                <button 
                  onClick={() => setConfirmingAction(null)}
                  className="flex-1 py-4 rounded-2xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-black text-sm transition-all active:scale-95 hover:bg-gray-200 dark:hover:bg-gray-600"
                >
                  {t('no')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
