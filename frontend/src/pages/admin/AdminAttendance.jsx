import React, { useState, useEffect } from 'react';
import {
  ScanFace,
  Download,
  History,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  XCircle,
  Edit,
  X,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import api from '../../api/client';

export const AdminAttendance = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('');
  const [search, setSearch] = useState('');

  // Modals
  const [showCorrectModal, setShowCorrectModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [newStatus, setNewStatus] = useState('Present');
  const [correctionReason, setCorrectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter !== 'ALL') params.status_filter = statusFilter;
      if (dateFilter) params.date_filter = dateFilter;
      const res = await api.get('/api/admin/attendance', { params });
      setRecords(res.data);
    } catch (err) {
      console.error('Failed to load attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [statusFilter, dateFilter]);

  const openCorrectModal = (rec) => {
    setSelectedRecord(rec);
    setNewStatus(rec.status);
    setCorrectionReason('');
    setShowCorrectModal(true);
  };

  const handleCorrectSubmit = async (e) => {
    e.preventDefault();
    if (!correctionReason.trim()) {
      alert('Please enter an official audit reason for this correction.');
      return;
    }
    setSubmitting(true);
    try {
      await api.put(`/api/admin/attendance/${selectedRecord.id}`, {
        status: newStatus,
        reason: correctionReason
      });
      setShowCorrectModal(false);
      fetchRecords();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update attendance');
    } finally {
      setSubmitting(false);
    }
  };

  const openAuditLogs = async () => {
    setShowAuditModal(true);
    setAuditLoading(true);
    try {
      const res = await api.get('/api/admin/attendance/audit-logs');
      setAuditLogs(res.data);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setAuditLoading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const res = await api.get('/api/admin/attendance/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_audit_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to export CSV: ' + (err.response?.data?.detail || err.message));
    }
  };

  const filteredRecords = records.filter(
    (r) =>
      r.student_name.toLowerCase().includes(search.toLowerCase()) ||
      r.roll_number.toLowerCase().includes(search.toLowerCase()) ||
      r.subject_code.toLowerCase().includes(search.toLowerCase()) ||
      r.subject_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <ScanFace className="w-6 h-6 text-teal-400" />
            Attendance Management & Audit
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            University biometric logs, manual administrative overrides, and tamper-proof audit trails.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={openAuditLogs}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <History className="w-4 h-4 text-amber-400" />
            Audit Trail Logs
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 text-white text-xs font-semibold shadow-lg shadow-teal-600/20 hover:from-teal-500 hover:to-emerald-500 transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by student name, roll number, or subject..."
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-teal-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="Present">Present</option>
            <option value="Late">Late</option>
            <option value="Absent">Absent</option>
          </select>

          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-teal-500"
          />
          {dateFilter && (
            <button
              onClick={() => setDateFilter('')}
              className="text-[11px] text-slate-400 hover:text-white"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Attendance Table */}
      <div className="rounded-2xl bg-[#0f172a] border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3.5 px-4">Date & Time</th>
                <th className="py-3.5 px-4">Student</th>
                <th className="py-3.5 px-4">Roll Number</th>
                <th className="py-3.5 px-4">Course</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">AI Verification</th>
                <th className="py-3.5 px-4">Audit / Remarks</th>
                <th className="py-3.5 px-4 text-right">Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-500">
                    Loading attendance database records...
                  </td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-8 text-center text-slate-500">
                    No attendance records match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4 font-mono text-slate-300">
                      <span>{r.date}</span>
                      <span className="block text-[10px] text-slate-500">{r.time}</span>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-white">{r.student_name}</p>
                      <p className="text-[10px] text-slate-500">{r.department}</p>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-teal-300">
                      {r.roll_number}
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      <span className="font-mono text-xs">{r.subject_code}</span>
                      <span className="block text-[10px] text-slate-500">{r.subject_name}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          r.status === 'Present'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : r.status === 'Late'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {r.status === 'Present' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : r.status === 'Late' ? (
                          <Clock className="w-3 h-3" />
                        ) : (
                          <XCircle className="w-3 h-3" />
                        )}
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      <span className="font-mono">{r.confidence}% Match</span>
                      <span className="block text-[10px] text-slate-500">{r.method}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px] max-w-xs truncate">
                      {r.remarks || 'Automated AI Camera Verification'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openCorrectModal(r)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition text-[11px]"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Correct
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Correct Attendance Modal */}
      {showCorrectModal && selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-[#0f172a] border border-slate-800 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Edit className="w-5 h-5 text-teal-400" />
                Administrative Attendance Override
              </h2>
              <button onClick={() => setShowCorrectModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1 text-xs">
              <p className="text-slate-300 font-semibold">{selectedRecord.student_name} ({selectedRecord.roll_number})</p>
              <p className="text-slate-400">Subject: {selectedRecord.subject_code} • Date: {selectedRecord.date}</p>
              <p className="text-slate-400">Current Status: <span className="font-bold text-white">{selectedRecord.status}</span></p>
            </div>

            <form onSubmit={handleCorrectSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">New Attendance Status *</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Present', 'Late', 'Absent'].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setNewStatus(st)}
                      className={`py-2 rounded-xl border text-xs font-semibold transition ${
                        newStatus === st
                          ? 'bg-teal-600/20 border-teal-500 text-teal-300'
                          : 'bg-slate-900 border-slate-700/80 text-slate-400 hover:text-white'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Audit Correction Reason *</label>
                <textarea
                  rows="3"
                  required
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="e.g. Student provided medical certificate; verified by department admin."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-teal-500 resize-none"
                />
                <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  This modification will be permanently logged in the audit trail.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCorrectModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-semibold transition"
                >
                  {submitting ? 'Recording...' : 'Save Correction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audit Trail Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl bg-[#0f172a] border border-slate-800 p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-amber-400" />
                Attendance Modification Audit Trail
              </h2>
              <button onClick={() => setShowAuditModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {auditLoading ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                Loading audit trail records...
              </div>
            ) : auditLogs.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                No administrative attendance overrides recorded yet.
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                {auditLogs.map((log) => (
                  <div key={log.id} className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">Modified by: {log.modified_by}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{log.timestamp}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <span>Status changed:</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 line-through text-[10px]">
                        {log.old_status}
                      </span>
                      <span>→</span>
                      <span className="px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-300 font-semibold text-[10px]">
                        {log.new_status}
                      </span>
                    </div>
                    <p className="text-slate-400 text-[11px] italic">"{log.reason}"</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

