
import React, { useState, useRef, useEffect } from 'react';
// Added ReportStatus to the imported types to fix reference error
import { User, Report, UserActivity, ReportStatus } from '../types';
import { db } from '../services/databaseService';
import { useTranslation } from '../context/LanguageContext';

interface ProfilePageProps {
  user: User;
  onUpdateUser: (updatedUser: User) => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ user, onUpdateUser }) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [userReports, setUserReports] = useState<Report[]>([]);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [allReports, allActivities] = await Promise.all([
          db.getReports(),
          db.getActivities(user.username)
        ]);
        
        const filteredReports = allReports.filter(r => r.user === user.username);
        setUserReports(filteredReports);
        setActivities(allActivities);
      } catch (err) {
        console.error("Failed to fetch profile data", err);
      }
    };
    fetchData();
  }, [user.username]);

  const handleProfilePicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUpdating(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const updatedUser = { ...user, profilePic: base64 };
      onUpdateUser(updatedUser);
      setIsUpdating(false);
    };
    reader.readAsDataURL(file);
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

  const getActivityConfig = (type: string) => {
    switch (type) {
      case 'submit':
        return { label: t('act_submit'), icon: 'fa-paper-plane', color: 'text-primary-600', bg: 'bg-primary-50 dark:bg-primary-900/10' };
      case 'verify':
        return { label: t('act_verify'), icon: 'fa-circle-check', color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-900/10' };
      case 'resolve':
        return { label: t('act_resolve'), icon: 'fa-check-double', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/10' };
      case 'decline':
        return { label: t('act_decline'), icon: 'fa-circle-xmark', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/10' };
      case 'delete':
        return { label: t('act_delete'), icon: 'fa-trash-can', color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-900/10' };
      default:
        return { label: type, icon: 'fa-clock', color: 'text-gray-600', bg: 'bg-gray-50 dark:bg-gray-900' };
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 animate-in slide-in-from-right-4 duration-500">
      <h1 className="text-3xl font-black mb-8">{t('yourProfile')}</h1>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="h-32 bg-primary-600 relative">
               <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
                <div className="relative group">
                  {user.profilePic ? (
                    <img src={user.profilePic} className="w-24 h-24 rounded-3xl object-cover border-4 border-white dark:border-gray-800 shadow-xl" alt="Profile" />
                  ) : (
                    <div className="w-24 h-24 rounded-3xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-4xl font-black text-gray-500 border-4 border-white dark:border-gray-800 shadow-xl">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-black/40 rounded-3xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                  >
                    <i className="fa-solid fa-camera"></i>
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    hidden 
                    accept="image/*" 
                    onChange={handleProfilePicUpload} 
                  />
                </div>
               </div>
            </div>
            
            <div className="pt-16 pb-8 px-6 text-center">
              {isUpdating && <p className="text-primary-600 text-xs font-bold mb-2 animate-pulse">{t('updatingProfile')}</p>}
              <h2 className="text-2xl font-black">{user.username}</h2>
              <p className="text-gray-500 dark:text-gray-400 font-bold text-sm uppercase tracking-widest mb-4">
                {user.role} • {t('memberSince')} {user.memberSince}
              </p>
              
              <div className="flex items-center justify-center gap-2 text-amber-500 font-black text-xl mb-6">
                <i className="fa-solid fa-star"></i>
                {user.points} {t('points')}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-2xl">
                  <div className="text-2xl font-black">{userReports.length}</div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('reports')}</div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-2xl">
                  <div className="text-2xl font-black">
                    {userReports.filter(r => r.status === ReportStatus.VERIFIED || r.status === ReportStatus.RESOLVED).length}
                  </div>
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{t('impact')}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
            <h3 className="text-xl font-black mb-6 flex items-center gap-3">
              <i className="fa-solid fa-clock-rotate-left text-primary-500"></i>
              {t('activityHistory')}
            </h3>
            
            <div className="space-y-4">
              {activities.length === 0 ? (
                <p className="text-gray-500 py-4 text-center font-bold">{t('noActivity')}</p>
              ) : (
                activities.map((act) => {
                  const config = getActivityConfig(act.type);
                  return (
                    <div key={act.id} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl transition-all hover:bg-gray-100 dark:hover:bg-gray-700/50">
                      <div className={`w-10 h-10 ${config.bg} rounded-xl flex items-center justify-center ${config.color} shadow-sm border border-gray-100 dark:border-gray-700`}>
                        <i className={`fa-solid ${config.icon}`}></i>
                      </div>
                      <div className="flex-grow min-w-0">
                        <div className="font-black text-sm truncate">{config.label}: {act.targetTitle}</div>
                        <div className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">
                          {formatDate(act.date)}
                        </div>
                      </div>
                      {act.pointsChange > 0 && (
                        <div className="text-xs font-black px-2.5 py-1 rounded-lg text-green-600 bg-green-50 dark:bg-green-900/20">
                          +{act.pointsChange} {t('points')}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 p-8">
            <h3 className="text-xl font-black mb-6 flex items-center gap-3">
              <i className="fa-solid fa-gear text-primary-500"></i>
              {t('securitySettings')}
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <button className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-colors group text-left">
                <span className="font-bold">{t('changePassword')}</span>
                <i className="fa-solid fa-chevron-right text-gray-300 group-hover:text-primary-500 transition-colors"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
