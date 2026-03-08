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
  Building2,
  MapPin,
  DollarSign,
  Briefcase,
  AlertTriangle,
  Check,
  X,
  Clock,
  ChevronLeft,
  ChevronRight,
  Ban,
  CheckCircle,
  PauseCircle,
} from 'lucide-react';
import { format } from 'date-fns';

interface Job {
  id: string;
  title: string;
  companyName: string;
  location: string;
  type: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  status: string;
  isFeatured?: boolean;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  deletedAt?: string | null;
  _count?: {
    applications: number;
  };
  postedBy?: {
    id: string;
    username: string;
    displayName?: string;
    avatar?: string;
  };
}

export default function AdminJobsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const [selectedJobs, setSelectedJobs] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [viewingJob, setViewingJob] = useState<Job | null>(null);

  const fetchJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params: Record<string, string | number> = {
        page: currentPage,
        limit: 20,
      };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter && statusFilter !== 'all') params.status = statusFilter;
      if (typeFilter && typeFilter !== 'all') params.type = typeFilter;

      const response = await apiClient.getPaginated<Job>('/admin/jobs', { params });
      setJobs(response.data || []);
      setTotalPages(response.pagination?.totalPages || 1);
      setTotalJobs(response.pagination?.total || 0);
    } catch (err: any) {
      setError(err?.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, statusFilter, typeFilter]);

  useEffect(() => {
    if (sessionStatus === 'loading') return;
    if (!session?.user || !['ADMIN', 'SUPER_ADMIN', 'MODERATOR'].includes(session.user.role)) {
      router.push('/');
      return;
    }
    fetchJobs();
  }, [session, sessionStatus, router, fetchJobs]);

  const handleStatusChange = async (jobId: string, newStatus: string) => {
    try {
      setActionLoading(jobId);
      await apiClient.patch(`/admin/jobs/${jobId}/status`, { status: newStatus });
      await fetchJobs();
      setActiveDropdown(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to update job status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleFeatureJob = async (jobId: string, featured: boolean) => {
    try {
      setActionLoading(jobId);
      await apiClient.put(`/admin/jobs/${jobId}/feature`, { featured });
      await fetchJobs();
      setActiveDropdown(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to update featured status');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job?')) return;
    
    try {
      setActionLoading(jobId);
      await apiClient.delete(`/admin/jobs/${jobId}`);
      await fetchJobs();
      setActiveDropdown(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to delete job');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestoreJob = async (jobId: string) => {
    try {
      setActionLoading(jobId);
      await apiClient.put(`/admin/jobs/${jobId}/restore`);
      await fetchJobs();
      setActiveDropdown(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to restore job');
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedJobs.length === 0) return;
    
    const confirmMessage = {
      delete: `Are you sure you want to delete ${selectedJobs.length} jobs?`,
      activate: `Are you sure you want to activate ${selectedJobs.length} jobs?`,
      pause: `Are you sure you want to pause ${selectedJobs.length} jobs?`,
      feature: `Are you sure you want to feature ${selectedJobs.length} jobs?`,
    }[action];
    
    if (confirmMessage && !confirm(confirmMessage)) return;
    
    try {
      setActionLoading('bulk');
      await apiClient.post('/admin/jobs/bulk', {
        jobIds: selectedJobs,
        action,
      });
      setSelectedJobs([]);
      await fetchJobs();
    } catch (err: any) {
      setError(err?.message || 'Bulk action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSelectAll = () => {
    if (selectedJobs.length === jobs.length) {
      setSelectedJobs([]);
    } else {
      setSelectedJobs(jobs.map(j => j.id));
    }
  };

  const handleSelectJob = (jobId: string) => {
    setSelectedJobs(prev => 
      prev.includes(jobId) 
        ? prev.filter(id => id !== jobId)
        : [...prev, jobId]
    );
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; icon: any }> = {
      DRAFT: { color: 'bg-gray-100 text-gray-700', icon: Clock },
      ACTIVE: { color: 'bg-green-100 text-green-700', icon: CheckCircle },
      PAUSED: { color: 'bg-orange-100 text-orange-700', icon: PauseCircle },
      FILLED: { color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
      EXPIRED: { color: 'bg-red-100 text-red-700', icon: X },
    };
    const badge = badges[status] || { color: 'bg-gray-100 text-gray-700', icon: AlertTriangle };
    const Icon = badge.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3" />
        {status}
      </span>
    );
  };

  const getTypeBadge = (type: string) => {
    const badges: Record<string, string> = {
      FULL_TIME: 'bg-blue-100 text-blue-700',
      PART_TIME: 'bg-purple-100 text-purple-700',
      CONTRACT: 'bg-orange-100 text-orange-700',
      FREELANCE: 'bg-teal-100 text-teal-700',
      INTERNSHIP: 'bg-pink-100 text-pink-700',
      COFOUNDER: 'bg-green-100 text-green-700',
    };
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badges[type] || 'bg-gray-100 text-gray-700'}`}>
        {type?.replace('_', ' ') || 'N/A'}
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Jobs Management</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage job listings across the platform ({totalJobs} total)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchJobs()}
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  placeholder="Search jobs..."
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
                <option value="DRAFT">Draft</option>
                <option value="ACTIVE">Active</option>
                <option value="PAUSED">Paused</option>
                <option value="FILLED">Filled</option>
                <option value="EXPIRED">Expired</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              >
                <option value="all">All Types</option>
                <option value="FULL_TIME">Full Time</option>
                <option value="PART_TIME">Part Time</option>
                <option value="CONTRACT">Contract</option>
                <option value="FREELANCE">Freelance</option>
                <option value="INTERNSHIP">Internship</option>
                <option value="COFOUNDER">Co-founder</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end mt-4 gap-2">
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('all');
                setTypeFilter('all');
                setCurrentPage(1);
              }}
              className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              Clear Filters
            </button>
            <button
              onClick={() => {
                setCurrentPage(1);
                fetchJobs();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {selectedJobs.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-700 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
          <span className="text-blue-700 dark:text-blue-300 font-medium">
            {selectedJobs.length} job(s) selected
          </span>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleBulkAction('activate')}
              disabled={actionLoading === 'bulk'}
              className="px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm flex items-center gap-1"
            >
              <Check className="w-4 h-4" />
              Activate
            </button>
            <button
              onClick={() => handleBulkAction('pause')}
              disabled={actionLoading === 'bulk'}
              className="px-3 py-1.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm flex items-center gap-1"
            >
              <PauseCircle className="w-4 h-4" />
              Pause
            </button>
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
              onClick={() => setSelectedJobs([])}
              className="px-3 py-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Jobs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedJobs.length === jobs.length && jobs.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Job
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Company
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Applications
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Created
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500 dark:text-gray-400">
                    <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No jobs found</p>
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr
                    key={job.id}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                      job.deletedAt ? 'bg-red-50/50 dark:bg-red-900/20' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedJobs.includes(job.id)}
                        onChange={() => handleSelectJob(job.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {job.isFeatured && (
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        )}
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white line-clamp-1">
                            {job.title}
                          </p>
                          {job.location && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {job.location}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-900 dark:text-white">{job.companyName || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {getTypeBadge(job.type)}
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(job.status)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        {job._count?.applications || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                      {format(new Date(job.createdAt), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3 text-right relative">
                      <button
                        onClick={() => setActiveDropdown(activeDropdown === job.id ? null : job.id)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        disabled={actionLoading === job.id}
                      >
                        {actionLoading === job.id ? (
                          <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
                        ) : (
                          <MoreVertical className="w-5 h-5 text-gray-500" />
                        )}
                      </button>

                      {activeDropdown === job.id && (
                        <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                          <div className="py-1">
                            <button
                              onClick={() => setViewingJob(job)}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                              <Eye className="w-4 h-4" />
                              View Details
                            </button>
                            {job.deletedAt ? (
                              <button
                                onClick={() => handleRestoreJob(job.id)}
                                className="w-full px-4 py-2 text-left text-sm text-green-600 hover:bg-green-50 dark:hover:bg-green-900/50 flex items-center gap-2"
                              >
                                <RefreshCw className="w-4 h-4" />
                                Restore Job
                              </button>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleFeatureJob(job.id, !job.isFeatured)}
                                  className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                                >
                                  <Star className={`w-4 h-4 ${job.isFeatured ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                                  {job.isFeatured ? 'Unfeature' : 'Feature'}
                                </button>
                                
                                <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                                
                                <span className="px-4 py-1 text-xs text-gray-500 dark:text-gray-400">Change Status</span>
                                {['DRAFT', 'ACTIVE', 'PAUSED', 'FILLED', 'EXPIRED'].map((s) => (
                                  <button
                                    key={s}
                                    onClick={() => handleStatusChange(job.id, s)}
                                    disabled={job.status === s}
                                    className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 ${
                                      job.status === s
                                        ? 'text-gray-400 cursor-not-allowed'
                                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                                    }`}
                                  >
                                    {s === 'ACTIVE' && <CheckCircle className="w-4 h-4 text-green-500" />}
                                    {s === 'PAUSED' && <PauseCircle className="w-4 h-4 text-orange-500" />}
                                    {s === 'FILLED' && <Check className="w-4 h-4 text-blue-500" />}
                                    {s === 'EXPIRED' && <Ban className="w-4 h-4 text-red-500" />}
                                    {s === 'DRAFT' && <Clock className="w-4 h-4 text-gray-500" />}
                                    {s}
                                  </button>
                                ))}
                                
                                <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                                
                                <button
                                  onClick={() => handleDeleteJob(job.id)}
                                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/50 flex items-center gap-2"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Delete Job
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, totalJobs)} of {totalJobs}
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

      {/* Job Detail Modal */}
      {viewingJob && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {viewingJob.title}
                </h2>
                <p className="text-gray-500 dark:text-gray-400 flex items-center gap-2 mt-1">
                  <Building2 className="w-4 h-4" />
                  {viewingJob.companyName}
                </p>
              </div>
              <button
                onClick={() => setViewingJob(null)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Status</label>
                  <p className="mt-1">{getStatusBadge(viewingJob.status)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Type</label>
                  <p className="mt-1">{getTypeBadge(viewingJob.type)}</p>
                </div>
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Location</label>
                  <p className="mt-1 text-gray-900 dark:text-white flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {viewingJob.location || 'Not specified'}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Salary</label>
                  <p className="mt-1 text-gray-900 dark:text-white flex items-center gap-1">
                    <DollarSign className="w-4 h-4" />
                    {viewingJob.salaryMin && viewingJob.salaryMax
                      ? `${viewingJob.salaryCurrency || 'USD'} ${viewingJob.salaryMin} - ${viewingJob.salaryMax}`
                      : 'Not specified'}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Applications</label>
                  <p className="mt-1 text-gray-900 dark:text-white">
                    {viewingJob._count?.applications || 0} applications
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Featured</label>
                  <p className="mt-1">
                    {viewingJob.isFeatured ? (
                      <span className="text-yellow-600 flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-500" /> Yes
                      </span>
                    ) : (
                      <span className="text-gray-500">No</span>
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Posted</label>
                  <p className="mt-1 text-gray-900 dark:text-white">
                    {format(new Date(viewingJob.createdAt), 'PPP')}
                  </p>
                </div>
                <div>
                  <label className="text-sm text-gray-500 dark:text-gray-400">Expires</label>
                  <p className="mt-1 text-gray-900 dark:text-white">
                    {viewingJob.expiresAt 
                      ? format(new Date(viewingJob.expiresAt), 'PPP')
                      : 'No expiration'
                    }
                  </p>
                </div>
              </div>
              
              {viewingJob.deletedAt && (
                <div className="bg-red-50 dark:bg-red-900/50 text-red-700 dark:text-red-300 p-4 rounded-lg">
                  <p className="font-medium">This job was deleted on {format(new Date(viewingJob.deletedAt), 'PPP')}</p>
                </div>
              )}
              
              <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                {viewingJob.deletedAt ? (
                  <button
                    onClick={() => {
                      handleRestoreJob(viewingJob.id);
                      setViewingJob(null);
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Restore Job
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        handleFeatureJob(viewingJob.id, !viewingJob.isFeatured);
                        setViewingJob(null);
                      }}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                    >
                      {viewingJob.isFeatured ? 'Unfeature' : 'Feature'}
                    </button>
                    <button
                      onClick={() => {
                        handleDeleteJob(viewingJob.id);
                        setViewingJob(null);
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                    >
                      Delete Job
                    </button>
                  </>
                )}
                <button
                  onClick={() => setViewingJob(null)}
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
