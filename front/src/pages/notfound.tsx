import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components";
import { Languages } from "lucide-react";

export default function NotFound() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const toggleLanguage = () => {
      const newLang = i18n.language === "en" ? "kr" : "en";
      i18n.changeLanguage(newLang);
  };

  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-gray-600">{t("common.loading")}</div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gray-50">
      <header className="relative z-20 pt-4 px-6">
          <div className="max-w-7xl mx-auto flex justify-center sm:justify-end items-center">
              <div className="flex items-center px-3 py-2 rounded-full p-1 cursor-pointer transition-all duration-300 text-gray-700 hover:bg-[#A50034]/5">
                  <Languages onClick={toggleLanguage} className="w-6 h-6" />
              </div>
          </div>
      </header>
      <div className="h-screen flex flex-col items-center justify-center text-center">
        <h1 className="text-7xl font-extrabold text-[#A50034] mb-4">404</h1>
        <p className="text-lg text-gray-700 dark:text-gray-300 mb-8">
          {t("notfound.message")}
        </p>
        <Button
          onClick={() => navigate(user ? "/home" : "/")}
          className="px-6 py-3 bg-gradient-to-r from-[#A50034] via-[#D70060] to-[#E61A5F]
                    text-white rounded-xl font-medium shadow-lg
                    hover:scale-105 hover:shadow-xl transition-transform duration-300"
        >
          {t("notfound.button")}
        </Button>
      </div>
    </div>
  );
}
