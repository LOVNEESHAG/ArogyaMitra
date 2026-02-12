import {
  LayoutDashboard,
  Calendar,
  Video,
  HeartPulse,
  Pill,
  Users,
  MessageSquare,
  Activity,
  Settings,
  FileText,
  Package,
  UserCheck
} from "lucide-react";
import { UserRole } from "@/hooks/use-user-role";

export interface NavItem {
  href: string;
  icon: any;
  labelKey: string;
  roles: UserRole[];
  isSubItem?: boolean;
}

export const navigationItems: NavItem[] = [
  // Common dashboard for all roles
  { 
    href: "/dashboard", 
    icon: LayoutDashboard, 
    labelKey: "nav.dashboard",
    roles: ['patient', 'doctor', 'pharmacyOwner', 'admin']
  },
  
  // Patient-specific navigation
  { 
    href: "/dashboard/appointments", 
    icon: Calendar, 
    labelKey: "nav.appointments",
    roles: ['patient']
  },
  { 
    href: "/dashboard/consultations", 
    icon: Video, 
    labelKey: "nav.consultations",
    roles: ['patient']
  },
  { 
    href: "/dashboard/health-records", 
    icon: HeartPulse, 
    labelKey: "nav.healthRecords",
    roles: ['patient']
  },
  { 
    href: "/dashboard/pharmacy", 
    icon: Pill, 
    labelKey: "nav.pharmacy",
    roles: ['patient']
  },
  { 
    href: "/dashboard/ai-assistant", 
    icon: MessageSquare, 
    labelKey: "nav.aiAssistant",
    roles: ['patient']
  },

  // Doctor-specific navigation
  { 
    href: "/dashboard/doctor/appointments", 
    icon: Calendar, 
    labelKey: "nav.myAppointments",
    roles: ['doctor']
  },
  { 
    href: "/dashboard/doctor/consultations", 
    icon: Video, 
    labelKey: "nav.activeConsultations",
    roles: ['doctor']
  },
  { 
    href: "/dashboard/doctor/patients", 
    icon: Users, 
    labelKey: "nav.myPatients",
    roles: ['doctor']
  },
  { 
    href: "/dashboard/doctor/schedule", 
    icon: Activity, 
    labelKey: "nav.schedule",
    roles: ['doctor']
  },

  // Pharmacy Owner-specific navigation
  { 
    href: "/dashboard/pharmacy/inventory", 
    icon: Package, 
    labelKey: "nav.inventory",
    roles: ['pharmacyOwner']
  },
  { 
    href: "/dashboard/pharmacy/orders", 
    icon: FileText, 
    labelKey: "nav.orders",
    roles: ['pharmacyOwner']
  },
  { 
    href: "/dashboard/pharmacy/stock-management", 
    icon: Pill, 
    labelKey: "nav.stockManagement",
    roles: ['pharmacyOwner']
  },

  // Admin-specific navigation
  { 
    href: "/dashboard/admin/users", 
    icon: Users, 
    labelKey: "nav.userManagement",
    roles: ['admin']
  },
  { 
    href: "/dashboard/admin/analytics", 
    icon: Activity, 
    labelKey: "nav.analytics",
    roles: ['admin']
  },
  { 
    href: "/dashboard/admin/system", 
    icon: Settings, 
    labelKey: "nav.systemSettings",
    roles: ['admin']
  },
  { 
    href: "/dashboard/admin/verification", 
    icon: UserCheck, 
    labelKey: "nav.userVerification",
    roles: ['admin']
  },
];

export function getNavigationForRole(role: UserRole): NavItem[] {
  if (!role) return [];
  
  return navigationItems.filter(item => 
    item.roles.includes(role)
  );
}

export function getRoleName(role: UserRole): string {
  switch (role) {
    case 'patient':
      return 'Patient';
    case 'doctor':
      return 'Doctor';
    case 'pharmacyOwner':
      return 'Pharmacy Owner';
    case 'admin':
      return 'Admin';
    default:
      return 'User';
  }
}
