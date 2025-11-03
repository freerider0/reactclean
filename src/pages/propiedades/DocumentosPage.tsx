import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Container } from '@/components/common/container';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileText, Upload, Download, Eye, Search, Filter, File, FileCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const mockDocumentos = [
  {
    id: 1,
    nombre: 'Escrituras Prop-001.pdf',
    tipo: 'Escrituras',
    propiedad: 'PROP-001 - Calle Mayor 123',
    fecha: '2024-01-15',
    tamano: '2.4 MB',
    categoria: 'Legal',
  },
  {
    id: 2,
    nombre: 'Nota Simple Prop-001.pdf',
    tipo: 'Nota Simple',
    propiedad: 'PROP-001 - Calle Mayor 123',
    fecha: '2024-01-20',
    tamano: '1.2 MB',
    categoria: 'Legal',
  },
  {
    id: 3,
    nombre: 'Certificado Energético Prop-002.pdf',
    tipo: 'Certificado Energético',
    propiedad: 'PROP-002 - Avenida Constitución 45',
    fecha: '2024-02-01',
    tamano: '890 KB',
    categoria: 'Certificados',
  },
  {
    id: 4,
    nombre: 'IBI 2024 Prop-001.pdf',
    tipo: 'Recibo IBI',
    propiedad: 'PROP-001 - Calle Mayor 123',
    fecha: '2024-01-10',
    tamano: '450 KB',
    categoria: 'Impuestos',
  },
  {
    id: 5,
    nombre: 'Planos Prop-003.pdf',
    tipo: 'Planos',
    propiedad: 'PROP-003 - Gran Vía 78',
    fecha: '2024-01-25',
    tamano: '3.8 MB',
    categoria: 'Técnico',
  },
];

export const DocumentosPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('Todos');

  const categorias = ['Todos', 'Legal', 'Certificados', 'Impuestos', 'Técnico'];

  const documentosFiltrados = mockDocumentos.filter((doc) => {
    const matchSearch = doc.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       doc.propiedad.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCategoria = filtroCategoria === 'Todos' || doc.categoria === filtroCategoria;
    return matchSearch && matchCategoria;
  });

  const getIconoCategoria = (categoria: string) => {
    switch (categoria) {
      case 'Legal':
        return <FileCheck className="w-4 h-4 text-blue-500" />;
      case 'Certificados':
        return <FileText className="w-4 h-4 text-green-500" />;
      case 'Impuestos':
        return <File className="w-4 h-4 text-yellow-500" />;
      case 'Técnico':
        return <FileText className="w-4 h-4 text-purple-500" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <>
      <Helmet>
        <title>Documentos | Sistema Inmobiliario</title>
      </Helmet>

      <Container className="py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Documentos</h1>
              <p className="text-muted-foreground mt-1">
                Gestiona toda la documentación de tus propiedades
              </p>
            </div>
          </div>
          <Button className="gap-2">
            <Upload className="w-4 h-4" />
            Subir Documento
          </Button>
        </div>

        {/* Búsqueda y filtros */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar documentos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {categorias.map((cat) => (
                  <Button
                    key={cat}
                    variant={filtroCategoria === cat ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFiltroCategoria(cat)}
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-foreground">{mockDocumentos.length}</div>
              <p className="text-xs text-muted-foreground">Total Documentos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-foreground">
                {mockDocumentos.filter(d => d.categoria === 'Legal').length}
              </div>
              <p className="text-xs text-muted-foreground">Legales</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-foreground">
                {mockDocumentos.filter(d => d.categoria === 'Certificados').length}
              </div>
              <p className="text-xs text-muted-foreground">Certificados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-foreground">
                {(mockDocumentos.reduce((sum, d) => sum + parseFloat(d.tamano), 0) / mockDocumentos.length).toFixed(1)} MB
              </div>
              <p className="text-xs text-muted-foreground">Tamaño Promedio</p>
            </CardContent>
          </Card>
        </div>

        {/* Lista de documentos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Documentos Recientes</CardTitle>
            <CardDescription>{documentosFiltrados.length} documentos encontrados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {documentosFiltrados.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                      {getIconoCategoria(doc.categoria)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm truncate">{doc.nombre}</span>
                        <Badge variant="outline" className="text-xs">{doc.tipo}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">{doc.propiedad}</div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span>{new Date(doc.fecha).toLocaleDateString('es-ES')}</span>
                        <span>•</span>
                        <span>{doc.tamano}</span>
                        <span>•</span>
                        <Badge variant="secondary" className="text-xs">{doc.categoria}</Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button variant="outline" size="sm" className="gap-1">
                      <Eye className="w-3 h-3" />
                      Ver
                    </Button>
                    <Button variant="outline" size="sm" className="gap-1">
                      <Download className="w-3 h-3" />
                      Descargar
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {documentosFiltrados.length === 0 && (
              <div className="py-12 text-center">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No se encontraron documentos</h3>
                <p className="text-muted-foreground mb-4">
                  Intenta con otros términos de búsqueda o filtros
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </Container>
    </>
  );
};

export default DocumentosPage;
