
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
    fetchData();
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
                    <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
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
                        <div className="flex items-center justify-end h-10 min-w-[200px]">
                          {/* INTEGRITY CHECK: Hide action buttons for self-submitted reports */}
                          {report.user === currentUser.username ? (
                            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 italic">
                              <i className="fa-solid fa-user-shield"></i>
                              {t('selfSubmitted')}
                            </div>
                          ) : confirmingAction?.reportId === report.id ? (
                            <div className="flex items-center gap-2 animate-in slide-in-from-right-2 duration-300">
                              <span className="text-[10px] font-black uppercase tracking-widest text-red-500 animate-pulse">{t('areYouSure')}</span>
                              <button 
                                onClick={() => handleStatusUpdate(report.id, report.user, confirmingAction.status)}
                                className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl shadow-lg transition-all active:scale-90 ${
                                  confirmingAction.type === 'decline' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'
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
    </div>
  );
};

export default AdminPage;
