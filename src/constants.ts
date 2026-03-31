export const UNITS = [
  { value: 'roll', label: 'لفة' },
  { value: 'piece', label: 'قطعة' },
  { value: 'package', label: 'طرد' },
  { value: 'head', label: 'رأس' },
  { value: 'bundle', label: 'ربطة' },
  { value: 'other', label: 'غير ذلك' },
];

export const ROLES = [
  { value: 'manager', label: 'مدير' },
  { value: 'agency_employee', label: 'موظف الوكالة' },
  { value: 'shipping_employee', label: 'موظف قسم الشحن' },
  { value: 'customs_employee', label: 'موظف الجمارك' },
];

export const PERMISSIONS = [
  { value: 'insert', label: 'إدخال' },
  { value: 'edit', label: 'تعديل' },
  { value: 'delete', label: 'حذف' },
  { value: 'read_only', label: 'قراءة فقط' },
  { value: 'all', label: 'الكل' },
];

export const VESSEL_STATUS = [
  { value: 'anchored', label: 'راسية' },
  { value: 'operating', label: 'قيد التشغيل' },
  { value: 'departed', label: 'مغادرة' },
];

export const CUSTOMS_TYPES = [
  { value: 'import', label: 'استيراد' },
  { value: 'export', label: 'تصدير' },
  { value: 'transit', label: 'ترانزيت' },
];

export const OPERATION_TYPES = [
  { value: 'discharge', label: 'تفريغ' },
  { value: 'loading', label: 'تحميل' },
];

export const DEFAULT_AGENCY_SETTINGS = {
  name: 'وكالة الناصر للملاحة البحرية',
  logo: 'https://storage.googleapis.com/static.antigravity.dev/635134606631/kqn6ua6fxzvtvfo5ecbsap/8904e223-936d-478a-9382-793397960786.png',
  address: 'سوريا ، طرطوس',
  phone: '0933123456',
  socialLinks: {
    facebook: '#',
    twitter: '#',
    instagram: '#',
    linkedin: '#',
  },
};
