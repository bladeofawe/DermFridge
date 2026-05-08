"use client";

import React, { useRef, useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/hooks";
import { Error, Button, Notification } from "@/components";
import { Camera, Download, RotateCw, Languages, LogOut, X, Upload, ArrowLeft } from "lucide-react";

interface DeviceInfo extends MediaDeviceInfo {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}
type PermissionState = "unknown" | "granted" | "denied";
type FacingMode = "user" | "environment";
type Mode = "select" | "capture" | "import" | "preview";

export default function CameraCapture() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const analysisType = (searchParams.get("type") as "food" | "face") || "food";
  
  // Ensure API URL is always valid
  const apiUrl = (() => {
    const envUrl = import.meta.env.VITE_API_URL;
    if (envUrl && typeof envUrl === 'string' && envUrl !== 'undefined' && envUrl.trim() !== '') {
      return envUrl.trim();
    }
    return 'http://localhost:8000';
  })();
  
  const toggleLanguage = () => {
    const newLang = i18n.language === "en" ? "kr" : "en";
    i18n.changeLanguage(newLang);
  };

  const { logout } = useAuth();
  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const { notification, showNotification, closeNotification } = useNotification();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<Mode>("select");
  const [previousMode, setPreviousMode] = useState<Mode | null>(null);
  const [, setPermissionState] = useState<PermissionState>("unknown");
  const [facingMode, setFacingMode] = useState<FacingMode>("user");
  const [capturedDataUrl, setCapturedDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  useEffect(() => {
    const loadDevices = async () => {
      try {
        const deviceList = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = deviceList.filter(d => d.kind === "videoinput") as DeviceInfo[];
        setDevices(videoDevices);
      } catch (err) {
        console.error("Failed to enumerate devices:", err);
      }
    };
    loadDevices();
  }, []);

  useEffect(() => {
    if (mode === "capture") startCamera(selectedDeviceId);
    return () => {
      if (mode !== "capture") stopCamera();
    };
  }, [mode, selectedDeviceId, facingMode]);

  const startCamera = async (deviceId: string | null = null): Promise<void> => {
    stopCamera();
    setError(null);

    if (mode !== "capture") return;

    try {
      const constraints: MediaStreamConstraints = deviceId
        ? { video: { deviceId: { exact: deviceId } } }
        : { video: { facingMode } };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setPermissionState("granted");
    } catch (err) {
      setPermissionState("denied");
    }
  };

  const stopCamera = (): void => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
    } catch (err) {
      setError(t("camera.errors.stopCamera"));
    }
  };

