import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Play, Check, Clock, AlertTriangle, RotateCcw, Calendar } from 'lucide-react';
import { fetchWithCache, invalidateCache, CACHE_KEYS } from '../utils/cache';
import Spinner from '../components/Spinner';
import { useSocket } from '../context/SocketContext';
import API_URL from '../utils/api';

export default function AssistantDashboard() {
  const [tasks, setTasks] = useState([]);
  const [activeTask, setActiveTask] = useState(null);
  const [resultsData, setResultsData] = useState([]);
  const [testingPeriod, setTestingPeriod] = useState({ startDate: '', endDate: '' });
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(() => !sessionStorage.getItem(CACHE_KEYS.MY_TASKS));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [errorModalData, setErrorModalData] = useState(null); // string for error message

  const formatJobCode = (code) => {
    if (!code) return '';
    return code.replace(/-N[12](?=-|$)/g, '-N');
  };

  const fetchTasks = async () => {
    try {
      await fetchWithCache(
        `${API_URL}/api/tests/instances`,
        CACHE_KEYS.MY_TASKS,
        setTasks
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTasks(); }, []);

  const socket = useSocket();

  useEffect(() => {
    if (!socket) return;
    const updateTasks = () => { invalidateCache(CACHE_KEYS.MY_TASKS); fetchTasks(); };

    socket.on('JOB_DISTRIBUTED', updateTasks);
    socket.on('TEST_REVIEWED', updateTasks);

    return () => {
      socket.off('JOB_DISTRIBUTED', updateTasks);
      socket.off('TEST_REVIEWED', updateTasks);
    };
  }, [socket]);

  const formatDateTimeLocal = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const openTask = (task) => {
    setActiveTask(task);
    // Initialize with existing saved values, or empty strings if not yet started
    setResultsData(task.results.map(r => ({ 
      ...r, 
      value: r.value || '',
      isSaved: r.isSaved || false,
      testMethod: r.testMethod || ''
    })));
    // Restore testingPeriod if already set, else auto-fill with current local time
    setTestingPeriod({
      startDate: task.testingPeriod?.startDate ? formatDateTimeLocal(task.testingPeriod.startDate) : formatDateTimeLocal(new Date()),
      endDate: task.testingPeriod?.endDate ? formatDateTimeLocal(task.testingPeriod.endDate) : formatDateTimeLocal(new Date())
    });
  };

  const closeTask = () => {
    setActiveTask(null);
    setResultsData([]);
    setTestingPeriod({ startDate: '', endDate: '' });
  };

  const handleResultChange = (index, field, val) => {
    const updated = [...resultsData];
    updated[index][field] = val;
    // If they change the value, we mark it as unsaved
    if (field === 'value') {
      updated[index].isSaved = false;
    }
    setResultsData(updated);
  };

  const handleIndividualSave = async (index) => {
    if (isSubmitting) return;
    
    // Skip save for approved parameters
    const hasRetestOnly = activeTask?.retestOnly && activeTask.retestOnly.length > 0;
    if (hasRetestOnly && !activeTask.retestOnly.includes(resultsData[index].parameterId)) return;

    const val = resultsData[index].value;
    const testMethod = resultsData[index].testMethod;

    // Validate that BOTH value and test method are filled
    if (!val || val.trim() === '' || !testMethod || testMethod.trim() === '') {
      setErrorModalData(`Please enter both a value and a test method for "${resultsData[index].name}"`);
      return;
    }
    
    const numericVal = parseFloat(val);
    if (!isNaN(numericVal) && numericVal < 0) {
      setErrorModalData(`Value for "${resultsData[index].name}" cannot be negative`);
      return;
    }

    setIsSubmitting(true);
    const updated = [...resultsData];
    updated[index].isSaved = true;
    setResultsData(updated);

    try {
      await axios.put(`${API_URL}/api/tests/instances/${activeTask._id}/save-progress`, {
        results: updated
      });
      setSuccess(`Parameter "${updated[index].name}" saved!`);
      invalidateCache(CACHE_KEYS.MY_TASKS);
      fetchTasks();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error(err);
      updated[index].isSaved = false;
      setResultsData(updated);
      setErrorModalData(err.response?.data?.message || 'Error saving parameter');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveProgress = async () => {
    const hasRetestOnly = activeTask?.retestOnly && activeTask.retestOnly.length > 0;
    // Only validate retestable params
    const editableParams = hasRetestOnly 
      ? resultsData.filter(r => activeTask.retestOnly.includes(r.parameterId))
      : resultsData;

    // Find partially filled params (one field filled but not the other) or negative values
    const partiallyFilled = editableParams.filter(r => {
      const hasVal = r.value && r.value.trim() !== '';
      const hasMethod = r.testMethod && r.testMethod.trim() !== '';
      return hasVal !== hasMethod; // one filled, the other empty
    });

    const negativeParams = editableParams.filter(r => {
      const num = parseFloat(r.value);
      return !isNaN(num) && num < 0;
    });

    if (partiallyFilled.length > 0 || negativeParams.length > 0) {
      const issues = [];
      if (partiallyFilled.length > 0) {
        issues.push(`Partially filled (need both value & test method): ${partiallyFilled.map(p => p.name).join(', ')}`);
      }
      if (negativeParams.length > 0) {
        issues.push(`Negative values: ${negativeParams.map(p => p.name).join(', ')}`);
      }
      setErrorModalData(`Some parameters have issues and won't be saved:\n\n${issues.join('\n')}\n\nAll other valid parameters will be saved.`);
    }

    if (isSubmitting) return;
    setIsSubmitting(true);
    
    // Mark only fully valid fields (both value + method filled, non-negative) as saved
    const updatedResults = resultsData.map(r => {
      const hasVal = r.value && r.value.trim() !== '';
      const hasMethod = r.testMethod && r.testMethod.trim() !== '';
      const num = parseFloat(r.value);
      const isNeg = !isNaN(num) && num < 0;
      if (hasVal && hasMethod && !isNeg) {
        return { ...r, isSaved: true };
      }
      return r;
    });
    setResultsData(updatedResults);

    try {
      await axios.put(`${API_URL}/api/tests/instances/${activeTask._id}/save-progress`, {
        results: updatedResults,
        testingPeriod: {
          startDate: testingPeriod.startDate || null,
          endDate: testingPeriod.endDate || null
        }
      });
      setSuccess(`Progress for ${formatJobCode(activeTask.testCode)} saved! You can continue later.`);
      invalidateCache(CACHE_KEYS.MY_TASKS);
      fetchTasks();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      console.error(err);
      setErrorModalData(err.response?.data?.message || 'Error saving draft');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePreSubmit = (e) => {
    e.preventDefault();
    
    const hasRetestOnly = activeTask?.retestOnly && activeTask.retestOnly.length > 0;
    const editableParams = hasRetestOnly 
      ? resultsData.filter(r => activeTask.retestOnly.includes(r.parameterId))
      : resultsData;

    // 1. Check if all editable fields are saved
    const unsavedParams = editableParams.filter(r => !r.isSaved);
    if (unsavedParams.length > 0) {
      setErrorModalData(`Please save all parameters before submitting. \n\nUnsaved fields: ${unsavedParams.map(p => p.name).join(', ')}`);
      return;
    }

    // 2. Double check values
    const invalidParams = editableParams.filter(r => {
      const val = r.value;
      const testMethod = r.testMethod;
      if (!val || val.trim() === '' || !testMethod || testMethod.trim() === '') return true;
      const num = parseFloat(val);
      return !isNaN(num) && num < 0;
    });

    if (invalidParams.length > 0) {
      setErrorModalData(`Some parameters have invalid or empty values. \n\nInvalid fields: ${invalidParams.map(p => p.name).join(', ')}`);
      return;
    }

    if (!testingPeriod.startDate || !testingPeriod.endDate) {
      setErrorModalData("Please provide both start and end dates for the testing period.");
      return;
    }

    setShowConfirmModal(true);
  };

  const executeSubmit = async () => {
    setShowConfirmModal(false);
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      await axios.put(`${API_URL}/api/tests/instances/${activeTask._id}/results`, {
        results: resultsData,
        testingPeriod: {
          startDate: testingPeriod.startDate || null,
          endDate: testingPeriod.endDate || null
        }
      });
      setSuccess(`Task ${formatJobCode(activeTask.testCode)} submitted for review!`);
      invalidateCache(CACHE_KEYS.MY_TASKS);
      closeTask();
      fetchTasks();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      console.error(err);
      setErrorModalData(err.response?.data?.message || 'An error occurred while submitting the task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isReassigned = (task) =>
    task.reviewHistory && task.reviewHistory.some(rh => rh.action === 'REASSIGN');

  const getLatestNote = (task) => {
    if (!task.reviewHistory) return null;
    const reassigns = task.reviewHistory.filter(rh => rh.action === 'REASSIGN');
    return reassigns.length > 0 ? reassigns[reassigns.length - 1] : null;
  };

  const inputStyle = {
    padding: '0.5rem 0.75rem',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.9rem',
    width: '100%',
    backgroundColor: 'var(--color-surface)',
    color: 'var(--color-text-main)'
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <Clock size={28} style={{ color: 'var(--color-primary)' }} /> Task Queue
      </h1>

      {success && (
        <div style={{ 
          position: 'fixed', top: '6rem', right: '2rem', zIndex: 1000,
          color: 'white', backgroundColor: 'var(--color-success)', 
          padding: '1rem 1.5rem', borderRadius: 'var(--radius-md)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
          animation: 'slideIn 0.3s ease-out'
        }}>
          <Check size={20} />
          <span style={{ fontWeight: 500 }}>{success}</span>
        </div>
      )}

      {activeTask ? (
        <div className="card" style={{ marginBottom: '2rem', borderTop: `4px solid ${isReassigned(activeTask) ? 'var(--color-danger)' : 'var(--color-primary)'}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--color-border)', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <h2 style={{ margin: 0 }}>Test {formatJobCode(activeTask.testCode)}</h2>
              <p style={{ color: 'var(--color-text-muted)', margin: '0.2rem 0 0 0', fontSize: '0.9rem' }}>Client: {activeTask.clientName}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span className="badge badge-warning" style={{ fontSize: '0.9rem' }}>
                Target: {new Date(activeTask.deadline).toLocaleString()}
              </span>
            </div>
          </div>

          {(() => {
            const latestNote = getLatestNote(activeTask);
            if (!latestNote) return null;
            return (
              <div style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem', backgroundColor: 'rgba(231, 76, 60, 0.08)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-md)', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <AlertTriangle size={20} style={{ color: 'var(--color-danger)', marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--color-danger)', fontSize: '0.9rem', marginBottom: '0.3rem' }}>
                    Reassigned by {latestNote.role} — Please correct and resubmit
                  </div>
                  {latestNote.note && (
                    <div style={{ fontSize: '0.85rem', color: 'var(--color-text-main)' }}>"{latestNote.note}"</div>
                  )}
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.3rem' }}>
                    {new Date(latestNote.date).toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })()}

          <form onSubmit={handlePreSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ padding: '1.25rem', backgroundColor: 'var(--color-surface-hover)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Calendar size={16} style={{ color: 'var(--color-primary)' }} />
                <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>Testing Period</span>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)' }}>(dates will appear in the report)</span>
              </div>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, marginBottom: '0.4rem', color: 'var(--color-text-muted)' }}>
                    Start Date <span style={{ color: 'var(--color-danger)' }}>*</span>
                  </label>
                  <input type="datetime-local" value={testingPeriod.startDate} onChange={e => setTestingPeriod(p => ({ ...p, startDate: e.target.value }))} required style={inputStyle} />
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, marginBottom: '0.4rem', color: 'var(--color-text-muted)' }}>
                    End Date <span style={{ color: 'var(--color-danger)' }}>*</span>
                  </label>
                  <input type="datetime-local" value={testingPeriod.endDate} min={testingPeriod.startDate} onChange={e => setTestingPeriod(p => ({ ...p, endDate: e.target.value }))} required style={inputStyle} />
                </div>
              </div>
            </div>

            <div>
              <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>Test Parameters ({resultsData.length})</span>
                <span style={{ fontSize: '0.78rem', color: 'var(--color-text-muted)', fontWeight: 400 }}>Fill result value and test method for each parameter</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {resultsData.map((resItem, i) => {
                  const prevResult = activeTask.previousResults?.find(pr => pr.parameterId === resItem.parameterId);
                  const hasRetestOnly = activeTask.retestOnly && activeTask.retestOnly.length > 0;
                  const isRetestParam = !hasRetestOnly || activeTask.retestOnly.includes(resItem.parameterId);
                  const isApprovedParam = hasRetestOnly && !isRetestParam;

                  return (
                    <div key={resItem.parameterId} style={{ 
                      padding: '1rem 1.25rem', 
                      backgroundColor: isApprovedParam ? 'var(--color-surface)' : 'var(--color-surface-hover)', 
                      borderRadius: 'var(--radius-md)', 
                      border: '1px solid var(--color-border)', 
                      borderLeft: isApprovedParam ? '4px solid var(--color-success)' : (resItem.isSaved ? '4px solid var(--color-success)' : '4px solid var(--color-warning)'),
                      transition: 'all 0.2s ease',
                      opacity: isApprovedParam ? 0.7 : 1
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: isApprovedParam ? '0' : '0.75rem' }}>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--color-text-main)', fontSize: '0.95rem' }}>{i + 1}. {resItem.name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginTop: '0.15rem' }}>
                            Ref Range: {resItem.referenceRange || '—'} &nbsp;|&nbsp; Unit: {resItem.unit || '—'}
                          </div>
                          {prevResult?.value && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-warning)', marginTop: '0.25rem', fontStyle: 'italic' }}>
                              ⚠ Previous (rejected): {prevResult.value} {prevResult.unit}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
                          {isApprovedParam ? (
                            <span style={{ 
                              display: 'flex', alignItems: 'center', gap: '0.3rem',
                              padding: '0.3rem 0.7rem', borderRadius: 'var(--radius-sm)',
                              backgroundColor: 'rgba(46, 204, 113, 0.1)', color: 'var(--color-success)',
                              fontSize: '0.8rem', fontWeight: 600
                            }}>
                              <Check size={14}/> Approved
                            </span>
                          ) : (
                            <>
                              <button type="button" onClick={() => handleIndividualSave(i)} disabled={isSubmitting} className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', backgroundColor: resItem.isSaved ? 'var(--color-success)' : 'var(--color-primary)', color: 'white', height: 'fit-content' }}>
                                {resItem.isSaved ? <span style={{ display: 'flex', alignItems: 'center', gap: '0.2rem' }}><Check size={14}/> Saved</span> : (isSubmitting ? 'Saving...' : 'Save Parameter')}
                              </button>
                              {!resItem.isSaved && (
                                <span style={{ fontSize: '0.7rem', color: 'var(--color-warning)', fontWeight: 500 }}>Unsaved changes</span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                      {!isApprovedParam && (
                        <>
                          {isApprovedParam ? (
                            <div className="grid-2" style={{ marginTop: '0.5rem' }}>
                              <div><span style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>Value:</span> <span style={{ fontWeight: 600 }}>{resItem.value || '—'}</span> {resItem.unit}</div>
                              <div><span style={{ fontSize: '0.78rem', fontWeight: 500, color: 'var(--color-text-muted)' }}>Method:</span> {resItem.testMethod || '—'}</div>
                            </div>
                          ) : (
                            <div className="grid-2">
                              <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 500, marginBottom: '0.3rem', color: 'var(--color-text-muted)' }}>
                                  Observed Result <span style={{ color: 'var(--color-danger)' }}>*</span>
                                </label>
                                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                  <input 
                                    type="text" 
                                    value={resItem.value} 
                                    onChange={e => handleResultChange(i, 'value', e.target.value)} 
                                    placeholder="Enter value…" 
                                    style={{
                                      ...inputStyle,
                                      borderColor: (resItem.value && !isNaN(parseFloat(resItem.value)) && parseFloat(resItem.value) < 0) ? 'var(--color-danger)' : 'var(--color-border)',
                                      outlineColor: (resItem.value && !isNaN(parseFloat(resItem.value)) && parseFloat(resItem.value) < 0) ? 'var(--color-danger)' : 'var(--color-primary)'
                                    }} 
                                  />
                                  <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', minWidth: '36px' }}>{resItem.unit}</span>
                                </div>
                                {resItem.value && !isNaN(parseFloat(resItem.value)) && parseFloat(resItem.value) < 0 && (
                                  <div style={{ fontSize: '0.7rem', color: 'var(--color-danger)', marginTop: '0.2rem' }}>Value cannot be negative</div>
                                )}
                              </div>
                              <div>
                                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 500, marginBottom: '0.3rem', color: 'var(--color-text-muted)' }}>Test Method</label>
                                <input type="text" value={resItem.testMethod} onChange={e => handleResultChange(i, 'testMethod', e.target.value)} placeholder="Standard / method used…" style={inputStyle} />
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex-row-responsive" style={{ marginTop: '0.5rem' }}>
              <button type="submit" className="btn btn-success" disabled={isSubmitting} style={{ flex: 2, justifyContent: 'center' }}>
                <Check size={18} style={{ marginRight: '0.5rem' }} /> {isSubmitting ? 'Submitting...' : 'Submit for Review'}
              </button>
              <button type="button" className="btn btn-primary" onClick={handleSaveProgress} disabled={isSubmitting} style={{ flex: 1, justifyContent: 'center' }}>{isSubmitting ? 'Saving...' : 'Save Draft'}</button>
              <button type="button" className="btn" onClick={closeTask} style={{ flex: 1, justifyContent: 'center', backgroundColor: 'transparent', border: '1px solid var(--color-border)' }}>Cancel</button>
            </div>
          </form>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
          {loading ? (
            <div className="card" style={{ gridColumn: '1 / -1' }}><Spinner message="Loading your tasks..." /></div>
          ) : tasks.length === 0 ? (
            <div className="card" style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: 'var(--color-text-muted)' }}>No pending tasks in your queue.</div>
          ) : (
            tasks.map(task => (
              <div key={task._id} className="card glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: isReassigned(task) ? '4px solid var(--color-danger)' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  {isReassigned(task) ? <span className="badge" style={{ backgroundColor: 'rgba(231, 76, 60, 0.1)', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}><RotateCcw size={12} /> Reassigned</span> : <span className="badge badge-warning" style={{ backgroundColor: 'rgba(241, 196, 15, 0.1)', color: '#d35400' }}>Pending</span>}
                  <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{new Date(task.deadline).toLocaleDateString()}</span>
                </div>
                <div>
                  <h3 style={{ margin: '0 0 0.3rem 0', color: 'var(--color-primary-dark)' }}>Test {formatJobCode(task.testCode)}</h3>
                  <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Client: {task.clientName}</span>
                    <span>Params: {task.results.length}</span>
                  </div>
                </div>
                <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--color-border)' }}>
                  <button onClick={() => openTask(task)} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
                    <Play size={16} /> {isReassigned(task) ? 'Revise & Resubmit' : 'Run Analysis'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── CUSTOM CONFIRMATION MODAL ── */}
      {showConfirmModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, backdropFilter: 'blur(4px)'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '450px', padding: '2rem', animation: 'slideUp 0.3s ease', borderTop: '4px solid var(--color-primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', color: 'var(--color-primary)' }}>
              <Check size={32} />
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Submit Analysis</h2>
            </div>
            
            <p style={{ margin: '0 0 1.5rem 0', color: 'var(--color-text-main)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              Are you sure you want to submit the results for <strong>Test {formatJobCode(activeTask?.testCode)}</strong>?
            </p>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button 
                type="button"
                className="btn" 
                onClick={() => setShowConfirmModal(false)}
                style={{ border: '1px solid var(--color-primary)', color: 'var(--color-primary)', padding: '0.6rem 2rem', backgroundColor: 'transparent' }}
                disabled={isSubmitting}
              >
                Review Again
              </button>
              <button 
                type="button"
                className="btn btn-primary" 
                onClick={executeSubmit}
                style={{ padding: '0.6rem 2rem' }}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Spinner size="sm" message="Submitting..." color="#fff" /> : 'Confirm Submission'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CUSTOM ERROR MODAL ── */}
      {errorModalData && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, backdropFilter: 'blur(4px)'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '450px', padding: '2rem', animation: 'slideUp 0.3s ease', borderTop: '4px solid var(--color-danger)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', color: 'var(--color-danger)' }}>
              <AlertTriangle size={32} />
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Validation Error</h2>
            </div>
            
            <p style={{ margin: '0 0 1.5rem 0', color: 'var(--color-text-main)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {errorModalData}
            </p>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button 
                type="button"
                className="btn" 
                onClick={() => setErrorModalData(null)}
                style={{ border: '1px solid var(--color-danger)', color: 'var(--color-danger)', padding: '0.6rem 2rem', backgroundColor: 'transparent' }}
              >
                Go Back & Fix
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
