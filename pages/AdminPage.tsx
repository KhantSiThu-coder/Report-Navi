
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
  
  useEffect(() => {
    fetchData();

    // Listen for broadcast sync to update UI immediately when other admins make changes
    const syncListener = db.onSync((payload) => {
      if (payload.type === 'report_update' || payload.type === 'new_report') {
        fetchData();
      }
    });

    return () => {
      // Cleanup is handled by Supabase channel teardown in real scenarios
    };
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

    if (report.user === currentUser.username) {
      alert("System Integrity Alert: You cannot verify or update your own reports.");
      return;
    }

    // Optimistic UI Update: Reflect change immediately for the admin
    setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: newStatus } : r));
    setStats(prev => ({
      ...prev,
      pending: prev.pending - (newStatus !== ReportStatus.PENDING && report.status === ReportStatus.PENDING ? 1 : 0),
      verified: prev.verified + (newStatus === ReportStatus.VERIFIED ? 1 : 0)
    }));

    try {
      await db.updateReport(reportId, { status: newStatus });
      
      let pts = 0;
      if (newStatus === ReportStatus.VERIFIED) {
        pts = 50;
        await db.updateUserPoints(reporterUsername, pts);
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
    } catch (err) {
      console.error("Update failed", err);
      // Revert if error
      fetchData();
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 animate-in zoom-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-black mb-2">{t('adminControl')}</h1>
          <p className="text-gray-500 font-bold uppercase tracking-[0.2em] text-[10px]">{t('adminSub')}</p>
        </div>
        
        <div className="px-5 py-2.5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-300 dark:border-gray-800 shadow-sm flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <span className="text-[10px] font-black uppercase tracking-widest">{db.isOnline() ? 'Cloud Active' : 'Offline Mode'}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <div className="bg-white dark:bg-gray-900 p-8 rounded-[2rem] border border-gray-300 dark:border-gray-800 shadow-sm transition-transform hover:-translate-y-1">
          <div className="text-amber-500 font-black text-4xl mb-2">{stats.pending}</div>
          <div className="text-gray-400 text-[10px] font-black uppercase tracking-widest">{t('pendingReview')}</div>
        </div>
        <div className="bg-white dark:bg-gray-900 p-8 rounded-[2rem] border border-gray-300 dark:border-gray-800 shadow-sm transition-transform hover:-translate-y-1">
          <div className="text-primary-600 font-black text-4xl mb-2">{stats.verified}</div>
          <div className="text-gray-400 text-[10px] font-black uppercase tracking-widest">{t('successVerified')}</div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-xl overflow-hidden border border-gray-300 dark:border-gray-800">
        <div className="overflow-x-auto">
          {isLoading && reports.length === 0 ? (
             <div className="p-24 text-center font-black text-gray-400 uppercase tracking-widest text-xs animate-pulse">Synchronizing system state...</div>
          ) : (
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-950 border-b border-gray-300 dark:border-gray-800">
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Reporter</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Incident</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                  <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                {reports.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-24 text-center text-gray-400 font-black uppercase tracking-widest text-xs">No reports found</td>
                  </tr>
                ) : (
                  reports.map(report => (
                    <tr key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-8 py-5 font-black text-primary-600">{report.user}</td>
                      <td className="px-8 py-5">
                        <div className="font-black text-gray-900 dark:text-white">{report.title}</div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase">{report.category}</div>
                      </td>
                      <td className="px-8 py-5">
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border shadow-sm ${
                          report.status === ReportStatus.PENDING ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          report.status === ReportStatus.DECLINED ? 'bg-red-50 text-red-700 border-red-200' :
                          'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {report.status}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        {report.user !== currentUser.username && report.status === ReportStatus.PENDING && (
                          <div className="flex gap-2 justify-end">
                            <button onClick={() => handleStatusUpdate(report.id, report.user, ReportStatus.VERIFIED)} className="bg-green-600 hover:bg-green-700 text-white text-[9px] font-black uppercase px-3 py-1.5 rounded-xl shadow-md active:scale-95 transition-all">Verify</button>
                            <button onClick={() => handleStatusUpdate(report.id, report.user, ReportStatus.DECLINED)} className="bg-red-600 hover:bg-red-700 text-white text-[9px] font-black uppercase px-3 py-1.5 rounded-xl shadow-md active:scale-95 transition-all">Decline</button>
                          </div>
                        )}
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

