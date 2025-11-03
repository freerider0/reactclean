'use client';

import { useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Receipt, Plus, List, Euro, FileText, TrendingUp, Calendar } from 'lucide-react';
import {
  AccordionMenu,
  AccordionMenuClassNames,
  AccordionMenuGroup,
  AccordionMenuItem,
  AccordionMenuLabel,
} from '@/components/ui/accordion-menu';

export function SidebarMenuFacturas() {
  const { pathname } = useLocation();

  const classNames: AccordionMenuClassNames = {
    root: 'lg:ps-1 space-y-1',
    group: 'gap-px',
    label:
      'uppercase text-xs font-medium text-muted-foreground/70 pt-2.25 pb-px',
    separator: '',
    item: 'h-8 hover:bg-background border-accent text-accent-foreground hover:text-primary data-[selected=true]:text-primary data-[selected=true]:bg-background data-[selected=true]:font-medium',
    sub: '',
    subTrigger:
      'h-8 hover:bg-transparent text-accent-foreground hover:text-primary data-[selected=true]:text-primary data-[selected=true]:bg-transparent data-[selected=true]:font-medium',
    subContent: 'ps-3 py-0',
    indicator: '',
  };

  const matchPath = useCallback(
    (path: string): boolean =>
      path === pathname || (path.length > 1 && pathname.startsWith(path)),
    [pathname],
  );

  return (
    <AccordionMenu
      selectedValue={pathname}
      matchPath={matchPath}
      type="single"
      collapsible
      classNames={classNames}
    >
      <AccordionMenuGroup>
        <AccordionMenuLabel>Facturas</AccordionMenuLabel>

        <AccordionMenuItem value="/facturas" className="text-sm">
          <Link to="/facturas" className="flex items-center gap-2">
            <List data-slot="accordion-menu-icon" className="size-4" />
            <span data-slot="accordion-menu-title">Todas las Facturas</span>
          </Link>
        </AccordionMenuItem>

        <AccordionMenuItem value="/facturas/new" className="text-sm">
          <Link to="/facturas/new" className="flex items-center gap-2">
            <Plus data-slot="accordion-menu-icon" className="size-4" />
            <span data-slot="accordion-menu-title">Nueva Factura</span>
          </Link>
        </AccordionMenuItem>

        <AccordionMenuItem value="/facturas/pendientes" className="text-sm">
          <Link to="/facturas/pendientes" className="flex items-center gap-2">
            <Calendar data-slot="accordion-menu-icon" className="size-4" />
            <span data-slot="accordion-menu-title">Pendientes de Pago</span>
          </Link>
        </AccordionMenuItem>

        <AccordionMenuLabel>Análisis</AccordionMenuLabel>

        <AccordionMenuItem value="/facturas/ingresos" className="text-sm">
          <Link to="/facturas/ingresos" className="flex items-center gap-2">
            <Euro data-slot="accordion-menu-icon" className="size-4" />
            <span data-slot="accordion-menu-title">Ingresos</span>
          </Link>
        </AccordionMenuItem>

        <AccordionMenuItem value="/facturas/reportes" className="text-sm">
          <Link to="/facturas/reportes" className="flex items-center gap-2">
            <TrendingUp data-slot="accordion-menu-icon" className="size-4" />
            <span data-slot="accordion-menu-title">Reportes</span>
          </Link>
        </AccordionMenuItem>

        <AccordionMenuItem value="/facturas/plantillas" className="text-sm">
          <Link to="/facturas/plantillas" className="flex items-center gap-2">
            <FileText data-slot="accordion-menu-icon" className="size-4" />
            <span data-slot="accordion-menu-title">Plantillas</span>
          </Link>
        </AccordionMenuItem>
      </AccordionMenuGroup>
    </AccordionMenu>
  );
}
