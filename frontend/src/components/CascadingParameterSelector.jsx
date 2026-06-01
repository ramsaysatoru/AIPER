import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Spinner from './Spinner';
import { AlertCircle, Beaker, Search, X, Plus, Save } from 'lucide-react';
import axios from 'axios';
import API_URL from '../utils/api';

const CascadingParameterSelector = ({ 
  label = "Parameters", 
  onDataChange, 
  modeClass = "",
  allGroupData = null // Fix 2: Accept pre-fetched data from parent
}) => {
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [selectedSubGroups, setSelectedSubGroups] = useState([]);
  const [selectedProductCategory, setSelectedProductCategory] = useState('');
  
  // Officer's curated pick list
  const [selectedParams, setSelectedParams] = useState([]);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const searchRef = useRef(null);

  // Global parameters state
  const [globalParameters, setGlobalParameters] = useState([]);

  // Fetch global parameters on mount
  useEffect(() => {
    const fetchParams = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/api/parameters`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setGlobalParameters(res.data || []);
      } catch (err) {
        console.error('Failed to fetch global parameters', err);
      }
    };
    fetchParams();
  }, []);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ═══════ ALL LOCAL FILTERING — zero API calls on interaction ═══════
  const allData = allGroupData || [];

  const groups = useMemo(() => {
    const s = new Set(allData.map(d => d.group));
    return Array.from(s).sort();
  }, [allData]);

  const subGroups = useMemo(() => {
    if (selectedGroups.length === 0) return [];
    const filtered = allData.filter(d => selectedGroups.includes(d.group));
    const seen = new Set();
    return filtered.filter(d => {
      if (seen.has(d.subGroup)) return false;
      seen.add(d.subGroup);
      return true;
    });
  }, [allData, selectedGroups]);

  const matchedDocs = useMemo(() => {
    if (selectedGroups.length === 0 || selectedSubGroups.length === 0) return [];
    return allData.filter(d => 
      selectedGroups.includes(d.group) && selectedSubGroups.includes(d.subGroup)
    );
  }, [allData, selectedGroups, selectedSubGroups]);

  const isPesticidePanel = useMemo(() => matchedDocs.some(d => d.isPesticidePanel), [matchedDocs]);
  const pesticidePanelType = useMemo(() => {
    const panel = matchedDocs.find(d => d.isPesticidePanel);
    return panel ? panel.pesticidePanelType : null;
  }, [matchedDocs]);
  const pesticideSubPanels = useMemo(() => {
    const panel = matchedDocs.find(d => d.isPesticidePanel);
    return panel ? (panel.pesticideSubPanels || []) : [];
  }, [matchedDocs]);

  const productCategories = useMemo(() => {
    const cats = new Set();
    matchedDocs.forEach(d => (d.productCategories || []).forEach(c => cats.add(c)));
    return Array.from(cats).sort();
  }, [matchedDocs]);

  const availableParameters = useMemo(() => {
    // Return all global parameters instead of restricting by matchedDocs
    return globalParameters;
  }, [globalParameters]);

  const hasNonPanelSubGroups = useMemo(() => matchedDocs.some(d => !d.isPesticidePanel), [matchedDocs]);

  // ═══════ NOTIFY PARENT ═══════
  // Fix 1: onDataChange is NOT in the dependency array — breaks the infinite loop
  useEffect(() => {
    if (onDataChange) {
      onDataChange({
        parameters: selectedParams,
        groupMetadata: {
          group: selectedGroups.join(', '),
          subGroup: selectedSubGroups.join(', '),
          productCategory: selectedProductCategory
        },
        pesticidePanel: {
          enabled: isPesticidePanel,
          panelType: pesticidePanelType
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedParams, selectedGroups, selectedSubGroups, selectedProductCategory, isPesticidePanel, pesticidePanelType]);

  // ═══════ HANDLERS ═══════
  // Fix 3: Inline cleanup in handlers instead of cascading useEffects
  const handleGroupSelect = (e) => {
    const value = e.target.value;
    if (value && !selectedGroups.includes(value)) {
      setSelectedGroups(prev => [...prev, value]);
    }
  };

  const handleGroupRemove = (group) => {
    const newGroups = selectedGroups.filter(g => g !== group);
    setSelectedGroups(newGroups);
    // Immediately prune subgroups that no longer belong to any selected group
    const validSubGroupNames = allData
      .filter(d => newGroups.includes(d.group))
      .map(d => d.subGroup);
    setSelectedSubGroups(prev => prev.filter(sg => validSubGroupNames.includes(sg)));
  };

  const handleSubGroupSelect = (e) => {
    const value = e.target.value;
    if (value && !selectedSubGroups.includes(value)) {
      setSelectedSubGroups(prev => [...prev, value]);
    }
  };

  const handleSubGroupRemove = (subGroup) => {
    setSelectedSubGroups(prev => prev.filter(sg => sg !== subGroup));
    // Reset product category if it's no longer valid after subgroup removal
  };

  const filteredSuggestions = availableParameters.filter(p => {
    if (selectedParams.some(sp => sp._id === p._id)) return false;
    if (!searchTerm.trim()) return true;
    return p.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Reset active index when search term changes
  useEffect(() => {
    setActiveIndex(0);
  }, [searchTerm]);

  const handleSearchKeyDown = (e) => {
    if (!showSuggestions || filteredSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev < filteredSuggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      const paramToAdd = filteredSuggestions[activeIndex];
      if (paramToAdd) {
        addParameter(paramToAdd);
        setSearchTerm('');
        setShowSuggestions(false);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSearchTerm('');
    }
  };

  const addParameter = (param) => {
    if (!selectedParams.some(sp => sp._id === param._id)) {
      setSelectedParams(prev => [...prev, param]);
    }
    setSearchTerm('');
    setShowSuggestions(false);
  };

  const removeParameter = (paramId) => setSelectedParams(prev => prev.filter(p => p._id !== paramId));

  const addAllAvailable = () => {
    const newParams = availableParameters.filter(p => !selectedParams.some(sp => sp._id === p._id));
    setSelectedParams(prev => [...prev, ...newParams]);
  };

  const handleUnitChange = (paramId, newUnit) => {
    setSelectedParams(prev => prev.map(p => 
      p._id === paramId ? { ...p, unit: newUnit } : p
    ));
  };

  const handleSaveUnit = async (paramId, unit) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`${API_URL}/api/parameters/${paramId}`, { unit }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('Unit saved to database for future use.');
    } catch (err) {
      console.error('Error saving unit', err);
      alert('Failed to save unit to database.');
    }
  };

  // ═══════ RENDER ═══════
  if (!allGroupData) {
    return (
      <div className={`cascading-selector ${modeClass}`} style={{ 
        padding: '2rem', textAlign: 'center',
        backgroundColor: 'var(--color-surface)', borderRadius: 'var(--radius-md)', 
        border: '1px solid var(--color-border)' 
      }}>
        <Spinner message="Loading parameter data..." />
      </div>
    );
  }

  return (
    <div className={`cascading-selector ${modeClass}`} style={{ 
      display: 'flex', flexDirection: 'column', gap: '1rem', 
      padding: '1.25rem', backgroundColor: 'var(--color-surface)', 
      borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' 
    }}>
      <h3 style={{ margin: 0, fontSize: '1.1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
        {label}
      </h3>
      
      <div className="flex-row-responsive">
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>Select Group(s)</label>
          <select 
            onChange={handleGroupSelect} 
            value=""
            style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
          >
            <option value="">-- Add Group --</option>
            {groups.filter(g => !selectedGroups.includes(g)).map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {selectedGroups.map(g => (
              <div key={g} className="badge badge-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.6rem' }}>
                {g}
                <button 
                  type="button" 
                  onClick={() => handleGroupRemove(g)} 
                  style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, display: 'flex' }}
                >
                  <AlertCircle size={18} style={{ transform: 'rotate(45deg)' }} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>Select Sub-Group(s)</label>
          <select 
            onChange={handleSubGroupSelect} 
            value=""
            disabled={selectedGroups.length === 0}
            style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
          >
            <option value="">-- Add Sub-Group --</option>
            {subGroups.filter(sg => !selectedSubGroups.includes(sg.subGroup)).map(sg => (
              <option key={sg.subGroup} value={sg.subGroup}>
                {sg.subGroup}
              </option>
            ))}
          </select>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {selectedSubGroups.map(sg => (
              <div key={sg} className="badge badge-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0.6rem' }}>
                {sg}
                <button 
                  type="button" 
                  onClick={() => handleSubGroupRemove(sg)} 
                  style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, display: 'flex' }}
                >
                  <AlertCircle size={18} style={{ transform: 'rotate(45deg)' }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-row-responsive">
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>Product Category (Aggregate)</label>
          <select 
            value={selectedProductCategory} 
            onChange={e => setSelectedProductCategory(e.target.value)}
            disabled={productCategories.length === 0}
            style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
          >
            <option value="">{productCategories.length === 0 ? '-- No Categories Available --' : '-- Select Category --'}</option>
            {productCategories.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {isPesticidePanel && (
        <div style={{ 
          backgroundColor: '#e8f4fd', color: '#1a5276', 
          padding: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'flex-start', gap: '1rem',
          border: '1px solid #aed6f1'
        }}>
          <Beaker size={24} style={{ flexShrink: 0 }} />
          <div>
            <h5 style={{ margin: '0 0 0.25rem 0', fontSize: '1rem' }}>Pesticide Panel Selected (Food)</h5>
            <p style={{ margin: 0, fontSize: '0.85rem' }}>
              This will automatically create separate assignments for:
              <ul style={{ margin: '0.5rem 0 0 0', paddingLeft: '1.5rem' }}>
                {pesticideSubPanels.map(sp => (
                  <li key={sp.panelName}>{sp.panelName} ({sp.parameterCount} parameters)</li>
                ))}
              </ul>
            </p>
          </div>
        </div>
      )}

      {hasNonPanelSubGroups && selectedSubGroups.length > 0 && (
        <div style={{ marginTop: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem' }}>
              Test Parameters 
              <span style={{ fontWeight: 400, fontSize: '0.8rem', color: 'var(--color-text-muted)', marginLeft: '0.5rem' }}>
                ({selectedParams.length} selected, {availableParameters.length} available)
              </span>
            </h4>
            {availableParameters.length > 0 && (
              <button
                type="button"
                onClick={addAllAvailable}
                title="Add all filtered parameters currently in view"
                style={{ 
                  fontSize: '0.8rem', padding: '0.3rem 0.6rem', 
                  backgroundColor: 'var(--color-primary)', color: '#fff',
                  border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '0.3rem'
                }}
              >
                <Plus size={14} /> Add All
              </button>
            )}
          </div>
          
          <div ref={searchRef} style={{ position: 'relative', marginBottom: '0.75rem' }}>
            <div style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
              padding: '0.5rem 0.75rem', backgroundColor: 'var(--color-surface)'
            }}>
              <Search size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
              <input
                type="text"
                placeholder={`Search from ${availableParameters.length} parameters...`}
                title="Use Arrow keys to navigate, Tab/Enter to select"
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onKeyDown={handleSearchKeyDown}
                style={{ 
                  border: 'none', outline: 'none', width: '100%', 
                  backgroundColor: 'transparent', fontSize: '0.9rem' 
                }}
              />
              {searchTerm && (
                <button 
                  type="button" 
                  onClick={() => { setSearchTerm(''); setShowSuggestions(false); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem', display: 'flex', color: 'var(--color-text-muted)' }}
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {showSuggestions && filteredSuggestions.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                maxHeight: '200px', overflowY: 'auto',
                backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderTop: 'none', borderRadius: '0 0 var(--radius-sm) var(--radius-sm)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                {filteredSuggestions.map((p, index) => (
                  <div
                    key={p._id}
                    onClick={() => addParameter(p)}
                    onMouseEnter={() => setActiveIndex(index)}
                    style={{
                      padding: '0.5rem 0.75rem', cursor: 'pointer', fontSize: '0.85rem',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      borderBottom: '1px solid var(--color-border)',
                      backgroundColor: activeIndex === index ? 'var(--color-surface-hover)' : 'transparent',
                      borderLeft: activeIndex === index ? '3px solid var(--color-primary)' : '3px solid transparent',
                      transition: 'background-color 0.1s'
                    }}
                  >
                    <span>{p.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className={`badge ${p.type === 'Micro' ? 'badge-primary' : 'badge-secondary'}`} style={{ fontSize: '0.65rem' }}>
                        {p.type}
                      </span>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>{p.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {showSuggestions && searchTerm && filteredSuggestions.length === 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                padding: '0.75rem', textAlign: 'center',
                backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderTop: 'none', borderRadius: '0 0 var(--radius-sm) var(--radius-sm)',
                color: 'var(--color-text-muted)', fontSize: '0.85rem', fontStyle: 'italic'
              }}>
                No matching parameters found
              </div>
            )}
          </div>

          {/* Selected parameters list */}
          {selectedParams.length > 0 && (
            <div style={{ 
              maxHeight: '250px', overflowY: 'auto', overflowX: 'auto',
              border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', 
              backgroundColor: 'var(--color-surface)' 
            }}>
              <table style={{ width: '100%', minWidth: '400px', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead style={{ backgroundColor: 'var(--color-surface-hover)', position: 'sticky', top: 0 }}>
                  <tr>
                    <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid var(--color-border)' }}>Parameter Name</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid var(--color-border)', width: '80px' }}>Type</th>
                    <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid var(--color-border)', width: '140px' }}>Unit</th>
                    <th style={{ padding: '0.5rem', textAlign: 'center', borderBottom: '1px solid var(--color-border)', width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {selectedParams.map((p) => (
                    <tr key={p._id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                      <td style={{ padding: '0.4rem 0.5rem' }}>{p.name}</td>
                      <td style={{ padding: '0.4rem 0.5rem' }}>
                        <span className={`badge ${p.type === 'Micro' ? 'badge-primary' : 'badge-secondary'}`} style={{ fontSize: '0.7rem' }}>
                          {p.type}
                        </span>
                      </td>
                      <td style={{ padding: '0.4rem 0.5rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <input
                            type="text"
                            value={p.unit}
                            onChange={(e) => handleUnitChange(p._id, e.target.value)}
                            style={{ 
                              width: '80px', padding: '0.25rem', fontSize: '0.8rem',
                              border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)'
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveUnit(p._id, p.unit)}
                            style={{ 
                              background: 'none', border: 'none', cursor: 'pointer', 
                              color: 'var(--color-primary)', padding: '0.35rem', display: 'flex' 
                            }}
                            title="Save as default for this parameter"
                          >
                            <Save size={18} />
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: '0.4rem 0.5rem', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => removeParameter(p._id)}
                          style={{ 
                            background: 'none', border: 'none', cursor: 'pointer', 
                            color: 'var(--color-danger)', padding: '0.35rem', display: 'flex' 
                          }}
                          title="Remove parameter"
                        >
                          <X size={20} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          
          {selectedParams.length === 0 && (
            <div style={{ 
              color: 'var(--color-text-muted)', fontSize: '0.9rem', fontStyle: 'italic', 
              padding: '1rem', textAlign: 'center', 
              backgroundColor: 'var(--color-surface-hover)', borderRadius: 'var(--radius-md)' 
            }}>
              Type above to search and add parameters from the selected sub-group(s).
            </div>
          )}
        </div>
      )}

      {/* No subgroups selected state */}
      {!hasNonPanelSubGroups && !isPesticidePanel && selectedSubGroups.length === 0 && selectedGroups.length > 0 && (
        <div style={{ 
          color: 'var(--color-text-muted)', fontSize: '0.9rem', fontStyle: 'italic', 
          padding: '1rem', textAlign: 'center', 
          backgroundColor: 'var(--color-surface-hover)', borderRadius: 'var(--radius-md)' 
        }}>
          Select a sub-group to start adding parameters.
        </div>
      )}
    </div>
  );
};

export default CascadingParameterSelector;
