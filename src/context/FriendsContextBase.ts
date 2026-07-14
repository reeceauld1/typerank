import { createContext } from 'react';
import type { FriendEntry } from '../types/index.js';

export interface FriendsContextType {
  friends: FriendEntry[];
  incomingRequests: FriendEntry[];
  outgoingRequests: FriendEntry[];
  loading: boolean;
  refresh: () => Promise<void>;
  sendRequest: (username: string) => Promise<{ ok: boolean; error?: string }>;
  acceptRequest: (userId: string) => Promise<boolean>;
  declineRequest: (userId: string) => Promise<boolean>;
  removeFriend: (userId: string) => Promise<boolean>;
}

export const FriendsContext = createContext<FriendsContextType | undefined>(undefined);
