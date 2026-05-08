import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/hooks";
import { Button, Notification } from "@/components";
import { 
  Trash, ArrowLeft, Info, X, Flame, Droplet, ActivitySquare, 
  Package, Calendar, TrendingUp, Languages, LogOut 
} from "lucide-react";

export default function Inventory() {
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

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  const { notification, showNotification, closeNotification } = useNotification();

  const [recommendation, setRecommendation] = useState<any | null>(null);
  const [recLoading, setRecLoading] = useState(false);

  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";

  const loadInventory = async () => {
    try {
      const res = await fetch(`${apiUrl}/food/inventory`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setItems(data);
    } catch {
      showNotification("Failed to load items.", "error");
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (id: number) => {
    try {
      const res = await fetch(`${apiUrl}/food/inventory/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) throw new Error();
      setItems(prev => prev.filter(i => i.id !== id));

      showNotification("Item deleted successfully", "success");
    } catch {
      showNotification("Failed to delete item", "error");
    }
  };

  const fetchRecommendation = async () => {
    try {
      setRecLoading(true);
      setRecommendation(null);

      const res = await fetch(`${apiUrl}/food/recommend?analysis_id=1`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to get recommendation");

      const data = await res.json();
      setRecommendation(data.recommendation);

      showNotification("Food recommendations updated!", "success");
    } catch {
      showNotification("Failed to generate recommendation", "error");
    } finally {
      setRecLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-100 to-stone-200">

      {/* HEADER */}
      <header className="bg-white/80 shadow-sm backdrop-blur-md pt-4">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <Button onClick={() => navigate("/home")} variant="secondary" size="sm" className="flex gap-2">
            <ArrowLeft className="w-5 h-5" /> {t("common.back")}
          </Button>
          <div className="flex gap-2">
            <button onClick={toggleLanguage} className="p-2 hover:bg-gray-100 rounded-full">
              <Languages className="w-6 h-6" />
            </button>
            <button onClick={handleLogout} className="p-2 hover:bg-gray-100 rounded-full">
              <LogOut className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* TITLE */}
        <div className="mb-8 flex gap-3 items-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#A50034] to-[#E61A5F] flex items-center justify-center">
            <Package className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-3xl font-bold">{t("inventory.title")}</h1>
        </div>

        {/* STATS */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <div className="grid grid-cols-3 text-center gap-4">
            <div>
              <p className="text-3xl font-bold text-emerald-600">{items.length}</p>
              <p className="text-sm text-gray-600">{t("inventory.stats.totalItems")}</p>
            </div>

            <div>
              <p className="text-3xl font-bold text-blue-600">
                {items.length > 0
                  ? Math.round(items.reduce((acc, item) => acc + (item.confidence || 0), 0) / items.length * 100)
                  : 0}%
              </p>
              <p className="text-sm text-gray-600">{t("inventory.stats.avgConfidence")}</p>
            </div>

            <div>
              <p className="text-3xl font-bold text-purple-600">
                {items.filter(item => item.nutrition).length}
              </p>
              <p className="text-sm text-gray-600">{t("inventory.stats.withNutrition")}</p>
            </div>
          </div>
        </div>

        {/* RECOMMEND BUTTON */}
        <div className="flex justify-center mb-8">
          <button
            onClick={fetchRecommendation}
            disabled={recLoading || items.length === 0}
            className="px-6 py-3 bg-gradient-to-r from-[#A50034] to-[#E61A5F] text-white rounded-xl hover:shadow-lg disabled:opacity-50"
          >
            {recLoading ? "Generating..." : "✨ Get Skin-Based Food Recommendation"}
          </button>
        </div>

        {/* EMPTY STATE */}
        {loading ? (
          <div className="text-center py-20">
            <div className="animate-spin h-10 w-10 border-b-2 border-[#A50034] mx-auto"></div>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white text-center p-10 rounded-2xl shadow-lg">
            <Package className="w-16 h-16 mx-auto text-gray-400" />
            <p className="text-gray-500 mt-4">No food scanned yet.</p>
            <button
              onClick={() => navigate("/capture?type=food")}
              className="mt-4 px-6 py-3 bg-[#A50034] text-white rounded-xl"
            >
              Scan Food
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map(item => (
              <div key={item.id} className="bg-white shadow-lg p-6 rounded-xl">
                <h2 className="font-bold text-xl mb-2">{item.name}</h2>

                {/* Confidence bar */}
                <div className="h-2 bg-gray-200 rounded-full mb-4">
                  <div
                    className="h-full bg-gradient-to-r from-[#A50034] to-[#E61A5F] rounded-full"
                    style={{ width: `${item.confidence * 100}%` }}
                  />
                </div>

                {/* Open Nutrition Modal */}
                {item.nutrition && (
                  <button
                    onClick={() => setSelectedItem(item)}
                    className="w-full bg-gray-50 p-3 rounded-xl text-center mb-4 hover:bg-gray-100"
                  >
                    <Info className="w-5 h-5 inline-block mr-2" /> Nutrition Info
                  </button>
                )}

                <button
                  onClick={() => deleteItem(item.id)}
                  className="w-full bg-red-50 text-red-600 p-3 rounded-xl"
                >
                  <Trash className="inline-block mr-2" /> Delete
                </button>
              </div>
            ))}
          </div>
        )}

        {/* RECOMMENDATION RESULT */}
        {recommendation && (
          <div className="mt-12 bg-white p-6 rounded-2xl shadow-lg">
            <h2 className="text-2xl font-bold mb-4">Recommended for Your Skin</h2>

            {recommendation.ranked_items?.map((item: any, i: number) => (
              <div key={i} className="border-b pb-3 mb-3">
                <p className="font-semibold text-lg">
                  {i + 1}. {item.food} ⭐ {item.score.toFixed(1)}/10
                </p>
                <p className="text-gray-600">{item.reason}</p>
                <p className="text-sm text-gray-500">
                  Nutrients: {item.nutrients_matched.join(", ")}
                </p>
              </div>
            ))}

            {recommendation.meal_suggestion && (
              <div className="mt-4">
                <h3 className="font-semibold text-lg">Suggested Meal 🍽</h3>
                <p className="font-medium">{recommendation.meal_suggestion.name}</p>
                <p className="text-gray-600">
                  Ingredients: {recommendation.meal_suggestion.ingredients.join(", ")}
                </p>
                <p className="text-sm text-gray-500">{recommendation.meal_suggestion.benefit}</p>
              </div>
            )}
          </div>
        )}

        {/* Nutrition modal */}
        {selectedItem && (
          <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
            onClick={() => setSelectedItem(null)}
          >
        <div
          className="bg-white rounded-3xl p-6 max-w-lg w-full relative max-h-[80vh] overflow-y-auto"
          onClick={e => e.stopPropagation()}
          >
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute right-4 top-4"
              >
                <X />
              </button>

              <h3 className="text-2xl font-bold mb-4">{selectedItem.name}</h3>

             <div className="p-6 space-y-6">
  {/* ---- MAIN MACROS ---- */}
  <div className="grid grid-cols-3 gap-3">
    <div className="bg-orange-50 rounded-xl p-4 text-center border border-orange-200">
      <Flame className="w-6 h-6 text-orange-600 mx-auto mb-2" />
      <p className="text-2xl font-bold text-orange-700">
        {selectedItem.nutrition.calories || 0}
      </p>
      <p className="text-xs text-gray-600">{t("inventory.nutrition.calories")}</p>
    </div>

    <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-200">
      <Droplet className="w-6 h-6 text-blue-600 mx-auto mb-2" />
      <p className="text-2xl font-bold text-blue-700">
        {selectedItem.nutrition.protein || 0}g
      </p>
      <p className="text-xs text-gray-600">{t("inventory.nutrition.protein")}</p>
    </div>

    <div className="bg-green-50 rounded-xl p-4 text-center border border-green-200">
      <ActivitySquare className="w-6 h-6 text-green-600 mx-auto mb-2" />
      <p className="text-2xl font-bold text-green-700">
        {selectedItem.nutrition.carbs || 0}g
      </p>
      <p className="text-xs text-gray-600">{t("inventory.nutrition.carbs")}</p>
    </div>
  </div>

  {/* ---- OTHER DETAILS ---- */}
  <div className="bg-gray-50 rounded-2xl p-4">
    <h4 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">
      {t("inventory.nutrition.details")}
    </h4>
    <div className="space-y-2">
      {Object.entries(selectedItem.nutrition)
        .filter(([key, value]) => typeof value !== "object" && !["calories","protein","carbs"].includes(key))
        .map(([name, value]) => (
          <div key={name} className="flex justify-between items-center">
            <span className="text-sm text-gray-600 capitalize">
              {name.replace(/_/g, " ")}
            </span>
            <div className="flex items-center gap-2">
              <div className="h-2 w-24 bg-gray-200 rounded-full">
                <div
                  className="h-full bg-gradient-to-r from-[#A50034] to-pink-400 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, Number(value) * 3)}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-gray-900">{value}</span>
            </div>
          </div>
        ))}
    </div>
  </div>

  {/* ---- VITAMINS ---- */}
  {selectedItem.nutrition.vitamins && (
    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-2xl">
      <h4 className="font-semibold text-gray-700 mb-3 flex gap-2">
        💊 {t("inventory.nutrition.vitamins")}
      </h4>
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(selectedItem.nutrition.vitamins).map(([v, val]) => (
          <div key={v} className="bg-white/60 rounded-lg p-3 text-center">
            <p className="text-xs uppercase text-gray-600">{v}</p>
            <p className="text-lg font-bold text-orange-700">{val}mg</p>
          </div>
        ))}
      </div>
    </div>
  )}

  {/* ---- MINERALS ---- */}
  {selectedItem.nutrition.minerals && (
    <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl">
      <h4 className="font-semibold text-gray-700 mb-3 flex gap-2">
        ⚡ {t("inventory.nutrition.minerals")}
      </h4>
      <div className="grid grid-cols-2 gap-3">
        {Object.entries(selectedItem.nutrition.minerals).map(([m, val]) => (
          <div key={m} className="bg-white/60 rounded-lg p-3 text-center">
            <p className="text-xs uppercase text-gray-600">{m}</p>
            <p className="text-lg font-bold text-blue-700">{val}mg</p>
          </div>
        ))}
      </div>
    </div>
  )}
</div>

            </div>
          </div>
        )}

        <Notification {...notification} onClose={closeNotification} />
      </main>
    </div>
  );
}
