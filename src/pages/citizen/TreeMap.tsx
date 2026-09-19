import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Tree, TreeStatus, treesApi } from '../../services/trees';
import InteractiveTreeMap, { UserLocation } from '../../components/map/InteractiveTreeMap';
import { calculateHaversineDistance, formatDistance } from '../../utils/geo';

type FilterOption = 'all' | TreeStatus;

const filters: { value: FilterOption; label: string; dot: string }[] = [
  { value: 'all', label: 'All', dot: 'bg-gray-400' },
  { value: 'healthy', label: 'Healthy', dot: 'bg-green-500' },
  { value: 'monitoring', label: 'Monitoring', dot: 'bg-yellow-500' },
  { value: 'at-risk', label: 'At Risk', dot: 'bg-orange-500' },
  { value: 'emergency', label: 'Emergency', dot: 'bg-red-500' },
];

const statusIndicatorColors: Record<TreeStatus, string> = {
  healthy: 'bg-green-500 border-green-200',
  monitoring: 'bg-yellow-400 border-yellow-200',
  'at-risk': 'bg-orange-500 border-orange-200',
  emergency: 'bg-red-500 border-red-200',
};

export default function TreeMap() {
  const [searchParams] = useSearchParams();
  const targetTreeId = searchParams.get('treeId') || searchParams.get('id');

  const [activeFilter, setActiveFilter] = useState<FilterOption>('all');
  const [search, setSearch] = useState('');
  const [trees, setTrees] = useState<Tree[]>([]);
  const [selectedTree, setSelectedTree] = useState<Tree | null>(null);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadTrees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await treesApi.getTrees({
        status: activeFilter !== 'all' ? activeFilter : undefined,
        search: search.trim() || undefined,
      });
      setTrees(data);

      // If URL has treeId, automatically select that tree
      if (targetTreeId) {
        const found = data.find((t) => t.id.toLowerCase() === targetTreeId.toLowerCase());
        if (found) {
          setSelectedTree(found);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Unable to load tree locations.');
    } finally {
      setLoading(false);
    }
  }, [activeFilter, search, targetTreeId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadTrees();
    }, 200); // Small debounce for search input

    return () => clearTimeout(timer);
  }, [loadTrees]);

  return (
    <div className="flex flex-col lg:flex-row h-full w-full overflow-hidden">
      {/* Left panel / Search & Filter Sidebar */}
      <div className="w-full lg:w-84 flex-shrink-0 bg-white border-r border-gray-100 flex flex-col z-10 shadow-sm max-h-[42vh] lg:max-h-full">
        {/* Header & Controls */}
        <div className="p-4 border-b border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="font-semibold text-gray-900 text-base">Tree Map</h1>
            <span className="text-xs text-gray-400 font-medium">
              {loading ? 'Searching...' : `${trees.length} trees shown`}
            </span>
          </div>

          {/* Search bar */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            <input
              type="text"
              placeholder="Search by species, ID, or street…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent transition"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Filter chips */}
          <div className="flex flex-wrap gap-1.5">
            {filters.map((f) => (
              <button
                key={f.value}
                onClick={() => {
                  setActiveFilter(f.value);
                  setSelectedTree(null);
                }}
                className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeFilter === f.value
                    ? 'bg-forest-700 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${activeFilter === f.value ? 'bg-white' : f.dot}`} />
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tree List Content */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {loading ? (
            <div className="p-8 text-center space-y-3">
              <div className="w-6 h-6 border-2 border-forest-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-gray-500 text-xs">Loading tree locations...</p>
            </div>
          ) : error ? (
            <div className="p-6 text-center space-y-3">
              <p className="text-red-600 text-xs font-medium">{error}</p>
              <button
                onClick={loadTrees}
                className="text-xs bg-forest-700 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-forest-800 transition-colors cursor-pointer"
              >
                Try again
              </button>
            </div>
          ) : trees.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-2xl mb-1">🌲</p>
              <p className="text-gray-800 font-medium text-xs">No tree locations found</p>
              <p className="text-gray-400 text-xs mt-1">Try adjusting your filters or search keyword.</p>
              {(activeFilter !== 'all' || search) && (
                <button
                  onClick={() => {
                    setActiveFilter('all');
                    setSearch('');
                  }}
                  className="mt-3 text-xs text-forest-600 hover:text-forest-800 font-medium"
                >
                  Clear all filters
                </button>
              )}
            </div>
          ) : (
            trees.map((tree) => {
              const isSelected = selectedTree?.id === tree.id;
              let distText: string | null = null;
              if (
                userLocation &&
                tree.latitude !== undefined &&
                tree.longitude !== undefined &&
                !isNaN(tree.latitude) &&
                !isNaN(tree.longitude)
              ) {
                const meters = calculateHaversineDistance(
                  userLocation.latitude,
                  userLocation.longitude,
                  tree.latitude,
                  tree.longitude
                );
                distText = formatDistance(meters);
              }

              return (
                <div
                  key={tree.id}
                  onClick={() => setSelectedTree(tree)}
                  className={`w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer ${
                    isSelected ? 'bg-forest-50/80 border-l-4 border-l-forest-600' : ''
                  }`}
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full border-2 mt-0.5 flex-shrink-0 ${
                      statusIndicatorColors[tree.status] || 'bg-gray-400'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-mono text-gray-400 font-medium">{tree.id}</p>
                      <div className="flex items-center gap-1.5">
                        {distText && (
                          <span className="text-[10px] font-semibold text-forest-700 bg-forest-100/80 px-1.5 py-0.5 rounded">
                            📍 {distText}
                          </span>
                        )}
                        <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                          {tree.health_score}/100
                        </span>
                      </div>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 truncate">{tree.species}</p>
                    <p className="text-xs text-gray-500 truncate">{tree.location_name}</p>

                    <div className="flex items-center justify-between mt-2 pt-1 border-t border-gray-100/60">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTree(tree);
                        }}
                        className="text-[11px] text-forest-700 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        View Map →
                      </button>
                      <Link
                        to={`/app/tree/${tree.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[11px] text-gray-400 hover:text-gray-600"
                      >
                        Tree details
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Quick Report Tree Footer Button */}
        <div className="p-3 border-t border-gray-100 bg-gray-50/70">
          <Link
            to="/app/report"
            className="w-full flex items-center justify-center gap-2 bg-forest-700 hover:bg-forest-800 text-white py-2 rounded-lg font-medium text-xs transition-colors shadow-sm"
          >
            <span>＋</span> Report a Tree
          </Link>
        </div>
      </div>

      {/* Main Interactive Map Area */}
      <div className="flex-1 relative w-full h-full min-h-[58vh] lg:min-h-0 bg-gray-100">
        <InteractiveTreeMap
          trees={trees}
          selectedTree={selectedTree}
          onSelectTree={setSelectedTree}
          userLocation={userLocation}
          onUserLocationChange={setUserLocation}
          defaultCenter={[11.0168, 76.9558]}
          defaultZoom={14}
        />
      </div>
    </div>
  );
}
