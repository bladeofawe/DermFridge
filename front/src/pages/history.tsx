"use client";

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/hooks";
import { Button, Notification } from "@/components";
import { ArrowLeft, Loader2, Calendar, Languages, LogOut, Eye } from "lucide-react";

interface AnalysisData {
  id: number;
  photo_id: number;
  analysis_data: any;
  skin_problems: string;
  recommendations: string;
  created_at: string;
}

export default function History() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const { logout } = useAuth();
  const { notification, showNotification, closeNotification } = useNotification();
  
  const [analyses, setAnalyses] = useState<AnalysisData[]>([]);
  const [loading, setLoading] = useState(true);

  const toggleLanguage = () => {
    const newLang = i18n.language === "en" ? "kr" : "en";
    i18n.changeLanguage(newLang);
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
        const res = await fetch(`${apiUrl}/skin-analysis/history`, {credentials: "include"});
        if (res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            const data = await res.json();
            setAnalyses(data);
          } else {
            console.error("Response is not JSON");
            showNotification("Failed to load history: Invalid response", "error");
          }
        } else {
          showNotification("Failed to load history", "error");
        }
      } catch (err: any) {
        console.error("Failed to fetch history:", err);
        showNotification("Failed to load history", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const parseJsonOrString = (value: string | null): any => {
    if (!value) return null;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getSkinProblems = (analysis: AnalysisData): string[] => {
    if (!analysis?.skin_problems) return [];
    const parsed = parseJsonOrString(analysis.skin_problems);
    if (Array.isArray(parsed)) return parsed;
    if (typeof parsed === "string") return [parsed];
    return [];
  };

  const getRecommendations = (analysis: AnalysisData): string[] => {
    if (!analysis?.recommendations) return [];
    const parsed = parseJsonOrString(analysis.recommendations);
    if (Array.isArray(parsed)) return parsed;
    if (typeof parsed === "string") return [parsed];
    return [];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-stone-200 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-[#A50034] animate-spin mx-auto mb-4" />
          <p className="text-gray-700">{t("history.loading")}</p>
        </div>
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

        {analyses.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {t("history.noAnalyses")}
            </h2>
            <p className="text-gray-600 mb-6">
              {t("history.noAnalysesDesc")}
            </p>
            <Button
              onClick={() => navigate("/capture?type=face")}
              variant="primary"
            >
              {t("history.startScan")}
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {analyses.map((analysis) => {
              const problems = getSkinProblems(analysis);
              const recommendations = getRecommendations(analysis);
              
              return (
                <div
                  key={analysis.id}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-5 h-5" />
                        <span className="text-sm">{formatDate(analysis.created_at)}</span>
                      </div>
                      <Button
                        onClick={() => navigate(`/analysis/${analysis.photo_id}`)}
                        variant="secondary"
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        {t("history.view")}
                      </Button>
                    </div>

                    {problems.length > 0 && (
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {t("history.skinProblems")}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {problems.map((problem, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm"
                            >
                              {problem}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {recommendations.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {t("history.recommendations")}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {recommendations.map((rec, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                            >
                              {rec}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {problems.length === 0 && recommendations.length === 0 && (
                      <p className="text-gray-600 italic">
                        {t("history.noData")}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
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

