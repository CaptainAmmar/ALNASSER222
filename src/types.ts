export type UserRole = 'manager' | 'agency_employee' | 'shipping_employee' | 'customs_employee';
export type Permission = 'insert' | 'edit' | 'delete' | 'read_only' | 'all';

export interface AgencySettings {
  name: string;
  logo: string;
  address: string;
  phone: string;
  socialLinks: {
    facebook?: string;
    twitter?: string;
    instagram?: string;
    linkedin?: string;
  };
}

export interface UserProfile {
  id: string;
  uid?: string;
  oldId?: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  permissions: Permission[];
  photoURL?: string;
  isOnline?: boolean;
  lastActive?: string;
}

export interface Vessel {
  id: string;
  name: string;
  manifestNumber: string;
  arrivalDate: string;
  departureDate?: string;
  status: 'anchored' | 'operating' | 'departed';
  captainName: string;
  captainPhone: string;
  agentName: string;
}

export interface BillOfLading {
  id: string;
  number: string;
  date: string;
  vesselId: string;
  cargoType: string;
  grossWeight: number;
  netWeight: number;
  quantity: number;
  unit: 'roll' | 'piece' | 'package' | 'head' | 'bundle' | 'other';
}

export interface CustomsDeclaration {
  id: string;
  type: 'import' | 'export' | 'transit';
  code: string;
  number: string;
  date: string;
  consignor: string;
  consignee: string;
  declarant: string;
  clearingAgent: string;
  vesselId: string;
  blId: string;
  customsItemId: string;
  customsFees: number;
  cargoType: string;
  grossWeight: number;
  netWeight: number;
  quantity: number;
  unit: string;
  totalValue: number;
  destination: string;
}

export interface CustomsFee {
  id: string;
  declarationType: string;
  declarationNumber: string;
  date: string;
  feeType: string;
  feeValue: number;
}

export interface CustomsItem {
  id: string;
  code: string;
  description: string;
  unit: string;
  customsDuty: number;
  serviceFee: number;
  exportDuty: number;
  notes: string;
}

export interface Truck {
  id: string;
  plateNumber: string;
  driverName: string;
  driverPhone: string;
}

export interface Operation {
  id: string;
  type: 'discharge' | 'loading';
  vesselId: string;
  blId: string;
  truckId: string;
  netWeight: number;
  quantity: number;
  employeeId: string;
  employeeName: string;
  timestamp: string;
  operationDate: string;
}

export interface DeletedOperation extends Operation {
  deletedBy: string;
  deletedAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  read: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  content: string;
  timestamp: string;
  read: boolean;
  type?: string;
  relatedId?: string;
  senderId?: string;
}
