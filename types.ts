
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user'
}

export enum ReportStatus {
  PENDING = 'Pending',
  VERIFIED = 'Verified',
  RESOLVED = 'Resolved',
  DECLINED = 'Declined'
}

export type Language = 'en' | 'jp';

export interface User {
  username: string;
  role: UserRole;
  points: number;
  memberSince: string;
  profilePic?: string; // Base64 or URL
  passwordHash: string; // Encrypted for security
}

export interface ReportFile {
  name: string;
  type: string;
  url: string; // Base64 or Blob URL
}

export interface Report {
  id: string;
  user: string;
  category: string;
  title: string;
  description: string;
  location: string;
  date: string;
  status: ReportStatus;
  files: ReportFile[];
  thumbnail: string;
}

export interface UserActivity {
  id: string;
  username: string;
  type: 'submit' | 'verify' | 'delete' | 'resolve' | 'decline';
  targetTitle: string;
  pointsChange: number;
  date: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
