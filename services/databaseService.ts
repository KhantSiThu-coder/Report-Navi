
import { createClient } from '@supabase/supabase-js';
import { User, Report, UserActivity } from '../types';

/**
 * ONLINE DATABASE CONFIGURATION
 */
const CLOUD_CONFIG = {
  URL: 'https://bzahntkbtmdwuqazjbpr.supabase.co',
  KEY: 'sb_publishable__IZeTrmjlrvC3fkEoFvcUA_NidZYOYE',
  isEnabled: true 
};

// Initialize Supabase client
const supabase = CLOUD_CONFIG.isEnabled 
  ? createClient(CLOUD_CONFIG.URL, CLOUD_CONFIG.KEY) 
  : null;

const USERS_KEY = 'crp_users_v1';
const DB_NAME = 'ReportNaviDB';
const STORE_NAME = 'reports';
const ACTIVITY_STORE = 'activities';

const initIDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 3);
    request.onupgradeneeded = (event) => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(ACTIVITY_STORE)) db.createObjectStore(ACTIVITY_STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const db = {
  isOnline: () => CLOUD_CONFIG.isEnabled,

  // USER MANAGEMENT
  getUsers: async (): Promise<User[]> => {
    if (CLOUD_CONFIG.isEnabled && supabase) {
      const { data, error } = await supabase.from('users').select('*');
      if (error) console.error("Cloud fetch error:", error);
      return data || [];
    }
    const data = localStorage.getItem(USERS_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveUser: async (user: User) => {
    if (CLOUD_CONFIG.isEnabled && supabase) {
      const { error } = await supabase.from('users').upsert(user, { onConflict: 'username' });
      if (error) console.error("Cloud save error:", error);
      return;
    }
    const users = await db.getUsers();
    const existingIndex = users.findIndex(u => u.username === user.username);
    if (existingIndex > -1) users[existingIndex] = user;
    else users.push(user);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  },

  // REPORTS
  getReports: async (): Promise<Report[]> => {
    if (CLOUD_CONFIG.isEnabled && supabase) {
      const { data, error } = await supabase.from('reports').select('*').order('date', { ascending: false });
      if (error) console.error("Cloud fetch reports error:", error);
      return data || [];
    }
    const idb = await initIDB();
    return new Promise((resolve) => {
      const transaction = idb.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => {
        const reports = request.result as Report[];
        resolve(reports.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      };
    });
  },

  saveReport: async (report: Report): Promise<void> => {
    if (CLOUD_CONFIG.isEnabled && supabase) {
      const { error } = await supabase.from('reports').insert(report);
      if (error) console.error("Cloud insert report error:", error);
      return;
    }
    const idb = await initIDB();
    return new Promise((resolve) => {
      const transaction = idb.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      store.put(report);
      transaction.oncomplete = () => resolve();
    });
  },

  updateReport: async (reportId: string, updates: Partial<Report>): Promise<void> => {
    if (CLOUD_CONFIG.isEnabled && supabase) {
      const { error } = await supabase.from('reports').update(updates).eq('id', reportId);
      if (error) console.error("Cloud update report error:", error);
      return;
    }
    const idb = await initIDB();
    return new Promise((resolve) => {
      const transaction = idb.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(reportId);
      request.onsuccess = () => {
        const data = request.result;
        if (data) store.put({ ...data, ...updates });
        resolve();
      };
    });
  },

  deleteReport: async (reportId: string): Promise<void> => {
    if (CLOUD_CONFIG.isEnabled && supabase) {
      const { error } = await supabase.from('reports').delete().eq('id', reportId);
      if (error) console.error("Cloud delete report error:", error);
      return;
    }
    const idb = await initIDB();
    return new Promise((resolve) => {
      const transaction = idb.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).delete(reportId);
      transaction.oncomplete = () => resolve();
    });
  },

  // ACTIVITY LOGS
  getActivities: async (username: string): Promise<UserActivity[]> => {
    if (CLOUD_CONFIG.isEnabled && supabase) {
      const { data, error } = await supabase.from('activities').select('*').eq('username', username).order('date', { ascending: false });
      if (error) console.error("Cloud fetch activities error:", error);
      return data || [];
    }
    const idb = await initIDB();
    return new Promise((resolve) => {
      const transaction = idb.transaction(ACTIVITY_STORE, 'readonly');
      const request = transaction.objectStore(ACTIVITY_STORE).getAll();
      request.onsuccess = () => {
        const all = request.result as UserActivity[];
        resolve(all.filter(a => a.username === username).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      };
    });
  },

  addActivity: async (activity: UserActivity): Promise<void> => {
    if (CLOUD_CONFIG.isEnabled && supabase) {
      const { error } = await supabase.from('activities').insert(activity);
      if (error) console.error("Cloud insert activity error:", error);
      return;
    }
    const idb = await initIDB();
    return new Promise((resolve) => {
      const transaction = idb.transaction(ACTIVITY_STORE, 'readwrite');
      transaction.objectStore(ACTIVITY_STORE).put(activity);
      transaction.oncomplete = () => resolve();
    });
  }
};
