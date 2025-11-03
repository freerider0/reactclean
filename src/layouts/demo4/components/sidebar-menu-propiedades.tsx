'use client';

import { useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Plus, List, Map, Image, FileText, Building2 } from 'lucide-react';
import {
  AccordionMenu,
  AccordionMenuClassNames,
  AccordionMenuGroup,
  AccordionMenuItem,
  AccordionMenuLabel,
} from '@/components/ui/accordion-menu';

export function SidebarMenuPropiedades() {
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
        <AccordionMenuLabel>Gestión</AccordionMenuLabel>

        <AccordionMenuItem value="/propiedades" className="text-sm">
          <Link to="/propiedades" className="flex items-center gap-2">
            <List data-slot="accordion-menu-icon" className="size-4" />
            <span data-slot="accordion-menu-title">Todas las Propiedades</span>
          </Link>
        </AccordionMenuItem>

        <AccordionMenuItem value="/propiedades/new" className="text-sm">
          <Link to="/propiedades/new" className="flex items-center gap-2">
            <Plus data-slot="accordion-menu-icon" className="size-4" />
            <span data-slot="accordion-menu-title">Nueva Propiedad</span>
          </Link>
        </AccordionMenuItem>

        <AccordionMenuItem value="/propiedades/mapa" className="text-sm">
          <Link to="/propiedades/mapa" className="flex items-center gap-2">
            <Map data-slot="accordion-menu-icon" className="size-4" />
            <span data-slot="accordion-menu-title">Mapa de Propiedades</span>
          </Link>
        </AccordionMenuItem>

        <AccordionMenuLabel>Organización</AccordionMenuLabel>

        <AccordionMenuItem value="/propiedades/galeria" className="text-sm">
          <Link to="/propiedades/galeria" className="flex items-center gap-2">
            <Image data-slot="accordion-menu-icon" className="size-4" />
            <span data-slot="accordion-menu-title">Galería de Medios</span>
          </Link>
        </AccordionMenuItem>

        <AccordionMenuItem value="/propiedades/documentos" className="text-sm">
          <Link to="/propiedades/documentos" className="flex items-center gap-2">
            <FileText data-slot="accordion-menu-icon" className="size-4" />
            <span data-slot="accordion-menu-title">Documentos</span>
          </Link>
        </AccordionMenuItem>

        <AccordionMenuItem value="/propiedades/tipos" className="text-sm">
          <Link to="/propiedades/tipos" className="flex items-center gap-2">
            <Building2 data-slot="accordion-menu-icon" className="size-4" />
            <span data-slot="accordion-menu-title">Tipos de Propiedad</span>
          </Link>
        </AccordionMenuItem>
      </AccordionMenuGroup>
    </AccordionMenu>
  );
}
