'use client';

import { useCallback, useEffect, useState } from 'react';

export function useAssessmentInputProtection(readOnly = false) {
    const [toastMessage, setToastMessage] = useState('');
    const [isToastVisible, setIsToastVisible] = useState(false);

    useEffect(() => {
        if (!isToastVisible) return undefined;

        const timeoutId = window.setTimeout(() => {
            setIsToastVisible(false);
            setToastMessage('');
        }, 1800);

        return () => window.clearTimeout(timeoutId);
    }, [isToastVisible]);

    const showRestrictionToast = useCallback(() => {
        if (readOnly) return;
        setToastMessage('Copy, cut and paste are disabled during the assessment.');
        setIsToastVisible(true);
    }, [readOnly]);

    const handleRestriction = useCallback((event) => {
        if (readOnly) return;
        event.preventDefault();
        event.stopPropagation();
        showRestrictionToast();
    }, [readOnly, showRestrictionToast]);

    const handleKeyDown = useCallback((event) => {
        if (readOnly) return;

        const isClipboardShortcut = event.key && ['c', 'v', 'x'].includes(event.key.toLowerCase());
        const isModifierPressed = event.ctrlKey || event.metaKey;

        if (isModifierPressed && isClipboardShortcut) {
            event.preventDefault();
            event.stopPropagation();
            showRestrictionToast();
        }
    }, [readOnly, showRestrictionToast]);

    const toast = isToastVisible ? (
        <div
            style={{
                position: 'fixed',
                bottom: '1.25rem',
                right: '1.25rem',
                zIndex: 2000,
                padding: '0.75rem 1rem',
                borderRadius: '999px',
                background: 'rgba(15, 23, 42, 0.95)',
                color: '#F8FAFC',
                border: '1px solid rgba(248,113,113,0.35)',
                boxShadow: '0 10px 24px rgba(0, 0, 0, 0.25)',
                fontSize: '0.875rem',
                fontWeight: 600,
                maxWidth: 'min(92vw, 320px)',
            }}
        >
            {toastMessage}
        </div>
    ) : null;

    return { handleRestriction, handleKeyDown, toast };
}
