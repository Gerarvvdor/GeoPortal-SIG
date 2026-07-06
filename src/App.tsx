import { useState } from 'react';
import { Header } from './components/Header';
import { Search, X } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { Map } from './components/Map';
import { MedicalCentersTable } from './components/MedicalCentersTable';
import { ChatBot } from './components/ChatBot';
import { LoadingSpinner } from './components/LoadingSpinner';
import { ErrorMessage } from './components/ErrorMessage';
import { AuthWrapper } from './components/auth/AuthWrapper';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { useGeolocation } from './hooks/useGeolocation';
import { useMedicalCenters } from './hooks/useMedicalCenters';
import { useAuth } from './hooks/useAuth';
import { LayerControls, CoverageStats, MedicalCenter } from './types';

function App() {
  const { user, userProfile, loading: authLoading, isAdmin, signOut, isSupabaseConfigured } = useAuth();
  const { location: userLocation } = useGeolocation();

  const {
    medicalCenters,
    loading: centersLoading,
    error: centersError,
    refetch: refetchCenters
  } = useMedicalCenters();

  const [activeTab, setActiveTab] = useState('coverage');

  const [layers, setLayers] = useState<LayerControls>({
    coverage: true,
    riskZones: false,
    populationDensity: false,
    covidHeatmap: true
  });

  const [selectedCenter, setSelectedCenter] = useState<MedicalCenter | null>(null);

  // Mobile sidebar toggle state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* ============================
     BARRA DE BÚSQUEDA - ESTADOS
     ============================ */

  // Guarda lo que el usuario escribe en la barra de búsqueda
  const [searchTerm, setSearchTerm] = useState('');

  // Guarda el filtro seleccionado: todos, hospitales, clínicas o unidades
  const [typeFilter, setTypeFilter] = useState<'all' | 'hospital' | 'clinic' | 'health_center'>('all');

  /* ============================
     BARRA DE BÚSQUEDA - FILTRADO
     ============================ */

  // Filtra los centros médicos según el texto escrito y el tipo seleccionado.
  // Usa los datos cargados desde useMedicalCenters(), ya sea desde Supabase o datos demo.
  const filteredCenters = medicalCenters.filter((center) => {
    const text = searchTerm.toLowerCase();

    const matchesSearch =
      center.name.toLowerCase().includes(text) ||
      center.address.toLowerCase().includes(text) ||
      center.phone.toLowerCase().includes(text) ||
      center.schedule.toLowerCase().includes(text) ||
      center.services.some((service) =>
        service.toLowerCase().includes(text)
      );

    const matchesType =
      typeFilter === 'all' ||
      center.type === typeFilter;

    return matchesSearch && matchesType;
  });

  const handleLayerToggle = (layer: keyof LayerControls) => {
    setLayers(prev => ({
      ...prev,
      [layer]: !prev[layer]
    }));
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const handleCenterSelect = (center: MedicalCenter) => {
    setSelectedCenter(center);
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleToggleSidebar = () => {
    setSidebarOpen(prev => !prev);
  };

  // Estadísticas calculadas basadas en los centros filtrados
  const stats: CoverageStats = {
    coveredArea: 78,
    uncoveredArea: 22,
    totalCenters: filteredCenters.length,
    population: 1250000
  };

  if (authLoading) {
    return (
      <div className="h-screen-safe flex items-center justify-center bg-gray-50">
        <LoadingSpinner
          size="lg"
          text="Cargando aplicación..."
        />
      </div>
    );
  }

  if (!user) {
    return <AuthWrapper onAuthSuccess={() => { }} />;
  }

  if (isAdmin) {
    return (
      <AdminDashboard
        user={user}
        userProfile={userProfile}
        onSignOut={handleSignOut}
      />
    );
  }

  if (centersLoading) {
    return (
      <div className="h-screen-safe flex items-center justify-center bg-gray-50">
        <LoadingSpinner
          size="lg"
          text={`Cargando centros médicos${isSupabaseConfigured ? ' desde Supabase' : ' (modo demo)'}...`}
        />
      </div>
    );
  }

  if (centersError) {
    return (
      <div className="h-screen-safe flex items-center justify-center bg-gray-50">
        <ErrorMessage
          message={`Error al cargar datos: ${centersError}`}
          onRetry={refetchCenters}
        />
      </div>
    );
  }

  return (
    <div className="h-screen-safe flex flex-col bg-gray-50 relative">
      <Header
        activeTab={activeTab}
        onTabChange={handleTabChange}
        user={user}
        userProfile={userProfile}
        isAdmin={isAdmin}
        onSignOut={handleSignOut}
        onToggleSidebar={handleToggleSidebar}
      />

      {/* ============================
          BARRA DE BÚSQUEDA - DISEÑO
          Esta barra aparece flotante en la parte superior del mapa.
          Permite buscar por nombre, dirección, teléfono, horario o servicios.
          También permite filtrar por tipo de centro médico.
          ============================ */}
      <div className="absolute top-20 sm:top-5 left-1/2 -translate-x-1/2 z-[1000] w-[calc(100%-24px)] max-w-[460px]">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl shadow-md px-3 py-2">

          {/* Icono de búsqueda */}
          <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />

          {/* Campo de texto de búsqueda */}
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar centro médico..."
            className="flex-1 min-w-0 bg-transparent outline-none text-sm text-gray-700 placeholder:text-gray-400"
          />

          {/* Filtro por tipo de centro médico */}
          <select
            value={typeFilter}
            onChange={(e) =>
              setTypeFilter(e.target.value as 'all' | 'hospital' | 'clinic' | 'health_center')
            }
            className="text-xs sm:text-sm bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-gray-600 outline-none flex-shrink-0"
          >
            <option value="all">Todos</option>
            <option value="hospital">Hospitales</option>
            <option value="health_center">Unidades</option>
            <option value="clinic">Clínicas</option>
          </select>

          {/* Botón para limpiar la búsqueda */}
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="p-1 rounded-full hover:bg-gray-100 flex-shrink-0"
              title="Limpiar búsqueda"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          layers={layers}
          onLayerToggle={handleLayerToggle}
          stats={stats}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <div className="flex-1 flex flex-col relative">
          <div className="flex-1 relative">
            <Map
              medicalCenters={filteredCenters}
              userLocation={userLocation}
              layers={layers}
              selectedCenter={selectedCenter}
            />
          </div>

          {activeTab === 'centers' && (
            <MedicalCentersTable
              medicalCenters={filteredCenters}
              userLocation={userLocation}
              onCenterSelect={handleCenterSelect}
              selectedCenter={selectedCenter}
            />
          )}
        </div>
      </div>

      <ChatBot />

      {!isSupabaseConfigured && (
        <div className="fixed bottom-4 left-4 bg-yellow-100 border border-yellow-300 rounded-lg p-3 shadow-lg z-50 max-w-[calc(100%-32px)] sm:max-w-xs">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full flex-shrink-0"></div>
            <span className="text-sm text-yellow-800 font-medium">Modo Demo</span>
          </div>
          <p className="text-xs text-yellow-700 mt-1">
            Datos simulados - Configure Supabase para datos reales
          </p>
        </div>
      )}
    </div>
  );
}

export default App;