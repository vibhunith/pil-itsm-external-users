'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Alert from '@/components/ui/Alert';
import Spinner from '@/components/ui/Spinner';
import { CheckCircle2, ChevronLeft, ChevronRight, FileText, Image as ImageIcon, Upload, X } from 'lucide-react';

interface CategorizationItem {
  id: string;
  title: string;
}

const STEPS = [
  { id: 1, label: 'Service Type' },
  { id: 2, label: 'Categorization' },
  { id: 3, label: 'Request Details' },
  { id: 4, label: 'Additional Details' },
  { id: 5, label: 'Review & Submit' },
];

const URGENCY_OPTIONS = [
  { value: 'Critical', label: 'Critical' },
  { value: 'High', label: 'High' },
  { value: 'Medium', label: 'Medium' },
  { value: 'Low', label: 'Low' },
];

const MAX_SCOPE_LENGTH = 1500;
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

export default function CreateServiceRequestPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [successID, setSuccessID] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Step 1 — Service Type
  const [serviceTypeId, setServiceTypeId] = useState('');
  const [serviceTypeName, setServiceTypeName] = useState('');
  const [serviceTypes, setServiceTypes] = useState<CategorizationItem[]>([]);
  const [loadingServiceTypes, setLoadingServiceTypes] = useState(true);

  // Step 2 — Categorization
  const [systemId, setSystemId] = useState('');
  const [systemName, setSystemName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');
  const [subCategoryName, setSubCategoryName] = useState('');
  const [systems, setSystems] = useState<CategorizationItem[]>([]);
  const [categories, setCategories] = useState<CategorizationItem[]>([]);
  const [subCategories, setSubCategories] = useState<CategorizationItem[]>([]);
  const [loadingSystems, setLoadingSystems] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingSubCategories, setLoadingSubCategories] = useState(false);

  // Step 3 — Request Details
  const [subject, setSubject] = useState('');
  const [scope, setScope] = useState('');
  const [urgency, setUrgency] = useState('');

  // Step 4 — Additional Details
  const [remarks, setRemarks] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);

  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Load service types from SP — filter to only these 3 allowed names
  const ALLOWED_SERVICE_TYPES = ['IT Service', 'Cloud Service Request', 'Central Data Platform'];
  useEffect(() => {
    fetch('/api/service-requests/categorization?type=Service+Type')
      .then((r) => r.json())
      .then((data: CategorizationItem[]) => {
        const all = Array.isArray(data) ? data : [];
        // Preserve SP item IDs (needed for system cascade), show only allowed names in order
        const filtered = ALLOWED_SERVICE_TYPES
          .map((name) => all.find((t) => t.title === name))
          .filter(Boolean) as CategorizationItem[];
        setServiceTypes(filtered.length > 0 ? filtered : all);
      })
      .catch(console.error)
      .finally(() => setLoadingServiceTypes(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load systems when service type changes
  useEffect(() => {
    if (!serviceTypeId) {
      setSystems([]); setSystemId(''); setSystemName('');
      setCategories([]); setCategoryId(''); setCategoryName('');
      setSubCategories([]); setSubCategoryId(''); setSubCategoryName('');
      return;
    }
    setLoadingSystems(true);
    setSystems([]); setSystemId(''); setSystemName('');
    setCategories([]); setCategoryId(''); setCategoryName('');
    setSubCategories([]); setSubCategoryId(''); setSubCategoryName('');
    fetch(`/api/service-requests/categorization?type=System&parentId=${encodeURIComponent(serviceTypeId)}`)
      .then((r) => r.json())
      .then((data) => setSystems(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoadingSystems(false));
  }, [serviceTypeId]);

  // Load categories when system changes
  useEffect(() => {
    if (!systemId) {
      setCategories([]); setCategoryId(''); setCategoryName('');
      setSubCategories([]); setSubCategoryId(''); setSubCategoryName('');
      return;
    }
    setLoadingCategories(true);
    setCategories([]); setCategoryId(''); setCategoryName('');
    setSubCategories([]); setSubCategoryId(''); setSubCategoryName('');
    fetch(`/api/service-requests/categorization?type=Category&parentId=${encodeURIComponent(systemId)}`)
      .then((r) => r.json())
      .then((data) => setCategories(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoadingCategories(false));
  }, [systemId]);

  // Load subcategories when category changes
  useEffect(() => {
    if (!categoryId) {
      setSubCategories([]); setSubCategoryId(''); setSubCategoryName('');
      return;
    }
    setLoadingSubCategories(true);
    setSubCategories([]); setSubCategoryId(''); setSubCategoryName('');
    fetch(`/api/service-requests/categorization?type=SubCategory&parentId=${encodeURIComponent(categoryId)}`)
      .then((r) => r.json())
      .then((data) => setSubCategories(Array.isArray(data) ? data : []))
      .catch(console.error)
      .finally(() => setLoadingSubCategories(false));
  }, [categoryId]);

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

  function handleImageInsert(file: File) {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = document.createElement('img');
      img.src = ev.target?.result as string;
      img.style.maxWidth = '100%';
      img.style.borderRadius = '4px';
      img.style.marginTop = '4px';
      if (editorRef.current) {
        editorRef.current.focus();
        document.execCommand('insertHTML', false, img.outerHTML);
        setRemarks(editorRef.current.innerHTML);
      }
    };
    reader.readAsDataURL(file);
  }

  function validateStep(s: number): boolean {
    const errs: Record<string, string> = {};
    if (s === 1) {
      if (!serviceTypeId) errs.serviceType = 'Please select a Service Type.';
    }
    if (s === 2) {
      if (!systemId) errs.system = 'Please select a System.';
      if (!categoryId) errs.category = 'Please select a Category.';
    }
    if (s === 3) {
      if (!subject.trim()) errs.subject = 'Please enter a subject.';
      else if (subject.length > 250) errs.subject = 'Max 250 characters.';
      if (!scope.trim()) errs.scope = 'Please describe the scope of request.';
      else if (scope.length > MAX_SCOPE_LENGTH) errs.scope = `Max ${MAX_SCOPE_LENGTH} characters.`;
      if (!urgency) errs.urgency = 'Please select urgency.';
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
    setSubmitting(true);
    setSubmitError('');
    try {
      const formData = new FormData();
      formData.append('serviceTypeName', serviceTypeName);
      formData.append('systemName', systemName);
      formData.append('categoryName', categoryName);
      if (subCategoryName) formData.append('subCategoryName', subCategoryName);
      formData.append('subject', subject);
      formData.append('scope', scope);
      formData.append('urgency', urgency);
      if (remarks) formData.append('remarks', remarks);
      files.forEach((f) => formData.append('attachments', f));

      const res = await fetch('/api/service-requests', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error ?? 'Failed to create service request. Please try again.');
        return;
      }
      setSuccessID(data.serviceID);
    } catch {
      setSubmitError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  // ── Success screen ──
  if (successID) {
    return (
      <div className="max-w-xl mx-auto mt-16 text-center">
        <div className="rounded-2xl bg-white border border-gray-200 shadow-sm p-10">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mx-auto mb-4">
            <CheckCircle2 className="h-9 w-9 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Service Request Created!</h2>
          <p className="text-gray-500 mb-1 text-sm">Your service request number is</p>
          <p className="font-bold text-[#003087] text-2xl mb-4">{successID}</p>
          <p className="text-sm text-gray-400 mb-7">
            Our service team will review your request and get back to you shortly.
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => router.push('/service-requests')}>
              My Service Requests
            </Button>
            <Button onClick={() => router.push('/dashboard')}>Back to Home</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">Raise a Service Request</h1>
        <p className="text-sm text-gray-500">Submit a new IT service request</p>
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
                <span
                  className={`mt-1.5 text-[10px] font-medium hidden sm:block ${
                    s.id === step ? 'text-[#003087]' : s.id < step ? 'text-green-600' : 'text-gray-400'
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`h-0.5 flex-1 mx-2 transition-colors ${
                    s.id < step ? 'bg-green-400' : 'bg-gray-200'
                  }`}
                />
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

          {/* Step 1 — Service Type */}
          {step === 1 && (
            <div className="space-y-4">
              {loadingServiceTypes ? (
                <div className="flex justify-center py-8"><Spinner /></div>
              ) : (
                <>
                  <p className="text-sm text-gray-500">
                    Select the type of service you need. This determines the available systems and categories.
                  </p>
                  <Select
                    label="Service Type"
                    required
                    options={serviceTypes.map((t) => ({ value: t.id, label: t.title }))}
                    value={serviceTypeId}
                    onChange={(e) => {
                      setServiceTypeId(e.target.value);
                      const found = serviceTypes.find((t) => t.id === e.target.value);
                      setServiceTypeName(found?.title ?? '');
                    }}
                    placeholder="Select Service Type"
                    error={errors.serviceType}
                  />
                  {serviceTypeName && (
                    <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3">
                      <p className="text-xs font-medium text-[#003087]">Selected</p>
                      <p className="text-sm font-semibold text-gray-800 mt-0.5">{serviceTypeName}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Step 2 — Categorization */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">
                Select the system, category, and subcategory for your request under{' '}
                <span className="font-medium text-gray-700">{serviceTypeName}</span>.
              </p>

              <div className="relative">
                <Select
                  label="System"
                  required
                  options={systems.map((s) => ({ value: s.id, label: s.title }))}
                  value={systemId}
                  onChange={(e) => {
                    setSystemId(e.target.value);
                    const found = systems.find((s) => s.id === e.target.value);
                    setSystemName(found?.title ?? '');
                  }}
                  placeholder={loadingSystems ? 'Loading systems…' : systems.length === 0 ? 'No systems available' : 'Select System'}
                  disabled={loadingSystems || systems.length === 0}
                  error={errors.system}
                />
                {loadingSystems && <Spinner size="sm" className="absolute right-8 top-9" />}
              </div>

              <div className="relative">
                <Select
                  label="Category"
                  required
                  options={categories.map((c) => ({ value: c.id, label: c.title }))}
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    const found = categories.find((c) => c.id === e.target.value);
                    setCategoryName(found?.title ?? '');
                  }}
                  placeholder={!systemId ? 'Select a System first' : loadingCategories ? 'Loading…' : categories.length === 0 ? 'No categories available' : 'Select Category'}
                  disabled={!systemId || loadingCategories || categories.length === 0}
                  error={errors.category}
                />
                {loadingCategories && <Spinner size="sm" className="absolute right-8 top-9" />}
              </div>

              <div className="relative">
                <Select
                  label="Sub Category"
                  options={subCategories.map((sc) => ({ value: sc.id, label: sc.title }))}
                  value={subCategoryId}
                  onChange={(e) => {
                    setSubCategoryId(e.target.value);
                    const found = subCategories.find((sc) => sc.id === e.target.value);
                    setSubCategoryName(found?.title ?? '');
                  }}
                  placeholder={!categoryId ? 'Select a Category first' : loadingSubCategories ? 'Loading…' : subCategories.length === 0 ? 'No subcategories available' : 'Select Sub Category'}
                  disabled={!categoryId || loadingSubCategories || subCategories.length === 0}
                />
                {loadingSubCategories && <Spinner size="sm" className="absolute right-8 top-9" />}
              </div>
            </div>
          )}

          {/* Step 3 — Request Details */}
          {step === 3 && (
            <div className="space-y-4">
              <Input
                label="Subject"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Brief description of your service request"
                maxLength={250}
                error={errors.subject}
                helperText={`${subject.length}/250 characters`}
              />

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">
                  Scope of Request <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  rows={6}
                  maxLength={MAX_SCOPE_LENGTH}
                  placeholder="Describe what you need in detail — include business justification, expected outcome, and any relevant context…"
                  className={`block w-full rounded-md border px-3 py-2 text-sm text-gray-900 shadow-sm transition-colors focus:outline-none focus:ring-1 focus:ring-[#003087] focus:border-[#003087] resize-none ${
                    errors.scope ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                <div className="flex justify-between items-center">
                  {errors.scope
                    ? <p className="text-xs text-red-600">{errors.scope}</p>
                    : <span />
                  }
                  <p className={`text-xs ml-auto ${scope.length > MAX_SCOPE_LENGTH * 0.9 ? 'text-amber-500' : 'text-gray-400'}`}>
                    {scope.length}/{MAX_SCOPE_LENGTH}
                  </p>
                </div>
              </div>

              <Select
                label="Urgency"
                required
                options={URGENCY_OPTIONS}
                value={urgency}
                onChange={(e) => setUrgency(e.target.value)}
                placeholder="Select Urgency"
                error={errors.urgency}
              />
            </div>
          )}

          {/* Step 4 — Additional Details */}
          {step === 4 && (
            <div className="space-y-5">
              {/* Remarks rich editor */}
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    Remarks <span className="text-gray-400 font-normal text-xs">(optional)</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-500 hover:text-[#003087] hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <ImageIcon className="h-4 w-4" />
                    Add Image
                  </button>
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleImageInsert(f);
                      e.target.value = '';
                    }}
                  />
                </div>
                <p className="text-xs text-gray-400 mb-1">
                  You can paste text, screenshots, and images directly into the editor.
                </p>
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={(e) => setRemarks((e.target as HTMLDivElement).innerHTML)}
                  onPaste={(e) => {
                    const items = Array.from(e.clipboardData?.items ?? []);
                    const imageItem = items.find((item) => item.type.startsWith('image/'));
                    if (imageItem) {
                      const blob = imageItem.getAsFile();
                      if (blob) { e.preventDefault(); handleImageInsert(blob); }
                    }
                  }}
                  className="min-h-[180px] w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#003087]/20 focus:border-[#003087]"
                  style={{ whiteSpace: 'pre-wrap' }}
                />
              </div>

              {/* Attachments */}
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
                  <p className="text-xs text-gray-400 mt-1">
                    PNG, JPG, PDF, DOCX, XLSX, ZIP (max {MAX_FILE_SIZE_MB}MB each)
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={ALLOWED_TYPES.join(',')}
                    className="hidden"
                    onChange={(e) => handleFiles(e.target.files)}
                  />
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
                          {f.type.startsWith('image/')
                            ? <ImageIcon className="h-4 w-4 text-blue-400 flex-shrink-0" />
                            : <FileText className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          }
                          <span className="text-sm text-gray-700 truncate">{f.name}</span>
                          <span className="text-xs text-gray-400 flex-shrink-0">({(f.size / 1024 / 1024).toFixed(1)} MB)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                          className="text-gray-400 hover:text-red-500 flex-shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Step 5 — Review & Submit */}
          {step === 5 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Review your service request before submitting.</p>

              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-100">
                    {[
                      ['Service Type', serviceTypeName],
                      ['System', systemName],
                      ['Category', categoryName],
                      ['Sub Category', subCategoryName || '—'],
                      ['Subject', subject],
                      ['Urgency', urgency],
                      ['Attachments', files.length > 0 ? `${files.length} file(s)` : 'None'],
                    ].map(([label, value]) => (
                      <tr key={label}>
                        <td className="px-4 py-2.5 text-gray-500 font-medium w-1/3 bg-gray-50 whitespace-nowrap">{label}</td>
                        <td className="px-4 py-2.5 text-gray-800">{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 mb-1">Scope of Request</p>
                <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 max-h-28 overflow-y-auto whitespace-pre-wrap">
                  {scope || <em className="text-gray-400">Empty</em>}
                </div>
              </div>

              {remarks && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Remarks</p>
                  <div
                    className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 max-h-28 overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: remarks }}
                  />
                </div>
              )}

              {submitError && <Alert message={submitError} variant="error" />}
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
          <Button
            variant="outline"
            onClick={step === 1 ? () => router.push('/service-requests') : prevStep}
          >
            <ChevronLeft className="h-4 w-4" />
            {step === 1 ? 'Cancel' : 'Back'}
          </Button>

          {step < STEPS.length ? (
            <Button onClick={nextStep}>
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} loading={submitting}>
              Submit Request
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
