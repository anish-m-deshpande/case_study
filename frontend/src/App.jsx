import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Upload, 
  Users, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  XCircle, 
  MessageSquare, 
  ChevronRight,
  Plus,
  History,
  Search,
  Send,
  Loader2,
  ArrowLeft,
  User,
  Calendar,
  MapPin,
  DollarSign,
  Info,
  Trash2
} from 'lucide-react';

const API_BASE = '/api';

function App() {
  const [view, setView] = useState('dashboard'); // dashboard, new-submission, detail
  const [employees, setEmployees] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // New Submission State
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [tripPurpose, setTripPurpose] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [files, setFiles] = useState([]);

  // New Employee State
  const [showNewEmployeeForm, setShowNewEmployeeForm] = useState(false);
  const [newEmployee, setNewEmployee] = useState({
    id: '',
    name: '',
    grade: 1,
    title: '',
    department: '',
    manager_id: '',
    home_base: ''
  });

  // Chat State
  const [chatOpen, setChatOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    fetchEmployees();
    fetchSubmissions();
  }, []);

  const fetchEmployees = async () => {
    try {
      const res = await axios.get(`${API_BASE}/employees`);
      setEmployees(res.data);
    } catch (err) {
      console.error("Error fetching employees", err);
    }
  };

  const fetchSubmissions = async () => {
    try {
      const res = await axios.get(`${API_BASE}/submissions`);
      setSubmissions(res.data);
    } catch (err) {
      console.error("Error fetching submissions", err);
    }
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_BASE}/employees`, newEmployee);
      setEmployees([...employees, res.data]);
      setSelectedEmployeeId(res.data.id);
      setShowNewEmployeeForm(false);
      setNewEmployee({
        id: '',
        name: '',
        grade: 1,
        title: '',
        department: '',
        manager_id: '',
        home_base: ''
      });
    } catch (err) {
      alert("Error creating employee: " + err.message);
    }
  };

  const handleFileUpload = (e) => {
    setFiles([...e.target.files]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData();
    formData.append('employee_id', selectedEmployeeId);
    formData.append('trip_purpose', tripPurpose);
    formData.append('trip_start_date', startDate);
    formData.append('trip_end_date', endDate);
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    try {
      const res = await axios.post(`${API_BASE}/submissions`, formData);
      setSubmissions([res.data, ...submissions]);
      setView('dashboard');
      // Reset form
      setSelectedEmployeeId('');
      setTripPurpose('');
      setStartDate('');
      setEndDate('');
      setFiles([]);
    } catch (err) {
      alert("Error creating submission: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOverride = async (lineItemId, verdict, comment) => {
    try {
      await axios.post(`${API_BASE}/line_items/${lineItemId}/override`, {
        verdict,
        comment
      });
      // Refresh detail
      const res = await axios.get(`${API_BASE}/submissions/${selectedSubmission.id}`);
      setSelectedSubmission(res.data);
    } catch (err) {
      alert("Error saving override");
    }
  };

  const handleDeleteSubmission = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Are you sure you want to delete this submission?")) return;
    
    try {
      await axios.delete(`${API_BASE}/submissions/${id}`);
      setSubmissions(submissions.filter(s => s.id !== id));
    } catch (err) {
      alert("Error deleting submission");
    }
  };

  const askPolicy = async (e) => {
    e.preventDefault();
    if (!question.trim()) return;
    
    setChatLoading(true);
    const userQ = question;
    setQuestion('');
    setChatHistory([...chatHistory, { role: 'user', content: userQ }]);

    try {
      const res = await axios.post(`${API_BASE}/policy/chat`, { question: userQ });
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: res.data.answer,
        citations: res.data.citations 
      }]);
    } catch (err) {
      setChatHistory(prev => [...prev, { role: 'assistant', content: "Error connecting to policy engine." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const getVerdictBadge = (verdict, override) => {
    const v = (override || verdict)?.toLowerCase();
    switch (v) {
      case 'compliant': 
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 uppercase tracking-wider border border-emerald-200"><CheckCircle className="w-3 h-3" /> Compliant</span>;
      case 'flagged': 
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700 uppercase tracking-wider border border-amber-200"><AlertCircle className="w-3 h-3" /> Flagged</span>;
      case 'rejected': 
        return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700 uppercase tracking-wider border border-rose-200"><XCircle className="w-3 h-3" /> Rejected</span>;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans antialiased">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setView('dashboard')}>
            <div className="bg-indigo-600 p-2 rounded-lg shadow-indigo-200 shadow-lg text-white">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">Northwind <span className="text-indigo-600">Finance</span></h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">AI Expense Auditor</p>
            </div>
          </div>
          <nav className="flex items-center gap-2">
            <button 
              onClick={() => setView('dashboard')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${view === 'dashboard' ? 'bg-slate-100 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              Dashboard
            </button>
            <button 
              onClick={() => setView('new-submission')}
              className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-sm ${view === 'new-submission' ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
            >
              <Plus className="w-4 h-4" /> New Submission
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-6 py-8 max-w-6xl">
        {view === 'dashboard' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-8">
              <h2 className="text-3xl font-black text-slate-900">Submissions</h2>
              <p className="text-slate-500 font-medium">Review and manage employee expense claims with AI assistance.</p>
            </div>

            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-300">
                    <th className="p-5 font-bold text-slate-700 text-xs uppercase tracking-widest border-r border-slate-300">Employee</th>
                    <th className="p-5 font-bold text-slate-700 text-xs uppercase tracking-widest border-r border-slate-300">Trip Purpose</th>
                    <th className="p-5 font-bold text-slate-700 text-xs uppercase tracking-widest border-r border-slate-300">Date</th>
                    <th className="p-5 font-bold text-slate-700 text-xs uppercase tracking-widest border-r border-slate-300">Status</th>
                    <th className="p-5 font-bold text-slate-700 text-xs uppercase tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {submissions.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <History className="w-12 h-12 text-slate-200" />
                          <p className="text-slate-400 font-medium italic">No submissions found yet.</p>
                          <button onClick={() => setView('new-submission')} className="text-indigo-600 font-bold text-sm hover:underline">Create your first one &rarr;</button>
                        </div>
                      </td>
                    </tr>
                  ) : submissions.map(s => (
                    <tr key={s.id} className="group hover:bg-indigo-50/30 transition-colors cursor-pointer" onClick={() => {
                      setSelectedSubmission(s);
                      setView('detail');
                    }}>
                      <td className="p-5 border-r border-slate-200">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm">
                            {s.employee.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{s.employee.name}</div>
                            <div className="text-xs font-bold text-slate-400">{s.employee.id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-5 border-r border-slate-200">
                        <div className="text-sm font-medium text-slate-700 max-w-xs truncate">{s.trip_purpose}</div>
                      </td>
                      <td className="p-5 border-r border-slate-200">
                        <div className="text-sm font-bold text-slate-600">{new Date(s.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                      </td>
                      <td className="p-5 border-r border-slate-200">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          s.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="p-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={(e) => handleDeleteSubmission(e, s.id)}
                            className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all"
                            title="Delete Submission"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <div className="inline-flex items-center justify-center w-8 h-8 rounded-full group-hover:bg-indigo-600 group-hover:text-white transition-all text-slate-300">
                            <ChevronRight className="w-5 h-5" />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {view === 'new-submission' && (
          <div className="max-w-2xl mx-auto animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-white p-10 rounded-3xl shadow-2xl shadow-slate-200 border border-slate-200">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h2 className="text-3xl font-black text-slate-900">New Submission</h2>
                  <p className="text-slate-500 font-medium">Upload receipts for AI pre-review.</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowNewEmployeeForm(!showNewEmployeeForm)}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  {showNewEmployeeForm ? 'Cancel' : '+ New Employee'}
                </button>
              </div>

              {showNewEmployeeForm ? (
                <form onSubmit={handleCreateEmployee} className="space-y-5 mb-8 p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                  <h3 className="font-black text-indigo-900 text-sm uppercase tracking-widest">Employee Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Employee ID</label>
                      <input required placeholder="NW-00000" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={newEmployee.id} onChange={e => setNewEmployee({...newEmployee, id: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Full Name</label>
                      <input required placeholder="John Doe" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={newEmployee.name} onChange={e => setNewEmployee({...newEmployee, name: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Grade (1-10)</label>
                      <input required type="number" min="1" max="10" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={newEmployee.grade} onChange={e => setNewEmployee({...newEmployee, grade: parseInt(e.target.value)})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Title</label>
                      <input required placeholder="Manager" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={newEmployee.title} onChange={e => setNewEmployee({...newEmployee, title: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Department</label>
                      <input required placeholder="Logistics" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={newEmployee.department} onChange={e => setNewEmployee({...newEmployee, department: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Manager ID</label>
                      <input required placeholder="NW-XXXXX" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={newEmployee.manager_id} onChange={e => setNewEmployee({...newEmployee, manager_id: e.target.value})} />
                    </div>
                    <div className="space-y-1 col-span-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Home Base</label>
                      <input required placeholder="City, State" className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={newEmployee.home_base} onChange={e => setNewEmployee({...newEmployee, home_base: e.target.value})} />
                    </div>
                  </div>
                  <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all">
                    Save Employee Profile
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Select Employee</label>
                    <select 
                      required
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all appearance-none"
                      value={selectedEmployeeId}
                      onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    >
                      <option value="">Choose an employee...</option>
                      {employees.map(e => (
                        <option key={e.id} value={e.id}>{e.name} ({e.id}) — {e.title}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Trip Purpose</label>
                    <input 
                      required
                      type="text" 
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      placeholder="e.g. Quarterly client review in Denver"
                      value={tripPurpose}
                      onChange={(e) => setTripPurpose(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Start Date</label>
                      <input required type="date" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">End Date</label>
                      <input required type="date" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-widest">Receipts</label>
                    <div className="relative group">
                      <div className="flex justify-center px-6 pt-8 pb-8 border-2 border-slate-200 border-dashed rounded-3xl group-hover:border-indigo-400 group-hover:bg-indigo-50/30 transition-all">
                        <div className="space-y-2 text-center">
                          <div className="bg-indigo-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-2 text-indigo-600 group-hover:scale-110 transition-transform">
                            <Upload className="h-6 w-6" />
                          </div>
                          <div className="flex text-sm text-slate-600 justify-center">
                            <label className="relative cursor-pointer font-black text-indigo-600 hover:text-indigo-500">
                              <span>Upload files</span>
                              <input type="file" multiple className="sr-only" onChange={handleFileUpload} />
                            </label>
                            <p className="pl-1 font-medium">or drag and drop</p>
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">PDF, PNG, JPG, TXT up to 10MB</p>
                        </div>
                      </div>
                    </div>
                    {files.length > 0 && (
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        {files.map((f, i) => (
                          <div key={i} className="flex items-center gap-2 p-2 bg-slate-100 rounded-lg text-[10px] font-bold text-slate-600 truncate">
                            <FileText className="w-3 h-3 flex-shrink-0" /> {f.name}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="pt-4 flex gap-4">
                    <button type="button" onClick={() => setView('dashboard')} className="flex-1 py-4 border border-slate-200 rounded-2xl font-bold text-slate-500 hover:bg-slate-50 transition-all">
                      Cancel
                    </button>
                    <button disabled={loading} type="submit" className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 transition-all flex justify-center items-center gap-2">
                      {loading ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</> : 'Submit for Review'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {view === 'detail' && selectedSubmission && (
          <div className="animate-in fade-in slide-in-from-left-4 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-10">
              <button onClick={() => setView('dashboard')} className="group flex items-center gap-2 text-slate-400 hover:text-indigo-600 font-bold transition-colors">
                <div className="p-2 rounded-full group-hover:bg-indigo-50 transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </div>
                Back to Dashboard
              </button>
              <div className="bg-white p-6 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-200 flex-1 w-full md:w-auto">
                <div className="flex flex-wrap gap-8">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Employee</p>
                      <p className="font-bold text-slate-900">{selectedSubmission.employee.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trip Dates</p>
                      <p className="font-bold text-slate-900">{new Date(selectedSubmission.trip_start_date).toLocaleDateString()} - {new Date(selectedSubmission.trip_end_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                      <Info className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Purpose</p>
                      <p className="font-bold text-slate-900">{selectedSubmission.trip_purpose}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-8">
              {selectedSubmission.line_items.map(item => (
                <div key={item.id} className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden group transition-all hover:shadow-2xl hover:shadow-indigo-100/50">
                  <div className="p-8">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-8">
                      <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                          <FileText className="w-8 h-8" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-black text-slate-900">{item.vendor}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-black uppercase tracking-widest">{item.category}</span>
                            <span className="text-slate-300">•</span>
                            <span className="text-xs font-bold text-slate-400">{new Date(item.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right self-stretch md:self-auto flex md:flex-col justify-between items-center md:items-end">
                        <div className="text-3xl font-black text-slate-900 flex items-baseline gap-1">
                          <span className="text-sm text-slate-400 font-bold">{item.currency}</span>
                          {item.amount.toLocaleString()}
                        </div>
                        <div className="mt-2">
                          {getVerdictBadge(item.verdict, item.override_verdict)}
                        </div>
                      </div>
                    </div>

                    <div className="grid lg:grid-cols-3 gap-8">
                      <div className="lg:col-span-2 space-y-6">
                        <div className="bg-slate-50/80 p-6 rounded-2xl border border-slate-100">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                            <MessageSquare className="w-3 h-3" /> AI Auditor Reasoning
                          </h4>
                          <p className="text-sm text-slate-700 leading-relaxed font-medium">{item.reasoning}</p>
                          <div className="mt-4 flex items-center gap-2">
                            <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${item.confidence * 100}%` }}></div>
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase">Confidence: {(item.confidence * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Policy Citations</h4>
                          <div className="grid md:grid-cols-2 gap-3">
                            {item.policy_citations.map((c, i) => (
                              <div key={i} className="group/cite p-4 rounded-2xl bg-white border border-slate-100 hover:border-indigo-200 transition-colors shadow-sm">
                                <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">{c.clause}</div>
                                <p className="text-xs text-slate-500 italic leading-relaxed">"{c.quote}"</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="bg-indigo-50/30 p-6 rounded-3xl border border-indigo-100/50 flex flex-col">
                        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4">Reviewer Action</h4>
                        {item.override_verdict ? (
                          <div className="flex-1 flex flex-col">
                            <div className="bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm mb-4">
                              <div className="text-[10px] font-black text-slate-400 uppercase mb-1">Manual Verdict</div>
                              <div className="font-bold text-indigo-900 mb-3">{item.override_verdict}</div>
                              <div className="text-[10px] font-black text-slate-400 uppercase mb-1">Comment</div>
                              <div className="text-sm text-slate-600 italic font-medium">"{item.override_comment}"</div>
                            </div>
                            <button 
                              onClick={() => handleOverride(item.id, null, null)}
                              className="mt-auto w-full py-3 text-xs font-black text-indigo-600 hover:bg-indigo-100/50 rounded-xl transition-colors"
                            >
                              Clear Override
                            </button>
                          </div>
                        ) : (
                          <div className="flex-1 flex flex-col gap-3">
                            <p className="text-xs font-bold text-slate-500 mb-2">Does this look correct? You can override the AI's decision below.</p>
                            <button 
                              onClick={() => handleOverride(item.id, 'Compliant', 'Manually approved')}
                              className="w-full py-3 bg-white border border-emerald-200 text-emerald-700 rounded-xl text-xs font-black hover:bg-emerald-50 transition-all shadow-sm"
                            >
                              Approve Item
                            </button>
                            <button 
                              onClick={() => {
                                const comment = prompt("Enter reason for flagging:");
                                if (comment) handleOverride(item.id, 'Flagged', comment);
                              }}
                              className="w-full py-3 bg-white border border-amber-200 text-amber-700 rounded-xl text-xs font-black hover:bg-amber-50 transition-all shadow-sm"
                            >
                              Flag for Review
                            </button>
                            <button 
                              onClick={() => {
                                const comment = prompt("Enter reason for rejection:");
                                if (comment) handleOverride(item.id, 'Rejected', comment);
                              }}
                              className="w-full py-3 bg-white border border-rose-200 text-rose-700 rounded-xl text-xs font-black hover:bg-rose-50 transition-all shadow-sm"
                            >
                              Reject Item
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Policy Chat Sidebar */}
      <div className={`fixed right-0 top-0 h-full w-[22rem] bg-white shadow-[0_0_50px_rgba(0,0,0,0.1)] border-l border-slate-200 transition-all duration-500 ease-in-out z-50 flex flex-col ${chatOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500 p-1.5 rounded-lg">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <span className="font-black text-sm uppercase tracking-widest">Policy Assistant</span>
              <p className="text-[10px] text-slate-400 font-bold">Grounded in Northwind Docs</p>
            </div>
          </div>
          <button onClick={() => setChatOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-2xl">&times;</button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          {chatHistory.length === 0 && (
            <div className="text-center mt-12 px-4">
              <div className="w-16 h-16 bg-white rounded-3xl shadow-sm border border-slate-100 flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-slate-200" />
              </div>
              <h4 className="font-bold text-slate-900 mb-1">How can I help?</h4>
              <p className="text-xs text-slate-400 font-medium leading-relaxed">Ask me anything about Northwind's travel and expense policies.</p>
              <div className="mt-8 space-y-2">
                {["What is the dinner cap?", "Is alcohol reimbursable?", "International travel rules"].map((q, i) => (
                  <button key={i} onClick={() => {setQuestion(q)}} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-500 hover:border-indigo-300 hover:text-indigo-600 transition-all text-left uppercase tracking-wider">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          {chatHistory.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
              <div className={`max-w-[90%] p-4 rounded-2xl text-sm shadow-sm ${
                msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-white text-slate-800 rounded-bl-none border border-slate-100'
              }`}>
                <p className="leading-relaxed font-medium">{msg.content}</p>
                {msg.citations && (
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sources</p>
                    {msg.citations.map((c, ci) => (
                      <div key={ci} className="flex items-center gap-2 text-[10px] text-indigo-600 font-bold bg-indigo-50 p-1.5 rounded-lg truncate" title={c.text}>
                        <FileText className="w-3 h-3 flex-shrink-0" /> {c.source}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div className="flex justify-start">
              <div className="bg-white p-4 rounded-2xl rounded-bl-none border border-slate-100 shadow-sm">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
              </div>
            </div>
          )}
        </div>

        <form onSubmit={askPolicy} className="p-6 bg-white border-t border-slate-100">
          <div className="flex gap-2">
            <input 
              type="text" 
              className="flex-1 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              placeholder="Ask a policy question..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
            />
            <button type="submit" className="px-4 bg-indigo-600 text-white rounded-2xl flex items-center justify-center hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200">
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>

      {/* Chat Toggle Button */}
      {!chatOpen && (
        <button 
          onClick={() => setChatOpen(true)}
          className="fixed bottom-4 right-8 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl hover:bg-indigo-600 hover:-translate-y-1 transition-all flex items-center gap-3 z-40 group"
        >
          <div className="relative">
            <MessageSquare className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-500 rounded-full border-2 border-slate-900 group-hover:border-indigo-600"></span>
          </div>
          <span className="font-black text-sm uppercase tracking-widest">Policy Help</span>
        </button>
      )}

      {/* Footer */}
      <footer className="p-8 text-center">
        <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">&copy; 2026 Northwind Logistics • Confidential Financial System</p>
      </footer>
    </div>
  );
}

export default App;
