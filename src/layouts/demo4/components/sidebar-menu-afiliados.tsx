'use client';

import { useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Users, TrendingUp, Gift, Link2, DollarSign } from 'lucide-react';
import {
  AccordionMenu,
  AccordionMenuClassNames,
  AccordionMenuGroup,
  AccordionMenuItem,
  AccordionMenuLabel,
} from '@/components/ui/accordion-menu';

export function SidebarMenuAfiliados() {
  const { pathname } = useLocation();

  const classNames: AccordionMenuClassNames = {
    root: 'lg:ps-1 space-y-1',
    group: 'gap-px',
    groupLabel: 'lg:ps-2.5 pe-2 lg:pe-0',
    item: 'font-medium text-2sm [&_.accordion-menu-title]:font-semibold [&_.accordion-menu-title]:text-gray-800 [&_.accordion-menu-title]:dark:text-gray-200',
  };

  const getItemClasses = useCallback(
    (path: string) => {
      return pathname === path ? 'active' : '';
    },
    [pathname],
  );

  return (
    <AccordionMenu classNames={classNames}>
      <AccordionMenuGroup>
        <AccordionMenuLabel>Programa</AccordionMenuLabel>
        <AccordionMenuItem value="/afiliados" className={getItemClasses('/afiliados')}>
          <Link to="/afiliados" className="flex items-center gap-2">
            <Home data-slot="accordion-menu-icon" className="size-4" />
            <span data-slot="accordion-menu-title">Panel Principal</span>
          </Link>
        </AccordionMenuItem>
        <AccordionMenuItem value="/afiliados/referidos" className={getItemClasses('/afiliados/referidos')}>
          <Link to="/afiliados/referidos" className="flex items-center gap-2">
            <Users data-slot="accordion-menu-icon" className="size-4" />
            <span data-slot="accordion-menu-title">Mis Referidos</span>
          </Link>
        </AccordionMenuItem>
        <AccordionMenuItem value="/afiliados/comisiones" className={getItemClasses('/afiliados/comisiones')}>
          <Link to="/afiliados/comisiones" className="flex items-center gap-2">
            <DollarSign data-slot="accordion-menu-icon" className="size-4" />
            <span data-slot="accordion-menu-title">Comisiones</span>
          </Link>
        </AccordionMenuItem>
      </AccordionMenuGroup>

      <AccordionMenuGroup>
        <AccordionMenuLabel>Herramientas</AccordionMenuLabel>
        <AccordionMenuItem value="/afiliados/materiales" className={getItemClasses('/afiliados/materiales')}>
          <Link to="/afiliados/materiales" className="flex items-center gap-2">
            <Gift data-slot="accordion-menu-icon" className="size-4" />
            <span data-slot="accordion-menu-title">Material Promocional</span>
          </Link>
        </AccordionMenuItem>
        <AccordionMenuItem value="/afiliados/enlaces" className={getItemClasses('/afiliados/enlaces')}>
          <Link to="/afiliados/enlaces" className="flex items-center gap-2">
            <Link2 data-slot="accordion-menu-icon" className="size-4" />
            <span data-slot="accordion-menu-title">Enlaces de Afiliado</span>
          </Link>
        </AccordionMenuItem>
        <AccordionMenuItem value="/afiliados/rendimiento" className={getItemClasses('/afiliados/rendimiento')}>
          <Link to="/afiliados/rendimiento" className="flex items-center gap-2">
            <TrendingUp data-slot="accordion-menu-icon" className="size-4" />
            <span data-slot="accordion-menu-title">Rendimiento</span>
          </Link>
        </AccordionMenuItem>
      </AccordionMenuGroup>
    </AccordionMenu>
  );
}
