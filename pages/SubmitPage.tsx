
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
        setFiles(prev => [...prev, { 
          name: file.name, 
          type: file.type, 
          url: base64 
        }]);
      };
      reader.onerror = () => alert("Error reading file: " + file.name);
      reader.readAsDataURL(file);
    });
    // Reset input value so same file can be selected again
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
          const mapLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
          setLocation(mapLink);
          setIsFetchingLocation(false);
          setIsConfirmingLocation(false);
        },
        (error) => {
          console.error("Geolocation error:", error);
          alert(t('locationError'));
          setIsFetchingLocation(false);
          setIsConfirmingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
      setIsFetchingLocation(false);
      setIsConfirmingLocation(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category) return alert('Please select a category');
    if (files.length === 0) return alert('Please upload at least one photo or video as evidence.');

    setIsSubmitting(true);
    
    // Use an image for thumbnail if available, otherwise a generic video placeholder
    const firstImage = files.find(f => f.type.startsWith('image'))?.url;
    const videoPlaceholder = 'https://images.unsplash.com/photo-1516280440614-37939bbacd81?q=80&w=500&auto=format&fit=crop';
    
    const newReport: Report = {
      id: Date.now().toString(),
      user: user.username,
      category,
      title,
      description,
      location,
      date: new Date().toISOString(), // Use ISO string for reliable sorting later
      status: ReportStatus.PENDING,
      files,
      thumbnail: firstImage || videoPlaceholder
    };

    try {
      // Save to IndexedDB (Async)
      await db.saveReport(newReport);

      // Log the submission activity
      await db.addActivity({
        id: Date.now().toString() + Math.random(),
        username: user.username,
        type: 'submit',
        targetTitle: title,
        pointsChange: 0,
        date: new Date().toISOString()
      });
      
      // Artificial delay for feedback
      setTimeout(() => {
        setIsSubmitting(false);
        navigate('/dashboard');
      }, 1000);
    } catch (error) {
      console.error("Storage error:", error);
      setIsSubmitting(false);
      alert("An error occurred while saving your report. Please try again with smaller files.");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl animate-in slide-in-from-bottom-8 duration-500">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-black mb-4">{t('reportAnIssue')}</h1>
        <p className="text-gray-500 dark:text-gray-400 font-medium">Your reports directly improve your community.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-gray-700 p-8 sm:p-12 space-y-8">
        {/* Category Selection */}
        <div className="space-y-3">
          <label className="text-sm font-black uppercase tracking-widest text-gray-400 flex items-center gap-2">
            <i className="fa-solid fa-layer-group text-primary-500"></i> {t('category')}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {['Road', 'Bridge', 'Streetlight', 'Sidewalk', 'Drainage', 'Other'].map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`py-3 px-4 rounded-2xl text-sm font-bold border-2 transition-all ${
                  category === cat 
                  ? 'bg-primary-600 border-primary-600 text-white shadow-lg' 
                  : 'bg-gray-50 dark:bg-gray-900 border-transparent text-gray-600 dark:text-gray-400 hover:border-primary-200'
                }`}
              >
                {t(cat.toLowerCase() as any) || cat}
              </button>
            ))}
          </div>
        </div>

        {/* Details Input */}
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-black uppercase tracking-widest text-gray-400">{t('issueSummary')}</label>
            <input 
              type="text" 
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Damaged street sign"
              className="w-full px-6 py-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-transparent focus:border-primary-500 outline-none transition-all font-bold"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-black uppercase tracking-widest text-gray-400">{t('detailedDesc')}</label>
            <textarea 
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="..."
              className="w-full px-6 py-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-transparent focus:border-primary-500 outline-none transition-all font-medium min-h-[120px] resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-black uppercase tracking-widest text-gray-400">{t('location')}</label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-grow">
                <i className="fa-solid fa-map-pin absolute left-6 top-1/2 -translate-y-1/2 text-primary-500"></i>
                <input 
                  type="text" 
                  required
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Address or Google Maps link"
                  className="w-full pl-14 pr-6 py-4 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-transparent focus:border-primary-500 outline-none transition-all font-bold"
                />
              </div>
              <button 
                type="button"
                onClick={() => setIsConfirmingLocation(true)}
                disabled={isFetchingLocation}
                className="bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400 px-6 py-4 rounded-2xl font-black text-sm whitespace-nowrap hover:bg-primary-600 hover:text-white transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 border border-primary-100 dark:border-primary-800"
              >
                {isFetchingLocation ? (
                   <>
                    <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
                    {t('fetchingLocation')}
                   </>
                ) : (
                  <>
                    <i className="fa-solid fa-location-crosshairs"></i>
                    {t('currentLocation')}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Media Upload Area */}
        <div className="space-y-3">
          <label className="text-sm font-black uppercase tracking-widest text-gray-400">{t('evidenceUpload')}</label>
          <div 
            onClick={() => document.getElementById('report-files')?.click()}
            className="border-4 border-dashed border-gray-100 dark:border-gray-700 rounded-[2rem] p-10 text-center cursor-pointer hover:border-primary-300 dark:hover:border-primary-800 transition-colors group"
          >
            <div className="text-4xl text-gray-300 group-hover:text-primary-500 transition-colors mb-4">
              <i className="fa-solid fa-file-video"></i>
            </div>
            <p className="font-bold text-gray-500">{t('dragDrop')}</p>
            <p className="text-xs text-gray-400 mt-1 uppercase font-bold tracking-widest">Supports high-quality video & photos</p>
            <input id="report-files" type="file" multiple hidden accept="image/*,video/*" onChange={handleFileChange} />
          </div>

          {/* File Selection Previews */}
          {files.length > 0 && (
            <div className="flex flex-wrap gap-6 mt-10 p-6 bg-gray-50 dark:bg-gray-900 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-inner">
              {files.map((file, i) => (
                <div 
                  key={i} 
                  className="relative group w-24 h-24 sm:w-32 sm:h-32 z-10 hover:z-50"
                >
                  <div className="w-full h-full transition-all duration-300 group-hover:scale-[1.8] group-hover:z-50 relative">
                    <div 
                      className="w-full h-full rounded-2xl overflow-hidden border-2 border-primary-200 shadow-lg group-hover:shadow-2xl cursor-pointer relative z-0 bg-black"
                      onClick={() => setPreviewingFile(file)}
                    >
                      {file.type.startsWith('image') ? (
                        <img src={file.url} className="w-full h-full object-cover" alt="Preview" />
                      ) : (
                        <video 
                          src={file.url} 
                          muted 
                          className="w-full h-full object-cover" 
                        />
                      )}
                      <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <i className={`fa-solid ${file.type.startsWith('video') ? 'fa-play' : 'fa-magnifying-glass-plus'} text-white text-xl`}></i>
                      </div>
                      {file.type.startsWith('video') && (
                         <div className="absolute top-2 left-2 bg-primary-600 text-white text-[8px] px-1.5 py-0.5 rounded-md font-black shadow-md">VIDEO</div>
                      )}
                    </div>
                    {/* Delete button: properly layered to avoid overlapping other items */}
                    <button 
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white w-6 h-6 rounded-xl text-xs flex items-center justify-center shadow-xl z-20 transition-all hover:bg-red-600 active:scale-90"
                    >
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white py-5 rounded-[1.5rem] font-black text-xl shadow-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-3"
        >
          {isSubmitting ? (
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Processing Media...</span>
            </div>
          ) : (
            <>
              <i className="fa-solid fa-paper-plane"></i>
              {t('submitReport')}
            </>
          )}
        </button>
      </form>

      {/* Location Confirmation Pop-up */}
      {isConfirmingLocation && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
            onClick={() => !isFetchingLocation && setIsConfirmingLocation(false)}
          ></div>
          <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-[2rem] shadow-2xl relative z-10 overflow-hidden animate-in zoom-in duration-300 p-8 text-center">
            <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 text-primary-600 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">
              <i className="fa-solid fa-location-dot"></i>
            </div>
            <h3 className="text-xl font-black mb-4 leading-tight">{t('confirmLocation')}</h3>
            <div className="flex gap-4">
              <button 
                type="button"
                onClick={fetchCurrentLocation}
                disabled={isFetchingLocation}
                className="flex-1 bg-primary-600 text-white py-3 rounded-xl font-black text-sm transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2"
              >
                {isFetchingLocation ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : t('yes')}
              </button>
              <button 
                type="button"
                onClick={() => setIsConfirmingLocation(false)}
                disabled={isFetchingLocation}
                className="flex-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 py-3 rounded-xl font-black text-sm transition-all active:scale-95"
              >
                {t('no')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Media Preview Modal */}
      {previewingFile && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/95 backdrop-blur-xl animate-in fade-in duration-300"
            onClick={() => setPreviewingFile(null)}
          ></div>
          <div className="relative z-10 max-w-5xl w-full flex flex-col items-center gap-6 animate-in zoom-in duration-300">
             <div className="w-full max-h-[75vh] flex items-center justify-center">
                {previewingFile.type.startsWith('video') ? (
                  <video src={previewingFile.url} controls autoPlay className="max-w-full max-h-[75vh] rounded-3xl shadow-2xl bg-black border border-white/10" />
                ) : (
                  <img src={previewingFile.url} className="max-w-full max-h-[75vh] object-contain rounded-3xl shadow-2xl" alt="Preview" />
                )}
             </div>

             <button 
              onClick={() => setPreviewingFile(null)}
              className="bg-white hover:bg-gray-100 text-black px-12 py-4 rounded-2xl font-black transition-all shadow-xl active:scale-95"
             >
               Close
             </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubmitPage;
