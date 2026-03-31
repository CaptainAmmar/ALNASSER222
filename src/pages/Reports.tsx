import React, { useState, useEffect } from 'react';
import { DataGrid } from '../components/DataGrid';
import { Modal } from '../components/Modal';
import { Input, Select, Button } from '../components/Form';
import { useFirestore } from '../hooks/useFirestore';
import { Operation, Vessel, BillOfLading, CustomsDeclaration, Truck } from '../types';
import { CUSTOMS_TYPES, OPERATION_TYPES } from '../constants';
import { Filter, Calendar, Search, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { cn } from '../components/Sidebar';
import { format, isWithinInterval, parseISO } from 'date-fns';

export const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'operations' | 'customs' | 'bls'>('operations');
  const { data: operations } = useFirestore<Operation>('operations');
  const { data: declarations } = useFirestore<CustomsDeclaration>('customsDeclarations');
  const { data: vessels } = useFirestore<Vessel>('vessels');
  const { data: bls } = useFirestore<BillOfLading>('billsOfLading');
  const { data: trucks } = useFirestore<Truck>('trucks');

  // Filters
  const [filters, setFilters] = useState({
    vesselId: '',
    blId: '',
    startDate: '',
    endDate: '',
    declType: '',
    declNumber: '',
    code: '',
    consignor: '',
    consignee: '',
    destination: '',
    clearingAgent: '',
    declarant: '',
    cargoType: '',
  });

  const filteredOps = operations.filter(op => {
    const matchesVessel = !filters.vesselId || op.vesselId === filters.vesselId;
    const matchesBL = !filters.blId || op.blId === filters.blId;
    
    let matchesDate = true;
    if (filters.startDate && filters.endDate && op.timestamp) {
      try {
        const opDate = parseISO(op.timestamp);
        const start = parseISO(filters.startDate);
        const end = parseISO(filters.endDate);
        
        if (!isNaN(opDate.getTime()) && !isNaN(start.getTime()) && !isNaN(end.getTime())) {
          matchesDate = isWithinInterval(opDate, { start, end });
        }
      } catch (e) {
        console.error("Date filtering error:", e);
        matchesDate = false;
      }
    }
    
    return matchesVessel && matchesBL && matchesDate;
  });

  const filteredDecls = declarations.filter(decl => {
    const matchesType = !filters.declType || decl.type === filters.declType;
    const matchesNumber = !filters.declNumber || decl.number.includes(filters.declNumber);
    const matchesCode = !filters.code || decl.code?.includes(filters.code);
    const matchesConsignor = !filters.consignor || decl.consignor?.includes(filters.consignor);
    const matchesConsignee = !filters.consignee || decl.consignee?.includes(filters.consignee);
    const matchesDestination = !filters.destination || decl.destination?.includes(filters.destination);
    const matchesClearingAgent = !filters.clearingAgent || decl.clearingAgent?.includes(filters.clearingAgent);
    const matchesDeclarant = !filters.declarant || decl.declarant?.includes(filters.declarant);
    const matchesCargoType = !filters.cargoType || decl.cargoType?.includes(filters.cargoType);
    const matchesVessel = !filters.vesselId || decl.vesselId === filters.vesselId;
    const matchesBL = !filters.blId || decl.blId === filters.blId;
    
    return matchesType && matchesNumber && matchesCode && matchesConsignor && 
           matchesConsignee && matchesDestination && matchesClearingAgent && 
           matchesDeclarant && matchesCargoType && matchesVessel && matchesBL;
  });

  const blSummary = bls.filter(bl => {
    const matchesVessel = !filters.vesselId || bl.vesselId === filters.vesselId;
    const matchesBL = !filters.blId || bl.id === filters.blId;
    return matchesVessel && matchesBL;
  }).map(bl => {
    const blOps = operations.filter(op => op.blId === bl.id && op.type === 'discharge');
    const dischargedWeight = blOps.reduce((sum, op) => sum + (Number(op.netWeight) || 0), 0);
    const dischargedQty = blOps.reduce((sum, op) => sum + (Number(op.quantity) || 0), 0);
    const vessel = vessels.find(v => v.id === bl.vesselId);
    
    return {
      ...bl,
      vesselName: vessel ? `${vessel.name} (${vessel.arrivalDate})` : 'غير معروف',
      dischargedWeight,
      remainingWeight: (Number(bl.netWeight) || 0) - dischargedWeight,
      dischargedQty,
      remainingQty: (Number(bl.quantity) || 0) - dischargedQty,
    };
  });

  const opColumns = [
    { key: 'type', label: 'النوع', render: (val: string) => val === 'loading' ? 'تحميل' : 'تفريغ' },
    { key: 'vesselId', label: 'اسم الباخرة', render: (val: string) => {
      const vessel = vessels.find(v => v.id === val);
      return vessel ? `${vessel.name} (${vessel.arrivalDate})` : val;
    } },
    { key: 'blId', label: 'رقم البوليصة', render: (val: string) => bls.find(b => b.id === val)?.number || val },
    { key: 'truckId', label: 'السيارة', render: (val: string) => trucks.find(t => t.id === val)?.plateNumber || val },
    { key: 'netWeight', label: 'الوزن الصافي' },
    { key: 'quantity', label: 'الكمية' },
    { key: 'operationDate', label: 'تاريخ العملية' },
    { key: 'timestamp', label: 'وقت التسجيل', render: (val: string) => format(parseISO(val), 'yyyy-MM-dd HH:mm') },
    { key: 'employeeName', label: 'الموظف' },
  ];

  const declColumns = [
    { key: 'type', label: 'النوع', render: (val: string) => CUSTOMS_TYPES.find(t => t.value === val)?.label || val },
    { key: 'code', label: 'الرمز' },
    { key: 'number', label: 'رقم البيان' },
    { key: 'date', label: 'التاريخ' },
    { key: 'consignor', label: 'المرسل' },
    { key: 'consignee', label: 'المرسل إليه' },
    { key: 'destination', label: 'المقصد' },
    { key: 'declarant', label: 'المصرح' },
    { key: 'clearingAgent', label: 'المخلص الجمركي' },
    { key: 'vesselId', label: 'اسم الباخرة', render: (val: string) => {
      const vessel = vessels.find(v => v.id === val);
      return vessel ? `${vessel.name} (${vessel.arrivalDate})` : val;
    } },
    { key: 'blId', label: 'رقم البوليصة', render: (val: string) => bls.find(b => b.id === val)?.number || val },
    { key: 'customsFees', label: 'الرسوم الجمركية' },
    { key: 'cargoType', label: 'نوع البضاعة' },
    { key: 'grossWeight', label: 'الوزن القائم' },
    { key: 'netWeight', label: 'الوزن الصافي' },
    { key: 'quantity', label: 'الكمية' },
    { key: 'unit', label: 'الوحدة' },
    { key: 'totalValue', label: 'القيمة الإجمالية' },
  ];

  const blSummaryColumns = [
    { key: 'vesselName', label: 'اسم الباخرة' },
    { key: 'number', label: 'رقم البوليصة' },
    { key: 'netWeight', label: 'الوزن الصافي (بوليصة)' },
    { key: 'quantity', label: 'العدد (بوليصة)' },
    { key: 'dischargedWeight', label: 'الوزن المفرغ (عمليات)' },
    { key: 'remainingWeight', label: 'الوزن المتبقي' },
    { key: 'dischargedQty', label: 'العدد المفرغ (عمليات)' },
    { key: 'remainingQty', label: 'العدد المتبقي' },
  ];

  return (
    <div className="space-y-8">
      {/* Tabs */}
      <div className="flex p-1 bg-slate-100 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('operations')}
          className={cn(
            "px-6 py-2.5 rounded-xl font-bold text-sm transition-all",
            activeTab === 'operations' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          تقارير عمليات التشغيل
        </button>
        <button
          onClick={() => setActiveTab('customs')}
          className={cn(
            "px-6 py-2.5 rounded-xl font-bold text-sm transition-all",
            activeTab === 'customs' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          تقارير البيانات الجمركية
        </button>
        <button
          onClick={() => setActiveTab('bls')}
          className={cn(
            "px-6 py-2.5 rounded-xl font-bold text-sm transition-all",
            activeTab === 'bls' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
          )}
        >
          ملخص البوالص
        </button>
      </div>

      {/* Filters */}
      <div className="p-6 bg-white rounded-2xl shadow-sm border border-slate-100 space-y-6">
        <div className="flex items-center gap-2 text-blue-900 font-bold">
          <Filter size={20} />
          <span>نظام الفلترة المتقدم</span>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {activeTab === 'operations' || activeTab === 'bls' || activeTab === 'customs' ? (
            <>
              <Select
                label="الباخرة"
                options={vessels.map(v => ({ value: v.id, label: `${v.name} (${v.arrivalDate})` }))}
                value={filters.vesselId}
                onChange={e => setFilters({ ...filters, vesselId: e.target.value, blId: '' })}
              />
              <Select
                label="رقم البوليصة"
                options={bls.filter(b => b.vesselId === filters.vesselId).map(b => ({ value: b.id, label: b.number }))}
                value={filters.blId}
                onChange={e => setFilters({ ...filters, blId: e.target.value })}
                disabled={!filters.vesselId}
              />
              {activeTab === 'operations' && (
                <>
                  <Input
                    label="من تاريخ"
                    type="date"
                    value={filters.startDate}
                    onChange={e => setFilters({ ...filters, startDate: e.target.value })}
                  />
                  <Input
                    label="إلى تاريخ"
                    type="date"
                    value={filters.endDate}
                    onChange={e => setFilters({ ...filters, endDate: e.target.value })}
                  />
                </>
              )}
              {activeTab === 'customs' && (
                <>
                  <Select
                    label="نوع البيان"
                    options={CUSTOMS_TYPES}
                    value={filters.declType}
                    onChange={e => setFilters({ ...filters, declType: e.target.value })}
                  />
                  <Input
                    label="رقم البيان"
                    value={filters.declNumber}
                    onChange={e => setFilters({ ...filters, declNumber: e.target.value })}
                  />
                  <Input
                    label="الرمز"
                    value={filters.code}
                    onChange={e => setFilters({ ...filters, code: e.target.value })}
                  />
                  <Input
                    label="المرسل"
                    value={filters.consignor}
                    onChange={e => setFilters({ ...filters, consignor: e.target.value })}
                  />
                  <Input
                    label="المرسل إليه"
                    value={filters.consignee}
                    onChange={e => setFilters({ ...filters, consignee: e.target.value })}
                  />
                  <Input
                    label="المقصد"
                    value={filters.destination}
                    onChange={e => setFilters({ ...filters, destination: e.target.value })}
                  />
                  <Input
                    label="المخلص الجمركي"
                    value={filters.clearingAgent}
                    onChange={e => setFilters({ ...filters, clearingAgent: e.target.value })}
                  />
                  <Input
                    label="المصرح"
                    value={filters.declarant}
                    onChange={e => setFilters({ ...filters, declarant: e.target.value })}
                  />
                  <Input
                    label="نوع البضاعة"
                    value={filters.cargoType}
                    onChange={e => setFilters({ ...filters, cargoType: e.target.value })}
                  />
                </>
              )}
            </>
          ) : (
            <>
              {/* This section is currently unused since all tabs now use the first block */}
            </>
          )}
          
          <div className="flex items-end">
            <Button
              variant="secondary"
              onClick={() => setFilters({ 
                vesselId: '', 
                blId: '', 
                startDate: '', 
                endDate: '', 
                declType: '', 
                declNumber: '',
                code: '',
                consignor: '',
                consignee: '',
                destination: '',
                clearingAgent: '',
                declarant: '',
                cargoType: '',
              })}
              className="w-full"
            >
              إعادة تعيين
            </Button>
          </div>
        </div>
      </div>

      {/* Results */}
      {activeTab === 'operations' ? (
        <DataGrid
          title="نتائج عمليات التشغيل"
          columns={opColumns}
          data={filteredOps}
          canAdd={false}
          canEdit={true}
          canDelete={false}
        />
      ) : activeTab === 'customs' ? (
        <DataGrid
          title="نتائج البيانات الجمركية"
          columns={declColumns}
          data={filteredDecls}
          canAdd={false}
          canEdit={true}
          canDelete={false}
        />
      ) : (
        <DataGrid
          title="ملخص بوالص الشحن"
          columns={blSummaryColumns}
          data={blSummary}
          canAdd={false}
          canEdit={false}
          canDelete={false}
        />
      )}
    </div>
  );
};
