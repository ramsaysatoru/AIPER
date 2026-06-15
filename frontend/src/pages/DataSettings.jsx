import React, { useState, useEffect, useContext } from "react";
import axios from "axios";
import API_URL from "../utils/api";
import { AuthContext } from "../context/AuthContext";
import {
  Database,
  Plus,
  Edit,
  Trash2,
  X,
  Check,
  Search,
  AlertCircle,
  Activity,
  Save,
} from "lucide-react";
import Spinner from "../components/Spinner";
import { fetchWithCache, invalidateCache, CACHE_KEYS } from "../utils/cache";

export default function DataSettings() {
  const { user } = useContext(AuthContext);
  const [data, setData] = useState([]);
  const [globalParameters, setGlobalParameters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paramsLoading, setParamsLoading] = useState(true);
  const [error, setError] = useState("");
  const [recentUlrs, setRecentUlrs] = useState([]);

  // ULR State
  const [ulrPreview, setUlrPreview] = useState("");
  const [nextUlrPreview, setNextUlrPreview] = useState("");
  const [ulrOffset, setUlrOffset] = useState("");
  const [isUpdatingOffset, setIsUpdatingOffset] = useState(false);
  const [confirmUlrModal, setConfirmUlrModal] = useState(false);

  // Sample Serial State
  const [serialPreview, setSerialPreview] = useState("");
  const [nextSerialPreview, setNextSerialPreview] = useState("");
  const [serialOffset, setSerialOffset] = useState("");
  const [isUpdatingSerialOffset, setIsUpdatingSerialOffset] = useState(false);
  const [confirmSerialModal, setConfirmSerialModal] = useState(false);

  const [statusModal, setStatusModal] = useState({
    show: false,
    type: "",
    title: "",
    message: "",
  });

  // Selection state
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedSubgroup, setSelectedSubgroup] = useState(null);

  // Editing state
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editGroupValue, setEditGroupValue] = useState("");
  const [editingSubgroupId, setEditingSubgroupId] = useState(null);
  const [editSubgroupValue, setEditSubgroupValue] = useState("");

  // New item state
  const [isAddingGroup, setIsAddingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [isAddingSubgroup, setIsAddingSubgroup] = useState(false);
  const [newSubgroupName, setNewSubgroupName] = useState("");

  // Subgroup details state (Categories & Parameters)
  const [newCategory, setNewCategory] = useState("");
  const [paramSearch, setParamSearch] = useState("");
  const [isAddingParam, setIsAddingParam] = useState(false);
  const [newParam, setNewParam] = useState({
    name: "",
    type: "Chemical",
    unit: "",
  });
  const [specModalParam, setSpecModalParam] = useState(null);
  const [specModalValue, setSpecModalValue] = useState("");

  const fetchData = async () => {
    // Only set page loading to true if we have NO cached groups data
    if (!sessionStorage.getItem(CACHE_KEYS.GROUPS)) {
      setLoading(true);
    }
    // Only show params loading if we have NO cached params
    if (!sessionStorage.getItem(CACHE_KEYS.GLOBAL_PARAMS)) {
      setParamsLoading(true);
    }

    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      await Promise.all([
        fetchWithCache(
          `${API_URL}/api/parameter-groups/all`,
          CACHE_KEYS.GROUPS,
          setData,
          headers,
        ),
        fetchWithCache(
          `${API_URL}/api/parameters`,
          CACHE_KEYS.GLOBAL_PARAMS,
          setGlobalParameters,
          headers,
        ).finally(() => setParamsLoading(false)),
      ]);
    } catch (err) {
      console.error(err);
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const fetchUlrData = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${API_URL}/api/jobs/next-ulr`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUlrPreview(res.data.lastUlr || res.data.ulr);
      setNextUlrPreview(res.data.nextUlr || "");

      const jobsRes = await axios.get(`${API_URL}/api/jobs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const jobsWithUlr = jobsRes.data
        .filter((j) => j.sample?.ulr_no)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);
      setRecentUlrs(jobsWithUlr);

      const serialRes = await axios.get(`${API_URL}/api/jobs/next-sample-id`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSerialPreview(serialRes.data.currentValue || "");
      setNextSerialPreview(
        serialRes.data.nextValue || serialRes.data.serial || "",
      );
    } catch (err) {
      console.error("Could not fetch counter data", err);
    }
  };

  useEffect(() => {
    fetchData();
    fetchUlrData();
  }, []);

  // Update selected subgroup data when data changes
  useEffect(() => {
    if (selectedSubgroup && data.length > 0) {
      const updated = data.find(
        (d) =>
          d.group === selectedSubgroup.group &&
          d.subGroup === selectedSubgroup.subGroup,
      );
      if (updated) setSelectedSubgroup(updated);
      else setSelectedSubgroup(null); // It might have been deleted
    }
  }, [data]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (statusModal.show) {
          setStatusModal({ show: false, type: "", title: "", message: "" });
        }
        if (confirmUlrModal) {
          setConfirmUlrModal(false);
        }
        if (confirmSerialModal) {
          setConfirmSerialModal(false);
        }
        if (isAddingGroup) setIsAddingGroup(false);
        if (isAddingSubgroup) setIsAddingSubgroup(false);
        if (isAddingParam) setIsAddingParam(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    statusModal.show,
    confirmUlrModal,
    confirmSerialModal,
    isAddingGroup,
    isAddingSubgroup,
    isAddingParam,
  ]);

  // ═══════════════════════════════════
  //  ULR HANDLERS
  // ═══════════════════════════════════

  const executeUlrUpdate = async () => {
    setIsUpdatingOffset(true);
    setConfirmUlrModal(false);
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_URL}/api/jobs/ulr-offset`,
        { offset: parseInt(ulrOffset, 10) },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setUlrOffset("");
      fetchUlrData();
      setStatusModal({
        show: true,
        type: "success",
        title: "Success",
        message: "ULR value updated successfully.",
      });
    } catch (err) {
      console.error(err);
      setStatusModal({
        show: true,
        type: "error",
        title: "Update Failed",
        message:
          "Failed to update ULR value: " +
          (err.response?.data?.message || err.message),
      });
    } finally {
      setIsUpdatingOffset(false);
    }
  };

  const handleUpdateUlrOffset = () => {
    if (!ulrOffset) return;
    setConfirmUlrModal(true);
  };

  const executeSerialUpdate = async () => {
    setIsUpdatingSerialOffset(true);
    setConfirmSerialModal(false);
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_URL}/api/jobs/sample-serial-offset`,
        { offset: parseInt(serialOffset, 10) },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setSerialOffset("");
      fetchUlrData();
      setStatusModal({
        show: true,
        type: "success",
        title: "Success",
        message: "Sample Serial updated successfully.",
      });
    } catch (err) {
      console.error(err);
      setStatusModal({
        show: true,
        type: "error",
        title: "Update Failed",
        message:
          "Failed to update Sample Serial: " +
          (err.response?.data?.message || err.message),
      });
    } finally {
      setIsUpdatingSerialOffset(false);
    }
  };

  const handleUpdateSerialOffset = () => {
    if (!serialOffset) return;
    setConfirmSerialModal(true);
  };

  // ═══════════════════════════════════
  //  GROUP HANDLERS
  // ═══════════════════════════════════

  const handleAddGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_URL}/api/data-settings/groups`,
        { name: newGroupName },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setNewGroupName("");
      setIsAddingGroup(false);
      invalidateCache(CACHE_KEYS.GROUPS);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Error adding group");
    }
  };

  const handleRenameGroup = async (oldName, newName) => {
    if (!newName.trim() || oldName === newName) {
      setEditingGroupId(null);
      return;
    }
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_URL}/api/data-settings/groups/${encodeURIComponent(oldName)}`,
        { newName },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setEditingGroupId(null);
      if (selectedGroup === oldName) setSelectedGroup(newName);
      invalidateCache(CACHE_KEYS.GROUPS);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Error renaming group");
    }
  };

  const handleDeleteGroup = async (name) => {
    if (
      !window.confirm(
        `Are you sure you want to delete the entire group "${name}" and all its subgroups?`,
      )
    )
      return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `${API_URL}/api/data-settings/groups/${encodeURIComponent(name)}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (selectedGroup === name) {
        setSelectedGroup(null);
        setSelectedSubgroup(null);
      }
      invalidateCache(CACHE_KEYS.GROUPS);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Error deleting group");
    }
  };

  // ═══════════════════════════════════
  //  SUBGROUP HANDLERS
  // ═══════════════════════════════════

  const handleAddSubgroup = async (group) => {
    if (!newSubgroupName.trim()) return;
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_URL}/api/data-settings/subgroups`,
        { group, subGroup: newSubgroupName },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setNewSubgroupName("");
      setIsAddingSubgroup(false);
      invalidateCache(CACHE_KEYS.GROUPS);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Error adding subgroup");
    }
  };

  const handleRenameSubgroup = async (doc, newName) => {
    if (!newName.trim() || doc.subGroup === newName) {
      setEditingSubgroupId(null);
      return;
    }
    // Cannot edit special pesticide panels this way right now
    if (doc.isPesticidePanel) {
      alert("Cannot rename Pesticide Panel subgroups directly.");
      setEditingSubgroupId(null);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_URL}/api/data-settings/subgroups/${doc._id}`,
        { newName },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setEditingSubgroupId(null);
      invalidateCache(CACHE_KEYS.GROUPS);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Error renaming subgroup");
    }
  };

  const handleDeleteSubgroup = async (doc) => {
    if (
      !window.confirm(
        `Are you sure you want to delete the subgroup "${doc.subGroup}"?`,
      )
    )
      return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/api/data-settings/subgroups/${doc._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (selectedSubgroup?._id === doc._id) setSelectedSubgroup(null);
      invalidateCache(CACHE_KEYS.GROUPS);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Error deleting subgroup");
    }
  };

  // ═══════════════════════════════════
  //  CATEGORY & PARAMETER HANDLERS
  // ═══════════════════════════════════

  const handleAddCategory = async () => {
    if (!newCategory.trim() || !selectedSubgroup) return;
    const updatedCategories = [
      ...(selectedSubgroup.productCategories || []),
      newCategory.trim(),
    ];
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_URL}/api/data-settings/subgroups/${selectedSubgroup._id}/categories`,
        { categories: updatedCategories },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      setNewCategory("");
      invalidateCache(CACHE_KEYS.GROUPS);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Error adding category");
    }
  };

  const handleRemoveCategory = async (catToRemove) => {
    if (!selectedSubgroup) return;
    const updatedCategories = (selectedSubgroup.productCategories || []).filter(
      (c) => c !== catToRemove,
    );
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_URL}/api/data-settings/subgroups/${selectedSubgroup._id}/categories`,
        { categories: updatedCategories },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      invalidateCache(CACHE_KEYS.GROUPS);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Error removing category");
    }
  };

  const handleAddGlobalParameter = async () => {
    if (!newParam.name.trim() || !newParam.unit.trim()) return;
    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API_URL}/api/parameters`, newParam, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setNewParam({ name: "", type: "Chemical", unit: "" });
      setIsAddingParam(false);
      invalidateCache(CACHE_KEYS.GLOBAL_PARAMS);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Error adding parameter");
    }
  };

  const handleRemoveGlobalParameter = async (paramId) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this parameter from the global library?",
      )
    )
      return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${API_URL}/api/parameters/${paramId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      invalidateCache(CACHE_KEYS.GLOBAL_PARAMS);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Error deleting parameter");
    }
  };

  const handleUpdateGlobalParameter = async (paramId, field, value) => {
    try {
      const token = localStorage.getItem("token");
      await axios.put(
        `${API_URL}/api/parameters/${paramId}`,
        { [field]: value },
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      invalidateCache(CACHE_KEYS.GLOBAL_PARAMS);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || "Error updating parameter");
    }
  };

  // Calculate groups
  const groups = Array.from(new Set(data.map((d) => d.group))).sort();

  return (
    <div style={{ paddingBottom: "3rem" }}>
      <h1
        style={{
          marginBottom: "1.5rem",
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        <Database size={28} style={{ color: "var(--color-primary)" }} /> Data
        Settings
      </h1>

      {/* ULR Settings Card */}
      {user?.role !== "HEAD" && (
        <div
          className="card"
          style={{
            marginBottom: "2rem",
            padding: "1.5rem",
            backgroundColor: "#eff6ff",
            border: "1px solid #bfdbfe",
          }}
        >
          <h3
            style={{
              margin: "0 0 1.5rem 0",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              color: "#1e3a8a",
              fontSize: "1.1rem",
            }}
          >
            <Activity size={18} /> NABL ULR Settings
          </h3>
          <div
            className="grid-2"
            style={{ gap: "2rem", alignItems: "flex-start" }}
          >
            <div>
              <div
                style={{
                  fontSize: "0.9rem",
                  color: "#1e40af",
                  fontWeight: 600,
                  marginBottom: "0.5rem",
                }}
              >
                Last Used ULR:
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: "1.25rem",
                  fontWeight: 700,
                  color: "#1d4ed8",
                  backgroundColor: "rgba(255,255,255,0.7)",
                  padding: "0.75rem 1rem",
                  borderRadius: "var(--radius-md)",
                  display: "inline-block",
                  border: "1px solid #93c5fd",
                }}
              >
                {ulrPreview || "Loading..."}
              </div>
              <div
                style={{
                  fontSize: "0.9rem",
                  color: "#1e40af",
                  fontWeight: 600,
                  marginTop: "1rem",
                  marginBottom: "0.5rem",
                }}
              >
                Next Value:
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: "1.25rem",
                  fontWeight: 700,
                  color: "#10b981",
                  backgroundColor: "rgba(255,255,255,0.7)",
                  padding: "0.75rem 1rem",
                  borderRadius: "var(--radius-md)",
                  display: "inline-block",
                  border: "1px solid #6ee7b7",
                }}
              >
                {nextUlrPreview || "Loading..."}
              </div>
              <div
                style={{
                  fontSize: "0.8rem",
                  color: "#3b82f6",
                  marginTop: "0.5rem",
                  maxWidth: "250px",
                }}
              >
                This will be the ULR assigned to the next submitted job.
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: "0.9rem",
                  color: "#1e40af",
                  fontWeight: 600,
                  marginBottom: "0.5rem",
                }}
              >
                Update ULR:
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="text"
                  placeholder="Digits only"
                  value={ulrOffset}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    if (val.length < 8) setUlrOffset(val);
                  }}
                  style={{
                    flex: 1,
                    border: "1px solid #93c5fd",
                    backgroundColor: "white",
                  }}
                />
                <button
                  onClick={handleUpdateUlrOffset}
                  disabled={isUpdatingOffset || !ulrOffset}
                  className="btn btn-primary"
                  style={{ backgroundColor: "#2563eb" }}
                >
                  {isUpdatingOffset ? "Updating..." : "Update ULR"}
                </button>
              </div>
              <div
                style={{
                  fontSize: "0.8rem",
                  color: "#3b82f6",
                  marginTop: "0.5rem",
                }}
              >
                Input ULR
              </div>
            </div>
          </div>
          <div
            style={{
              marginTop: "1.5rem",
              paddingTop: "1.5rem",
              borderTop: "1px solid #bfdbfe",
            }}
          >
            <div
              style={{
                fontSize: "0.9rem",
                color: "#1e40af",
                fontWeight: 600,
                marginBottom: "0.5rem",
              }}
            >
              Last 5 Recent ULRs:
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {recentUlrs.map((j) => (
                <span
                  key={j._id}
                  style={{
                    fontFamily: "monospace",
                    fontSize: "0.85rem",
                    backgroundColor: "#dbeafe",
                    color: "#1e40af",
                    padding: "0.3rem 0.6rem",
                    borderRadius: "var(--radius-sm)",
                    border: "1px solid #bfdbfe",
                  }}
                >
                  {j.sample.ulr_no}
                </span>
              ))}
              {recentUlrs.length === 0 && (
                <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>
                  No recent ULRs found.
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Sample Serial Settings Card */}
      {user?.role !== "HEAD" && (
        <div
          className="card"
          style={{
            marginBottom: "2rem",
            padding: "1.5rem",
            backgroundColor: "#f0fdf4",
            border: "1px solid #bbf7d0",
          }}
        >
          <h3
            style={{
              margin: "0 0 1.5rem 0",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              color: "#166534",
              fontSize: "1.1rem",
            }}
          >
            <Activity size={18} /> Sample Serial (Job Code) Settings
          </h3>
          <div
            className="grid-2"
            style={{ gap: "2rem", alignItems: "flex-start" }}
          >
            <div>
              <div
                style={{
                  fontSize: "0.9rem",
                  color: "#166534",
                  fontWeight: 600,
                  marginBottom: "0.5rem",
                }}
              >
                Current Serial Number:
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: "1.25rem",
                  fontWeight: 700,
                  color: "#15803d",
                  backgroundColor: "rgba(255,255,255,0.7)",
                  padding: "0.75rem 1rem",
                  borderRadius: "var(--radius-md)",
                  display: "inline-block",
                  border: "1px solid #86efac",
                }}
              >
                {serialPreview || "Loading..."}
              </div>
              <div
                style={{
                  fontSize: "0.9rem",
                  color: "#166534",
                  fontWeight: 600,
                  marginTop: "1rem",
                  marginBottom: "0.5rem",
                }}
              >
                Next Job Code Number:
              </div>
              <div
                style={{
                  fontFamily: "monospace",
                  fontSize: "1.25rem",
                  fontWeight: 700,
                  color: "#047857",
                  backgroundColor: "rgba(255,255,255,0.7)",
                  padding: "0.75rem 1rem",
                  borderRadius: "var(--radius-md)",
                  display: "inline-block",
                  border: "1px solid #6ee7b7",
                }}
              >
                {nextSerialPreview || "Loading..."}
              </div>
              <div
                style={{
                  fontSize: "0.8rem",
                  color: "#15803d",
                  marginTop: "0.5rem",
                  maxWidth: "250px",
                }}
              >
                This will be the trailing serial part of the next job code.
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: "0.9rem",
                  color: "#166534",
                  fontWeight: 600,
                  marginBottom: "0.5rem",
                }}
              >
                Update Serial Number:
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <input
                  type="text"
                  placeholder="Digits only"
                  value={serialOffset}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    if (val.length < 8) setSerialOffset(val);
                  }}
                  style={{
                    flex: 1,
                    border: "1px solid #86efac",
                    backgroundColor: "white",
                  }}
                />
                <button
                  onClick={handleUpdateSerialOffset}
                  disabled={isUpdatingSerialOffset || !serialOffset}
                  className="btn btn-primary"
                  style={{ backgroundColor: "#16a34a" }}
                >
                  {isUpdatingSerialOffset ? "Updating..." : "Update Serial"}
                </button>
              </div>
              <div
                style={{
                  fontSize: "0.8rem",
                  color: "#15803d",
                  marginTop: "0.5rem",
                }}
              >
                Input the last used serial number (the next job will be +1 of
                this).
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
        {/* Left Panel: Hierarchy Tree */}
        <div
          className="card"
          style={{
            flex: "1 1 350px",
            minWidth: "300px",
            display: "flex",
            flexDirection: "column",
            height: "600px",
          }}
        >
          <h3
            style={{
              margin: "0 0 1rem 0",
              fontSize: "1.1rem",
              borderBottom: "1px solid var(--color-border)",
              paddingBottom: "0.5rem",
            }}
          >
            Groups
          </h3>

          {loading ? (
            <Spinner />
          ) : (
            <div style={{ overflowY: "auto", flex: 1, paddingRight: "0.5rem" }}>
              {groups.map((group) => {
                const subGroups = data.filter((d) => d.group === group);
                const isExpanded = selectedGroup === group;

                return (
                  <div key={group} style={{ marginBottom: "0.5rem" }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "0.5rem",
                        backgroundColor: isExpanded
                          ? "var(--color-surface-hover)"
                          : "transparent",
                        borderRadius: "var(--radius-sm)",
                        cursor: "pointer",
                        fontWeight: isExpanded ? 600 : 400,
                      }}
                      onClick={() =>
                        setSelectedGroup(isExpanded ? null : group)
                      }
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          flex: 1,
                        }}
                      >
                        <span
                          style={{
                            color: "var(--color-text-muted)",
                            fontSize: "0.8rem",
                            width: "12px",
                          }}
                        >
                          {isExpanded ? "▼" : "▶"}
                        </span>

                        {editingGroupId === group ? (
                          <input
                            autoFocus
                            value={editGroupValue}
                            onChange={(e) => setEditGroupValue(e.target.value)}
                            onBlur={() =>
                              handleRenameGroup(group, editGroupValue)
                            }
                            onKeyDown={(e) =>
                              e.key === "Enter" &&
                              handleRenameGroup(group, editGroupValue)
                            }
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              flex: 1,
                              padding: "0.2rem",
                              fontSize: "0.9rem",
                            }}
                          />
                        ) : (
                          <span
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              setEditingGroupId(group);
                              setEditGroupValue(group);
                            }}
                          >
                            {group}
                          </span>
                        )}
                      </div>

                      <div style={{ display: "flex", gap: "0.25rem" }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteGroup(group);
                          }}
                          style={{
                            background: "none",
                            border: "none",
                            color: "var(--color-danger)",
                            cursor: "pointer",
                            opacity: isExpanded ? 1 : 0.5,
                            padding: "0.25rem",
                          }}
                          title="Delete Group"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>

                    {/* Subgroups list */}
                    {isExpanded && (
                      <div
                        style={{
                          paddingLeft: "1.5rem",
                          marginTop: "0.25rem",
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.25rem",
                        }}
                      >
                        {subGroups
                          .filter((sg) => sg.subGroup !== "__placeholder__")
                          .map((doc) => {
                            const isSelected =
                              selectedSubgroup?._id === doc._id;
                            return (
                              <div
                                key={doc._id}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  padding: "0.4rem 0.5rem",
                                  backgroundColor: isSelected
                                    ? "var(--color-surface-hover)"
                                    : "transparent",
                                  color: isSelected
                                    ? "var(--color-primary)"
                                    : "inherit",
                                  fontWeight: isSelected ? 600 : 400,
                                  borderLeft: isSelected
                                    ? "3px solid var(--color-primary)"
                                    : "3px solid transparent",
                                  borderRadius:
                                    "0 var(--radius-sm) var(--radius-sm) 0",
                                  cursor: "pointer",
                                  fontSize: "0.9rem",
                                }}
                                onClick={() => setSelectedSubgroup(doc)}
                              >
                                <div
                                  style={{
                                    flex: 1,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                  }}
                                >
                                  {editingSubgroupId === doc._id ? (
                                    <input
                                      autoFocus
                                      value={editSubgroupValue}
                                      onChange={(e) =>
                                        setEditSubgroupValue(e.target.value)
                                      }
                                      onBlur={() =>
                                        handleRenameSubgroup(
                                          doc,
                                          editSubgroupValue,
                                        )
                                      }
                                      onKeyDown={(e) =>
                                        e.key === "Enter" &&
                                        handleRenameSubgroup(
                                          doc,
                                          editSubgroupValue,
                                        )
                                      }
                                      onClick={(e) => e.stopPropagation()}
                                      style={{
                                        flex: 1,
                                        padding: "0.2rem",
                                        fontSize: "0.85rem",
                                      }}
                                    />
                                  ) : (
                                    <span
                                      onDoubleClick={(e) => {
                                        if (!doc.isPesticidePanel) {
                                          e.stopPropagation();
                                          setEditingSubgroupId(doc._id);
                                          setEditSubgroupValue(doc.subGroup);
                                        }
                                      }}
                                    >
                                      {doc.subGroup}{" "}
                                      {doc.isPesticidePanel ? "(Panel)" : ""}
                                    </span>
                                  )}
                                </div>
                                <div
                                  style={{ display: "flex", gap: "0.25rem" }}
                                >
                                  {!doc.isPesticidePanel && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteSubgroup(doc);
                                      }}
                                      style={{
                                        background: "none",
                                        border: "none",
                                        color: "var(--color-danger)",
                                        cursor: "pointer",
                                        opacity: isSelected ? 1 : 0.5,
                                        padding: "0.25rem",
                                      }}
                                      title="Delete Subgroup"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}

                        {/* Add subgroup input */}
                        {isAddingSubgroup ? (
                          <div
                            style={{
                              display: "flex",
                              gap: "0.5rem",
                              padding: "0.25rem 0",
                            }}
                          >
                            <input
                              autoFocus
                              placeholder="New subgroup name..."
                              value={newSubgroupName}
                              onChange={(e) =>
                                setNewSubgroupName(e.target.value)
                              }
                              onKeyDown={(e) =>
                                e.key === "Enter" && handleAddSubgroup(group)
                              }
                              style={{
                                flex: 1,
                                padding: "0.3rem",
                                fontSize: "0.85rem",
                              }}
                            />
                            <button
                              onClick={() => setIsAddingSubgroup(false)}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: "0.25rem",
                              }}
                            >
                              <X size={18} />
                            </button>
                            <button
                              onClick={() => handleAddSubgroup(group)}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: "0.25rem",
                                color: "var(--color-primary)",
                              }}
                            >
                              <Check size={18} />
                            </button>
                          </div>
                        ) : (
                          <div
                            onClick={() => setIsAddingSubgroup(true)}
                            style={{
                              padding: "0.4rem 0.5rem",
                              fontSize: "0.85rem",
                              color: "var(--color-primary)",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.25rem",
                            }}
                          >
                            <Plus size={14} /> Add Sub-Group
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Add group input */}
              {isAddingGroup ? (
                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    padding: "0.5rem",
                    marginTop: "0.5rem",
                    borderTop: "1px solid var(--color-border)",
                  }}
                >
                  <input
                    autoFocus
                    placeholder="New group name..."
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddGroup()}
                    style={{ flex: 1, padding: "0.4rem", fontSize: "0.9rem" }}
                  />
                  <button
                    onClick={() => setIsAddingGroup(false)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "0.25rem",
                    }}
                  >
                    <X size={18} />
                  </button>
                  <button
                    onClick={handleAddGroup}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "0.25rem",
                      color: "var(--color-primary)",
                    }}
                  >
                    <Check size={18} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingGroup(true)}
                  style={{
                    width: "100%",
                    marginTop: "0.5rem",
                    padding: "0.5rem",
                    background: "var(--color-surface-hover)",
                    border: "1px dashed var(--color-border)",
                    borderRadius: "var(--radius-sm)",
                    cursor: "pointer",
                    color: "var(--color-text-main)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                  }}
                >
                  <Plus size={16} /> Add Group
                </button>
              )}
            </div>
          )}
        </div>

        {/* Right Panel: Editor */}
        <div
          className="card"
          style={{
            flex: "2 1 500px",
            display: "flex",
            flexDirection: "column",
            height: "600px",
          }}
        >
          {!selectedSubgroup ? (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-text-muted)",
                fontStyle: "italic",
              }}
            >
              Select a sub-group from the left to edit its data.
            </div>
          ) : (
            <>
              <div
                style={{
                  borderBottom: "1px solid var(--color-border)",
                  paddingBottom: "1rem",
                  marginBottom: "1rem",
                }}
              >
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--color-text-muted)",
                    marginBottom: "0.25rem",
                  }}
                >
                  {selectedSubgroup.group}
                </div>
                <h2 style={{ margin: 0, fontSize: "1.25rem" }}>
                  {selectedSubgroup.subGroup}{" "}
                  {selectedSubgroup.isPesticidePanel ? "(Pesticide Panel)" : ""}
                </h2>
              </div>

              {/* Product Categories */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  flex: 1,
                  minHeight: 0,
                  marginBottom: "1rem",
                }}
              >
                <h4
                  style={{
                    margin: "0 0 0.5rem 0",
                    fontSize: "0.95rem",
                    flexShrink: 0,
                  }}
                >
                  Product Categories
                </h4>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "0.5rem",
                    alignContent: "flex-start",
                    flex: 1,
                    overflowY: "auto",
                    paddingRight: "0.5rem",
                    paddingBottom: "1rem",
                  }}
                >
                  {selectedSubgroup.productCategories?.map((cat) => (
                    <div
                      key={cat}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        padding: "0.3rem 0.6rem",
                        backgroundColor: "var(--color-surface-hover)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "0.85rem",
                      }}
                    >
                      {cat}
                      <button
                        onClick={() => handleRemoveCategory(cat)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          padding: "0.15rem",
                          display: "flex",
                          color: "var(--color-text-muted)",
                        }}
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem",
                      padding: "0.1rem 0",
                    }}
                  >
                    <input
                      placeholder="Add category..."
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleAddCategory()
                      }
                      style={{
                        padding: "0.3rem 0.5rem",
                        fontSize: "0.85rem",
                        width: "130px",
                        minWidth: "100px",
                      }}
                    />
                    <button
                      onClick={handleAddCategory}
                      style={{
                        background: "var(--color-surface-hover)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "var(--radius-sm)",
                        cursor: "pointer",
                        padding: "0.3rem",
                        color: "var(--color-primary)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── GLOBAL PARAMETER LIBRARY ── */}
      <div
        className="card"
        style={{
          marginBottom: "2rem",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "1rem",
          }}
        >
          <h3
            style={{
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              color: "var(--color-primary-dark)",
              fontSize: "1.1rem",
            }}
          >
            <Database size={18} /> Global Parameter Library
          </h3>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-sm)",
              padding: "0.25rem 0.5rem",
            }}
          >
            <Search size={14} style={{ color: "var(--color-text-muted)" }} />
            <input
              placeholder="Search parameters..."
              value={paramSearch}
              onChange={(e) => setParamSearch(e.target.value)}
              style={{
                border: "none",
                outline: "none",
                background: "transparent",
                fontSize: "0.85rem",
                width: "180px",
              }}
            />
          </div>
        </div>

        <div
          style={{
            flex: 1,
            maxHeight: "500px",
            overflowY: "auto",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            marginBottom: "1rem",
          }}
        >
          {paramsLoading ? (
            <div
              style={{
                padding: "3rem",
                display: "flex",
                justifyContent: "center",
              }}
            >
              <Spinner message="Loading parameter library..." />
            </div>
          ) : (
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.9rem",
              }}
            >
              <thead
                style={{
                  position: "sticky",
                  top: 0,
                  backgroundColor: "var(--color-surface-hover)",
                  zIndex: 1,
                }}
              >
                <tr>
                  <th
                    style={{
                      padding: "0.75rem 1rem",
                      textAlign: "left",
                      borderBottom: "1px solid var(--color-border)",
                    }}
                  >
                    Name
                  </th>
                  <th
                    style={{
                      padding: "0.75rem 1rem",
                      textAlign: "left",
                      borderBottom: "1px solid var(--color-border)",
                      width: "120px",
                    }}
                  >
                    Type
                  </th>
                  <th
                    style={{
                      padding: "0.75rem 1rem",
                      textAlign: "left",
                      borderBottom: "1px solid var(--color-border)",
                      width: "150px",
                    }}
                  >
                    Unit
                  </th>
                  <th
                    style={{
                      padding: "0.75rem 1rem",
                      textAlign: "left",
                      borderBottom: "1px solid var(--color-border)",
                      width: "150px",
                    }}
                  >
                    Specification
                  </th>
                  <th
                    style={{
                      padding: "0.75rem 1rem",
                      textAlign: "center",
                      borderBottom: "1px solid var(--color-border)",
                      width: "60px",
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {globalParameters
                  .filter(
                    (p) =>
                      !paramSearch ||
                      p.name.toLowerCase().includes(paramSearch.toLowerCase()),
                  )
                  .map((p) => (
                    <tr
                      key={p._id}
                      style={{ borderBottom: "1px solid var(--color-border)" }}
                    >
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <input
                          type="text"
                          defaultValue={p.name}
                          onBlur={(e) => {
                            if (
                              e.target.value !== p.name &&
                              e.target.value.trim() !== ""
                            )
                              handleUpdateGlobalParameter(
                                p._id,
                                "name",
                                e.target.value,
                              );
                          }}
                          style={{
                            width: "100%",
                            padding: "0.2rem",
                            fontSize: "0.9rem",
                            border: "1px solid transparent",
                            borderRadius: "var(--radius-sm)",
                            background: "transparent",
                          }}
                          onFocus={(e) =>
                            Object.assign(e.target.style, {
                              border: "1px solid var(--color-primary)",
                              background: "#fff",
                            })
                          }
                        />
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <select
                          defaultValue={p.type}
                          onChange={(e) =>
                            handleUpdateGlobalParameter(
                              p._id,
                              "type",
                              e.target.value,
                            )
                          }
                          style={{
                            padding: "0.2rem",
                            fontSize: "0.9rem",
                            border: "1px solid transparent",
                            borderRadius: "var(--radius-sm)",
                            background: "transparent",
                          }}
                        >
                          <option value="Chemical">Chemical</option>
                          <option value="Micro">Micro</option>
                        </select>
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                          }}
                        >
                          <input
                            type="text"
                            defaultValue={p.unit}
                            onBlur={(e) => {
                              if (e.target.value !== p.unit)
                                handleUpdateGlobalParameter(
                                  p._id,
                                  "unit",
                                  e.target.value,
                                );
                            }}
                            style={{
                              width: "100px",
                              padding: "0.2rem",
                              fontSize: "0.9rem",
                              border: "1px solid transparent",
                              borderRadius: "var(--radius-sm)",
                              background: "transparent",
                            }}
                            onFocus={(e) =>
                              Object.assign(e.target.style, {
                                border: "1px solid var(--color-primary)",
                                background: "#fff",
                              })
                            }
                          />
                          <Save
                            size={14}
                            style={{ color: "var(--color-text-muted)" }}
                          />
                        </div>
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <button
                          type="button"
                          onClick={() => {
                            setSpecModalParam(p);
                            setSpecModalValue(p.specification || "");
                          }}
                          style={{
                            background: p.specification
                              ? "var(--color-surface-hover)"
                              : "var(--color-primary)",
                            color: p.specification
                              ? "var(--color-text-main)"
                              : "#fff",
                            border: p.specification
                              ? "1px solid var(--color-border)"
                              : "none",
                            padding: "0.3rem 0.6rem",
                            borderRadius: "var(--radius-sm)",
                            fontSize: "0.75rem",
                            cursor: "pointer",
                            display: "inline-block",
                          }}
                        >
                          {p.specification ? "✓ Edit" : "Set Spec"}
                        </button>
                      </td>
                      <td
                        style={{ padding: "0.75rem 1rem", textAlign: "center" }}
                      >
                        <button
                          onClick={() => handleRemoveGlobalParameter(p._id)}
                          style={{
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            color: "var(--color-danger)",
                            padding: "0.25rem",
                          }}
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                {globalParameters.length === 0 && (
                  <tr>
                    <td
                      colSpan="5"
                      style={{
                        padding: "2rem",
                        textAlign: "center",
                        color: "var(--color-text-muted)",
                      }}
                    >
                      No parameters found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Add Global Parameter Row */}
        <div>
          {isAddingParam ? (
            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                padding: "1rem",
                backgroundColor: "var(--color-surface-hover)",
                borderRadius: "var(--radius-md)",
                border: "1px dashed var(--color-border)",
              }}
            >
              <input
                placeholder="Parameter Name..."
                value={newParam.name}
                onChange={(e) =>
                  setNewParam({ ...newParam, name: e.target.value })
                }
                style={{
                  flex: 2,
                  padding: "0.5rem",
                  fontSize: "0.9rem",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-sm)",
                }}
              />
              <select
                value={newParam.type}
                onChange={(e) =>
                  setNewParam({ ...newParam, type: e.target.value })
                }
                style={{
                  flex: 1,
                  padding: "0.5rem",
                  fontSize: "0.9rem",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <option value="Chemical">Chemical</option>
                <option value="Micro">Micro</option>
              </select>
              <input
                placeholder="Unit..."
                value={newParam.unit}
                onChange={(e) =>
                  setNewParam({ ...newParam, unit: e.target.value })
                }
                style={{
                  flex: 1,
                  padding: "0.5rem",
                  fontSize: "0.9rem",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-sm)",
                }}
              />
              <button
                onClick={handleAddGlobalParameter}
                style={{
                  background: "var(--color-primary)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "var(--radius-sm)",
                  padding: "0.5rem 1rem",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  fontWeight: 500,
                }}
              >
                Save Parameter
              </button>
              <button
                onClick={() => setIsAddingParam(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "0.5rem",
                  color: "var(--color-text-muted)",
                }}
              >
                <X size={20} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingParam(true)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1rem",
                background: "var(--color-surface-hover)",
                border: "1px dashed var(--color-border)",
                borderRadius: "var(--radius-md)",
                color: "var(--color-primary)",
                cursor: "pointer",
                fontSize: "0.95rem",
                width: "100%",
                justifyContent: "center",
              }}
            >
              <Plus size={18} /> Add New Parameter
            </button>
          )}
        </div>
      </div>

      {specModalParam && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "400px",
              padding: "1.5rem",
              animation: "slideUp 0.3s ease",
            }}
          >
            <h3 style={{ margin: "0 0 1rem 0" }}>
              Specification for "{specModalParam.name}"
            </h3>
            <input
              autoFocus
              value={specModalValue}
              onChange={(e) => setSpecModalValue(e.target.value)}
              placeholder="Enter specification"
              style={{
                width: "100%",
                padding: "0.6rem",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-sm)",
                marginBottom: "1rem",
              }}
            />
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                className="btn"
                onClick={() => setSpecModalParam(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={async () => {
                  await handleUpdateGlobalParameter(
                    specModalParam._id,
                    "specification",
                    specModalValue,
                  );
                  setSpecModalParam(null);
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CUSTOM CONFIRMATION MODALS ── */}
      {confirmUlrModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "400px",
              padding: "1.5rem",
              animation: "slideUp 0.3s ease",
            }}
          >
            <h3
              style={{
                margin: "0 0 1rem 0",
                color: "#1e3a8a",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <AlertCircle size={20} /> Confirm ULR Update
            </h3>
            <p
              style={{
                margin: "0 0 1.5rem 0",
                color: "var(--color-text-main)",
                fontSize: "0.95rem",
                lineHeight: 1.5,
              }}
            >
              Are you sure you want to update the NABL ULR value to{" "}
              <strong style={{ color: "#1d4ed8" }}>{ulrOffset}</strong>?
            </p>
            <p
              style={{
                margin: "0 0 1.5rem 0",
                color: "var(--color-text-muted)",
                fontSize: "0.85rem",
                lineHeight: 1.5,
              }}
            >
              This will directly affect the very next job logged as NABL. Please
              double-check this number against the NABL portal.
            </p>
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                className="btn"
                onClick={() => setConfirmUlrModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={executeUlrUpdate}
                style={{ backgroundColor: "#2563eb" }}
              >
                Confirm Update
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmSerialModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "400px",
              padding: "1.5rem",
              animation: "slideUp 0.3s ease",
            }}
          >
            <h3
              style={{
                margin: "0 0 1rem 0",
                color: "#166534",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <AlertCircle size={20} /> Confirm Serial Update
            </h3>
            <p
              style={{
                margin: "0 0 1.5rem 0",
                color: "var(--color-text-main)",
                fontSize: "0.95rem",
                lineHeight: 1.5,
              }}
            >
              Are you sure you want to set the current Job Serial Number to{" "}
              <strong style={{ color: "#15803d" }}>{serialOffset}</strong>?
            </p>
            <p
              style={{
                margin: "0 0 1.5rem 0",
                color: "var(--color-text-muted)",
                fontSize: "0.85rem",
                lineHeight: 1.5,
              }}
            >
              The very next job logged will be assigned{" "}
              <strong style={{ color: "#15803d" }}>
                {parseInt(serialOffset, 10) + 1}
              </strong>
              . Ensure this does not clash with existing job codes.
            </p>
            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                className="btn"
                onClick={() => setConfirmSerialModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={executeSerialUpdate}
                style={{ backgroundColor: "#16a34a" }}
              >
                Confirm Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CUSTOM STATUS MODAL ── */}
      {statusModal.show && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            className="card"
            style={{
              width: "100%",
              maxWidth: "450px",
              padding: "2rem",
              animation: "slideUp 0.3s ease",
              borderTop: `4px solid ${statusModal.type === "error" ? "var(--color-danger)" : "var(--color-success)"}`,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                marginBottom: "1.5rem",
                color:
                  statusModal.type === "error"
                    ? "var(--color-danger)"
                    : "var(--color-success)",
              }}
            >
              {statusModal.type === "error" ? (
                <AlertCircle size={32} />
              ) : (
                <Check size={32} />
              )}
              <h2 style={{ margin: 0, fontSize: "1.25rem" }}>
                {statusModal.title}
              </h2>
            </div>

            <p
              style={{
                margin: "0 0 1.5rem 0",
                color: "var(--color-text-main)",
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
              }}
            >
              {statusModal.message}
            </p>

            <div
              style={{
                display: "flex",
                gap: "1rem",
                justifyContent: "flex-end",
              }}
            >
              <button
                className="btn"
                onClick={() =>
                  setStatusModal({
                    show: false,
                    type: "",
                    title: "",
                    message: "",
                  })
                }
                style={{
                  border: `1px solid ${statusModal.type === "error" ? "var(--color-danger)" : "var(--color-success)"}`,
                  color:
                    statusModal.type === "error"
                      ? "var(--color-danger)"
                      : "var(--color-success)",
                  padding: "0.6rem 2rem",
                  backgroundColor: "transparent",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
