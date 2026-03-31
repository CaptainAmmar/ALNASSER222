import React, { useState, useEffect } from 'react';
import { 
  BarChart3, Users, Truck, Ship, FileText, 
  CheckCircle2, Clock, AlertCircle, TrendingUp,
  Package, Scale, UserCheck
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, getDocs, Timestamp } from 'firebase/firestore';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { handleFirestoreError, OperationType } from '../lib/firestore-errors';
import { cn } from '../components/Sidebar';

const StatCard: React.FC<{ 
  title: string; 
  value: string | number; 
  icon: React.ElementType; 
  color: string;
  subtitle?: string;
}> = ({ title, value, icon: Icon, color, subtitle }) => (
  <motion.div
    whileHover={{ y: -5 }}
    className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-4"
  >
    <div className="flex items-center justify-between">
      <div className={cn("p-3 rounded-xl", color)}>
        <Icon size={24} className="text-white" />
      </div>
      {subtitle && <span className="text-xs font-medium text-slate-400">{subtitle}</span>}
    </div>
    <div>
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <h3 className="text-2xl font-bold text-slate-900 mt-1">{value}</h3>
    </div>
  </motion.div>
);

export const Home: React.FC = () => {
  const { profile } = useAuth();
  const isManager = profile?.role === 'manager';
  
  const [stats, setStats] = useState({
    todayOps: 0,
    todayTrucks: 0,
    todayWeight: 0,
    onlineEmployees: 0,
    activeVessels: 0,
  });

  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [recentOps, setRecentOps] = useState<any[]>([]);

  useEffect(() => {
    if (!profile?.uid) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Today's Operations
    const qOps = query(
      collection(db, 'operations'),
      where('timestamp', '>=', today.toISOString())
    );
    
    const unsubOps = onSnapshot(qOps, (snap) => {
      let weight = 0;
      let trucksSet = new Set();
      snap.docs.forEach(doc => {
        const data = doc.data();
        weight += Number(data.netWeight || 0);
        trucksSet.add(data.truckId);
      });
      setStats(prev => ({
        ...prev,
        todayOps: snap.size,
        todayTrucks: trucksSet.size,
        todayWeight: weight,
      }));
      setRecentOps(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      if (error.code === 'permission-denied') {
        console.warn("Permission denied for operations sync on home page");
      }
    });

    // Online Users
    const qUsers = query(collection(db, 'users'), where('isOnline', '==', true));
    const unsubUsers = onSnapshot(qUsers, (snap) => {
      setStats(prev => ({ ...prev, onlineEmployees: snap.size }));
      setOnlineUsers(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      if (error.code === 'permission-denied') {
        console.warn("Permission denied for users sync on home page");
      }
    });

    // Active Vessels
    const qVessels = query(collection(db, 'vessels'), where('status', '==', 'operating'));
    const unsubVessels = onSnapshot(qVessels, (snap) => {
      setStats(prev => ({ ...prev, activeVessels: snap.size }));
    }, (error) => {
      if (error.code === 'permission-denied') {
        console.warn("Permission denied for vessels sync on home page");
      }
    });

    return () => {
      unsubOps();
      unsubUsers();
      unsubVessels();
    };
  }, [profile?.uid]);

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-black text-slate-900">
          أهلاً بك، {profile?.name} 👋
        </h2>
        <p className="text-slate-500">
          إليك ملخص العمليات التشغيلية لهذا اليوم، {format(new Date(), 'EEEE, d MMMM yyyy', { locale: ar })}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="عمليات التشغيل اليوم" 
          value={stats.todayOps} 
          icon={BarChart3} 
          color="bg-blue-600"
          subtitle="تفريغ وتحميل"
        />
        <StatCard 
          title="السيارات المحملة" 
          value={stats.todayTrucks} 
          icon={Truck} 
          color="bg-emerald-600"
          subtitle="إجمالي الشاحنات"
        />
        <StatCard 
          title="الأوزان المحملة (طن)" 
          value={stats.todayWeight.toLocaleString()} 
          icon={Scale} 
          color="bg-amber-600"
          subtitle="الوزن الصافي"
        />
        <StatCard 
          title="الموظفون المتصلون" 
          value={stats.onlineEmployees} 
          icon={UserCheck} 
          color="bg-purple-600"
          subtitle="نشطون حالياً"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Clock size={20} className="text-blue-600" />
              آخر العمليات
            </h3>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-sm font-bold text-slate-600">النوع</th>
                    <th className="px-6 py-4 text-sm font-bold text-slate-600">الباخرة</th>
                    <th className="px-6 py-4 text-sm font-bold text-slate-600">الوزن</th>
                    <th className="px-6 py-4 text-sm font-bold text-slate-600">الوقت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentOps.length > 0 ? recentOps.slice(0, 5).map((op) => (
                    <tr key={op.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-xs font-bold",
                          op.type === 'loading' ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                        )}>
                          {op.type === 'loading' ? 'تحميل' : 'تفريغ'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{op.vesselName || 'باخرة'}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{op.netWeight} طن</td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {(() => {
                          try {
                            return op.timestamp ? format(new Date(op.timestamp), 'HH:mm') : '-';
                          } catch (e) {
                            return '-';
                          }
                        })()}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                        لا توجد عمليات مسجلة اليوم
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Online Users List */}
        <div className="space-y-6">
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Users size={20} className="text-blue-600" />
            الموظفون المتصلون
          </h3>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-4">
            {onlineUsers.length > 0 ? onlineUsers.map((user) => (
              <div key={user.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
                    {user.photoURL ? (
                      <img src={user.photoURL} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <Users size={20} className="text-blue-600" />
                    )}
                  </div>
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{user.name}</p>
                  <p className="text-xs text-slate-500">{user.role === 'manager' ? 'مدير' : 'موظف'}</p>
                </div>
              </div>
            )) : (
              <p className="text-center py-8 text-slate-400 text-sm">لا يوجد موظفون متصلون حالياً</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
