import { useLocation } from 'react-router';
import { SidebarMenuDashboard } from './sidebar-menu-dashboard';
import { SidebarMenuDefault } from './sidebar-menu-default';
import { SidebarMenuPropiedades } from './sidebar-menu-propiedades';
import { SidebarMenuFacturas } from './sidebar-menu-facturas';
import { SidebarMenuAfiliados } from './sidebar-menu-afiliados';

export function SidebarSecondary() {
  const { pathname } = useLocation();

  const renderMenu = () => {
    if (pathname === '/') {
      return <SidebarMenuDashboard />;
    } else if (pathname.startsWith('/propiedades')) {
      return <SidebarMenuPropiedades />;
    } else if (pathname.startsWith('/facturas')) {
      return <SidebarMenuFacturas />;
    } else if (pathname.startsWith('/afiliados')) {
      return <SidebarMenuAfiliados />;
    } else {
      return <SidebarMenuDefault />;
    }
  };

  return (
    <div className="grow shrink-0 ps-3.5 kt-scrollable-y-hover max-h-[calc(100vh-2rem)] pe-1 my-5">
      {renderMenu()}
    </div>
  );
}
