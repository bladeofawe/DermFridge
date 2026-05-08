"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Input, Button } from "@/components";
import { MapPin, Languages, Check } from 'lucide-react';

export default function Forgot() {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();
    const toggleLanguage = () => {
        const newLang = i18n.language === "en" ? "kr" : "en";
        i18n.changeLanguage(newLang);
    };

    const { user, loading } = useAuth();
    const [email, setEmail] = useState("");
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        if (!loading && user) {
            navigate("/home");
        }
    }, [user, loading, navigate]);

    const change = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setEmail(e.target.value);
    };

    const validate = () => {
        let erreurs: Record<string, string> = {};

        if (!email.trim()) {
            erreurs.email = t("auth.errors.emailRequired");
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            erreurs.email = t("auth.errors.emailInvalid");
        }

        setErrors(erreurs);
        return Object.keys(erreurs).length === 0;
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        if (validate()) {
            try {
                setSubmitted(true);
            } catch (error) {
                setErrors({ form: t("auth.errors.?") });
            }
        }

        setIsSubmitting(false);
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
                    {!submitted ? (
                        <>
                            <form className="space-y-4" onSubmit={submit} noValidate>
                                <div>
                                    <Input
                                        label={t("auth.email")}
                                        name="email"
                                        id="email"
                                        type="email"
                                        value={email ?? ""}
                                        onChange={change}
                                        error={errors.email}
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
                                    {t("auth.submitForgot")}
                                </Button>
                            </form>
                            <div className="space-y-2">
                                <p className="text-center text-sm">
                                    {t("auth.noAccount")} <a onClick={() => navigate("../auth")} className="text-[#A50034] hover:underline font-medium cursor-pointer">{t("auth.signin")}</a>
                                </p>
                                <p className="text-center text-sm">
                                    <a onClick={() => navigate("../sign")} className="text-[#A50034] hover:underline font-medium cursor-pointer">{t("auth.submit")}</a>
                                </p>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex justify-center">
                                <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full">
                                    <Check className="h-6 w-6 text-green-600 dark:text-green-300" />
                                </div>
                            </div>
                            <p className="block text-sm text-center font-semibold text-gray-700 dark:text-white">
                                {t("auth.successMessage", { email })}
                            </p>
                            <Button onClick={() => setSubmitted(false)} variant="primary" size="sm" fullWidth className="ml-auto">{t("auth.tryAnotherEmail")}</Button>
                            <p className="text-center text-sm">
                                <a onClick={() => navigate("../auth")} className="text-[#A50034] hover:underline font-medium cursor-pointer">{t("auth.submit")}</a>
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}