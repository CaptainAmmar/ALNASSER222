import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useFirestore } from '../hooks/useFirestore';
import { Message, UserProfile } from '../types';
import { Send, User as UserIcon, Trash2, Clock, CheckCheck, MessageCircle, ArrowRight } from 'lucide-react';
import { cn } from '../components/Sidebar';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { collection, query, where, orderBy, onSnapshot, addDoc, deleteDoc, doc, updateDoc, or, and, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { ConfirmModal } from '../components/ConfirmModal';

export const Messages: React.FC = () => {
  const { profile } = useAuth();
  const isManager = profile?.role === 'manager';
  const { data: users } = useFirestore<UserProfile>('users');
  
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedUser || !profile) return;

    // Query messages between current user and selected user
    // Or if manager, can see all messages for that user
    const myIds = [profile.id];
    if (profile.uid) myIds.push(profile.uid);
    if (profile.oldId) myIds.push(profile.oldId);

    const theirIds = [selectedUser.id];
    if (selectedUser.uid) theirIds.push(selectedUser.uid);
    if (selectedUser.oldId) theirIds.push(selectedUser.oldId);

    // Use a more specific query that Firestore security rules can validate
    // (sender is ME and receiver is THEM) OR (sender is THEM and receiver is ME)
    const q = query(
      collection(db, 'messages'),
      or(
        and(where('senderId', 'in', myIds), where('receiverId', 'in', theirIds)),
        and(where('senderId', 'in', theirIds), where('receiverId', 'in', myIds))
      ),
      orderBy('timestamp', 'asc')
    );

    const processedMessages = new Set<string>();
    const unsubscribe = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Message));
      setMessages(msgs);
      
      // Mark as read if receiver is current user
      msgs.forEach(async (m) => {
        if (m.receiverId === profile.id && !m.read && !processedMessages.has(m.id)) {
          processedMessages.add(m.id);
          try {
            await updateDoc(doc(db, 'messages', m.id), { read: true });
            
            // Also mark any corresponding notification as read
            const notifQuery = query(
              collection(db, 'notifications'),
              where('userId', 'in', myIds),
              where('relatedId', '==', m.id),
              where('read', '==', false)
            );
            const notifSnap = await getDocs(notifQuery);
            notifSnap.forEach(async (notifDoc) => {
              await updateDoc(doc(db, 'notifications', notifDoc.id), { read: true });
            });
          } catch (err: any) {
            if (err.code === 'resource-exhausted') {
              console.warn("Quota exceeded while marking message as read");
            } else if (err.code === 'permission-denied') {
              try {
                handleFirestoreError(err, OperationType.UPDATE, `messages/${m.id}`);
              } catch (e) {
                console.error("Permission denied for message update:", e);
              }
            }
          }
        }
      });
    }, (error) => {
      console.error("Error in messages snapshot listener:", error);
      if (error.code === 'permission-denied') {
        try {
          handleFirestoreError(error, OperationType.LIST, 'messages');
        } catch (e) {
          console.error("Permission denied for messages sync:", e);
        }
      }
    });

    return () => unsubscribe();
  }, [selectedUser, profile]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser || !profile) return;

    try {
      const messageRef = await addDoc(collection(db, 'messages'), {
        senderId: profile.id,
        receiverId: selectedUser.id,
        content: newMessage,
        timestamp: new Date().toISOString(),
        read: false
      });

      // Create a notification for the receiver
      const receiverId = selectedUser.uid || selectedUser.id;
      await addDoc(collection(db, 'notifications'), {
        userId: receiverId,
        title: `رسالة جديدة من ${profile.name}`,
        content: newMessage.length > 50 ? newMessage.substring(0, 50) + '...' : newMessage,
        timestamp: new Date().toISOString(),
        read: false,
        type: 'message',
        relatedId: messageRef.id,
        senderId: profile.id
      });

      setNewMessage('');
    } catch (err: any) {
      console.error("Error sending message:", err);
      if (err.code === 'permission-denied') {
        handleFirestoreError(err, OperationType.CREATE, 'messages');
      }
    }
  };

  const handleDeleteMessage = (id: string) => {
    if (isManager) {
      setDeletingMessageId(id);
      setIsConfirmOpen(true);
    }
  };

  const confirmDelete = async () => {
    if (!deletingMessageId) return;
    try {
      await deleteDoc(doc(db, 'messages', deletingMessageId));
    } catch (err: any) {
      if (err.code === 'permission-denied') {
        handleFirestoreError(err, OperationType.DELETE, `messages/${deletingMessageId}`);
      }
    }
  };

  const chatUsers = isManager 
    ? users.filter(u => u.id !== profile?.id)
    : users.filter(u => u.role === 'manager');

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-10rem)] lg:h-[calc(100vh-12rem)] bg-white rounded-2xl lg:rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Users List */}
      <div className={cn(
        "w-full lg:w-80 border-l border-slate-100 flex flex-col bg-slate-50/50",
        selectedUser && "hidden lg:flex"
      )}>
        <div className="p-4 lg:p-6 border-b border-slate-100">
          <h3 className="text-lg font-bold text-slate-900">المراسلات</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-2 lg:p-4 space-y-2">
          {chatUsers.map(user => (
            <button
              key={user.id}
              onClick={() => setSelectedUser(user)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-2xl transition-all",
                selectedUser?.id === user.id 
                  ? "bg-blue-600 text-white shadow-md" 
                  : "hover:bg-white text-slate-700 hover:shadow-sm"
              )}
            >
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <UserIcon size={20} className={selectedUser?.id === user.id ? "text-white" : "text-blue-600"} />
                  )}
                </div>
                {user.isOnline && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                )}
              </div>
              <div className="flex-1 text-right">
                <p className="text-sm font-bold">{user.name}</p>
                <p className={cn("text-xs opacity-70", selectedUser?.id === user.id ? "text-blue-50" : "text-slate-500")}>
                  {user.role === 'manager' ? 'مدير' : 'موظف'}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className={cn(
        "flex-1 flex flex-col bg-white",
        !selectedUser && "hidden lg:flex"
      )}>
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="p-3 lg:p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/30">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSelectedUser(null)}
                  className="p-2 hover:bg-slate-200 rounded-lg lg:hidden text-slate-600"
                >
                  <ArrowRight size={20} />
                </button>
                <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden">
                  {selectedUser.photoURL ? (
                    <img src={selectedUser.photoURL} alt={selectedUser.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <UserIcon size={20} className="text-blue-600" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{selectedUser.name}</p>
                  <p className="text-xs text-slate-500">{selectedUser.isOnline ? 'متصل الآن' : 'غير متصل'}</p>
                </div>
              </div>
            </div>

            {/* Messages List */}
            <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
              {messages.map((msg, idx) => {
                const isMe = msg.senderId === profile?.id;
                return (
                  <div key={msg.id} className={cn("flex flex-col", isMe ? "items-start" : "items-end")}>
                    <div className={cn(
                      "max-w-[85%] lg:max-w-[70%] p-3 lg:p-4 rounded-2xl relative group",
                      isMe 
                        ? "bg-blue-600 text-white rounded-tr-none" 
                        : "bg-slate-100 text-slate-800 rounded-tl-none"
                    )}>
                      {isManager && (
                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                      <p className="text-sm leading-relaxed">{msg.content}</p>
                      <div className={cn(
                        "flex items-center gap-1 mt-2 text-[10px]",
                        isMe ? "text-blue-100" : "text-slate-400"
                      )}>
                        <span>{format(new Date(msg.timestamp), 'HH:mm')}</span>
                        {isMe && <CheckCheck size={12} className={msg.read ? "text-emerald-300" : "text-blue-200"} />}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={scrollRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-3 lg:p-4 border-t border-slate-100 bg-slate-50/30">
              <div className="flex gap-2 lg:gap-3">
                <input
                  type="text"
                  placeholder="اكتب رسالتك هنا..."
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  className="flex-1 px-4 lg:px-6 py-2 lg:py-3 bg-white border border-slate-200 rounded-xl lg:rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="p-2 lg:p-3 bg-blue-600 text-white rounded-xl lg:rounded-2xl hover:bg-blue-700 transition-all disabled:opacity-50 shadow-md"
                >
                  <Send size={20} className="lg:w-6 lg:h-6 rotate-180" />
                </button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4">
            <div className="p-6 bg-slate-50 rounded-full">
              <MessageCircle size={48} />
            </div>
            <p className="font-medium">اختر موظفاً لبدء المراسلة</p>
          </div>
        )}
      </div>

      <ConfirmModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="تأكيد حذف الرسالة"
        message="هل أنت متأكد من حذف هذه الرسالة؟ لا يمكن التراجع عن هذا الإجراء."
      />
    </div>
  );
};
