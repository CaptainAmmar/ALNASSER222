import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Notification } from '../types';
import { Bell, Clock, CheckCircle2, Trash2 } from 'lucide-react';
import { cn } from '../components/Sidebar';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { doc, updateDoc, collection, query, where, onSnapshot, orderBy, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { ConfirmModal } from '../components/ConfirmModal';
import { toast } from 'sonner';

export const Notifications: React.FC = () => {
  const { profile } = useAuth();
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);
  const [isClearing, setIsClearing] = React.useState(false);

  React.useEffect(() => {
    if (!profile) return;

    // Managers see their own notifications + manager_broadcast
    // Employees only see their own notifications
    const userIds = [profile.id];
    if (profile.uid) userIds.push(profile.uid);
    if (profile.oldId) userIds.push(profile.oldId);
    
    if (profile.role === 'manager') {
      userIds.push('manager_broadcast');
    }

    const q = query(
      collection(db, 'notifications'),
      where('userId', 'in', userIds)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      // Sort on client to avoid composite index requirement
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setNotifications(items);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching notifications:", err);
      if (err.code === 'permission-denied') {
        try {
          handleFirestoreError(err, OperationType.LIST, 'notifications');
        } catch (e) {
          console.error("Permission denied for notifications sync:", e);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [profile]);

  const handleMarkAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (err: any) {
      if (err.code === 'permission-denied') {
        handleFirestoreError(err, OperationType.UPDATE, `notifications/${id}`);
      }
    }
  };

  const handleClearAll = async () => {
    if (notifications.length === 0 || isClearing) return;
    
    setIsClearing(true);
    try {
      const batch = writeBatch(db);
      notifications.forEach((notif) => {
        batch.delete(doc(db, 'notifications', notif.id));
      });
      await batch.commit();
      toast.success('تم مسح جميع التنبيهات بنجاح');
    } catch (err: any) {
      console.error("Error clearing notifications:", err);
      if (err.code === 'permission-denied') {
        handleFirestoreError(err, OperationType.DELETE, 'notifications');
      } else {
        toast.error('حدث خطأ أثناء مسح التنبيهات');
      }
    } finally {
      setIsClearing(false);
      setIsConfirmOpen(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <h2 className="text-2xl font-black text-slate-900">التنبيهات والإشعارات</h2>
          <p className="text-slate-500">لديك {unreadCount} تنبيهات غير مقروءة</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
              audio.play().then(() => {
                toast.success('تم تشغيل صوت التنبيه بنجاح');
              }).catch(err => {
                console.error("Audio test failed:", err);
                toast.error('فشل تشغيل الصوت. يرجى التأكد من تفعيل أذونات الصوت في المتصفح.');
              });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 font-bold rounded-xl hover:bg-blue-100 transition-all"
          >
            <Bell size={18} />
            <span>تجربة الصوت</span>
          </button>
          {notifications.length > 0 && (
            <button
              onClick={() => setIsConfirmOpen(true)}
              disabled={isClearing}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition-all disabled:opacity-50"
            >
              <Trash2 size={18} />
              <span>مسح الكل</span>
            </button>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleClearAll}
        title="مسح جميع التنبيهات"
        message="هل أنت متأكد من مسح جميع التنبيهات؟ لا يمكن التراجع عن هذا الإجراء."
        confirmText={isClearing ? "جاري المسح..." : "مسح الكل"}
        type="danger"
      />

      <div className="grid grid-cols-1 gap-4">
        {notifications.length > 0 ? notifications.map((notif) => (
          <div
            key={notif.id}
            onClick={() => !notif.read && handleMarkAsRead(notif.id)}
            className={cn(
              "p-6 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-start gap-4 transition-all cursor-pointer",
              !notif.read ? "border-blue-200 bg-blue-50/30 shadow-md scale-[1.01]" : "opacity-70"
            )}
          >
            <div className={cn(
              "p-3 rounded-xl",
              !notif.read ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"
            )}>
              {notif.read ? <CheckCircle2 size={24} /> : <Bell size={24} />}
            </div>
            
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <h4 className={cn("font-bold", !notif.read ? "text-slate-900" : "text-slate-600")}>
                  {notif.title}
                </h4>
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <Clock size={14} />
                  <span>{format(new Date(notif.timestamp), 'yyyy-MM-dd HH:mm')}</span>
                </div>
              </div>
              <p className={cn("text-sm leading-relaxed", !notif.read ? "text-slate-700" : "text-slate-500")}>
                {notif.content}
              </p>
            </div>
          </div>
        )) : (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
            <div className="p-6 bg-slate-50 rounded-full">
              <Bell size={48} />
            </div>
            <p className="font-medium">لا توجد تنبيهات حالياً</p>
          </div>
        )}
      </div>
    </div>
  );
};
