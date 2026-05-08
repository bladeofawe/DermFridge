import { useState, useEffect } from 'react';
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Camera, Utensils, Sparkles, Users, MapPin, Languages } from 'lucide-react';

export default function Hero() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const toggleLanguage = () => {
    const newLang = i18n.language === "en" ? "kr" : "en";
    i18n.changeLanguage(newLang);
  };
  
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const [currentFeature, setCurrentFeature] = useState(0);
  const features = [
    { icon: <Camera className="w-8 h-8" />, text: t("hero.features.skin") },
    { icon: <Utensils className="w-8 h-8" />, text: t("hero.features.food") },
    { icon: <Sparkles className="w-8 h-8" />, text: t("hero.features.recommend") }
  ];

  const handleAuth = () => {
    setTimeout(() => {
      setTimeout(() => {
        setIsTransitioning(true);
        setTimeout(() => {
          setIsDarkTheme(false);
          setTimeout(() => {
            setIsTransitioning(false);
            setTimeout(() => {
              navigate("/auth");
            }, 200);
          }, 100);
        }, 500);
      }, 500);
    }, 100);
  };

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % 3);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 relative overflow-hidden transition-all duration-1000">
      <div className={`absolute inset-0 transition-opacity duration-1000 ${isDarkTheme ? 'opacity-100' : 'opacity-0'}`}>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
          </div>
        </div>
      </div>
      <div className={`absolute inset-0 transition-opacity duration-1000 ${isDarkTheme ? 'opacity-0' : 'opacity-100'}`}>
        <div className="min-h-screen bg-gradient-to-br from-stone-200 via-gray-300 to-stone-400 relative overflow-hidden">
          <div className="absolute inset-0">
            <div className="absolute top-20 left-20 w-72 h-72 bg-amber-400/10 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute bottom-20 right-20 w-96 h-96 bg-stone-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gray-400/10 rounded-full blur-3xl animate-pulse delay-500"></div>
          </div>
        </div>
      </div>
      <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transform transition-all duration-1000 ${isTransitioning ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'}`}></div>

      <header className="relative z-10 pt-4 px-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-white/80">
              <MapPin className="w-4 h-4" />
              <span className="text-sm">{t("header.location")}</span>
            </div>
          </div>
          <div className="flex items-center text-white/80 px-3 py-2 rounded-full p-1 hover:bg-white/5">
            <Languages onClick={toggleLanguage} className="w-6 h-6" />
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-12">
        <div className="text-center mb-16">
          <div className={`flex justify-center mb-5 duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="flex items-center space-x-4 px-4 py-2">
              <a href="https://www.lg.com" target="_blank" className="hover:scale-110 transition-transform duration-300">
                <img src="/lg.png" className="w-13 h-10 object-contain" alt="LG Electronics logo" />
              </a>
              <a href="https://www.hanyang.ac.kr" target="_blank" className="hover:scale-110 transition-transform duration-300">
                <img src="/hanyang.png" className="w-11 h-11 object-contain" alt="Hanyang University logo" />
              </a>
            </div>
          </div>

          <h1 className={`text-5xl md:text-6xl xl:text-7xl font-bold text-white my-10 transition-all duration-1000 delay-200 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <span className="bg-gradient-to-r from-red-500 via-pink-500 to-purple-500 bg-clip-text text-transparent">Derm</span>
            <span className="text-white">Fridge</span>
          </h1>
          
          <p className={`text-md md:text-2xl text-white/80 mb-12 max-w-4xl mx-auto leading-relaxed transition-all duration-1000 delay-400 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {t("hero.description")}
          </p>
 
          <div className={`transition-all duration-1000 delay-800 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <button 
              onClick={handleAuth}
              className="group inline-flex items-center px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold rounded-full text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>{t("hero.cta")}</span>
              <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
            </button>
          </div>

          <div className={`flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-8 my-10 transition-all duration-1000 delay-600 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {features.map((feature, index) => (
              <div
                key={index}
                className={`flex flex-col items-center p-6 rounded-2xl w-64 sm:w-40 h-32 transition-all duration-500 ${
                  currentFeature === index
                    ? 'bg-white/20 backdrop-blur-lg border border-white/30'
                    : 'bg-white/5 backdrop-blur-sm border border-white/10'
                }`}
              >
                <div className={`text-white mb-3 transition-colors duration-500 ${
                  currentFeature === index ? 'text-purple-300' : 'text-white/70'
                }`}>
                  {feature.icon}
                </div>
                <span className="text-white text-sm font-medium text-center">{feature.text}</span>
              </div>
            ))}
          </div>

          <div className={`inline-flex items-center px-4 py-2 space-x-2 sm:bg-white/10 backdrop-blur-sm rounded-full sm:border sm:border-white/20 transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} max-w-full`}>
            <div className="flex flex-col md:flex-row md:justify-center md:space-x-2 text-sm md:text-md text-white/80 leading-relaxed transition-all">
              <span className="text-center lg:text-left">{t("hero.course")} (CSE406) : </span>
              <div className="flex items-center justify-center space-x-2 text-white/90 mt-1 md:mt-0">
                <Users className="hidden md:block w-4 h-4 flex-shrink-0" />
                <span className="text-xs md:text-sm text-center">
                  Léo BELARBI - Amina LAHRAOUI - Vaughn SIBURIAN - Henrik LAM - Shajnin HOWLADER
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}