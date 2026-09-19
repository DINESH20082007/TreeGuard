import { useState, useRef } from 'react';
import { Link, useLocation } from 'react-router';
import { emergencyApi, EmergencyAnalysisResponse } from '../../services/emergency';

type Phase = 'idle' | 'analyzing' | 'result' | 'unavailable' | 'inconclusive' | 'error';

export default function EmergencyDetection() {
  const location = useLocation();
  const [phase, setPhase] = useState<Phase>('idle');
  const [preview, setPreview] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<EmergencyAnalysisResponse | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Extract any passed state (e.g. from existing tree report or tree detail)
  const navState = (location.state as {
    report_id?: string;
    tree_id?: string;
    location_name?: string;
    latitude?: number;
    longitude?: number;
  }) || {};

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    setErrorMessage(null);

    const file = e.target.files?.[0];
    if (!file) return;

    // 1. Client-side validation: file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
    const hasValidType = validTypes.includes(file.type.toLowerCase());
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));

    if (!hasValidType && !hasValidExt) {
      setFileError('Invalid file format. Please upload a JPG, JPEG, PNG, or WEBP photo.');
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    // 2. Client-side validation: file size (max 10MB)
    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      setFileError('The selected image exceeds the maximum size limit of 10MB. Please choose a smaller photo.');
      if (fileRef.current) fileRef.current.value = '';
      return;
    }

    // 3. Create local preview and transition to real analysis
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setPhase('analyzing');
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      if (navState.report_id) {
        formData.append('report_id', navState.report_id);
      }
      if (navState.tree_id) {
        formData.append('tree_id', navState.tree_id);
      }
      if (navState.location_name) {
        formData.append('location_name', navState.location_name);
      }
      if (navState.latitude !== undefined && navState.latitude !== null) {
        formData.append('latitude', navState.latitude.toString());
      }
      if (navState.longitude !== undefined && navState.longitude !== null) {
        formData.append('longitude', navState.longitude.toString());
      }

      // Real backend API submission
      const result = await emergencyApi.analyze(formData);
      setAnalysis(result);

      if (result.analysis_status === 'completed' && result.is_ai_available) {
        setPhase('result');
      } else if (result.analysis_status === 'inconclusive') {
        setPhase('inconclusive');
      } else {
        // Honest fallback: AI model unavailable or manual review needed
        setPhase('unavailable');
      }
    } catch (err: any) {
      const userMsg = err?.message || 'Failed to complete emergency analysis. Please check your connection and try again.';
      setErrorMessage(userMsg);
      setPhase('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setPhase('idle');
    setPreview(null);
    setAnalysis(null);
    setFileError(null);
    setErrorMessage(null);
    setIsSubmitting(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
          <span className="text-xs font-semibold text-red-600 uppercase tracking-wider">Emergency Detection</span>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 mb-2">Tree Emergency Detection</h1>
        <p className="text-gray-500 text-sm leading-relaxed">
          Upload or capture a photo to analyze for emergency conditions — fallen trees, broken limbs, road obstructions, and structural hazards.
        </p>
      </div>

      {/* Upload area */}
      {phase === 'idle' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="p-6">
            {fileError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center justify-between">
                <span>{fileError}</span>
                <button
                  type="button"
                  onClick={() => setFileError(null)}
                  className="text-red-400 hover:text-red-700 font-bold ml-2 cursor-pointer"
                >
                  ✕
                </button>
              </div>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFile}
              disabled={isSubmitting}
              className="hidden"
            />
            <div
              onClick={() => !isSubmitting && fileRef.current?.click()}
              className="border-2 border-dashed border-gray-200 rounded-xl p-14 text-center cursor-pointer hover:border-red-300 hover:bg-red-50/20 transition-all"
            >
              <div className="text-5xl mb-4">🚨</div>
              <p className="font-semibold text-gray-800 mb-1">Upload emergency photo</p>
              <p className="text-sm text-gray-400 mb-4">JPG, PNG, WEBP · Max 10MB</p>
              <button
                type="button"
                disabled={isSubmitting}
                className="bg-red-600 text-white px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer"
              >
                📷 Capture or upload photo
              </button>
            </div>
          </div>
          <div className="border-t border-gray-50 px-6 py-4 bg-gray-50/50 rounded-b-xl">
            <div className="flex items-start gap-2">
              <span className="text-amber-500 flex-shrink-0">ℹ</span>
              <p className="text-xs text-gray-500">
                If someone is in immediate danger, call emergency services (911) first. This tool supports tree-related assessments only.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Analyzing - Real backend request state */}
      {phase === 'analyzing' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {preview && <img src={preview} alt="Analyzing" className="w-full h-56 object-cover" />}
          <div className="p-8 text-center">
            <div className="w-14 h-14 rounded-full border-4 border-red-100 border-t-red-500 animate-spin mx-auto mb-5" />
            <p className="font-semibold text-gray-900 mb-1">Analyzing for emergency conditions…</p>
            <p className="text-sm text-gray-400">Communicating with backend emergency assessment pipeline</p>
          </div>
        </div>
      )}

      {/* Result - Completed Real Analysis */}
      {phase === 'result' && analysis && (
        <div className="space-y-4">
          {/* Image */}
          {preview && (
            <div className="relative rounded-xl overflow-hidden">
              <img src={preview} alt="Emergency" className="w-full h-48 object-cover" />
              <div className={`absolute top-3 left-3 text-white text-xs font-semibold px-2.5 py-1 rounded-full ${
                analysis.emergency_detected ? 'bg-red-600' : 'bg-forest-600'
              }`}>
                {analysis.emergency_detected ? '⚠ Potential emergency detected' : '✓ AI assessment complete'}
              </div>
            </div>
          )}

          {/* Detection result */}
          <div className={`bg-white rounded-xl border shadow-sm overflow-hidden ${
            analysis.emergency_detected ? 'border-red-200' : 'border-gray-200'
          }`}>
            <div className={`px-6 py-4 flex items-center gap-3 ${
              analysis.emergency_detected ? 'bg-red-600' : 'bg-forest-700'
            }`}>
              <span className="text-white text-2xl">{analysis.emergency_detected ? '🚨' : '🌳'}</span>
              <div>
                <p className="text-white font-semibold text-lg leading-tight">{analysis.detected_issue}</p>
                <p className="text-red-100 text-sm">AI assessment — field verification required</p>
              </div>
            </div>
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-3 gap-3">
                {[
                  {
                    label: 'Severity',
                    value: analysis.severity,
                    color: analysis.severity === 'High' ? 'bg-red-50 text-red-700' : analysis.severity === 'Medium' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700',
                  },
                  {
                    label: 'Confidence',
                    value: analysis.confidence > 0 ? `${Math.round(analysis.confidence * 100)}%` : 'Standard',
                    color: 'bg-forest-50 text-forest-700',
                  },
                  {
                    label: 'Response',
                    value: analysis.severity === 'High' ? 'Immediate' : analysis.severity === 'Medium' ? 'Priority' : 'Standard',
                    color: analysis.severity === 'High' ? 'bg-orange-50 text-orange-700' : 'bg-gray-50 text-gray-700',
                  },
                ].map((s) => (
                  <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}>
                    <p className="font-bold text-xl">{s.value}</p>
                    <p className="text-xs opacity-70 font-medium mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {analysis.explanation && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Assessment Explanation</p>
                  <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-lg p-3.5 border border-gray-100">
                    {analysis.explanation}
                  </p>
                </div>
              )}

              {analysis.detected_conditions && analysis.detected_conditions.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Detected conditions</p>
                  <ul className="space-y-1.5">
                    {analysis.detected_conditions.map((c) => (
                      <li key={c} className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />{c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {analysis.risk_factors && analysis.risk_factors.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Location risk factors</p>
                  <ul className="space-y-1.5">
                    {analysis.risk_factors.map((r) => (
                      <li key={r} className="flex items-center gap-2 text-sm text-gray-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 flex-shrink-0" />{r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="bg-red-50 border border-red-100 rounded-lg p-4">
                <p className="text-xs font-semibold text-red-700 uppercase tracking-wider mb-1">Recommended action</p>
                <p className="text-sm text-red-800 font-medium">{analysis.recommended_action}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <Link
              to="/app/report"
              state={{
                fromEmergency: true,
                emergencyId: analysis.id,
                severity: analysis.severity,
                issueType: analysis.detected_issue,
              }}
              className="block w-full text-center bg-red-600 text-white py-3 rounded-xl font-semibold hover:bg-red-700 transition-colors"
            >
              Submit Emergency Report
            </Link>
            <button
              onClick={handleReset}
              className="w-full border border-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Retake Photo
            </button>
          </div>

          <div className="text-center text-xs text-gray-400 leading-relaxed">
            This AI assessment is for guidance only. If there is immediate danger to life, call emergency services (911) immediately.
          </div>
        </div>
      )}

      {/* Honest AI Availability / Manual Review Recommended State */}
      {phase === 'unavailable' && (
        <div className="space-y-4">
          {/* Image */}
          {preview && (
            <div className="relative rounded-xl overflow-hidden">
              <img src={preview} alt="Uploaded scene" className="w-full h-48 object-cover" />
              <div className="absolute top-3 left-3 bg-gray-800/90 text-white text-xs font-semibold px-2.5 py-1 rounded-full">
                ℹ Image Received
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xl flex-shrink-0">
                🛡️
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 text-lg">AI Emergency Detection Unavailable</h3>
                <p className="text-xs text-gray-500 mt-0.5">Manual municipal arborist review recommended</p>
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-100 rounded-lg p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Status details</p>
              <p className="text-sm text-gray-700 leading-relaxed">
                {analysis?.explanation ||
                  'No automated computer vision emergency detection model is currently configured on this server. TreeGuard does not simulate or fabricate emergency findings.'}
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider mb-1">Recommended action</p>
              <p className="text-sm text-amber-900 font-medium">
                {analysis?.recommended_action ||
                  'If someone is in immediate danger, call emergency services (911) first. Otherwise, please submit a standard tree report for field crew inspection.'}
              </p>
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <Link
                to="/app/report"
                state={{
                  fromEmergency: true,
                  emergencyId: analysis?.id,
                }}
                className="block w-full text-center bg-forest-700 text-white py-3 rounded-xl font-semibold hover:bg-forest-800 transition-colors shadow-sm"
              >
                Submit Report for Field Inspection
              </Link>
              <button
                type="button"
                onClick={handleReset}
                className="w-full border border-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Retake Photo
              </button>
            </div>
          </div>

          <div className="text-center text-xs text-gray-400 leading-relaxed">
            If there is immediate danger to life or road blockage, please contact municipal emergency services (911) immediately.
          </div>
        </div>
      )}

      {/* AI uncertainty state */}
      {phase === 'inconclusive' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center">
          <div className="text-4xl mb-4">🔍</div>
          <h3 className="font-semibold text-gray-900 mb-2">Analysis inconclusive</h3>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            The image does not provide enough visual information for a reliable automated assessment. This may be due to lighting, angle, or distance.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleReset}
              className="bg-forest-700 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-forest-800 transition-colors cursor-pointer"
            >
              Try another photo
            </button>
            <Link
              to="/app/report"
              className="border border-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors text-center"
            >
              Submit for manual arborist review
            </Link>
          </div>
        </div>
      )}

      {/* Error state */}
      {phase === 'error' && (
        <div className="bg-white rounded-xl border border-red-100 shadow-sm p-6 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h3 className="font-semibold text-gray-900 mb-2">Analysis Request Failed</h3>
          <p className="text-gray-500 text-sm mb-6 leading-relaxed">
            {errorMessage || 'An error occurred while uploading and analyzing the photo. Please try again.'}
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={handleReset}
              className="bg-forest-700 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-forest-800 transition-colors cursor-pointer"
            >
              Try again
            </button>
            <Link
              to="/app/report"
              className="border border-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors text-center"
            >
              Submit standard tree report
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
