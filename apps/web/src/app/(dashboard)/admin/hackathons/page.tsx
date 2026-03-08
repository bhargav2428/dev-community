'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import {
  Search,
  Filter,
  MoreVertical,
  Eye,
  Trash2,
  Star,
  RefreshCw,
  Calendar,
  Users,
  Trophy,
  AlertTriangle,
  Check,
  X,
  Clock,
  ChevronLeft,
  ChevronRight,
  Play,
  Award,
  DollarSign,
  MapPin,
  Globe,
  CheckCircle,
} from 'lucide-react';
import { format, formatDistanceToNow, isPast, isFuture } from 'date-fns';

interface Hackathon {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  status: string;
  startDate: string;
  endDate: string;
  registrationDeadline?: string;
  location?: string;
  isOnline?: boolean;
  prizes?: any;
  maxTeamSize?: number;
  isFeatured?: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  _count?: {
    participants: number;
  };
  organizer?: {
    id: string;
    username: string;
    displayName?: string;
    avatar?: string;
  };
}

export default function AdminHackathonsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  
  const [hackathons, setHackathons] = useState<Hackathon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalHackathons, setTotalHackathons] = useState(0);
  const [selectedHackathons, setSelectedHackathons] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [viewingHackathon, setViewingHackathon] = useState<Hackathon | null>(null);

  const fetchHackathons = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: Record<string, string | number> = {
        page: currentPage,
        limit: 20,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;

      const response = await apiClient.getPaginated<Hackathon>('/admin/hackathons', { params });
      setHackathons(response.data || []);
      setTotalPages(response.pagination?.totalPages || 1);
      setTotalHackathons(response.pagination?.total || 0);
    } catch (err: any) {
      setError(err?.message || 'Failed to load hackathons');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, statusFilter]);

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (!session?.user || !['ADMIN', 'SUPER_ADMIN', 'MODERATOR'].includes(session.user.role)) {
      router.push('/');
      return;
    }
    fetchHackathons();
  }, [session, sessionStatus, router, fetchHackathons]);

  const handleStatusChange = async (hackathonId: string, newStatus: string) => {
    try {
      setActionLoading(hackathonId);
      await apiClient.patch(`/admin/hackathons/${hackathonId}/status`, { status: newStatus });
      await fetchHackathons();
      setActiveDropdown(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to update hackathon status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleFeatureHackathon = async (hackathonId: string, featured: boolean) => {
    try {
      setActionLoading(hackathonId);
      await apiClient.put(`/admin/hackathons/${hackathonId}/feature`, { featured });
      await fetchHackathons();
      setActiveDropdown(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to update featured status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteHackathon = async (hackathonId: string) => {
    if (!confirm('Are you sure you want to delete this hackathon?')) return;
    
    try {
      setActionLoading(hackathonId);
      await apiClient.delete(`/admin/hackathons/${hackathonId}`);
      await fetchHackathons();
      setActiveDropdown(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to delete hackathon');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestoreHackathon = async (hackathonId: string) => {
    try {
      setActionLoading(hackathonId);
      await apiClient.put(`/admin/hackathons/${hackathonId}/restore`);
      await fetchHackathons();
      setActiveDropdown(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to restore hackathon');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedHackathons.length === 0) return;
    
    const confirmMessage = {
      delete: `Are you sure you want to delete ${selectedHackathons.length} hackathons?`,
      feature: `Are you sure you want to feature ${selectedHackathons.length} hackathons?`,
    }[action];
    
    if (confirmMessage && !confirm(confirmMessage)) return;
    
    try {
      setActionLoading('bulk');
      await apiClient.post('/admin/hackathons/bulk', {
        hackathonIds: selectedHackathons,
        action,
      });
      setSelectedHackathons([]);
      await fetchHackathons();
    } catch (err: any) {
      setError(err?.message || 'Bulk action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSelectAll = () => {
    if (selectedHackathons.length === hackathons.length) {
      setSelectedHackathons([]);
    } else {
      setSelectedHackathons(hackathons.map(h => h.id));
    }
  };

  const handleSelectHackathon = (hackathonId: string) => {
    setSelectedHackathons(prev => 
      prev.includes(hackathonId) 
        ? prev.filter(id => id !== hackathonId)
        : [...prev, hackathonId]
    );
  };

  const getHackathonPhase = (hackathon: Hackathon) => {
    const now = new Date();
    const start = new Date(hackathon.startDate);
    const end = new Date(hackathon.endDate);
    const registration = hackathon.registrationDeadline ? new Date(hackathon.registrationDeadline) : null;
    
    if (hackathon.status === 'CANCELLED') return 'cancelled';
    if (isPast(end)) return 'ended';
    if (isPast(start) && isFuture(end)) return 'ongoing';
    if (registration && isPast(registration) && isFuture(start)) return 'registration-closed';
    if (isFuture(start)) return 'upcoming';
    return 'unknown';
  };

  const getStatusBadge = (status: string, phase?: string) => {
    const badges: Record<string, { color: string; icon: any; label: string }> = {
      UPCOMING: { color: 'bg-gray-100 text-gray-700', icon: Clock, label: 'Upcoming' },
      REGISTRATION_OPEN: { color: 'bg-blue-100 text-blue-700', icon: Users, label: 'Registration Open' },
      IN_PROGRESS: { color: 'bg-purple-100 text-purple-700', icon: Play, label: 'In Progress' },
      JUDGING: { color: 'bg-orange-100 text-orange-700', icon: Award, label: 'Judging' },
      COMPLETED: { color: 'bg-teal-100 text-teal-700', icon: Trophy, label: 'Completed' },
      CANCELLED: { color: 'bg-red-100 text-red-700', icon: X, label: 'Cancelled' },
    };
    
    const badge = badges[status] || { color: 'bg-gray-100 text-gray-700', icon: AlertTriangle, label: status };
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {badge.label}
      </span>
    );
  };

  const getPhaseBadge = (phase: string) => {
    const phaseConfig: Record<string, { color: string; label: string }> = {
      upcoming: { color: 'bg-blue-50 text-blue-600 border-blue-200', label: 'Upcoming' },
      'registration-closed': { color: 'bg-yellow-50 text-yellow-600 border-yellow-200', label: 'Reg. Closed' },
      ongoing: { color: 'bg-green-50 text-green-600 border-green-200', label: 'Ongoing' },
      ended: { color: 'bg-gray-50 text-gray-600 border-gray-200', label: 'Ended' },
      cancelled: { color: 'bg-red-50 text-red-600 border-red-200', label: 'Cancelled' },
    };
    
    const config = phaseConfig[phase] || phaseConfig.upcoming;
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${config.color}`}>
        {config.label}
      </span>
    );
  };

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Hackathons Management</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage hackathon events across the platform ({totalHackathons} total)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchHackathons()}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${
              showFilters
                ? 'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/50 dark:border-blue-700 dark:text-blue-300'
                : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-300 p-4 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search hackathons..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              >
                <option value="all">All Statuses</option>
                <option value="UPCOMING">Upcoming</option>
                <option value="REGISTRATION_OPEN">Registration Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="JUDGING">Judging</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end mt-4 gap-2">
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setCurrentPage(1);
              }}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              Clear Filters
            </button>
            <button
              onClick={() => {
                setCurrentPage(1);
                fetchHackathons();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedHackathons.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-700 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
          <span className="text-blue-700 dark:text-blue-300 font-medium">
            {selectedHackathons.length} hackathon(s) selected
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleBulkAction('feature')}
              disabled={actionLoading === 'bulk'}
              className="px-3 py-1.5 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm flex items-center gap-1"
            >
              <Star className="w-4 h-4" />
              Feature
            </button>
            <button
              onClick={() => handleBulkAction('delete')}
              disabled={actionLoading === 'bulk'}
              className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm flex items-center gap-1"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
            <button
              onClick={() => setSelectedHackathons([])}
              className="px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Hackathons Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedHackathons.length === hackathons.length && hackathons.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Hackathon
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Dates
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Participants
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {hackathons.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                    <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No hackathons found</p>
                  </td>
                </tr>
              ) : (
                hackathons.map((hackathon) => {
                  const phase = getHackathonPhase(hackathon);
                  return (
                    <tr
                      key={hackathon.id}
                      className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                        hackathon.deletedAt ? 'bg-red-50/50 dark:bg-red-900/20' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedHackathons.includes(hackathon.id)}
                          onChange={() => handleSelectHackathon(hackathon.id)}
                          className="rounded border-gray-300"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2">
                          {hackathon.isFeatured && (
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 mt-1 flex-shrink-0" />
                          )}
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white line-clamp-1">
                              {hackathon.name}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              {hackathon.isOnline ? (
                                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                  <Globe className="w-3 h-3" />
                                  Online
                                </span>
                              ) : hackathon.location ? (
                                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {hackathon.location}
                                </span>
                              ) : null}
                              {hackathon.prizes && (
                                <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                                  <DollarSign className="w-3 h-3" />
                                  Prize Pool
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1">
                          {getStatusBadge(hackathon.status)}
                          {getPhaseBadge(phase)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm">
                          <p className="text-gray-900 dark:text-white">
                            {format(new Date(hackathon.startDate), 'MMM d')} - {format(new Date(hackathon.endDate), 'MMM d, yyyy')}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {phase === 'ongoing' 
                              ? `Ends ${formatDistanceToNow(new Date(hackathon.endDate), { addSuffix: true })}`
                              : phase === 'upcoming'
                              ? `Starts ${formatDistanceToNow(new Date(hackathon.startDate), { addSuffix: true })}`
                              : phase === 'ended'
                              ? `Ended ${formatDistanceToNow(new Date(hackathon.endDate), { addSuffix: true })}`
                              : ''
                            }
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                          <Users className="w-3 h-3" />
                          {hackathon._count?.participants || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right relative">
                        <button
                          onClick={() => setActiveDropdown(activeDropdown === hackathon.id ? null : hackathon.id)}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          disabled={actionLoading === hackathon.id}
                        >
                          {actionLoading === hackathon.id ? (
                            <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                          ) : (
                            <MoreVertical className="w-5 h-5 text-gray-500" />
                          )}
                        </button>

                        {activeDropdown === hackathon.id && (
                          <div className="absolute right-0 mt-1 w-52 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                            <div className="py-1">
                              <button
                                onClick={() => setViewingHackathon(hackathon)}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                              >
                                <Eye className="w-4 h-4" />
                                View Details
                              </button>
                              {hackathon.deletedAt ? (
                                <button
                                  onClick={() => handleRestoreHackathon(hackathon.id)}
                                  className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/50 flex items-center gap-2"
                                >
                                  <RefreshCw className="w-4 h-4" />
                                  Restore Hackathon
                                </button>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleFeatureHackathon(hackathon.id, !hackathon.isFeatured)}
                                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                  >
                                    <Star className={`w-4 h-4 ${hackathon.isFeatured ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                                    {hackathon.isFeatured ? 'Unfeature' : 'Feature'}
                                  </button>
                                  
                                  <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                                  
                                  <span className="px-4 py-1 text-xs text-gray-500 dark:text-gray-400">Change Status</span>
                                  {['UPCOMING', 'REGISTRATION_OPEN', 'IN_PROGRESS', 'JUDGING', 'COMPLETED', 'CANCELLED'].map((s) => (
                                    <button
                                      key={s}
                                      onClick={() => handleStatusChange(hackathon.id, s)}
                                      disabled={hackathon.status === s}
                                      className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
                                        hackathon.status === s
                                          ? 'text-gray-400 cursor-not-allowed'
                                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                      }`}
                                    >
                                      {s === 'IN_PROGRESS' && <Play className="w-3 h-3 text-purple-500" />}
                                      {s === 'COMPLETED' && <Trophy className="w-3 h-3 text-teal-500" />}
                                      {s === 'CANCELLED' && <X className="w-3 h-3 text-red-500" />}
                                      {!['IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(s) && <Clock className="w-3 h-3 text-gray-500" />}
                                      {s.replace('_', ' ')}
                                    </button>
                                  ))}
                                  
                                  <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                                  
                                  <button
                                    onClick={() => handleDeleteHackathon(hackathon.id)}
                                    className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/50 flex items-center gap-2"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                    Delete Hackathon
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, totalHackathons)} of {totalHackathons}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Hackathon Detail Modal */}
      {viewingHackathon && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {viewingHackathon.name}
                </h2>
                <div className="flex items-center gap-2 mt-2">
                  {getStatusBadge(viewingHackathon.status)}
                  {getPhaseBadge(getHackathonPhase(viewingHackathon))}
                </div>
              </div>
              <button
                onClick={() => setViewingHackathon(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {viewingHackathon.description && (
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Description</label>
                  <p className="mt-1 text-gray-900 dark:text-white">{viewingHackathon.description}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Start Date</label>
                  <p className="mt-1 text-gray-900 dark:text-white flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(viewingHackathon.startDate), 'PPP')}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">End Date</label>
                  <p className="mt-1 text-gray-900 dark:text-white flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(viewingHackathon.endDate), 'PPP')}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Location</label>
                  <p className="mt-1 text-gray-900 dark:text-white flex items-center gap-1">
                    {viewingHackathon.isOnline ? (
                      <>
                        <Globe className="w-4 h-4" />
                        Online
                      </>
                    ) : (
                      <>
                        <MapPin className="w-4 h-4" />
                        {viewingHackathon.location || 'Not specified'}
                      </>
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Prize Pool</label>
                  <p className="mt-1 text-gray-900 dark:text-white flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    {viewingHackathon.prizes ? 'Configured' : 'Not specified'}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Participants</label>
                  <p className="mt-1 text-gray-900 dark:text-white flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    {viewingHackathon._count?.participants || 0} participants
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Max Team Size</label>
                  <p className="mt-1 text-gray-900 dark:text-white">
                    {viewingHackathon.maxTeamSize || 'Not specified'}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Featured</label>
                  <p className="mt-1">
                    {viewingHackathon.isFeatured ? (
                      <span className="text-yellow-600 flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-500" /> Yes
                      </span>
                    ) : (
                      <span className="text-gray-500">No</span>
                    )}
                  </p>
                </div>
              </div>
              
              {viewingHackathon.deletedAt && (
                <div className="bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-300 p-4 rounded-lg">
                  <p className="font-medium">This hackathon was deleted on {format(new Date(viewingHackathon.deletedAt), 'PPP')}</p>
                </div>
              )}
              
              <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                {viewingHackathon.deletedAt ? (
                  <button
                    onClick={() => {
                      handleRestoreHackathon(viewingHackathon.id);
                      setViewingHackathon(null);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Restore Hackathon
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        handleFeatureHackathon(viewingHackathon.id, !viewingHackathon.isFeatured);
                        setViewingHackathon(null);
                      }}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                    >
                      {viewingHackathon.isFeatured ? 'Unfeature' : 'Feature'}
                    </button>
                    <button
                      onClick={() => {
                        handleDeleteHackathon(viewingHackathon.id);
                        setViewingHackathon(null);
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Delete Hackathon
                    </button>
                  </>
                )}
                <button
                  onClick={() => setViewingHackathon(null)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close dropdown */}
      {activeDropdown && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setActiveDropdown(null)}
        />
      )}
    </div>
  );
}
