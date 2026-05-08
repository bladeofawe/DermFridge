"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/hooks";
import { Error, Input, Button, Notification } from "@/components";
import { MapPin, Languages } from "lucide-react";

export default function Auth() {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const toggleLanguage = () => {
        const newLang = i18n.language === "en" ? "kr" : "en";
        i18n.changeLanguage(newLang);
    };
    
    const { login, user, loading } = useAuth();
    const [auth, setAuth] = useState({ email: '', password: '' });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    useEffect(() => {
        if (!loading && user) navigate("/home");
    }, [user, loading, navigate]);

    const { notification, showNotification, closeNotification } = useNotification();
    
    const validate = () => {
        let validationErrors: Record<string, string> = {};
        
        if (!auth.email.trim()) validationErrors.email = t("auth.errors.emailRequired");
        if (!auth.password) validationErrors.password = t("auth.errors.passwordRequired");
        
        return validationErrors;
    };
    
    const submit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const validationErrors = validate();
        setErrors(validationErrors);
        
        if (Object.keys(validationErrors).length === 0) {
            setIsSubmitting(true);
            
            try {
                const result = await login(auth.email, auth.password);
                
                if (result.success) {
                    if (result.data?.language) i18n.changeLanguage(result.data.language);
                    setTimeout(() => {
                        navigate("/home");
                    }, 1000);
                } else {
                    if (result.status === 401) {
                        showNotification(t("auth.errors.authFailed"), "error");
                    } else if (result.status === 429) {
                        showNotification(t("auth.errors.limitRequest"), "error");
                    } else {
                        showNotification(result.error || t("auth.errors.form"), "error");
                    }
                }
            } catch (error) {
                showNotification(t("auth.errors.connectionError"), "error");
            } finally {
                setIsSubmitting(false);
            }
        }
    };
    
    const change = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setAuth(prev => ({ ...prev, [name]: value }));
        if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
    };

    if (loading) {
        return (
            <div className="relative w-full h-screen flex items-center justify-center">
                <div className="text-gray-600">{t("common.loading")}</div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-screen overflow-hidden">
            <div className="absolute inset-0 transition-opacity duration-1000 opacity-0">
                <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 relative overflow-hidden">
                    <div className="absolute inset-0">
                        <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
                        <div className="absolute bottom-20 right-20 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>
                    </div>
                </div>
            </div>
            <div className="absolute inset-0 transition-opacity duration-1000 opacity-100">
                <div className="min-h-screen bg-gradient-to-br from-stone-200 via-gray-300 to-stone-400 relative overflow-hidden">
                    <div className="absolute inset-0">
                        <div className="absolute top-20 left-20 w-72 h-72 bg-amber-400/10 rounded-full blur-3xl animate-pulse"></div>
                        <div className="absolute bottom-20 right-20 w-96 h-96 bg-stone-400/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-gray-400/10 rounded-full blur-3xl animate-pulse delay-500"></div>
                    </div>
                </div>
            </div>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transform transition-all duration-1000 -translate-x-full opacity-0"></div>

            <header className="relative z-20 pt-4 px-6">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2 transition-colors duration-1000 text-gray-700">
                            <MapPin className="w-4 h-4" />
                            <span className="text-sm">{t("header.location")}</span>
                        </div>
                    </div>
                    <div className="flex items-center px-3 py-2 rounded-full p-1 cursor-pointer transition-all duration-300 text-gray-700 hover:bg-[#A50034]/5">
                        <Languages onClick={toggleLanguage} className="w-6 h-6" />
                    </div>
                </div>
            </header>

            <div className="relative z-10 flex items-center justify-center px-6 h-[calc(100vh-80px)]">
                <div className="w-full max-w-md p-8 space-y-6 rounded-2xl shadow-2xl backdrop-blur-sm bg-white/90 dark:bg-gray-800/90 text-gray-900 dark:text-white">
                    <form className="space-y-4" onSubmit={submit} noValidate>
                        <div>
                            <Input
                                label={t("auth.email")}
                                name="email"
                                id="email"
                                type="email"
                                value={auth.email ?? ""}
                                onChange={change}
                                error={errors.email}
                                required
                            />
                        </div>
                        <div>
                            <Input
                                label={t("auth.password")}
                                name="password"
                                id="password"
                                type="password"
                                value={auth.password ?? ""}
                                onChange={change}
                                error={errors.password}
                                required
                            />
                        </div>
                        <Button
                            type="submit"
                            variant="primary"
                            size="sm"
                            fullWidth
                            disabled={isSubmitting}
                            loading={isSubmitting}
                        >
                            {t("auth.submit")}
                        </Button>
                        <Button
                            type="submit"
                            variant="secondary"
                            size="sm"
                            fullWidth
                            onClick={() => navigate("./home")}
                            disabled={isSubmitting}
                        >
                            {t("auth.skipAuth")}
                        </Button>
                        {errors.submit && <Error message={errors.submit} />}
                    </form>

                    <div className="space-y-2">
                        <p className="text-center text-sm">
                            {t("auth.noAccount")} <a onClick={() => navigate("../sign")} className="text-[#A50034] hover:underline font-medium cursor-pointer">{t("auth.signin")}</a>
                        </p>
                        <p className="text-center text-sm">
                            {t("auth.forgot")} <a onClick={() => navigate("../forgot")} className="text-[#A50034] hover:underline font-medium cursor-pointer">{t("auth.reset")}</a>
                        </p>
                    </div>
                </div>
                <Notification
                    message={notification.message}
                    type={notification.type}
                    isVisible={notification.isVisible}
                    onClose={closeNotification}
                />
            </div>
        </div>
    );
}