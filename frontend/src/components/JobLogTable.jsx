import React, { useState } from 'react';
import { Search, ChevronDown, ChevronRight, Filter, Clock, Trash2, Edit, FileText } from 'lucide-react';
import JobTimeline from './JobTimeline';
import GlobalJobHistory from './GlobalJobHistory';
import ReportModal from './ReportModal';

export default function JobLogTable({ jobs, title = "Job Logs", onReopen, onDeleteJob, onEditJob, defaultExpandedId }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [expandedJobId, setExpandedJobId] = useState(defaultExpandedId || null);

  React.useEffect(() => {
    if (defaultExpandedId) {
      setExpandedJobId(defaultExpandedId);
      setTimeout(() => {
        const row = document.getElementById(`job-row-${defaultExpandedId}`);
        if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    }
  }, [defaultExpandedId]);

  // Helper to determine a simple global status for a job
  const getJobStatus = (job) => {
    let statuses = [];
    if (job.distribution?.micro?.required) statuses.push(job.distribution.micro.status);
    if (job.distribution?.chemical?.required) statuses.push(job.distribution.chemical.status);

    if (statuses.length === 0) return 'PENDING';
    if (statuses.some(s => s === 'RETURNED')) return 'RETURNED';
    if (statuses.every(s => s === 'COMPLETED')) return 'COMPLETED';
    if (statuses.every(s => s === 'PENDING')) return 'PENDING';
    // Any mix (e.g. one COMPLETED + one PENDING, or any ASSIGNED_TO_ASSISTANT) = in progress
    return 'IN_PROGRESS';
  };

  // Group jobs: only show ROOT jobs in the main table. Child jobs will be fetched/passed inside JobTimeline.
  const rootJobs = jobs.filter(j => !j.isRetest);

  const filteredJobs = rootJobs.filter(j => {
    const term = searchTerm.toLowerCase();
    const matchSearch = j.jobCode.toLowerCase().includes(term) || j.clientName.toLowerCase().includes(term);
    const jobStatus = getJobStatus(j);
    const matchStatus = statusFilter === 'ALL' || jobStatus === statusFilter;
    return matchSearch && matchStatus;
  });

  const toggleExpand = (id) => {
    setExpandedJobId(expandedJobId === id ? null : id);
  };

  const [historyJob, setHistoryJob] = useState(null);
  const [selectedReportJob, setSelectedReportJob] = useState(null);

  const StatusBadge = ({ status }) => {
    switch (status) {
      case 'COMPLETED': return <span className="badge badge-success">Completed</span>;
      case 'IN_PROGRESS': return <span className="badge badge-warning">In Progress</span>;
      case 'REOPENED': return <span className="badge badge-warning" style={{ backgroundColor: '#f59e0b' }}>Reopened</span>;
      case 'RETURNED': return <span className="badge" style={{ backgroundColor: '#EF4444', color: 'white' }}>Returned</span>;
      default: return <span className="badge" style={{ backgroundColor: 'var(--color-border)', color: 'var(--color-text-main)' }}>Pending</span>;
    }
  };

  const formatJobCode = (code) => {
    if (!code) return '';
    return code.replace(/-N[12]([a-z]?)(?:-v\d+)?$/g, '-N$1').replace(/-[12][a-z]?(?:-v\d+)?$/g, '');
  };

  const showActions = !!onDeleteJob || !!onEditJob || jobs.some(j => j.history && j.history.length > 0) || jobs.some(j => getJobStatus(j) === 'COMPLETED');

  return (
    <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'var(--color-surface)', flexWrap: 'wrap', gap: '1rem' }}>
        <h2 style={{ margin: 0, width: '100%' }}>{title}</h2>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <input
              type="text"
              placeholder="Search Client or Code..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '2.2rem', paddingRight: '1rem', paddingBottom: '0.4rem', paddingTop: '0.4rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}
            />
          </div>
          <div style={{ position: 'relative' }}>
            <Filter size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ paddingLeft: '2.2rem', appearance: 'auto', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', paddingBottom: '0.4rem', paddingTop: '0.4rem' }}
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RETURNED">Returned</option>
              <option value="COMPLETED">Completed</option>
            </select>
          </div>
        </div>
      </div>

      <div style={{ overflowX: 'auto', width: '100%' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
          <thead style={{ backgroundColor: 'var(--color-surface-hover)' }}>
          <tr>
            <th style={{ width: '50px' }}></th>
            <th>Job Code</th>
            <th>Client Name</th>
            <th>Date Created</th>
            <th>Overall Status</th>
            {showActions && <th style={{ textAlign: 'right' }}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {filteredJobs.length === 0 ? (
            <tr><td colSpan={showActions ? 6 : 5} style={{ textAlign: 'center', padding: '2rem' }}>No jobs match your filters.</td></tr>
          ) : (
            filteredJobs.map(job => (
              <React.Fragment key={job._id}>
                <tr id={`job-row-${job._id}`} style={{ cursor: 'pointer', borderBottom: expandedJobId === job._id ? 'none' : '1px solid var(--color-border)' }} onClick={() => toggleExpand(job._id)}>
                  <td style={{ textAlign: 'center' }}>
                    {expandedJobId === job._id ? <ChevronDown size={20} color="var(--color-primary)" /> : <ChevronRight size={20} color="var(--color-text-muted)" />}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{formatJobCode(job.jobCode)}</td>
                  <td style={{ fontWeight: 500 }}>{job.clientName}</td>
                  <td>{new Date(job.createdAt).toLocaleDateString('en-IN')}</td>
                  <td><StatusBadge status={getJobStatus(job)} /></td>
                  {showActions && (
                    <td style={{ textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                      {getJobStatus(job) === 'COMPLETED' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedReportJob(job); }}
                          style={{ padding: '0.3rem 0.6rem', fontSize: '0.8rem', background: 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 600, boxShadow: '0 2px 6px rgba(124, 58, 237, 0.2)', transition: 'transform 0.1s' }}
                          title="View & Download Report"
                          onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
                          onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
                        >
                          <FileText size={14} /> Report
                        </button>
                      )}
                      {job.history?.length > 0 && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setHistoryJob(job); }}
                          style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '0.2rem', display: 'flex', alignItems: 'center' }}
                          title="View Job History"
                        >
                          <Clock size={16} />
                        </button>
                      )}
                      {onEditJob && getJobStatus(job) !== 'COMPLETED' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onEditJob(job); }}
                          style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', padding: '0.2rem', display: 'flex', alignItems: 'center' }}
                          title="Edit Job"
                        >
                          <Edit size={16} />
                        </button>
                      )}
                      {onDeleteJob && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onDeleteJob(job._id); }}
                          style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', padding: '0.2rem', display: 'flex', alignItems: 'center' }}
                          title="Delete Job"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
                {expandedJobId === job._id && (
                  <tr>
                    <td colSpan={showActions ? 6 : 5} style={{ padding: '0', backgroundColor: 'var(--color-surface-hover)' }}>
                      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--color-border)' }}>
                        <JobTimeline job={job} allJobs={jobs} onReopen={onReopen} />
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))
          )}
        </tbody>
      </table>
      </div>
      {historyJob && (
        <GlobalJobHistory history={historyJob.history} onClose={() => setHistoryJob(null)} />
      )}
      {selectedReportJob && (
        <ReportModal job={selectedReportJob} onClose={() => setSelectedReportJob(null)} />
      )}
    </div>
  );
}
