"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { logout as performLogout, clearAuthUser } from "./auth";

export default function LogoutButton({ className, children }) {
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await performLogout();
        } catch (e) {
            // ignore errors; still clear client state
        }
        try { clearAuthUser(); } catch (e) { }
        router.push('/');
    };

    return (
        <button type="button" className={className} onClick={handleLogout}>
            {children || 'Logout'}
        </button>
    );
}
