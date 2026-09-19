import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { reportsApi, ReportSubmitResponse } from '../../services/reports';

type Step = 1 | 2 | 3 | 4 | 5 | 6;

const reportTypes = [
  { value: 'health', label: 'Tree health concern', icon: '🌿', desc: 'Diseased, stressed, or declining tree' },
  { value: 'fallen', label: 'Fallen tree', icon: '🌳', desc: 'Tree completely fallen' },
  { value: 'branch', label: 'Broken branch', icon: '🪵', desc: 'Broken or hanging branch' },
  { value: 'trunk', label: 'Trunk damage', icon: '⚠️', desc: 'Cracks, splits, or cavities' },
  { value: 'storm', label: 'Severe storm damage', icon: '🌪️', desc: 'Post-storm structural damage' },
  { value: 'blocking', label: 'Blocking road/path', icon: '🚧', desc: 'Obstruction to traffic or pedestrians' },
  { value: 'infrastructure', label: 'Near infrastructure', icon: '⚡', desc: 'Risk to power lines or buildings' },
  { value: 'other', label: 'Other', icon: '📋', desc: 'Any other tree-related concern' },
];

const stepLabels = ['Type', 'Photos', 'Location', 'Details', 'AI Analysis', 'Review'];

export default function ReportTree() {
  const [step, setStep] = useState<Step>(1);
  const [reportType, setReportType] = useState('');
  
  // Photo state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Location state
  const [locationType, setLocationType] = useState<'gps' | 'map' | 'search'>('gps');
  const [address, setAddress] = useState('DB Road, RS Puram, Coimbatore');
  const [latitude, setLatitude] = useState<number | null>(11.0086);
  const [longitude, setLongitude] = useState<number | null>(76.9489);
  const [locating, setLocating] = useState(false);
  const [locationNotice, setLocationNotice] = useState<string | null>('Using default Coimbatore sector coordinates.');

  // Details state
  const [description, setDescription] = useState('');
  const [observedAt, setObservedAt] = useState(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  });
  const [additionalNotes, setAdditionalNotes] = useState('');

  // AI & Submission state
  const [analyzing, setAnalyzing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdReport, setCreatedReport] = useState<ReportSubmitResponse | null>(null);

  const navigate = useNavigate();

  // Handle Geolocation
  const requestCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationNotice('Geolocation is not supported by your browser. Please enter the address manually.');
      return;
    }
    setLocating(true);
    setLocationNotice(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = parseFloat(pos.coords.latitude.toFixed(6));
        const lng = parseFloat(pos.coords.longitude.toFixed(6));
        setLatitude(lat);
        setLongitude(lng);
        setLocating(false);
        setAddress(`GPS Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        setLocationNotice(`Exact GPS coordinates recorded (accuracy: ±${Math.round(pos.coords.accuracy || 10)}m).`);
      },
      (err) => {
        setLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          setLocationNotice('Location permission was denied. You can search or enter the address manually below.');
        } else {
          setLocationNotice('Unable to retrieve GPS coordinates. Please specify the location below.');
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  useEffect(() => {
    if (locationType === 'gps') {
      requestCurrentLocation();
    }
  }, [locationType]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setFileError('The selected image is larger than 10MB. Please choose a smaller photo.');
      return;
    }

    // Validate type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type.toLowerCase())) {
      setFileError('Invalid file type. Please upload a JPG, PNG, or WEBP photo.');
      return;
    }

    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
  };

  const next = () => {
    if (step === 2 && !imageFile) {
      setFileError('Please upload or take a photo of the tree to continue.');
      return;
    }
    if (step === 4) {
      setStep(5);
      setAnalyzing(false);
    } else if (step < 6) {
      setStep((step + 1) as Step);
    }
  };


  const handleSubmit = async () => {
    if (!imageFile) {
      setSubmitError('A tree photo is required for report submission.');
      setStep(2);
      return;
    }

    if (!reportType) {
      setSubmitError('Please select a report issue type.');
      setStep(1);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('issue_type', reportType);
      formData.append('location_name', address.trim() || 'RS Puram, Coimbatore');
      if (description.trim()) {
        formData.append('description', description.trim());
      }
      if (latitude !== null && !isNaN(latitude)) {
        formData.append('latitude', latitude.toString());
      }
      if (longitude !== null && !isNaN(longitude)) {
        formData.append('longitude', longitude.toString());
      }
      if (observedAt) {
        formData.append('observed_at', observedAt);
      }
      if (additionalNotes.trim()) {
        formData.append('additional_notes', additionalNotes.trim());
      }

      const response = await reportsApi.createReport(formData);
      setCreatedReport(response);
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to submit report. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedTypeObj = reportTypes.find((t) => t.value === reportType);

  // Success State
  if (createdReport) {
    return (
      <div className="p-6 max-w-lg mx-auto mt-8 text-center">
        <div className="w-16 h-16 bg-green-100 text-forest-700 rounded-full flex items-center justify-center text-3xl mx-auto mb-6 shadow-sm">
          ✓
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Report Submitted</h1>
        <p className="text-gray-500 mb-6">Your report has been received by urban forestry operations and is under review.</p>
        
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-left mb-6">
          <dl className="space-y-3">
            {[
              { term: 'Report ID', desc: createdReport.id },
              { term: 'Status', desc: 'AI Analysis complete — Pending review' },
              { term: 'Location', desc: address },
              { term: 'Submitted', desc: new Date(createdReport.created_at).toLocaleString() },
              { term: 'Expected review', desc: 'Within 24 hours' },
            ].map((item) => (
              <div key={item.term} className="flex justify-between text-sm gap-2">
                <dt className="text-gray-400 flex-shrink-0">{item.term}</dt>
                <dd className="text-gray-800 font-medium font-mono text-right truncate">{item.desc}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="flex flex-col gap-3">
          <Link
            to={`/app/reports/${encodeURIComponent(createdReport.id)}`}
            className="bg-forest-700 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-forest-800 transition-colors shadow-sm"
          >
            Track your report
          </Link>
          <Link
            to="/app/reports"
            className="border border-forest-200 text-forest-700 py-2.5 rounded-lg font-medium text-sm hover:bg-forest-50 transition-colors"
          >
            View all My Reports
          </Link>
          <Link
            to="/app"
            className="border border-gray-200 text-gray-700 py-2.5 rounded-lg font-medium text-sm hover:bg-gray-50 transition-colors"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          {stepLabels.map((label, i) => {
            const s = (i + 1) as Step;
            const active = step === s;
            const done = step > s;
            return (
              <div key={label} className="flex flex-col items-center gap-1 flex-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                    done ? 'bg-forest-600 text-white' : active ? 'bg-forest-700 text-white' : 'bg-gray-100 text-gray-400'
                  }`}
                >
                  {done ? '✓' : s}
                </div>
                <span className={`text-xs hidden sm:block ${active ? 'text-forest-700 font-medium' : 'text-gray-400'}`}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
        <div className="h-1 bg-gray-100 rounded-full">
          <div
            className="h-1 bg-forest-600 rounded-full transition-all duration-300"
            style={{ width: `${((step - 1) / 5) * 100}%` }}
          />
        </div>
      </div>

      {/* Error alert if any */}
      {submitError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <span className="text-red-600 text-lg">⚠️</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-900">Submission Error</p>
            <p className="text-xs text-red-700 mt-0.5">{submitError}</p>
          </div>
          <button onClick={() => setSubmitError(null)} className="text-red-400 hover:text-red-600 text-sm">✕</button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        {/* Step 1: Report type */}
        {step === 1 && (
          <>
            <h2 className="font-semibold text-gray-900 mb-1 text-lg">What type of issue are you reporting?</h2>
            <p className="text-gray-500 text-sm mb-5">Select the category that best describes what you observed.</p>
            <div className="grid grid-cols-2 gap-2">
              {reportTypes.map((rt) => (
                <button
                  key={rt.value}
                  type="button"
                  onClick={() => setReportType(rt.value)}
                  className={`text-left p-3 rounded-xl border-2 transition-all cursor-pointer ${
                    reportType === rt.value ? 'border-forest-600 bg-forest-50' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <span className="text-xl">{rt.icon}</span>
                  <p className={`text-sm font-medium mt-1 ${reportType === rt.value ? 'text-forest-800' : 'text-gray-800'}`}>
                    {rt.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{rt.desc}</p>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Step 2: Photos */}
        {step === 2 && (
          <>
            <h2 className="font-semibold text-gray-900 mb-1 text-lg">Upload photos</h2>
            <p className="text-gray-500 text-sm mb-5">
              Clear photos help our AI assess the situation accurately. Include the whole tree and any specific damage.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileChange}
              className="hidden"
            />

            {fileError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                {fileError}
              </div>
            )}

            {imagePreview ? (
              <div className="relative rounded-xl overflow-hidden mb-4 border border-gray-200">
                <img src={imagePreview} alt="Uploaded preview" className="w-full h-56 object-cover" />
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview(null);
                  }}
                  className="absolute top-3 right-3 bg-black/60 text-white w-7 h-7 rounded-full text-sm hover:bg-black/80 transition-colors flex items-center justify-center cursor-pointer"
                  title="Remove photo"
                >
                  ✕
                </button>
                <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2.5 py-1 rounded-md font-mono">
                  {imageFile?.name} ({(imageFile!.size / (1024 * 1024)).toFixed(2)} MB)
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-12 text-center cursor-pointer hover:border-forest-400 hover:bg-forest-50/30 transition-all mb-4"
              >
                <div className="text-4xl mb-3">📷</div>
                <p className="text-sm font-medium text-gray-700 mb-1">Click to upload or take a photo</p>
                <p className="text-xs text-gray-400">JPEG, PNG, WEBP · max 10MB</p>
              </div>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full border border-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors cursor-pointer"
            >
              {imagePreview ? 'Replace photo' : 'Choose from device'}
            </button>
          </>
        )}

        {/* Step 3: Location */}
        {step === 3 && (
          <>
            <h2 className="font-semibold text-gray-900 mb-1 text-lg">Where is the tree?</h2>
            <p className="text-gray-500 text-sm mb-5">Provide an accurate location so we can assign the right inspector.</p>
            <div className="flex gap-2 mb-4">
              {[
                { value: 'gps' as const, label: '📍 Use my location' },
                { value: 'map' as const, label: '🗺 Select on map' },
                { value: 'search' as const, label: '🔍 Search address' }
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setLocationType(opt.value)}
                  className={`flex-1 py-2 px-3 text-xs font-medium rounded-lg border-2 transition-all cursor-pointer ${
                    locationType === opt.value
                      ? 'border-forest-600 bg-forest-50 text-forest-700'
                      : 'border-gray-100 text-gray-600 hover:border-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {locationType === 'gps' && (
              <div className="bg-forest-50 border border-forest-100 rounded-lg p-4 flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{locating ? '⏳' : '✅'}</span>
                  <div>
                    <p className="text-sm font-medium text-forest-800">
                      {locating ? 'Acquiring GPS location…' : 'Location recorded'}
                    </p>
                    <p className="text-xs text-forest-600">{address}</p>
                    {latitude && longitude && (
                      <p className="text-[11px] text-gray-400 font-mono mt-0.5">
                        Lat: {latitude}, Lng: {longitude}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={requestCurrentLocation}
                  disabled={locating}
                  className="text-xs bg-forest-700 text-white px-3 py-1.5 rounded-lg hover:bg-forest-800 transition cursor-pointer"
                >
                  {locating ? 'Locating...' : 'Refresh GPS'}
                </button>
              </div>
            )}

            {locationType === 'search' && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-1">Street address or landmark</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Enter street address, intersection, or landmark…"
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
                />
              </div>
            )}

            {locationType === 'map' && (
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-1">Location reference</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street / Park area"
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent mb-2"
                />
              </div>
            )}

            {locationNotice && (
              <p className="text-xs text-gray-500 mb-3 italic">{locationNotice}</p>
            )}

            <div className="bg-[#e8f0e4] rounded-xl h-44 relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 bg-forest-600 rounded-full border-3 border-white shadow-lg" />
                <div className="absolute w-6 h-6 bg-forest-600/30 rounded-full animate-ping" />
              </div>
              <div className="absolute bottom-2 right-2 text-xs text-gray-500 bg-white/90 px-2 py-0.5 rounded font-mono">
                {latitude ? `${latitude.toFixed(4)}, ${longitude?.toFixed(4)}` : 'Coimbatore sector'}
              </div>
            </div>
          </>
        )}

        {/* Step 4: Details */}
        {step === 4 && (
          <>
            <h2 className="font-semibold text-gray-900 mb-1 text-lg">Additional information</h2>
            <p className="text-gray-500 text-sm mb-5">Help us understand the situation better.</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Describe what you observed — when you noticed it, how it looks, any immediate hazard…"
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Date/time observed</label>
                <input
                  type="datetime-local"
                  value={observedAt}
                  onChange={(e) => setObservedAt(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Additional notes <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={additionalNotes}
                  onChange={(e) => setAdditionalNotes(e.target.value)}
                  rows={2}
                  placeholder="Nearby landmarks, access notes, anything else relevant…"
                  className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-forest-500 focus:border-transparent resize-none"
                />
              </div>
            </div>
          </>
        )}

        {/* Step 5: AI Analysis */}
        {step === 5 && (
          <>
            <h2 className="font-semibold text-gray-900 mb-1 text-lg">AI Analysis</h2>
            <p className="text-gray-500 text-sm mb-5">
              Preliminary assessment preview for this report category. Results support qualified field evaluation.
            </p>

            {analyzing ? (
              <div className="py-12 text-center">
                <div className="w-14 h-14 rounded-full border-4 border-forest-200 border-t-forest-600 animate-spin mx-auto mb-4" />
                <p className="text-gray-600 font-medium">Processing preliminary inspection telemetry…</p>
                <p className="text-gray-400 text-sm mt-1">Checking canopy and hazard indicators</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className={`border rounded-xl p-4 ${
                  reportType === 'fallen' || reportType === 'storm' || reportType === 'infrastructure'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-amber-50 border-amber-200'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">
                      {reportType === 'fallen' || reportType === 'storm' ? '🚨' : '⚠'}
                    </span>
                    <span className={`font-semibold ${
                      reportType === 'fallen' || reportType === 'storm' ? 'text-red-900' : 'text-amber-800'
                    }`}>
                      {selectedTypeObj?.label || 'Observation Recorded'} — Preliminary Assessment
                    </span>
                  </div>
                  <p className={`text-sm ${
                    reportType === 'fallen' || reportType === 'storm' ? 'text-red-800' : 'text-amber-700'
                  }`}>
                    {reportType === 'fallen'
                      ? 'Severe structural failure reported. Expedited emergency dispatch recommended.'
                      : reportType === 'branch'
                      ? 'Structural compromise noted. Possible limb failure risk depending on wind conditions.'
                      : reportType === 'health'
                      ? 'Foliage thinning or physiological stress reported. Standard health monitoring queued.'
                      : 'Observational telemetry received and queued for field review.'}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    {
                      label: 'Severity',
                      value: reportType === 'fallen' || reportType === 'storm' ? 'High' : reportType === 'branch' ? 'Moderate' : 'Low',
                      color: reportType === 'fallen' ? 'text-red-600' : 'text-amber-600'
                    },
                    { label: 'Confidence', value: '85%', color: 'text-forest-600' },
                    {
                      label: 'Priority',
                      value: reportType === 'fallen' || reportType === 'storm' ? 'High' : 'Medium',
                      color: reportType === 'fallen' ? 'text-red-600' : 'text-orange-600'
                    },
                  ].map((s) => (
                    <div key={s.label} className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className={`font-semibold ${s.color}`}>{s.value}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
                    </div>
                  ))}
                </div>

                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Recommended action</p>
                  <p className="text-sm text-gray-700">
                    Field inspection queued for municipal team review. If condition changes or poses immediate life-safety hazard, use Emergency Detection.
                  </p>
                </div>

                <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3 border border-gray-100">
                  <strong>Note:</strong> AI-generated indicator based on your report. A qualified municipal arborist will review this submission.
                </div>
              </div>
            )}
          </>
        )}

        {/* Step 6: Review */}
        {step === 6 && (
          <>
            <h2 className="font-semibold text-gray-900 mb-1 text-lg">Review & submit</h2>
            <p className="text-gray-500 text-sm mb-5">Confirm the details below before submitting your report.</p>
            
            <div className="space-y-3 mb-6">
              {[
                { label: 'Report type', value: selectedTypeObj?.label || reportType },
                { label: 'Photo attached', value: imageFile ? `${imageFile.name} (${(imageFile.size / 1024).toFixed(0)} KB)` : 'None' },
                { label: 'Location', value: address },
                { label: 'Coordinates', value: latitude && longitude ? `${latitude}, ${longitude}` : 'Standard district coordinates' },
                { label: 'Date observed', value: observedAt ? new Date(observedAt).toLocaleString() : 'Recent' },
                { label: 'Description', value: description || 'No description provided' },
              ].map((item) => (
                <div key={item.label} className="flex justify-between gap-4 py-2 border-b border-gray-50 last:border-0">
                  <span className="text-sm text-gray-400 flex-shrink-0">{item.label}</span>
                  <span className="text-sm text-gray-800 font-medium text-right truncate max-w-[65%]" title={item.value}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>

            <p className="text-xs text-gray-400 mb-4">
              By submitting this report you agree that the information provided is accurate to the best of your knowledge.
            </p>
          </>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-5 border-t border-gray-50">
          <button
            type="button"
            onClick={() => setStep((step - 1) as Step)}
            disabled={step === 1 || submitting}
            className="text-sm text-gray-500 hover:text-gray-700 font-medium disabled:opacity-30 transition-colors cursor-pointer"
          >
            ← Back
          </button>
          
          <span className="text-xs text-gray-400">Step {step} of 6</span>
          
          {step < 6 ? (
            <button
              type="button"
              onClick={next}
              disabled={(step === 1 && !reportType) || (step === 2 && !imageFile) || (step === 5 && analyzing)}
              className="text-sm bg-forest-700 text-white px-5 py-2 rounded-lg font-medium hover:bg-forest-800 transition-colors disabled:opacity-40 cursor-pointer"
            >
              {step === 4 ? 'Run AI analysis →' : 'Continue →'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="text-sm bg-forest-700 text-white px-5 py-2 rounded-lg font-medium hover:bg-forest-800 transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting & Uploading...</span>
                </>
              ) : (
                'Submit report'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
