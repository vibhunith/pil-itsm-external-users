'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Alert from '@/components/ui/Alert';
import Spinner from '@/components/ui/Spinner';
import { CheckCircle2, Upload, X, FileText, Image as ImageIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import SimilarTicketsPanel from '@/components/tickets/SimilarTicketsPanel';
import type { SystemItem, ModuleItem, SubModuleItem } from '@/types/master';

const STEPS = [
  { id: 1, label: 'Issue Scope' },
  { id: 2, label: 'Module Mapping' },
  { id: 3, label: 'Problem Assessment' },
  { id: 4, label: 'Issue Details' },
  { id: 5, label: 'Review & Submit' },
];

const URGENCY_OPTIONS = [
  { value: 'Critical', label: 'Critical' },
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' },
];

const MAX_FILES = 6;
const MAX_FILE_SIZE_MB = 40;
const ALLOWED_TYPES = [
  'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/zip',
];

export default function CreateTicketPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successTicket, setSuccessTicket] = useState('');

  const [subject, setSubject] = useState('');
  const [system, setSystem] = useState('');
  const [systemId, setSystemId] = useState('');
  const [module, setModule] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [subModule, setSubModule] = useState('');
  const [subModuleId, setSubModuleId] = useState('');
  const [urgency, setUrgency] = useState('');
  const [impact, setImpact] = useState('');
  const [priority, setPriority] = useState('');
  const [issueDescription, setIssueDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);

  const [systems, setSystems] = useState<SystemItem[]>([]);
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [subModules, setSubModules] = useState<SubModuleItem[]>([]);
  const [loadingSystems, setLoadingSystems] = useState(true);
  const [loadingModules, setLoadingModules] = useState(false);
  const [loadingSubModules, setLoadingSubModules] = useState(false);
  const [slaPreview, setSlaPreview] = useState<{ priority: string; respond: string; resolve: string } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/masters/systems')
      .then((r) => r.json())
      .then((data) => setSystems(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoadingSystems(false));
  }, []);

  useEffect(() => {
    if (!system) { setModules([]); setModule(''); setModuleId(''); setSubModule(''); setSubModuleId(''); return; }
    const found = systems.find((s) => s.system === system);
    const sid = found?.id ?? systemId;
    if (!sid) return;
    setLoadingModules(true);
    setModule(''); setModuleId(''); setSubModule(''); setSubModuleId(''); setSubModules([]);
    fetch(`/api/masters/modules?systemId=${encodeURIComponent(sid)}`)
      .then((r) => r.json())
      .then((data) => setModules(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoadingModules(false));
  }, [system, systems]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!moduleId) { setSubModules([]); setSubModule(''); setSubModuleId(''); return; }
    setLoadingSubModules(true);
    setSubModule('');
    fetch(`/api/masters/submodules?moduleId=${moduleId}`)
      .then((r) => r.json())
      .then((data) => setSubModules(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoadingSubModules(false));
  }, [moduleId]);

  const fetchSLA = useCallback(async () => {
    if (!urgency || !impact) { setSlaPreview(null); return; }
    try {
      const res = await fetch(`/api/sla?urgency=${urgency}&impact=${impact}`);
      const data = await res.json();
      if (data.policy) {
        setPriority(data.policy.priority);
        setSlaPreview({
          priority: data.policy.priority,
          respond: data.sla?.initialResponseClockSLA ? new Date(data.sla.initialResponseClockSLA).toLocaleString() : '—',
          resolve: data.sla?.initialResolutionClockSLA ? new Date(data.sla.initialResolutionClockSLA).toLocaleString() : '—',
        });
      } else {
        setPriority(urgency);
        setSlaPreview(null);
      }
    } catch { setSlaPreview(null); }
  }, [urgency, impact]);

  useEffect(() => { fetchSLA(); }, [fetchSLA]);

  function handleFiles(incoming: FileList | null) {
    if (!incoming) return;
    const errs: string[] = [];
    const valid: File[] = [];
    Array.from(incoming).forEach((f) => {
      if (files.length + valid.length >= MAX_FILES) { errs.push(`Max ${MAX_FILES} files allowed.`); return; }
      if (f.size > MAX_FILE_SIZE_MB * 1024 * 1024) { errs.push(`${f.name} exceeds ${MAX_FILE_SIZE_MB}MB limit.`); return; }
      if (!ALLOWED_TYPES.includes(f.type) && !f.type.startsWith('image/')) { errs.push(`${f.name}: unsupported file type.`); return; }
      valid.push(f);
    });
    setFiles((prev) => [...prev, ...valid]);
    setFileErrors(errs);
  }

  function validateStep(s: number): boolean {
    const errs: Record<string, string> = {};
    if (s === 1) {
      if (!subject.trim()) errs.subject = 'Please describe your need.';
      else if (subject.length > 250) errs.subject = 'Max 250 characters.';
    }
    if (s === 2) {
      if (!system) errs.system = 'Please select a system.';
      if (!module) errs.module = 'Please select a module.';
    }
    if (s === 3) {
      if (!urgency) errs.urgency = 'Please select urgency.';
      if (!impact) errs.impact = 'Please select impact.';
    }
    if (s === 4) {
      const text = issueDescription.replace(/<[^>]+>/g, '').trim();
      if (text.length < 20) errs.issueDescription = 'Description must be at least 20 characters.';
      else if (text.length > 5000) errs.issueDescription = 'Description must not exceed 5000 characters.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function nextStep() {
    if (validateStep(step)) setStep((s) => Math.min(s + 1, STEPS.length));
  }

  function prevStep() {
    setStep((s) => Math.max(s - 1, 1));
  }

  async function handleSubmit() {
    if (!validateStep(4)) { setStep(4); return; }
    setSubmitting(true);
    setSubmitError('');
    try {
      const formData = new FormData();
      formData.append('subject', subject);
      formData.append('system', system);
      formData.append('systemId', systemId);
      formData.append('module', module);
      formData.append('moduleId', moduleId);
      formData.append('subModule', subModule);
      formData.append('subModuleId', subModuleId);
      formData.append('urgency', urgency);
      formData.append('impact', impact);
      formData.append('issueDescription', issueDescription);
      files.forEach((f) => formData.append('attachments', f));
      const res = await fetch('/api/tickets', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) { setSubmitError(data.error ?? 'Failed to create ticket. Please try again.'); return; }
      setSuccessTicket(data.incidentID);
    } catch {
      setSubmitError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success screen ──
  if (successTicket) {
    return (
      <div className="max-w-xl mx-auto mt-16 text-center">
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-10">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mx-auto mb-4">
            <CheckCircle2 className="h-9 w-9 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Ticket Created Successfully!</h2>
          <p className="text-gray-500 mb-1 text-sm">Your ticket number is</p>
          <p className="font-bold text-[#003087] text-2xl mb-4">{successTicket}</p>
          <p className="text-sm text-gray-400 mb-7">
            Our support team will review your request and respond within the SLA timeframe.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => router.push('/tickets')}>View My Tickets</Button>
            <Button onClick={() => router.push('/dashboard')}>Back to Home</Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Stepper UI ──
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">Raise an Issue</h1>
        <p className="text-sm text-gray-500">Submit a new IT support request</p>
      </div>

      {/* Step indicator */}
      <div className="mb-6">
        <div className="flex items-center">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                    s.id < step
                      ? 'bg-green-500 text-white'
                      : s.id === step
                      ? 'bg-[#003087] text-white'
                      : 'bg-gray-100 text-gray-400 border border-gray-200'
                  }`}
                >
                  {s.id < step ? <CheckCircle2 className="h-4 w-4" /> : s.id}
                </div>
                <span className={`mt-1.5 text-[10px] font-medium hidden sm:block ${
                  s.id === step ? 'text-[#003087]' : s.id < step ? 'text-green-600' : 'text-gray-400'
                }`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 mx-2 transition-colors ${s.id < step ? 'bg-green-400' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Card */}
      <div className="rounded-xl bg-white border border-gray-200 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 rounded-t-xl">
          <h2 className="font-semibold text-gray-700 text-sm">{STEPS[step - 1].label}</h2>
        </div>

        <div className="p-6 space-y-5">

          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-4">
              <Input
                label="What best describes your need?"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Unable to access SAP — login fails with error code 403"
                maxLength={250}
                error={errors.subject}
                helperText={`${subject.length}/250 characters`}
              />
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="space-y-4">
              {loadingSystems ? (
                <div className="flex justify-center py-8"><Spinner /></div>
              ) : (
                <>
                  <Select
                    label="System"
                    required
                    options={systems.map((s) => ({ value: s.system, label: s.system }))}
                    value={system}
                    onChange={(e) => {
                      setSystem(e.target.value);
                      const found = systems.find((s) => s.system === e.target.value);
                      setSystemId(found?.id ?? '');
                    }}
                    placeholder="Select System"
                    error={errors.system}
                  />
                  <div className="relative">
                    <Select
                      label="Module"
                      required
                      options={modules.map((m) => ({ value: m.id, label: m.module }))}
                      value={moduleId}
                      onChange={(e) => {
                        setModuleId(e.target.value);
                        const found = modules.find((m) => m.id === e.target.value);
                        setModule(found?.module ?? '');
                      }}
                      placeholder={!system ? 'Select a system first' : 'Select Module'}
                      disabled={!system || loadingModules}
                      error={errors.module}
                    />
                    {loadingModules && <Spinner size="sm" className="absolute right-8 top-9" />}
                  </div>
                  <div className="relative">
                    <Select
                      label="Sub Module"
                      options={subModules.map((sm) => ({ value: sm.id, label: sm.subModule }))}
                      value={subModuleId}
                      onChange={(e) => {
                        setSubModuleId(e.target.value);
                        const found = subModules.find((sm) => sm.id === e.target.value);
                        setSubModule(found?.subModule ?? '');
                      }}
                      placeholder={!module ? 'Select a module first' : subModules.length === 0 ? 'No submodules available' : 'Select Sub Module'}
                      disabled={!module || loadingSubModules || subModules.length === 0}
                    />
                    {loadingSubModules && <Spinner size="sm" className="absolute right-8 top-9" />}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="space-y-4">
              <Select
                label="Urgency"
                required
                options={URGENCY_OPTIONS}
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                placeholder="Select Urgency"
                error={errors.urgency}
              />
              <Select
                label="Impact"
                required
                options={URGENCY_OPTIONS}
                value={impact}
                onChange={(e) => setImpact(e.target.value)}
                placeholder="Select Impact"
                error={errors.impact}
              />
              {slaPreview && (
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 space-y-2">
                  <p className="text-sm font-semibold text-[#003087]">SLA Policy Applied</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-600">
                    <div>
                      <p className="font-medium text-gray-500">Priority</p>
                      <p className="font-bold text-gray-800">{slaPreview.priority}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-500">Response By</p>
                      <p className="font-semibold text-gray-800">{slaPreview.respond}</p>
                    </div>
                    <div>
                      <p className="font-medium text-gray-500">Resolution By</p>
                      <p className="font-semibold text-gray-800">{slaPreview.resolve}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4 */}
          {step === 4 && (
            <div className="space-y-5">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">
                  Issue Description <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-gray-400 mb-1">You can paste text, screenshots, and images directly into the editor below.</p>
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) => setIssueDescription((e.target as HTMLDivElement).innerHTML)}
                  onPaste={(e) => {
                    const items = Array.from(e.clipboardData?.items ?? []);
                    const imageItem = items.find((item) => item.type.startsWith('image/'));
                    if (imageItem) {
                      const blob = imageItem.getAsFile();
                      if (blob) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          const img = document.createElement('img');
                          img.src = ev.target?.result as string;
                          img.style.maxWidth = '100%';
                          document.execCommand('insertHTML', false, img.outerHTML);
                        };
                        reader.readAsDataURL(blob);
                        e.preventDefault();
                      }
                    }
                  }}
                  className={`min-h-[200px] w-full rounded-md border px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#003087]/20 focus:border-[#003087] ${
                    errors.issueDescription ? 'border-red-400' : 'border-gray-300'
                  }`}
                  style={{ whiteSpace: 'pre-wrap' }}
                />
                {errors.issueDescription && <p className="text-xs text-red-600">{errors.issueDescription}</p>}
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Attachments <span className="text-gray-400 font-normal">(Max {MAX_FILES} files, {MAX_FILE_SIZE_MB}MB each)</span>
                </label>
                <div
                  className="rounded-lg border-2 border-dashed border-gray-200 p-6 text-center hover:border-[#003087] transition-colors cursor-pointer bg-gray-50"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mx-auto h-8 w-8 text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">
                    Drag & drop files here, or <span className="text-[#003087] font-medium">browse</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF, PDF, DOCX, XLSX, PPTX, ZIP (max {MAX_FILE_SIZE_MB}MB each)</p>
                  <input ref={fileInputRef} type="file" multiple className="hidden" accept={ALLOWED_TYPES.join(',')} onChange={(e) => handleFiles(e.target.files)} />
                </div>
                {fileErrors.length > 0 && (
                  <div className="space-y-1">
                    {fileErrors.map((e, i) => <Alert key={i} message={e} variant="error" />)}
                  </div>
                )}
                {files.length > 0 && (
                  <ul className="space-y-2">
                    {files.map((f, i) => (
                      <li key={i} className="flex items-center justify-between gap-2 rounded-md border border-gray-200 bg-gray-50 px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {f.type.startsWith('image/') ? <ImageIcon className="h-4 w-4 text-blue-400 flex-shrink-0" /> : <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />}
                          <span className="text-sm text-gray-700 truncate">{f.name}</span>
                          <span className="text-xs text-gray-400 flex-shrink-0">({(f.size / 1024 / 1024).toFixed(1)} MB)</span>
                        </div>
                        <button type="button" onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))} className="text-gray-400 hover:text-red-500 flex-shrink-0">
                          <X className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Step 5 — Review */}
          {step === 5 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Please review your ticket details before submitting.</p>
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-100">
                    {[
                      ['Subject', subject],
                      ['System', system],
                      ['Module', module],
                      ['Sub Module', subModule || '—'],
                      ['Urgency', urgency],
                      ['Impact', impact],
                      ['Priority', priority || urgency],
                      ['Attachments', files.length > 0 ? `${files.length} file(s)` : 'None'],
                    ].map(([label, value]) => (
                      <tr key={label}>
                        <td className="px-4 py-2.5 text-gray-500 font-medium w-1/3 bg-gray-50">{label}</td>
                        <td className="px-4 py-2.5 text-gray-800">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Issue Description Preview</p>
                <div
                  className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 max-h-32 overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: issueDescription || '<em>Empty</em>' }}
                />
              </div>
              {submitError && <Alert message={submitError} variant="error" />}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
          <Button
            variant="outline"
            onClick={step === 1 ? () => void 0 : prevStep}
            disabled={step === 1}
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>

          {step < STEPS.length ? (
            <Button onClick={nextStep}>
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} loading={submitting}>
              Submit Ticket
            </Button>
          )}
        </div>
      </div>

      {/* Surface existing tickets with similar context while the user is drafting */}
      {step <= 4 && (
        <SimilarTicketsPanel
          subject={subject}
          issueDescription={issueDescription}
          system={system}
          module={module}
          subModule={subModule}
        />
      )}
    </div>
  );
}