const capturePhoto = (): void => {
  if (!videoRef.current) return;

  const tempCanvas = document.createElement("canvas");
  tempCanvas.width = videoRef.current.videoWidth;
  tempCanvas.height = videoRef.current.videoHeight;
  const ctx = tempCanvas.getContext("2d");
  if (!ctx) return;

  if (facingMode === "user") {
    ctx.translate(tempCanvas.width, 0);
    ctx.scale(-1, 1);
  }

  ctx.drawImage(videoRef.current, 0, 0);

  // 🔥 Resize for backend compatibility
  const MAX_WIDTH = 1024;
  const scale = MAX_WIDTH / tempCanvas.width;
  const resizedCanvas = document.createElement("canvas");
  resizedCanvas.width = MAX_WIDTH;
  resizedCanvas.height = tempCanvas.height * scale;

  const resizedCtx = resizedCanvas.getContext("2d");
  resizedCtx?.drawImage(tempCanvas, 0, 0, resizedCanvas.width, resizedCanvas.height);

  const dataURL = resizedCanvas.toDataURL("image/jpeg", 0.85);

  setCapturedDataUrl(dataURL);
  setPreviousMode("capture");
  setMode("preview");
};


  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError(t("camera.errors.noFile"));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCapturedDataUrl(reader.result as string);
      setPreviousMode("import");
      setMode("preview");
    };
    reader.readAsDataURL(file);
  };

  const enumerateVideoDevices = async (): Promise<void> => {
    try {
      const all = await navigator.mediaDevices.enumerateDevices();
      const vids = all.filter((d) => d.kind === "videoinput") as DeviceInfo[];
      setDevices(vids);
      if (vids.length && !selectedDeviceId) {
        setSelectedDeviceId(vids[0].deviceId);
      }
    } catch (err) {
      setError("enumerateDevices error")
    }
  };

 const uploadPhoto = async (): Promise<void> => {
  if (!capturedDataUrl || !previousMode) return;

  setIsUploading(true);
  setError(null);

  try {
    // Step 1: Save the image to backend (photo storage)
    const res = await fetch(`${apiUrl}/photos/upload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: capturedDataUrl,
        source: previousMode === "capture" ? "capture" : "import",
      }),
      credentials: "include",
    });

    if (!res.ok) {
      showNotification(t("camera.errors.uploadFail"), "error");
      setIsUploading(false);
      return;
    }

    const data = await res.json();
    const photoId = data.id;

    if (analysisType === "food") {
      try {
      const blob = await fetch(capturedDataUrl).then(res => res.blob());


        const formData = new FormData();
        formData.append("file", blob, `photo-${Date.now()}.jpg`);

        const inventoryRes = await fetch(`${apiUrl}/food/analyze`, {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        if (!inventoryRes.ok) {
          showNotification("Food detection failed.", "error");
          setIsUploading(false);
          return;
        }

        showNotification("Food analyzed successfully!", "success");
        navigate("/inventory");
        return;
      } catch (error) {
        console.error(error);
        showNotification("Food analysis failed.", "error");
        setIsUploading(false);
        return;
      }
    }

    // ---------------------
    // 📌 SKIN ANALYSIS MODE
    // ---------------------
    const analysisRes = await fetch(`${apiUrl}/skin-analysis/analyze/${photoId}`, {
      method: "POST",
      credentials: "include",
    });

    if (!analysisRes.ok) {
      showNotification(t("camera.errors.analysisError"), "error");
      setIsUploading(false);
      return;
    }

    const analysisData = await analysisRes.json();
    navigate(`/analysis/${photoId}`, { state: { analysisData } });

  } catch (error) {
    console.error(error);
    showNotification(t("camera.errors.uploadError"), "error");
  } finally {
    setIsUploading(false);
  }
};



  useEffect(() => {
    if (mode === "capture" && selectedDeviceId) {
      startCamera(selectedDeviceId);
    } else if (mode !== "capture") {
      stopCamera();
    }
  }, [mode, selectedDeviceId]);

  useEffect(() => {
    let mounted = true;

    const initCamera = async (): Promise<void> => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError(t("camera.errors.browser"));  // La capture vidéo n'est pas supportée par ce navigateur
        return;
      }

      await enumerateVideoDevices();

      if (navigator.permissions && navigator.permissions.query) {
        try {
          const res = await navigator.permissions.query({ name: "camera" } as PermissionDescriptor);
          if (!mounted) return;
          setPermissionState(res.state as PermissionState);
          res.addEventListener("change", () => {
            if (mounted) setPermissionState(res.state as PermissionState);
          });
        } catch (err) {
          setError(t("camera.errors.browserPermission"));  // Erreur de permission au niveau de votre navigateur
        }
      }
    };

    initCamera();

    return () => {
      mounted = false;
      stopCamera();
    };
  }, []);

  const toggleFacing = (): void => {
    setFacingMode((f) => (f === "user" ? "environment" : "user"));
    setSelectedDeviceId(null);
  };

  const downloadCaptured = (): void => {
    if (!capturedDataUrl) return;
    const a = document.createElement("a");
    a.href = capturedDataUrl;
    a.download = `photo-${Date.now()}.jpg`;
    a.click();
  };

  const handleBack = (): void => {
    if (mode === "preview") {
      if (previousMode) {
        setMode(previousMode);
        setPreviousMode(null);
        setCapturedDataUrl(null);
        return;
      }
    }

    setCapturedDataUrl(null);
    setMode("select");
    stopCamera();
  };

  const handleModeSelect = (selectedMode: "capture" | "import"): void => {
    setMode(selectedMode);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-stone-200">
      <header className="bg-white/80 backdrop-blur-md shadow-sm relative z-10 pt-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center">
            <Button
              onClick={() => navigate("/home")}
              variant="secondary"
              size="sm"
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" />
              {t("common.back")}
            </Button>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={toggleLanguage}
              className="p-2 hover:bg-[#A50034]/5 rounded-full transition-colors"
            >
              <Languages className="w-6 h-6 text-gray-700" />
            </button>
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-[#A50034]/5 rounded-full transition-colors"
            >
              <LogOut className="w-6 h-6 text-gray-700" />
            </button>
          </div>
        </div>
      </header>


      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {mode === "select" && (
          <div className="flex flex-col items-center justify-center min-h-[500px] gap-6">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">{t("camera.chooseMode")}</h1>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
              <button
                onClick={() => handleModeSelect("capture")}
                className="group relative overflow-hidden rounded-2xl bg-white p-8 shadow-lg hover:shadow-xl transition-all hover:scale-105"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#A50034]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex flex-col items-center gap-4">
                  <div className="p-4 rounded-full bg-[#A50034]/10 group-hover:bg-[#A50034]/20 transition-colors">
                    <Camera className="w-8 h-8 text-[#A50034]" />
                  </div>
                  <div className="text-center">
                    <h2 className="text-xl font-bold text-gray-900">{t("camera.capture")}</h2>
                    <p className="text-sm text-gray-600 mt-1">{t("camera.captureDescription")}</p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => handleModeSelect("import")}
                className="group relative overflow-hidden rounded-2xl bg-white p-8 shadow-lg hover:shadow-xl transition-all hover:scale-105"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[#A50034]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative flex flex-col items-center gap-4">
                  <div className="p-4 rounded-full bg-[#A50034]/10 group-hover:bg-[#A50034]/20 transition-colors">
                    <Upload className="w-8 h-8 text-[#A50034]" />
                  </div>
                  <div className="text-center">
                    <h2 className="text-xl font-bold text-gray-900">{t("camera.import")}</h2>
                    <p className="text-sm text-gray-600 mt-1">{t("camera.importDescription")}</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {mode === "capture" && (
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">{t("camera.capturePhoto")}</h2>
              <button
                onClick={handleBack}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                aria-label="Close"
              >
                <X className="w-6 h-6 text-gray-700" />
              </button>
            </div>
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="relative bg-black rounded-t-2xl overflow-hidden">
                <video
                  ref={videoRef}
                  className="w-full h-[500px] object-cover"
                  playsInline
                  autoPlay
                />
                {error && <Error message={error} />}
              </div>
              <div className="p-6 space-y-4">
                {devices.length > 0 && (
                  <div className="space-y-2">
                    <label htmlFor="camera-select" className="text-sm font-medium text-gray-700">
                      {t("camera.selectCamera")}
                    </label>
                    <select
                      id="camera-select"
                      value={selectedDeviceId || ""}
                      onChange={(e) => setSelectedDeviceId(e.target.value || null)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A50034] focus:border-transparent transition-all"
                    >
                      <option value="">{t("camera.defaultCamera")}</option>
                      {devices.map((d) => (
                        <option key={d.deviceId} value={d.deviceId}>
                          {d.label || `${t("camera.camera")} ${d.deviceId}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    onClick={toggleFacing}
                    variant="secondary"
                    size="md"
                    fullWidth
                    className="flex-1 flex items-center justify-center gap-2"
                  >
                    <RotateCw className="w-5 h-5" />
                    {t("camera.toggle")}
                  </Button>
                  <Button
                    onClick={capturePhoto}
                    variant="primary"
                    size="md"
                    fullWidth
                    className="flex-1 flex items-center justify-center gap-2"
                  >
                    <Camera className="w-5 h-5" />
                    {t("camera.capture")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {mode === "import" && (
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">{t("camera.importPhoto")}</h2>
              <button
                onClick={handleBack}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
                aria-label="Close"
              >
                <X className="w-6 h-6 text-gray-700" />
              </button>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <label className="block">
                <div className="flex flex-col items-center justify-center h-80 border-2 border-dashed border-gray-300 rounded-xl hover:border-[#A50034] hover:bg-[#A50034]/5 transition-all cursor-pointer">
                  <div className="text-center">
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-700">{t("camera.dropImage")}</p>
                    <p className="text-sm text-gray-500 mt-2">{t("camera.selectImage")}</p>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={onFileChange}
                  className="hidden"
                  aria-label={t("camera.importImage")}
                />
              </label>
              {error && <Error message={error} />}
            </div>
          </div>
        )}

        {mode === "preview" && capturedDataUrl && (
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">{t("camera.preview")}</h2>
              <button
                onClick={handleBack}
                disabled={isUploading}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50"
                aria-label="Close"
              >
                <X className="w-6 h-6 text-gray-700" />
              </button>
            </div>
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="p-6">
                <img
                  src={capturedDataUrl}
                  alt={t("camera.previewAlt")}
                  className="w-full rounded-xl object-contain mb-6 shadow-md"
                />
                <div className="space-y-3">
                  <Button
                    onClick={uploadPhoto}
                    disabled={isUploading}
                    variant="primary"
                    size="md"
                    fullWidth
                    className="flex items-center justify-center gap-2"
                  >
                    <Upload className="w-5 h-5" />
                    {isUploading ? t("camera.uploading") : t("camera.upload")}
                  </Button>
                  <Button
                    onClick={downloadCaptured}
                    variant="secondary"
                    size="md"
                    fullWidth
                    className="flex items-center justify-center gap-2"
                  >
                    <Download className="w-5 h-5" />
                    {t("camera.download")}
                  </Button>
                  <Button
                    onClick={handleBack}
                    disabled={isUploading}
                    variant="secondary"
                    size="md"
                    fullWidth
                    className="flex items-center justify-center gap-2"
                  >
                    <X className="w-5 h-5" />
                    {t("camera.back")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
        <Notification
          message={notification.message}
          type={notification.type}
          isVisible={notification.isVisible}
          onClose={closeNotification}
        />
      </main>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}