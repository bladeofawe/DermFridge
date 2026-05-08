import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components"
import { Scan, Package, Settings, LogOut, Languages, ChevronRight, History, Utensils, Bell, Shield, Server } from "lucide-react";

export default function Home() {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const toggleLanguage = () => {
        const newLang = i18n.language === "en" ? "kr" : "en";
        i18n.changeLanguage(newLang);
    };

    const { logout } = useAuth();
    const handleLogout = () => {
        logout();
        navigate("/");
    };

    const [showSettings, setShowSettings] = useState(false);
    const [scanCount, setScanCount] = useState(0);
    const [foodCount, setFoodCount] = useState(0);

    useEffect(() => {
        const fetchScanCount = async () => {
            try {
                const apiUrl = import.meta.env.VITE_API_URL;
                const res = await fetch(`${apiUrl}/skin-analysis/history`, {
                    credentials: "include",
                });
                if (res.ok) {
                    const contentType = res.headers.get("content-type");
                    if (contentType && contentType.includes("application/json")) {
                        const data = await res.json();
                        setScanCount(data.length);
                    }
                }
            } catch (err) {
                // console.error("Failed to fetch scan count:", err);
            }
        };
        fetchScanCount();
    }, []);

        useEffect(() => {
        const fetchFoodCount = async () => {
            try {
                const apiUrl = import.meta.env.VITE_API_URL;
                const res = await fetch(`${apiUrl}/food/inventory`, {
                    credentials: "include",
                });
                if (res.ok) {
                    const contentType = res.headers.get("content-type");
                    if (contentType && contentType.includes("application/json")) {
                        const data = await res.json();
                        setFoodCount(data.length);
                    }
                }
            } catch (err) {
                // console.error("Failed to fetch food count:", err);
            }
        };
        fetchFoodCount();
    }, []);

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
                            onClick={() => setShowSettings(!showSettings)}
                            className="p-2 hover:bg-[#A50034]/5 rounded-full transition-colors"
                        >
                            <Settings className="w-6 h-6 text-gray-700" />
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
                {!showSettings ? (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                            <div
                                key="face-scan"
                                onClick={() => navigate("/capture?type=face")}
                                className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-[#A50034] to-[#E61A5F] opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                                <div className="p-8">
                                    <div className="w-16 h-16 bg-gradient-to-br from-[#A50034] to-[#E61A5F] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                        <Scan className="w-8 h-8 text-white" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-gray-900 mb-3">{t("home.faceScan.title")}</h2>
                                    <p className="text-gray-600 mb-4">{t("home.faceScan.description")}</p>
                                    <div className="flex items-center text-sm font-medium text-gray-900 group-hover:text-red-600 transition-colors">
                                        <span>{t("home.getStarted")}</span>
                                        <ChevronRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </div>
                            <div
                                key="inventory"
                                onClick={() => navigate("/capture?type=food")}
                                className="group relative overflow-hidden bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-[#A50034] to-[#E61A5F] opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                                <div className="p-8">
                                    <div className="w-16 h-16 bg-gradient-to-br from-[#A50034] to-[#E61A5F] rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                        <Package className="w-8 h-8 text-white" />
                                    </div>
                                    <h2 className="text-2xl font-bold text-gray-900 mb-3">{t("home.inventory.title")}</h2>
                                    <p className="text-gray-600 mb-4">{t("home.inventory.description")}</p>
                                    <div className="flex items-center text-sm font-medium text-gray-900 group-hover:text-red-600 transition-colors">
                                        <span>{t("home.getStarted")}</span>
                                        <ChevronRight className="w-5 h-5 ml-1 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-2xl shadow-lg p-6">
                            <div className="grid grid-cols-2 gap-2">
                                <div 
                                    className="text-center p-4 bg-emerald-50 rounded-xl cursor-pointer hover:bg-emerald-100 transition-colors"
                                    onClick={() => navigate("/history")}
                                >
                                    <p className="text-3xl font-bold text-emerald-600">{scanCount}</p>
                                    <p className="text-sm text-gray-600 mt-1">{t("home.stats.scans")}</p>
                                </div>
                                <div className="text-center p-4 bg-emerald-50 rounded-xl">
                                    <p className="text-3xl font-bold text-emerald-600">{foodCount}</p>
                                    <p className="text-sm text-gray-600 mt-1">{t("home.stats.items")}</p>
                                </div>
                            </div>

                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
                            <button
                                onClick={() => navigate("/history")}
                                className="w-full bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-[#A50034] to-[#E61A5F] rounded-xl flex items-center justify-center">
                                        <History className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="text-lg font-bold text-gray-900">{t("home.viewHistory")}</h3>
                                        <p className="text-sm text-gray-600">{t("home.viewHistoryDesc")}</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-[#A50034] group-hover:translate-x-1 transition-all" />
                            </button>
                            <button
                                onClick={() => navigate("/inventory")}
                                className="w-full bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-all flex items-center justify-between group"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-[#A50034] to-[#E61A5F] rounded-xl flex items-center justify-center">
                                        <Server className="w-6 h-6 text-white" />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="text-lg font-bold text-gray-900">{t("home.viewInventory")}</h3>
                                        <p className="text-sm text-gray-600">{t("home.viewInventoryDesc")}</p>
                                    </div>
                                </div>
                                <ChevronRight className="w-6 h-6 text-gray-400 group-hover:text-[#A50034] group-hover:translate-x-1 transition-all" />
                            </button>
                        </div>
                    </>
                ) : (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">{t("settings.title")}</h2>
                            <Button
                                type="submit"
                                variant="secondary"
                                size="sm"
                                onClick={() => setShowSettings(false)}
                                className="px-6 py-2"
                            >
                                {t("settings.back")}
                            </Button>
                        </div>
                        <div className="bg-white rounded-2xl shadow-lg p-6">
                            <div className="flex items-start space-x-4 mb-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-[#A50034] to-[#E61A5F] rounded-xl flex items-center justify-center flex-shrink-0">
                                    <Utensils className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-gray-900 mb-1">{t("settings.dietary.title")}</h3>
                                    <p className="text-sm text-gray-600 mb-4">{t("settings.dietary.description")}</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-4 mb-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-[#A50034] to-[#E61A5F] rounded-xl flex items-center justify-center flex-shrink-0">
                                    <Bell className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-gray-900 mb-1">{t("settings.notifications.title")}</h3>
                                    <p className="text-sm text-gray-600 mb-4">{t("settings.notifications.description")}</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-4 mb-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-[#A50034] to-[#E61A5F] rounded-xl flex items-center justify-center flex-shrink-0">
                                    <Languages className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-gray-900 mb-1">{t("settings.language.title")}</h3>
                                    <p className="text-sm text-gray-600 mb-4">{t("settings.language.description")}</p>
                                </div>
                            </div>
                            <div className="flex items-start space-x-4 mb-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-[#A50034] to-[#E61A5F] rounded-xl flex items-center justify-center flex-shrink-0">
                                    <Shield className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-gray-900 mb-1">{t("settings.privacy.title")}</h3>
                                    <p className="text-sm text-gray-600 mb-4">{t("settings.privacy.description")}</p>
                                </div>
                            </div>
                        </div>
                        <Button
                            type="submit"
                            variant="primary"
                            fullWidth
                            onClick={() => setShowSettings(false)}
                        >
                            {t("settings.save")}
                        </Button>
                    </div>
                )}
            </main>
        </div>
    );
}
