import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, CheckCircle2, AlertCircle, X, Trash2 } from 'lucide-react';

export const WebcamCaptureModal = ({ isOpen, onClose, onSaveSamples, maxSamples = 5 }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState('');
  const [capturedSamples, setCapturedSamples] = useState([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [isCapturing, setIsCapturing] = useState(false);

  // Load available camera devices
  const enumerateDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      setCameras(videoDevices);
      if (videoDevices.length > 0 && !selectedCamera) {
        setSelectedCamera(videoDevices[0].deviceId);
      }
    } catch (err) {
      console.warn('Could not enumerate devices:', err);
    }
  };

  const startCamera = async (deviceId) => {
    stopCamera();
    setCameraError('');
    try {
      const constraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId }, width: { ideal: 1280, min: 640 }, height: { ideal: 720, min: 480 } }
          : { facingMode: 'user', width: { ideal: 1280, min: 640 }, height: { ideal: 720, min: 480 } },
        audio: false,
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
      await enumerateDevices();
    } catch (err) {
      console.error('Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission denied. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on this device.');
      } else {
        setCameraError(`Unable to start camera: ${err.message || 'Unknown error'}`);
      }
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (isOpen) {
      setCapturedSamples([]);
      startCamera(selectedCamera);
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  const captureFrame = () => {
    if (!videoRef.current || !cameraActive) return;
    setIsCapturing(true);

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);

      if (capturedSamples.length < maxSamples) {
        setCapturedSamples((prev) => [...prev, dataUrl]);
      }
    } catch (e) {
      console.error('Error capturing frame:', e);
    } finally {
      setTimeout(() => setIsCapturing(false), 200);
    }
  };

  const removeSample = (idx) => {
    setCapturedSamples((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    if (capturedSamples.length === 0) {
      setCameraError('Please capture at least 1 face sample.');
      return;
    }
    onSaveSamples(capturedSamples);
    stopCamera();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#0f172a] border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Capture Face Samples</h3>
              <p className="text-xs text-slate-400">Capture 3-5 snapshots from different angles for optimal recognition</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Camera Controls & Device Selector */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-400 font-medium">Camera:</label>
              <select
                value={selectedCamera}
                onChange={(e) => {
                  setSelectedCamera(e.target.value);
                  startCamera(e.target.value);
                }}
                disabled={cameras.length === 0}
                className="bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500 outline-none"
              >
                {cameras.map((c, i) => (
                  <option key={c.deviceId || i} value={c.deviceId}>
                    {c.label || `Camera ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">
                Samples:{' '}
                <strong className="text-indigo-400">
                  {capturedSamples.length} / {maxSamples}
                </strong>
              </span>
              {cameraActive ? (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
                >
                  Stop Camera
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => startCamera(selectedCamera)}
                  className="px-2.5 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition"
                >
                  Start Camera
                </button>
              )}
            </div>
          </div>

          {/* Camera Viewfinder */}
          <div className="relative aspect-video w-full bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover transform ${cameraActive ? 'scale-x-[-1]' : 'hidden'}`}
            />

            {!cameraActive && !cameraError && (
              <div className="flex flex-col items-center gap-3 text-slate-400 p-6 text-center">
                <Camera className="w-10 h-10 text-slate-600" />
                <p className="text-sm">Camera is currently paused or inactive.</p>
                <button
                  type="button"
                  onClick={() => startCamera(selectedCamera)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow-lg shadow-indigo-600/30 transition"
                >
                  Enable Camera
                </button>
              </div>
            )}

            {cameraError && (
              <div className="flex flex-col items-center gap-2 text-rose-400 p-6 text-center max-w-sm">
                <AlertCircle className="w-8 h-8 text-rose-500" />
                <p className="text-xs leading-relaxed">{cameraError}</p>
                <button
                  type="button"
                  onClick={() => startCamera(selectedCamera)}
                  className="mt-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-white rounded-lg transition"
                >
                  Retry Camera
                </button>
              </div>
            )}

            {/* Target Face Oval Outline Guide */}
            {cameraActive && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-48 h-60 border-2 border-dashed border-indigo-400/50 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.15)]">
                  <span className="text-[10px] uppercase font-mono text-indigo-300/70 bg-slate-900/80 px-2 py-0.5 rounded">
                    Align Face Here
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={captureFrame}
              disabled={!cameraActive || capturedSamples.length >= maxSamples || isCapturing}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm transition shadow-lg ${
                !cameraActive || capturedSamples.length >= maxSamples
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
                  : 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-indigo-600/25 active:scale-95'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Capture Face Sample ({capturedSamples.length}/{maxSamples})</span>
            </button>
          </div>

          {/* Captured Samples Gallery */}
          {capturedSamples.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs text-slate-400 font-medium">Captured Samples:</span>
              <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {capturedSamples.map((src, i) => (
                  <div key={i} className="relative group flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-slate-700 bg-slate-900">
                    <img src={src} alt={`Sample ${i + 1}`} className="w-full h-full object-cover transform scale-x-[-1]" />
                    <button
                      type="button"
                      onClick={() => removeSample(i)}
                      className="absolute inset-0 bg-rose-950/80 text-rose-300 opacity-0 group-hover:opacity-100 flex items-center justify-center transition"
                      title="Remove sample"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <span className="absolute bottom-1 right-1 bg-black/70 text-[9px] text-white px-1 rounded">
                      #{i + 1}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-3.5 border-t border-slate-800 bg-slate-900/60">
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={capturedSamples.length === 0}
            className={`flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-semibold transition ${
              capturedSamples.length === 0
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/25'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Use {capturedSamples.length} Face Sample(s)</span>
          </button>
        </div>
      </div>
    </div>
  );
};

