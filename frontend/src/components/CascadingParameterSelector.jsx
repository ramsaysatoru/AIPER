import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import API_URL from '../utils/api';
import Spinner from './Spinner';
import { AlertCircle, Beaker, Search, X, Plus, Save } from 'lucide-react';

const CascadingParameterSelector = ({ 
  label = "Parameters", 
  onDataChange, 
  modeClass = "", // For styling specific to nabl/non-nabl cards
  initialData = null 
}) => {
  const [groups, setGroups] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  
  const [subGroups, setSubGroups] = useState([]);
  const [selectedSubGroups, setSelectedSubGroups] = useState([]);
  
  const [productCategories, setProductCategories] = useState([]);
  const [selectedProductCategory, setSelectedProductCategory] = useState('');
  
  // Available parameters from selected subgroups (suggestion pool)
  const [availableParameters, setAvailableParameters] = useState([]);
  // Officer's curated pick list
  const [selectedParams, setSelectedParams] = useState([]);
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef(null);
  
  const [isPesticidePanel, setIsPesticidePanel] = useState(false);
  const [pesticidePanelType, setPesticidePanelType] = useState(null);
  const [pesticideSubPanels, setPesticideSubPanels] = useState([]);

  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingSubGroups, setLoadingSubGroups] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  const [error, setError] = useState('');

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

  // Notify parent whenever significant data changes
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
  }, [selectedParams, selectedGroups, selectedSubGroups, selectedProductCategory, isPesticidePanel, pesticidePanelType, onDataChange]);

  // Fetch groups on mount
  useEffect(() => {
    const fetchGroups = async () => {
      setLoadingGroups(true);
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/api/parameter-groups/groups`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setGroups(res.data || []);
      } catch (err) {
        setError('Failed to fetch parameter groups');
        console.error(err);
      } finally {
        setLoadingGroups(false);
      }
    };
    fetchGroups();
  }, []);

  // Fetch subgroups when groups change
  useEffect(() => {
    if (selectedGroups.length === 0) {
      setSubGroups([]);
      setSelectedSubGroups([]);
      return;
    }
    
    const fetchSubGroups = async () => {
      setLoadingSubGroups(true);
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/api/parameter-groups/subgroups?groups=${encodeURIComponent(selectedGroups.join(','))}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        // Remove duplicates if any
        const uniqueSubGroups = Array.from(new Set(res.data.map(s => s.subGroup)))
          .map(name => res.data.find(s => s.subGroup === name));
          
        setSubGroups(uniqueSubGroups);
        
        // Retain selected subgroups if they still exist in the new list, otherwise clear
        setSelectedSubGroups(prev => prev.filter(sg => uniqueSubGroups.some(u => u.subGroup === sg)));
      } catch (err) {
        setError('Failed to fetch subgroups');
        console.error(err);
      } finally {
        setLoadingSubGroups(false);
      }
    };
    fetchSubGroups();
  }, [selectedGroups]);

  // Fetch details when subgroups change — populate availableParameters (suggestion pool)
  useEffect(() => {
    if (selectedGroups.length === 0 || selectedSubGroups.length === 0) {
      setAvailableParameters([]);
      setProductCategories([]);
      setSelectedProductCategory('');
      setIsPesticidePanel(false);
      setPesticideSubPanels([]);
      // Also remove any selected params that no longer have a valid subgroup
      // (Keep params that might have been manually typed — we don't clear the list automatically)
      return;
    }

    const fetchDetails = async () => {
      setLoadingDetails(true);
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/api/parameter-groups/details?groups=${encodeURIComponent(selectedGroups.join(','))}&subGroups=${encodeURIComponent(selectedSubGroups.join(','))}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        let allParams = [];
        let allCats = new Set();
        let isPanel = false;
        let panelType = null;
        let pSubPanels = [];
        
        res.data.forEach(detail => {
          (detail.productCategories || []).forEach(c => allCats.add(c));
          
          if (detail.isPesticidePanel) {
            isPanel = true;
            panelType = detail.pesticidePanelType;
            pSubPanels = detail.pesticideSubPanels || [];
          } else {
            (detail.parameters || []).forEach(p => {
              if (!allParams.some(ext => ext.name === p.name)) {
                allParams.push({
                  _id: p._id,
                  name: p.name,
                  type: p.type,
                  unit: p.unit
                });
              }
            });
          }
        });
        
        setProductCategories(Array.from(allCats).sort());
        setAvailableParameters(allParams);
        setIsPesticidePanel(isPanel);
        setPesticidePanelType(panelType);
        setPesticideSubPanels(pSubPanels);
        
        // Reset product category if it's no longer in the list
        if (selectedProductCategory && !allCats.has(selectedProductCategory)) {
          setSelectedProductCategory('');
        }
      } catch (err) {
        setError('Failed to fetch parameter details');
        console.error(err);
      } finally {
        setLoadingDetails(false);
      }
    };
    fetchDetails();
  }, [selectedSubGroups, selectedGroups]);

  const handleGroupSelect = (e) => {
    const value = e.target.value;
    if (value && !selectedGroups.includes(value)) {
      setSelectedGroups([...selectedGroups, value]);
    }
  };

  const handleGroupRemove = (group) => {
    setSelectedGroups(selectedGroups.filter(g => g !== group));
  };

  const handleSubGroupSelect = (e) => {
    const value = e.target.value;
    if (value && !selectedSubGroups.includes(value)) {
      setSelectedSubGroups([...selectedSubGroups, value]);
    }
  };

  const handleSubGroupRemove = (subGroup) => {
    setSelectedSubGroups(selectedSubGroups.filter(sg => sg !== subGroup));
  };

  // --- Parameter search and selection ---
  const filteredSuggestions = availableParameters.filter(p => {
    // Don't show already-selected params
    if (selectedParams.some(sp => sp._id === p._id)) return false;
    // Filter by search term
    if (!searchTerm.trim()) return true;
    return p.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const addParameter = (param) => {
    if (!selectedParams.some(sp => sp._id === param._id)) {
      setSelectedParams(prev => [...prev, param]);
    }
    setSearchTerm('');
    setShowSuggestions(false);
  };

  const removeParameter = (paramId) => {
    setSelectedParams(prev => prev.filter(p => p._id !== paramId));
  };

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

  return (
    <div className={`cascading-selector ${modeClass}`} style={{ 
      display: 'flex', flexDirection: 'column', gap: '1rem', 
      padding: '1.25rem', backgroundColor: 'var(--color-surface)', 
      borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' 
    }}>
      <h3 style={{ margin: 0, fontSize: '1.1rem', borderBottom: '1px solid var(--color-border)', paddingBottom: '0.5rem' }}>
        {label}
      </h3>
      
      {error && <div style={{ color: 'var(--color-danger)', fontSize: '0.9rem' }}>{error}</div>}
      
      <div className="flex-row-responsive">
        {/* GROUPS */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>Select Group(s)</label>
          <select 
            onChange={handleGroupSelect} 
            value=""
            disabled={loadingGroups}
            style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
          >
            <option value="">{loadingGroups ? 'Loading...' : '-- Add Group --'}</option>
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
                  <AlertCircle size={14} style={{ transform: 'rotate(45deg)' }} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* SUBGROUPS */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.9rem', fontWeight: 500 }}>Select Sub-Group(s)</label>
          <select 
            onChange={handleSubGroupSelect} 
            value=""
            disabled={loadingSubGroups || selectedGroups.length === 0}
            style={{ padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-border)' }}
          >
            <option value="">{loadingSubGroups ? 'Loading...' : '-- Add Sub-Group --'}</option>
            {subGroups.filter(sg => !selectedSubGroups.includes(sg.subGroup)).map(sg => (
              <option key={sg.subGroup} value={sg.subGroup}>
                {sg.subGroup} {sg.isPesticidePanel ? '(Panel)' : ''}
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
                  <AlertCircle size={14} style={{ transform: 'rotate(45deg)' }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-row-responsive">
        {/* PRODUCT CATEGORY */}
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

      {/* PESTICIDE PANEL BANNER */}
      {isPesticidePanel && (
        <div style={{ 
          backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)', 
          padding: '1rem', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'flex-start', gap: '1rem' 
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

      {/* PARAMETER SEARCH & SELECTION */}
      {!isPesticidePanel && selectedSubGroups.length > 0 && (
        <div style={{ marginTop: '0.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
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
          
          {/* Search box */}
          <div ref={searchRef} style={{ position: 'relative', marginBottom: '0.75rem' }}>
            <div style={{ 
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
              padding: '0.5rem 0.75rem', backgroundColor: 'var(--color-surface)'
            }}>
              <Search size={16} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
              <input
                type="text"
                placeholder={loadingDetails ? 'Loading parameters...' : `Search from ${availableParameters.length} parameters...`}
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                disabled={loadingDetails}
                style={{ 
                  border: 'none', outline: 'none', width: '100%', 
                  backgroundColor: 'transparent', fontSize: '0.9rem' 
                }}
              />
              {searchTerm && (
                <button 
                  type="button" 
                  onClick={() => { setSearchTerm(''); setShowSuggestions(false); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: 'var(--color-text-muted)' }}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Suggestions dropdown */}
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                maxHeight: '200px', overflowY: 'auto',
                backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)',
                borderTop: 'none', borderRadius: '0 0 var(--radius-sm) var(--radius-sm)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                {filteredSuggestions.map(p => (
                  <div
                    key={p._id}
                    onClick={() => addParameter(p)}
                    style={{
                      padding: '0.5rem 0.75rem', cursor: 'pointer', fontSize: '0.85rem',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      borderBottom: '1px solid var(--color-border)',
                      transition: 'background-color 0.1s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--color-surface-hover)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
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
                    <th style={{ padding: '0.5rem', textAlign: 'left', borderBottom: '1px solid var(--color-border)', width: '120px' }}>Unit</th>
                    <th style={{ padding: '0.5rem', textAlign: 'center', borderBottom: '1px solid var(--color-border)', width: '40px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {selectedParams.map((p, i) => (
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
                              color: 'var(--color-primary)', padding: '0.25rem', display: 'flex' 
                            }}
                            title="Save as default for this parameter"
                          >
                            <Save size={14} />
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: '0.4rem 0.5rem', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => removeParameter(p._id)}
                          style={{ 
                            background: 'none', border: 'none', cursor: 'pointer', 
                            color: 'var(--color-danger)', padding: 0, display: 'flex' 
                          }}
                          title="Remove parameter"
                        >
                          <X size={16} />
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
      {!isPesticidePanel && selectedSubGroups.length === 0 && selectedGroups.length > 0 && (
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
