
import { createClient } from '@supabase/supabase-js';
import { User, Report, UserActivity } from '../types';

/**
 * ONLINE DATABASE CONFIGURATION
 */
const CLOUD_CONFIG = {
  URL: process.env.SUPABASE_URL || '',
  KEY: process.env.SUPABASE_KEY || '',
  isEnabled: !!(process.env.SUPABASE_URL && process.env.SUPABASE_KEY)
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

  // REALTIME SUBSCRIPTIONS
  subscribeToUser: (username: string, onUpdate: (user: User) => void) => {
    if (!CLOUD_CONFIG.isEnabled || !supabase) return null;

    console.log(`📡 Initializing Realtime Subscription for: ${username}`);
    
    return supabase
      .channel(`user-sync-${username}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'users',
          filter: `username=eq.${username}`,
        },
        (payload) => {
          console.log("⚡ Realtime Update Received:", payload.new);
          onUpdate(payload.new as User);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') console.log('✅ Subscribed to Realtime changes');
        if (status === 'CHANNEL_ERROR') console.error('❌ Realtime Connection Failed. Check if Realtime is enabled in Supabase Dashboard -> Database -> Replication');
      });
  },

  // USER MANAGEMENT
  getUsers: async (): Promise<User[]> => {
    if (CLOUD_CONFIG.isEnabled && supabase) {
      const { data, error } = await supabase.from('users').select('*');
      if (!error) return data || [];
    }
    const data = localStorage.getItem(USERS_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveUser: async (user: User) => {
    if (CLOUD_CONFIG.isEnabled && supabase) {
      await supabase.from('users').upsert(user, { onConflict: 'username' });
      return;
    }
    const users = await db.getUsers();
    const existingIndex = users.findIndex(u => u.username === user.username);
    if (existingIndex > -1) users[existingIndex] = user;
    else users.push(user);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  },

  // FASTER POINT UPDATE METHOD
  updateUserPoints: async (username: string, pointsToAdd: number) => {
    if (CLOUD_CONFIG.isEnabled && supabase) {
      // Direct DB increment is much faster and safer than fetch-and-save
      const { data: users } = await supabase.from('users').select('points').eq('username', username).single();
      if (users) {
        const { error } = await supabase
          .from('users')
          .update({ points: users.points + pointsToAdd })
          .eq('username', username);
        if (error) console.error("Points update error:", error);
      }
      return;
    }
    const users = await db.getUsers();
    const user = users.find(u => u.username === username);
    if (user) {
      user.points += pointsToAdd;
      await db.saveUser(user);
    }
  },

  // REPORTS
  getReports: async (): Promise<Report[]> => {
    if (CLOUD_CONFIG.isEnabled && supabase) {
      const { data, error } = await supabase.from('reports').select('*').order('date', { ascending: false });
      if (!error) return data || [];
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
      await supabase.from('reports').insert(report);
      return;
    }
    const idb = await initIDB();
    return new Promise((resolve) => {
      const transaction = idb.transaction(STORE_NAME, 'readwrite');
      transaction.objectStore(STORE_NAME).put(report);
      transaction.oncomplete = () => resolve();
    });
  },

  updateReport: async (reportId: string, updates: Partial<Report>): Promise<void> => {
    if (CLOUD_CONFIG.isEnabled && supabase) {
      await supabase.from('reports').update(updates).eq('id', reportId);
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
      await supabase.from('reports').delete().eq('id', reportId);
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
      if (!error) return data || [];
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
      await supabase.from('activities').insert(activity);
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
