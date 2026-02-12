
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Report, ReportStatus, ReportFile } from '../types';
import { db } from '../services/databaseService';
import { useTranslation } from '../context/LanguageContext';

interface SubmitPageProps {
  user: User;
}

const SubmitPage: React.FC<SubmitPageProps> = ({ user }) => {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [files, setFiles] = useState<ReportFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewingFile, setPreviewingFile] = useState<ReportFile | null>(null);
  const [isConfirmingLocation, setIsConfirmingLocation] = useState(false);
  const [isFetchingLocation, setIsFetchingLocation] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    selectedFiles.forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setFiles(prev => [...prev, { name: file.name, type: file.type, url: base64 }]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const fetchCurrentLocation = () => {
    setIsFetchingLocation(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setLocation(`https://www.google.com/maps?q=${latitude},${longitude}`);
          setIsFetchingLocation(false);
          setIsConfirmingLocation(false);
        },
        () => {
          alert(t('locationError'));
          setIsFetchingLocation(false);
          setIsConfirmingLocation(false);
        }
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) return alert('Please select a category');
    if (files.length === 0) return alert('Please upload evidence');

    setIsSubmitting(true);
    const firstImage = files.find(f => f.type.startsWith('image'))?.url;
    
    const newReport: Report = {
      id: Date.now().toString(),
      user: user.username,
      category,
      title,
      description,
      location,
      date: new Date().toISOString(),
      status: ReportStatus.PENDING,
      files,
      thumbnail: firstImage || 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=500&auto=format&fit=crop'
    };

    try {
      await db.saveReport(newReport);
      await db.addActivity({
        id: Date.now().toString() + Math.random(),
        username: user.username,
        type: 'submit',
        targetTitle: title,
        pointsChange: 0,
        date: new Date().toISOString()
      });
      setTimeout(() => navigate('/dashboard'), 1000);
    } catch (error) {
      setIsSubmitting(false);
      alert("Error saving report.");
    }
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl animate-in slide-in-from-bottom-8 duration-500">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-black mb-4 tracking-tight">{t('reportAnIssue')}</h1>
        <p className="text-gray-400 font-bold uppercase tracking-[0.2em] text-xs">Community Safety Network</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-[3rem] shadow-2xl border border-gray-200 dark:border-gray-700 p-8 sm:p-14 space-y-10">
        <div className="space-y-4">
          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 flex items-center gap-2">
            <i className="fa-solid fa-layer-group text-primary-500"></i> {t('category')}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {['Road', 'Bridge', 'Streetlight', 'Sidewalk', 'Drainage', 'Other'].map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`py-4 px-4 rounded-[1.25rem] text-xs font-black uppercase tracking-widest border-2 transition-all ${
                  category === cat ? 'bg-primary-600 border-primary-600 text-white shadow-xl scale-105' : 'bg-gray-50 dark:bg-gray-900 border-transparent text-gray-400 hover:border-primary-100 hover:text-primary-600'
                }`}
              >
                {t(cat.toLowerCase() as any) || cat}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">{t('issueSummary')}</label>
            <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-7 py-5 rounded-[1.5rem] bg-gray-100 dark:bg-gray-900 border border-transparent focus:border-primary-500 focus:bg-white outline-none transition-all font-black" placeholder="What happened?" />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">{t('detailedDesc')}</label>
            <textarea required value={description} onChange={(e) => setDescription(e.target.value)} className="w-full px-7 py-5 rounded-[1.5rem] bg-gray-100 dark:bg-gray-900 border border-transparent focus:border-primary-500 focus:bg-white outline-none transition-all font-bold min-h-[140px] resize-none" placeholder="Details..." />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">{t('location')}</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input type="text" required value={location} onChange={(e) => setLocation(e.target.value)} className="flex-grow px-7 py-5 rounded-[1.5rem] bg-gray-100 dark:bg-gray-900 border border-transparent focus:border-primary-500 focus:bg-white outline-none transition-all font-black" placeholder="Address..." />
              <button type="button" onClick={() => setIsConfirmingLocation(true)} className="bg-primary-50 dark:bg-primary-900/20 text-primary-600 px-8 py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-widest hover:bg-primary-600 hover:text-white transition-all border border-primary-100">Location</button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">{t('evidenceUpload')}</label>
          <div onClick={() => document.getElementById('report-files')?.click()} className="border-4 border-dashed border-gray-100 dark:border-gray-700 rounded-[2.5rem] p-12 text-center cursor-pointer hover:border-primary-500 hover:bg-primary-50/10 transition-all group bg-gray-50/50 dark:bg-gray-900/50">
            <i className="fa-solid fa-cloud-arrow-up text-5xl text-gray-200 group-hover:text-primary-500 transition-colors mb-4"></i>
            <p className="font-black text-gray-400 uppercase tracking-widest text-[10px]">{t('dragDrop')}</p>
            <input id="report-files" type="file" multiple hidden accept="image/*,video/*" onChange={handleFileChange} />
          </div>

          {files.length > 0 && (
            <div className="flex flex-wrap gap-4 mt-6 p-6 bg-gray-100 dark:bg-gray-900 rounded-[2rem] border border-gray-200 dark:border-gray-800 shadow-inner">
              {files.map((file, i) => (
                <div key={i} className="relative w-24 h-24 group">
                  <img src={file.url} className="w-full h-full object-cover rounded-xl border border-white dark:border-gray-700 shadow-md" alt="Preview" />
                  <button type="button" onClick={() => removeFile(i)} className="absolute -top-2 -right-2 bg-red-600 text-white w-6 h-6 rounded-full text-xs flex items-center justify-center shadow-lg"><i className="fa-solid fa-xmark"></i></button>
                </div>
              ))}
            </div>
          )}
        </div>

        <button type="submit" disabled={isSubmitting} className="w-full bg-primary-600 hover:bg-primary-700 text-white py-6 rounded-[1.75rem] font-black text-lg uppercase tracking-widest shadow-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-3">
          {isSubmitting ? <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div> : t('submitReport')}
        </button>
      </form>
    </div>
  );
};

export default SubmitPage;
