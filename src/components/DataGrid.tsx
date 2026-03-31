import React, { useState } from 'react';
import { 
  Search, Plus, Edit, Trash, Download, 
  ChevronLeft, ChevronRight, Filter, X,
  FileSpreadsheet, FileJson, RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../components/Sidebar';
import * as XLSX from 'xlsx';

interface Column {
  key: string;
  label: string;
  render?: (value: any, item: any) => React.ReactNode;
}

interface DataGridProps {
  columns: Column[];
  data: any[];
  onAdd?: () => void;
  onEdit?: (item: any) => void;
  onDelete?: (item: any) => void;
  onRestore?: (item: any) => void;
  title: string;
  searchPlaceholder?: string;
  canAdd?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  onRowClick?: (item: any) => void;
}

export const DataGrid: React.FC<DataGridProps> = ({
  columns,
  data,
  onAdd,
  onEdit,
  onDelete,
  onRestore,
  title,
  searchPlaceholder = "بحث...",
  canAdd = true,
  canEdit = true,
  canDelete = true,
  onRowClick
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(columns.map(c => c.key));
  const itemsPerPage = 10;

  const filteredData = React.useMemo(() => {
    if (!searchTerm) return data;
    const lowerSearch = searchTerm.toLowerCase();
    return data.filter(item => 
      Object.values(item).some(val => 
        String(val).toLowerCase().includes(lowerSearch)
      )
    );
  }, [data, searchTerm]);

  const totalPages = React.useMemo(() => 
    Math.ceil(filteredData.length / itemsPerPage)
  , [filteredData.length]);

  const paginatedData = React.useMemo(() => 
    filteredData.slice(
      (currentPage - 1) * itemsPerPage,
      currentPage * itemsPerPage
    )
  , [filteredData, currentPage]);

  const handleExportClick = () => {
    setSelectedColumns(columns.map(c => c.key));
    setShowExportModal(true);
  };

  const executeExport = () => {
    const exportCols = columns.filter(c => selectedColumns.includes(c.key));
    
    const ws = XLSX.utils.json_to_sheet(filteredData.map(item => {
      const row: any = {};
      exportCols.forEach(col => {
        let val = item[col.key];
        if (col.render) {
          const rendered = col.render(val, item);
          if (typeof rendered === 'string' || typeof rendered === 'number') {
            val = rendered;
          } else {
            val = val !== undefined && val !== null ? String(val) : "";
          }
        }
        
        if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
          val = String(val);
        }
        
        row[col.label] = val;
      });
      return row;
    }));
    
    // Set RTL
    if (!ws['!views']) ws['!views'] = [];
    ws['!views'][0] = { RTL: true };
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    XLSX.writeFile(wb, `${title}.xlsx`);
    
    setShowExportModal(false);
  };

  const toggleColumn = (key: string) => {
    setSelectedColumns(prev => 
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-xl font-bold text-slate-900">{title}</h3>
          <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-bold rounded-full">
            {filteredData.length} سجل
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExportClick()}
              className="p-2 text-emerald-600 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors"
              title="تصدير Excel"
            >
              <FileSpreadsheet size={20} />
            </button>
            {canAdd && onAdd && (
              <button
                onClick={onAdd}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-sm font-bold text-sm"
              >
                <Plus size={18} />
                <span>إضافة جديد</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-right border-collapse">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-6 py-4 text-sm font-bold text-slate-600 whitespace-nowrap">
                  {col.label}
                </th>
              ))}
              {(canEdit || canDelete) && (
                <th className="px-6 py-4 text-sm font-bold text-slate-600 text-center">الإجراءات</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedData.length > 0 ? paginatedData.map((item, idx) => {
              const rowKey = item.id || `row-${idx}-${searchTerm}`;
              return (
                <tr 
                  key={rowKey} 
                  className={cn(
                    "hover:bg-slate-50 transition-colors group",
                    onRowClick && "cursor-pointer"
                  )}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-6 py-4 text-sm text-slate-700 whitespace-nowrap">
                      {(() => {
                        try {
                          return col.render ? col.render(item[col.key], item) : item[col.key];
                        } catch (e) {
                          console.error(`Error rendering column ${col.key}:`, e);
                          return <span className="text-red-500 text-xs">خطأ في العرض</span>;
                        }
                      })()}
                    </td>
                  ))}
                  {(canEdit || canDelete) && (
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {onRestore && (
                          <button
                            onClick={() => onRestore(item)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="استعادة"
                          >
                            <RotateCcw size={18} />
                          </button>
                        )}
                        {canEdit && onEdit && (
                          <button
                            onClick={() => onEdit(item)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit size={18} />
                          </button>
                        )}
                        {canDelete && onDelete && (
                          <button
                            onClick={() => onDelete(item)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={columns.length + 1} className="px-6 py-12 text-center text-slate-400">
                  لا توجد بيانات متاحة
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="p-6 border-t border-slate-100 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            عرض {(currentPage - 1) * itemsPerPage + 1} إلى {Math.min(currentPage * itemsPerPage, filteredData.length)} من {filteredData.length} سجل
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => p - 1)}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronRight size={20} />
            </button>
            <div className="flex items-center gap-1">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={cn(
                    "w-8 h-8 text-sm font-bold rounded-lg transition-all",
                    currentPage === i + 1 
                      ? "bg-blue-600 text-white shadow-md" 
                      : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(p => p + 1)}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
          </div>
        </div>
      )}
      {/* Export Modal */}
      <AnimatePresence>
        {showExportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" dir="rtl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="text-lg font-bold text-slate-900">
                  تصدير البيانات إلى Excel
                </h3>
                <button onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6">
                <p className="text-sm text-slate-500 mb-4 font-bold">اختر الحقول المراد تصديرها:</p>
                <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto p-1">
                  {columns.map(col => (
                    <label 
                      key={col.key} 
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                        selectedColumns.includes(col.key) 
                          ? "bg-blue-50 border-blue-200 text-blue-700" 
                          : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                      )}
                    >
                      <input 
                        type="checkbox"
                        className="hidden"
                        checked={selectedColumns.includes(col.key)}
                        onChange={() => toggleColumn(col.key)}
                      />
                      <div className={cn(
                        "w-5 h-5 rounded-md border flex items-center justify-center transition-all",
                        selectedColumns.includes(col.key) ? "bg-blue-600 border-blue-600" : "bg-white border-slate-300"
                      )}>
                        {selectedColumns.includes(col.key) && <Plus size={14} className="text-white rotate-45" />}
                      </div>
                      <span className="text-sm font-bold">{col.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  إلغاء
                </button>
                <button
                  onClick={executeExport}
                  disabled={selectedColumns.length === 0}
                  className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-md disabled:opacity-50"
                >
                  تصدير الآن
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
