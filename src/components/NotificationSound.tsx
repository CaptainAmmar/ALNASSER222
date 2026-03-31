import React, { useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, limit, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Notification } from '../types';
import { toast } from 'sonner';
import { Bell } from 'lucide-react';

const NOTIFICATION_SOUND_URL = 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3';

export const NotificationSound: React.FC = () => {
  const { profile } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isInitialLoad = useRef(true);

  useEffect(() => {
    if (!profile) return;

    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);

    // Listen for unread notifications
    const userIds = [profile.id];
    if (profile.uid) userIds.push(profile.uid);
    if (profile.oldId) userIds.push(profile.oldId);
    if (profile.role === 'manager') {
      userIds.push('manager_broadcast');
    }

    const q = query(
      collection(db, 'notifications'),
      where('read', '==', false),
      where('userId', 'in', userIds)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Skip the initial batch of unread notifications
      if (isInitialLoad.current) {
        isInitialLoad.current = false;
        console.log("Notification sound listener initialized with", snapshot.size, "unread notifications");
        return;
      }

      snapshot.docChanges().forEach((change) => {
        // Only play sound and show toast for NEWLY added unread notifications
        if (change.type === 'added') {
          const data = change.doc.data() as Notification;
          
          // Show toast notification
          toast(data.title, {
            description: data.content,
            icon: <Bell className="text-blue-600" size={20} />,
            duration: 5000,
            action: {
              label: 'عرض',
              onClick: () => {
                // We can't easily change tab from here without a global state
                // but at least the user sees it
              }
            }
          });

          // Play sound
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
              playPromise.catch(err => {
                console.warn("Audio playback failed (user interaction might be required):", err);
              });
            }
          }
        }
      });
    }, (error) => {
      if (error.code === 'permission-denied') {
        console.warn("Permission denied for notification sound listener. This is expected during initial profile sync.");
      } else {
        console.error("Notification sound listener error:", error);
      }
    });

    return () => unsubscribe();
  }, [profile]);

  return null;
};
