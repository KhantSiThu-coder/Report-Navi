
import { createClient } from '@supabase/supabase-js';
import { User, Report, UserActivity } from '../types';

const CLOUD_CONFIG = {
  URL: process.env.SUPABASE_URL || '',
  KEY: process.env.SUPABASE_KEY || '',
  isEnabled: !!(process.env.SUPABASE_URL && process.env.SUPABASE_KEY)
};

const supabase = CLOUD_CONFIG.isEnabled 
  ? createClient(CLOUD_CONFIG.URL, CLOUD_CONFIG.KEY) 
  : null;

// Realtime Broadcast Channel for instantaneous UI updates
const syncChannel = supabase ? supabase.channel('report_navi_sync') : null;
if (syncChannel) {
  syncChannel.subscribe();
}

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

  // Direct broadcast to all connected clients for instant sync
  broadcastSync: (payload: any) => {
    if (syncChannel) {
      syncChannel.send({
        type: 'broadcast',
        event: 'data_changed',
        payload
      });
    }
  },

  onSync: (callback: (payload: any) => void) => {
    if (!syncChannel) return null;
    return syncChannel.on('broadcast', { event: 'data_changed' }, ({ payload }) => {
      callback(payload);
    });
  },

  subscribeToUser: (username: string, onUpdate: (user: User) => void) => {
    if (!CLOUD_CONFIG.isEnabled || !supabase) return null;
    
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
          onUpdate(payload.new as User);
        }
      )
      .subscribe();
  },

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
      db.broadcastSync({ type: 'user_update', username: user.username });
      return;
    }
    const users = await db.getUsers();
    const existingIndex = users.findIndex(u => u.username === user.username);
    if (existingIndex > -1) users[existingIndex] = user;
    else users.push(user);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  },

  updateUserPoints: async (username: string, pointsToAdd: number) => {
    if (CLOUD_CONFIG.isEnabled && supabase) {
      // Direct update using postgres math to avoid fetch-then-save race conditions
      const { error } = await supabase.rpc('increment_points', { x: pointsToAdd, row_id: username });
      
      // Fallback if RPC isn't set up: standard fetch-update logic
      if (error) {
        const { data: user } = await supabase.from('users').select('points').eq('username', username).single();
        if (user) {
          await supabase.from('users').update({ points: user.points + pointsToAdd }).eq('username', username);
        }
      }
      db.broadcastSync({ type: 'points_update', username, pointsAdded: pointsToAdd });
      return;
    }
    const users = await db.getUsers();
    const user = users.find(u => u.username === username);
    if (user) {
      user.points += pointsToAdd;
      await db.saveUser(user);
    }
  },

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
      db.broadcastSync({ type: 'new_report', id: report.id });
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
      db.broadcastSync({ type: 'report_update', id: reportId, updates });
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
      db.broadcastSync({ type: 'new_activity', username: activity.username });
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
