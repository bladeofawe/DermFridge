import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/hooks";
import { Error, Button, Notification } from "@/components";
import { ArrowLeft, Loader2, AlertCircle, CheckCircle, Info, Languages, LogOut } from "lucide-react";

// Simple Radar Chart Component for Skin Health Matrix
interface RadarChartProps {
  metricScores: Record<string, { value: number; label: string; color: string }>;
}

const SkinHealthRadarChart: React.FC<RadarChartProps> = ({ metricScores }) => {
  const size = 300;
  const center = size / 2;
  const radius = 120;
  const metrics = Object.entries(metricScores);
  const numMetrics = metrics.length;
  
  if (numMetrics === 0) return null;
  
  // Calculate points for each metric
  const points = metrics.map(([, data], index) => {
    const angle = (index * 2 * Math.PI) / numMetrics - Math.PI / 2;
    const value = data.value / 100; // Normalize to 0-1
    const x = center + radius * value * Math.cos(angle);
    const y = center + radius * value * Math.sin(angle);
    return { x, y, label: data.label, value: data.value, angle };
  });
  
  // Create path for the filled area
  const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
  
  // Create grid circles
  const gridCircles = [0.2, 0.4, 0.6, 0.8, 1.0].map(scale => (
    <circle
      key={scale}
      cx={center}
      cy={center}
      r={radius * scale}
      fill="none"
      stroke="#e5e7eb"
      strokeWidth="1"
    />
  ));
  
  // Create axis lines
  const axisLines = points.map((p, i) => (
    <line
      key={i}
      x1={center}
      y1={center}
      x2={center + radius * Math.cos(p.angle)}
      y2={center + radius * Math.sin(p.angle)}
      stroke="#e5e7eb"
      strokeWidth="1"
    />
  ));
  
  return (
    <div className="relative" style={{ width: `${size}px`, height: `${size}px` }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)',
    transformOrigin: 'center' }}>
        {/* Grid circles */}
        {gridCircles}
        
        {/* Axis lines */}
        {axisLines}
        
        {/* Filled area */}
        <path
          d={pathData}
          fill="rgba(165, 0, 52, 0.3)"
          stroke="#A50034"
          strokeWidth="2"
        />
        
        {/* Points */}
        {points.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x}
              cy={p.y}
              r="6"
              fill="#A50034"
              stroke="white"
              strokeWidth="2"
            />
          </g>
        ))}
      </svg>
      
      {/* Labels outside the chart */}
      <div className="absolute inset-0 pointer-events-none" style={{ width: `${size}px`, height: `${size}px` }}>
        {points.map((p, i) => {
          const labelAngle = p.angle + Math.PI / 2; // Rotate back
          const labelRadius = radius + 40;
          const labelX = center + labelRadius * Math.cos(labelAngle);
          const labelY = center + labelRadius * Math.sin(labelAngle);
          
          return (
            <div
              key={i}
              className="absolute text-xs font-semibold text-gray-700"
              style={{
                left: `${labelX}px`,
                top: `${labelY}px`,
                transform: 'translate(-50%, -50%)',
                whiteSpace: 'nowrap'
              }}
            >
              {p.label}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Component to overlay face regions with skin problem indicators
interface FaceRegionOverlaysProps {
  pores: any;
  wrinkles: any;
  pigmentation: any;
  lesions: any;
  faceRegions?: any;
  imageInfo?: any;
}

const FaceRegionOverlays: React.FC<FaceRegionOverlaysProps> = ({ 
  pores, 
  wrinkles, 
  pigmentation, 
  lesions,
  faceRegions,
  imageInfo
}) => {
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const updateSize = () => {
      const img = document.getElementById('analysis-photo') as HTMLImageElement;
      if (img) {
        const rect = img.getBoundingClientRect();
        console.log('📏 Updating image size:', rect);
        if (rect.width > 0 && rect.height > 0) {
          setImageSize({
            width: rect.width,
            height: rect.height
          });
        }
      }
    };
    
    // Initial check
    const timer1 = setTimeout(updateSize, 100);
    const timer2 = setTimeout(updateSize, 500);
    const timer3 = setTimeout(updateSize, 1000);
    
    const img = document.getElementById('analysis-photo') as HTMLImageElement;
    if (img) {
      if (img.complete) {
        updateSize();
      } else {
        img.onload = () => {
          setTimeout(updateSize, 100);
          setTimeout(updateSize, 500);
        };
      }
    }
    
    window.addEventListener('resize', updateSize);
    window.addEventListener('load', updateSize);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      window.removeEventListener('resize', updateSize);
      window.removeEventListener('load', updateSize);
    };
  }, [pores, wrinkles, pigmentation, lesions]);

  // Standard face region positions (as percentages of image dimensions)
  const getStandardRegionPositions = (imgWidth: number, imgHeight: number) => {
    const regions: Record<string, { left: number; top: number; width: number; height: number }> = {};
    
    // Forehead: top 20% of face, centered horizontally
    regions.forehead = {
      left: imgWidth * 0.15,
      top: imgHeight * 0.05,
      width: imgWidth * 0.7,
      height: imgHeight * 0.25
    };
    
    // Left eye area
    regions.left_eye = {
      left: imgWidth * 0.2,
      top: imgHeight * 0.25,
      width: imgWidth * 0.15,
      height: imgHeight * 0.15
    };
    
    // Right eye area
    regions.right_eye = {
      left: imgWidth * 0.65,
      top: imgHeight * 0.25,
      width: imgWidth * 0.15,
      height: imgHeight * 0.15
    };
    
    // Nose bridge (between eyes)
    regions.nose = {
      left: imgWidth * 0.4,
      top: imgHeight * 0.25,
      width: imgWidth * 0.2,
      height: imgHeight * 0.25
    };
    
    // Left cheek
    regions.left_cheek = {
      left: imgWidth * 0.1,
      top: imgHeight * 0.4,
      width: imgWidth * 0.3,
      height: imgHeight * 0.3
    };
    
    // Right cheek
    regions.right_cheek = {
      left: imgWidth * 0.6,
      top: imgHeight * 0.4,
      width: imgWidth * 0.3,
      height: imgHeight * 0.3
    };
    
    // Chin
    regions.chin = {
      left: imgWidth * 0.25,
      top: imgHeight * 0.65,
      width: imgWidth * 0.5,
      height: imgHeight * 0.25
    };
    
    return regions;
  };

  const getRegionColor = (regionName: string): { bg: string; border: string } => {
    // Check for issues in this specific region
    const regionPores = pores?.[regionName];
    const regionWrinkles = wrinkles?.[regionName];
    const regionPigmentation = pigmentation?.[regionName];
    
    const hasPores = regionPores && (regionPores.count > 0 || (regionPores.severity && regionPores.severity !== 'none' && regionPores.severity !== 'low'));
    const hasWrinkles = regionWrinkles && (regionWrinkles.wrinkle_score > 0.3 || (regionWrinkles.severity && regionWrinkles.severity !== 'none' && regionWrinkles.severity !== 'low'));
    const hasPigmentation = regionPigmentation && (regionPigmentation.spot_count > 0 || (regionPigmentation.severity && regionPigmentation.severity !== 'none' && regionPigmentation.severity !== 'low'));
    const hasLesions = lesions && lesions.count > 0;
    
    const hasIssues = hasPores || hasWrinkles || hasPigmentation || hasLesions;
    
    // Red for areas with significant issues (eyes, nose, forehead)
    if (hasIssues && (regionName.includes('eye') || regionName.includes('nose') || regionName.includes('forehead'))) {
      return {
        bg: 'rgba(239, 68, 68, 0.4)',
        border: 'rgba(239, 68, 68, 0.6)'
      };
    }
    
    // Green for healthy areas or areas with minor issues (cheeks, chin)
    // Always show green for cheeks and chin, or if no issues detected
    return {
      bg: 'rgba(34, 197, 94, 0.3)',
      border: 'rgba(34, 197, 94, 0.5)'
    };
  };

  // Use face_regions from API if available, otherwise use standard positions
  let regionsToRender: Array<{ name: string; position: { left: number; top: number; width: number; height: number } }> = [];
  
  if (imageSize.width > 0 && imageSize.height > 0) {
    if (faceRegions && Object.keys(faceRegions).length > 0) {
      // Use API-provided bounding boxes
      const originalSize = imageInfo?.original_size || imageInfo?.processed_size || { width: imageSize.width, height: imageSize.height };
      const scaleX = imageSize.width / originalSize.width;
      const scaleY = imageSize.height / originalSize.height;
      
      regionsToRender = Object.entries(faceRegions).map(([name, bbox]: [string, any]) => {
        if (!Array.isArray(bbox) || bbox.length !== 4) return null;
        const [x1, y1, x2, y2] = bbox;
        return {
          name,
          position: {
            left: x1 * scaleX,
            top: y1 * scaleY,
            width: (x2 - x1) * scaleX,
            height: (y2 - y1) * scaleY
          }
        };
      }).filter(Boolean) as Array<{ name: string; position: { left: number; top: number; width: number; height: number } }>;
    } else {
      // Use standard face region positions - always show these if we have analysis data
      const standardRegions = getStandardRegionPositions(imageSize.width, imageSize.height);
      regionsToRender = Object.entries(standardRegions).map(([name, pos]) => ({
        name,
        position: pos
      }));
    }
  }

  if (!imageSize.width || imageSize.width === 0 || regionsToRender.length === 0) {
    console.log('FaceRegionOverlays: Not rendering - imageSize:', imageSize, 'regionsToRender:', regionsToRender.length);
    return null;
  }

  console.log('🎨 FaceRegionOverlays render:', {
    imageSize,
    hasPores: !!pores,
    hasWrinkles: !!wrinkles,
    hasPigmentation: !!pigmentation,
    hasLesions: !!lesions,
    regionsCount: regionsToRender.length,
    regions: regionsToRender.map(r => r.name)
  });

  if (regionsToRender.length === 0) {
    console.log('⚠️ No regions to render');
    return null;
  }

  return (
    <div 
      className="absolute top-0 left-0 pointer-events-none" 
      style={{ 
        width: `${imageSize.width}px`,
        height: `${imageSize.height}px`,
        position: 'absolute',
        top: 0,
        left: 0,
        zIndex: 20
      }}
    >
      {regionsToRender.map(({ name, position }) => {
        const colors = getRegionColor(name);
        const poreCount = pores?.[name]?.count || 0;
        const wrinkleSeverity = wrinkles?.[name]?.severity || 'none';
        const spotCount = pigmentation?.[name]?.spot_count || 0;
        
        return (
          <div
            key={name}
            style={{
              position: 'absolute',
              left: `${position.left}px`,
              top: `${position.top}px`,
              width: `${position.width}px`,
              height: `${position.height}px`,
              backgroundColor: colors.bg,
              border: `2px solid ${colors.border}`,
              borderRadius: '0px',
              transition: 'all 0.3s ease',
              zIndex: 10,
              pointerEvents: 'none',
              boxSizing: 'border-box'
            }}
            className="hover:opacity-80"
            title={`${name}: ${poreCount} pores, ${wrinkleSeverity} wrinkles, ${spotCount} spots`}
          />
        );
      })}
    </div>
  );
};

interface AnalysisData {
  id: number;
  photo_id: number;
  analysis_data: any;
  skin_problems: string;
  recommendations: string;
  created_at: string;
}

export default function AnalysisResults() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const { photoId } = useParams<{ photoId: string }>();
  const { logout } = useAuth();
  const { notification, showNotification, closeNotification } = useNotification();
  
  const [analysis, setAnalysis] = useState<AnalysisData | null>(
    location.state?.analysisData || null
  );
  const [loading, setLoading] = useState(!location.state?.analysisData);
  const [error, setError] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(
    location.state?.photoUrl || null
  );

  const toggleLanguage = () => {
    const newLang = i18n.language === "en" ? "kr" : "en";
    i18n.changeLanguage(newLang);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  useEffect(() => {
    const fetchAnalysis = async () => {
      if (!photoId) {
        setError("Photo ID is missing");
        setLoading(false);
        return;
      }

      // If analysis data was passed via navigation state, use it
      const stateAnalysis = location.state?.analysisData;
      if (stateAnalysis) {
        setAnalysis(stateAnalysis);
        setLoading(false);
      }

      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        
        // Get the photo URL if not already set from location state
        if (!photoUrl) {
          const photoRes = await fetch(`${apiUrl}/photos`, {
            credentials: "include",
          });
          
          if (photoRes.ok) {
            const photos = await photoRes.json();
            const photo = photos.find((p: any) => p.id === parseInt(photoId));
            if (photo) {
              setPhotoUrl(photo.s3_url || photo.data_url || photo.url);
            }
          }
        }

        // If we don't have analysis data from state, fetch it
        if (!stateAnalysis) {
          const analysisRes = await fetch(`${apiUrl}/skin-analysis/analyze/${photoId}`, {
            method: "POST",
            credentials: "include",
          });

          if (!analysisRes.ok) {
            const errorText = await analysisRes.text();
            throw (errorText);
          }

          const analysisData = await analysisRes.json();
          console.log("✅ Analysis data received:", analysisData);
          console.log("📋 Skin problems (raw):", analysisData.skin_problems, typeof analysisData.skin_problems);
          
          // Debug: Try to parse skin_problems
          if (analysisData.skin_problems) {
            try {
              const parsed = JSON.parse(analysisData.skin_problems);
              console.log("📋 Skin problems (parsed):", parsed, Array.isArray(parsed));
            } catch (e) {
              console.log("📋 Skin problems (parse error):", e, "Raw value:", analysisData.skin_problems);
            }
          } else {
            console.warn("⚠️ No skin_problems field in response!");
          }
          
          console.log("📊 Analysis data type:", typeof analysisData.analysis_data);
          console.log("📊 Analysis data keys:", analysisData.analysis_data ? Object.keys(analysisData.analysis_data) : "null");
          setAnalysis(analysisData);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load analysis");
        showNotification("Failed to load analysis", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photoId]);

  const parseJsonOrString = useCallback((value: string | null): any => {
    if (!value) return null;
    // If it's already an array or object, return it
    if (Array.isArray(value) || typeof value === 'object') {
      return value;
    }
    // Try to parse as JSON
    try {
      const parsed = JSON.parse(value);
      return parsed;
    } catch {
      // If parsing fails, treat as plain string
      return value;
    }
  }, []);

  // Extract detailed analysis data from API response
  const getDetailedAnalysis = useCallback(() => {
    if (!analysis?.analysis_data) return null;
    try {
      const data = typeof analysis.analysis_data === 'string' 
        ? JSON.parse(analysis.analysis_data) 
        : analysis.analysis_data;
      return data;
    } catch {
      return null;
    }
  }, [analysis]);

  const detailedAnalysis = React.useMemo(() => getDetailedAnalysis(), [getDetailedAnalysis]);

  const getSkinProblems = useCallback((): string[] => {
    const problems: string[] = [];
    
    console.log("🔍 getSkinProblems called with analysis:", analysis);
    console.log("🔍 analysis.skin_problems:", analysis?.skin_problems, typeof analysis?.skin_problems);
    
    // First, try to get from skin_problems field (this is what the backend stores from Zyla API)
    if (analysis?.skin_problems) {
      const parsed = parseJsonOrString(analysis.skin_problems);
      console.log("🔍 Parsed result:", parsed, "Type:", typeof parsed, "IsArray:", Array.isArray(parsed));
      
      if (Array.isArray(parsed)) {
        // Add all problems from the array
        parsed.forEach((p: any) => {
          if (p && typeof p === 'string' && p.trim()) {
            problems.push(p);
          }
        });
        console.log("🔍 Added problems from array:", problems);
      } else if (typeof parsed === "string" && parsed.trim()) {
        problems.push(parsed);
        console.log("🔍 Added problem from string:", parsed);
      } else {
        console.warn("🔍 Parsed value is not array or string:", parsed);
      }
    } else {
      console.warn("🔍 No skin_problems field in analysis object");
    }
    
    // If we still don't have problems, extract from detailed analysis data as fallback
    if (problems.length === 0) {
      const detailed = getDetailedAnalysis();
      if (detailed) {
        if (detailed.lesions && detailed.lesions.count > 0) {
          problems.push(t("analysis.problems.acneBlemishes", { 
            count: detailed.lesions.count, 
            severity: detailed.lesions.severity || 'detected' 
          }));
        }
        if (detailed.pores) {
          const totalPores = Object.values(detailed.pores).reduce((sum: number, region: any) => sum + (region.count || 0), 0);
          if (totalPores > 0) {
            problems.push(t("analysis.problems.enlargedPores", { count: totalPores }));
          }
        }
        if (detailed.pigmentation) {
          const totalSpots = Object.values(detailed.pigmentation).reduce((sum: number, region: any) => sum + (region.spot_count || 0), 0);
          if (totalSpots > 0) {
            problems.push(t("analysis.problems.darkSpotsPigmentation", { count: totalSpots }));
          }
        }
        if (detailed.wrinkles) {
          const hasWrinkles = Object.values(detailed.wrinkles).some((region: any) => (region.wrinkle_score || 0) > 0.1);
          if (hasWrinkles) {
            problems.push(t("analysis.problems.wrinklesDetected"));
          }
        }
      }
    }
    
    console.log("🔍 Final problems array:", problems);
    return problems;
  }, [analysis, parseJsonOrString, getDetailedAnalysis, t]);

  const getRecommendations = useCallback((): string[] => {
    if (!analysis?.recommendations) return [];
    const parsed = parseJsonOrString(analysis.recommendations);
    if (Array.isArray(parsed)) return parsed;
    if (typeof parsed === "string") return [parsed];
    return [];
  }, [analysis, parseJsonOrString]);

  const extractRecommendationsFromAnalysis = useCallback((): string[] => {
    const recommendations: string[] = [];
    const problems = getSkinProblems();
    
    // Map skin problems to vitamin/nutrition recommendations
    const problemToVitamins: Record<string, string[]> = {
      "acne": ["Vitamin A", "Zinc", "Omega-3", "Vitamin E"],
      "dryness": ["Vitamin E", "Omega-3", "Vitamin C", "Hyaluronic Acid"],
      "oiliness": ["Vitamin B3 (Niacin)", "Zinc", "Vitamin A"],
      "wrinkles": ["Vitamin C", "Collagen", "Vitamin E", "Retinol"],
      "redness": ["Omega-3", "Vitamin C", "Zinc", "Vitamin E"],
      "dark spots": ["Vitamin C", "Vitamin E", "Niacinamide"],
      "uneven tone": ["Vitamin C", "Vitamin E", "Niacinamide", "Retinol"],
    };

    problems.forEach(problem => {
      const lowerProblem = problem.toLowerCase();
      for (const [key, vitamins] of Object.entries(problemToVitamins)) {
        if (lowerProblem.includes(key)) {
          recommendations.push(...vitamins);
        }
      }
    });

    // Remove duplicates
    return Array.from(new Set(recommendations));
  }, [getSkinProblems]);

  const recommendations = React.useMemo(() => {
    const recs = getRecommendations();
    return recs.length > 0 ? recs : extractRecommendationsFromAnalysis();
  }, [getRecommendations, extractRecommendationsFromAnalysis]);

  const skinProblems = React.useMemo(() => getSkinProblems(), [getSkinProblems]);

  // Calculate metric scores from detailed analysis for circular overlays
  const getMetricScores = useCallback(() => {
    if (!detailedAnalysis) return null;
    
    const scores: Record<string, { value: number; label: string; color: string }> = {};
    
    // Blemish prone (from lesions)
    if (detailedAnalysis.lesions) {
      const lesionCount = detailedAnalysis.lesions.count || 0;
      const severity = detailedAnalysis.lesions.severity || 'none';
      const severityMap: Record<string, number> = { 'none': 0, 'low': 30, 'moderate': 60, 'high': 90, 'severe': 100 };
      scores.blemish = {
        value: Math.min(100, lesionCount * 10 + (severityMap[severity.toLowerCase()] || 0)),
        label: t("analysis.metrics.blemish"),
        color: 'border-blue-500 bg-blue-50 text-blue-700'
      };
    }
    
    // Oiliness/Shine (from skin type or pores)
    if (detailedAnalysis.skin_type?.label) {
      const skinType = detailedAnalysis.skin_type.label.toLowerCase();
      const oilinessMap: Record<string, number> = { 'oily': 85, 'combination': 60, 'normal': 40, 'dry': 20 };
      scores.oiliness = {
        value: oilinessMap[skinType] || 50,
        label: t("analysis.metrics.oiliness"),
        color: 'border-orange-500 bg-orange-50 text-orange-700'
      };
    }
    
    // Redness prone (from lesions or inflammation)
    if (detailedAnalysis.lesions) {
      const rednessScore = detailedAnalysis.severity?.component_scores?.inflammatory_acne || 0;
      scores.redness = {
        value: Math.min(100, rednessScore * 20),
        label: t("analysis.metrics.redness"),
        color: 'border-red-500 bg-red-50 text-red-700'
      };
    }
    
    // Dark Circles (estimated from pigmentation)
    if (detailedAnalysis.pigmentation) {
      const darkSpots = Object.values(detailedAnalysis.pigmentation).reduce((sum: number, region: any) => {
        return sum + (region.spot_count || 0);
      }, 0);
      scores.darkCircles = {
        value: Math.min(100, darkSpots * 15),
        label: t("analysis.metrics.darkCircles"),
        color: 'border-red-800 bg-red-100 text-red-900'
      };
    }
    
    // Wrinkles
    if (detailedAnalysis.wrinkles) {
      const wrinkleScores = Object.values(detailedAnalysis.wrinkles).map((region: any) => region.wrinkle_score || 0);
      const avgWrinkle = wrinkleScores.length > 0 
        ? wrinkleScores.reduce((a: number, b: number) => a + b, 0) / wrinkleScores.length 
        : 0;
      scores.wrinkles = {
        value: Math.min(100, avgWrinkle * 100),
        label: t("analysis.metrics.wrinkles"),
        color: 'border-green-500 bg-green-50 text-green-700'
      };
    }
    
    // Texture (from pores)
    if (detailedAnalysis.pores) {
      const poreCounts = Object.values(detailedAnalysis.pores).map((region: any) => region.count || 0);
      const totalPores = poreCounts.reduce((a: number, b: number) => a + b, 0);
      scores.texture = {
        value: Math.min(100, totalPores * 2),
        label: t("analysis.metrics.texture"),
        color: 'border-purple-500 bg-purple-50 text-purple-700'
      };
    }
    
    // Dark Spots (from pigmentation)
    if (detailedAnalysis.pigmentation) {
      const totalSpots = Object.values(detailedAnalysis.pigmentation).reduce((sum: number, region: any) => {
        return sum + (region.spot_count || 0);
      }, 0);
      scores.darkSpots = {
        value: Math.min(100, totalSpots * 20),
        label: t("analysis.metrics.darkSpots"),
        color: 'border-blue-500 bg-blue-50 text-blue-700'
      };
    }
    
    // Hydration (estimated from skin type)
    if (detailedAnalysis.skin_type?.label) {
      const skinType = detailedAnalysis.skin_type.label.toLowerCase();
      const hydrationMap: Record<string, number> = { 'dry': 30, 'normal': 60, 'combination': 70, 'oily': 80 };
      scores.hydration = {
        value: hydrationMap[skinType] || 65,
        label: t("analysis.metrics.hydration"),
        color: 'border-amber-600 bg-amber-50 text-amber-800'
      };
    }
    
    return scores;
  }, [detailedAnalysis, t]);

  const metricScores = React.useMemo(() => getMetricScores(), [getMetricScores]);

  // Get overall severity and quality for problems section
  const getOverallSeverity = useCallback(() => {
    if (!detailedAnalysis) return { severity: 'unknown', score: 0 };
    const severity = detailedAnalysis.severity?.overall || 'unknown';
    const weightedScore = detailedAnalysis.severity?.total_weighted_score || 0;
    return { severity, score: weightedScore };
  }, [detailedAnalysis]);

  const getImageQuality = useCallback(() => {
    if (!detailedAnalysis?.quality) return { quality: 'error', score: 0 };
    const quality = detailedAnalysis.quality.overall_quality || 'error';
    const score = (detailedAnalysis.quality.quality_score || 0) * 100;
    return { quality, score };
  }, [detailedAnalysis]);

  const overallSeverity = React.useMemo(() => getOverallSeverity(), [getOverallSeverity]);
  const imageQuality = React.useMemo(() => getImageQuality(), [getImageQuality]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-stone-200 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#A50034] animate-spin mx-auto mb-4" />
          <p className="text-gray-700">{t("analysis.loading")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-stone-200">
        <header className="bg-white/80 backdrop-blur-md shadow-sm relative z-10 pt-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-center sm:justify-end items-center">
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
        <main className="flex flex-col items-center justify-center min-h-screen max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <Error message={error} />
          <Button onClick={() => navigate("/capture")} variant="primary" className="mt-4">
            <ArrowLeft className="w-5 h-5 mr-2" />
            {t("analysis.backToCapture")}
          </Button>
        </main>
      </div>
    );
  }

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

        {/* Modern Photo Section with Skin Age and Metrics */}
        {photoUrl ? (
          <div className="bg-white rounded-3xl shadow-2xl mb-8 overflow-hidden">
            <div className="relative">
              {/* Photo with Overlays */}
              <div className="relative w-full bg-gradient-to-br from-gray-100 to-gray-200 p-8">
                <div className="relative max-w-2xl mx-auto">
                  <div className="relative inline-block max-w-full" style={{ position: 'relative', display: 'inline-block' }}>
                    <img
                      id="analysis-photo"
                      src={photoUrl}
                      alt="Analysis photo"
                      className="max-w-full max-h-[600px] object-contain rounded-2xl relative z-0 shadow-2xl block"
                      style={{ display: 'block' }}
                      onLoad={(e) => {
                        const img = e.target as HTMLImageElement;
                        console.log("📸 Image loaded, dimensions:", {
                          natural: { width: img.naturalWidth, height: img.naturalHeight },
                          displayed: { width: img.width, height: img.height },
                          rect: img.getBoundingClientRect()
                        });
                        // Force overlay update by triggering resize
                        setTimeout(() => {
                          const event = new Event('resize');
                          window.dispatchEvent(event);
                        }, 200);
                      }}
                      onError={(e) => {
                        console.error("Failed to load image:", photoUrl);
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                    
                    {/* Face Region Overlays - Always render if we have analysis data */}
                    {detailedAnalysis && (
                      <FaceRegionOverlays 
                        faceRegions={detailedAnalysis.face_regions}
                        pores={detailedAnalysis.pores}
                        wrinkles={detailedAnalysis.wrinkles}
                        pigmentation={detailedAnalysis.pigmentation}
                        lesions={detailedAnalysis.lesions}
                        imageInfo={detailedAnalysis.image_info}
                      />
                    )}
                  </div>
                  
                  {/* Skin Age Display - Bottom Left */}
                  {detailedAnalysis && (
                    <div className="absolute bottom-4 left-4 bg-white rounded-xl px-4 py-3 shadow-lg z-20">
                      <div className="text-xs text-gray-600 mb-0.5">{t("analysis.skinAge")}</div>
                      <div className="text-3xl font-bold text-[#A50034]">
                        {detailedAnalysis.severity?.overall === 'mild' ? '23' : 
                         detailedAnalysis.severity?.overall === 'moderate' ? '28' : 
                         detailedAnalysis.severity?.overall === 'severe' ? '35' : '28'}
                      </div>
                    </div>
                  )}
                  
                  {/* Circular Metric Buttons - Bottom Right */}
                  {metricScores && (
                    <div className="absolute bottom-4 right-4 flex gap-2 z-20">
                      {metricScores.blemish && (
                        <div className="w-14 h-14 rounded-full bg-pink-200 flex items-center justify-center shadow-md">
                          <span className="text-base font-bold text-pink-800">{Math.round(metricScores.blemish.value)}</span>
                        </div>
                      )}
                      {metricScores.texture && (
                        <div className="w-14 h-14 rounded-full bg-purple-200 flex items-center justify-center shadow-md">
                          <span className="text-base font-bold text-purple-800">{Math.round(metricScores.texture.value)}</span>
                        </div>
                      )}
                      {metricScores.wrinkles && (
                        <div className="w-14 h-14 rounded-full bg-green-200 flex items-center justify-center shadow-md">
                          <span className="text-base font-bold text-green-800">{Math.round(metricScores.wrinkles.value)}</span>
                        </div>
                      )}
                      {metricScores.darkSpots && (
                        <div className="w-14 h-14 rounded-full bg-blue-200 flex items-center justify-center shadow-md">
                          <span className="text-base font-bold text-blue-800">{Math.round(metricScores.darkSpots.value)}</span>
                        </div>
                      )}
                      {metricScores.hydration && (
                        <div className="w-14 h-14 rounded-full bg-yellow-200 flex items-center justify-center shadow-md">
                          <span className="text-base font-bold text-yellow-800">{Math.round(metricScores.hydration.value)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-lg mb-6 p-6">
            <div className="text-center py-8">
              <p className="text-gray-500">{t("analysis.photoLoading")}</p>
            </div>
          </div>
        )}

        {/* Skin Health Matrix - Radar Chart Section */}
        {detailedAnalysis && metricScores && Object.keys(metricScores).length > 0 && (
          <div className="bg-white rounded-3xl shadow-2xl mb-8 p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6 text-center">{t("analysis.yourSkinReport")}</h2>
            <div className="text-center mb-2 text-lg font-semibold text-gray-700">{t("analysis.skinHealthMatrix")}</div>
            
            {/* Simple Radar Chart using SVG */}
            <div className="flex justify-center items-center my-8 min-h-[350px]">
              <SkinHealthRadarChart metricScores={metricScores} />
            </div>
            
            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mt-8">
              {metricScores.blemish && (
                <div className="text-center p-3 bg-pink-50 rounded-xl">
                  <div className="text-2xl font-bold text-pink-700">{Math.round(metricScores.blemish.value)}</div>
                  <div className="text-xs text-gray-600 mt-1">{t("analysis.metrics.blemish")}</div>
                </div>
              )}
              {metricScores.oiliness && (
                <div className="text-center p-3 bg-orange-50 rounded-xl">
                  <div className="text-2xl font-bold text-orange-700">{Math.round(metricScores.oiliness.value)}</div>
                  <div className="text-xs text-gray-600 mt-1">{t("analysis.metrics.oiliness")}</div>
                </div>
              )}
              {metricScores.redness && (
                <div className="text-center p-3 bg-red-50 rounded-xl">
                  <div className="text-2xl font-bold text-red-700">{Math.round(metricScores.redness.value)}</div>
                  <div className="text-xs text-gray-600 mt-1">{t("analysis.metrics.redness")}</div>
                </div>
              )}
              {metricScores.darkCircles && (
                <div className="text-center p-3 bg-gray-50 rounded-xl">
                  <div className="text-2xl font-bold text-gray-700">{Math.round(metricScores.darkCircles.value)}</div>
                  <div className="text-xs text-gray-600 mt-1">{t("analysis.metrics.darkCircles")}</div>
                </div>
              )}
              {metricScores.wrinkles && (
                <div className="text-center p-3 bg-green-50 rounded-xl">
                  <div className="text-2xl font-bold text-green-700">{Math.round(metricScores.wrinkles.value)}</div>
                  <div className="text-xs text-gray-600 mt-1">{t("analysis.metrics.wrinkles")}</div>
                </div>
              )}
              {metricScores.texture && (
                <div className="text-center p-3 bg-purple-50 rounded-xl">
                  <div className="text-2xl font-bold text-purple-700">{Math.round(metricScores.texture.value)}</div>
                  <div className="text-xs text-gray-600 mt-1">{t("analysis.metrics.texture")}</div>
                </div>
              )}
              {metricScores.darkSpots && (
                <div className="text-center p-3 bg-blue-50 rounded-xl">
                  <div className="text-2xl font-bold text-blue-700">{Math.round(metricScores.darkSpots.value)}</div>
                  <div className="text-xs text-gray-600 mt-1">{t("analysis.metrics.darkSpots")}</div>
                </div>
              )}
              {metricScores.hydration && (
                <div className="text-center p-3 bg-amber-50 rounded-xl">
                  <div className="text-2xl font-bold text-amber-700">{Math.round(metricScores.hydration.value)}</div>
                  <div className="text-xs text-gray-600 mt-1">{t("analysis.metrics.hydration")}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Skin Analysis Results Section */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden mb-6">
          <div className="p-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-8 text-center">
              {t("analysis.title")}
            </h1>

            {/* Detected Skin Problems Section */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-6">
                <AlertCircle className="w-8 h-8 text-orange-500" />
                <h2 className="text-3xl font-bold text-gray-900">
                  {t("analysis.skinProblems")}
                </h2>
              </div>
              <div className="space-y-4">
                {/* Show all problems from Zyla API */}
                {skinProblems.length > 0 ? (
                  <>
                    {skinProblems.map((problem, index) => (
                      <div
                        key={index}
                        className="p-5 bg-orange-100 border-2 border-orange-300 rounded-lg shadow-md hover:shadow-lg transition-shadow"
                      >
                        <p className="text-gray-900 font-semibold text-lg">{problem}</p>
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    {/* Fallback: Show Overall Severity and Image Quality if no specific problems */}
                    {overallSeverity.severity !== 'unknown' && (
                      <div className="p-5 bg-orange-100 border-2 border-orange-300 rounded-lg shadow-md">
                        <p className="text-gray-900 font-semibold text-lg">
                          {t("analysis.problems.overallSeverity", { 
                            severity: overallSeverity.severity, 
                            score: overallSeverity.score.toFixed(2) 
                          })}
                        </p>
                      </div>
                    )}
                    
                    {imageQuality.quality !== 'error' && imageQuality.score > 0 && (
                      <div className="p-5 bg-orange-100 border-2 border-orange-300 rounded-lg shadow-md">
                        <p className="text-gray-900 font-semibold text-lg">
                          {t("analysis.problems.imageQuality", { 
                            quality: imageQuality.quality, 
                            score: imageQuality.score.toFixed(1) 
                          })}
                        </p>
                      </div>
                    )}
                    
                    {!analysis && (
                      <div className="p-5 bg-yellow-100 border-2 border-yellow-300 rounded-lg shadow-md">
                        <p className="text-gray-900 font-semibold text-lg">
                          ⚠️ {t("analysis.analysisLoading")}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Recommended Vitamins & Nutrients Section */}
            {recommendations.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center gap-3 mb-6">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                  <h2 className="text-3xl font-bold text-gray-900">
                    {t("analysis.recommendations")}
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recommendations.map((rec, index) => (
                    <div
                      key={index}
                      className="p-5 bg-green-100 border-2 border-green-300 rounded-lg shadow-md hover:shadow-lg transition-shadow flex items-center gap-4"
                    >
                      <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                      <p className="text-gray-900 font-semibold text-lg">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fallback if no problems or recommendations */}
            {skinProblems.length === 0 && recommendations.length === 0 && overallSeverity.severity === 'unknown' && (
              <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-6 h-6 text-blue-500" />
                  <h3 className="text-lg font-bold text-gray-900">
                    {t("analysis.noIssues")}
                  </h3>
                </div>
                <p className="text-gray-700">
                  {t("analysis.noIssuesDesc")}
                </p>
              </div>
            )}

            <div className="mt-6 flex gap-4">
              <Button
                onClick={() => navigate("/history")}
                variant="primary"
                className="flex-1"
              >
                {t("analysis.viewHistory")}
              </Button>
              <Button
                onClick={() => navigate("/capture")}
                variant="secondary"
                className="flex-1"
              >
                {t("analysis.newScan")}
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Notification
        message={notification.message}
        type={notification.type}
        isVisible={notification.isVisible}
        onClose={closeNotification}
      />
    </div>
  );
}