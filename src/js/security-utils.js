/**
 * src/js/security-utils.js
 * Utilitários de Segurança e Proteção de Dados (LGPD / OWASP / SAST)
 * CAR . VERIFY — Proteção contra Stored XSS e Armazenamento Seguro de Dados de RH
 */

(function () {
    'use strict';

    /**
     * Sanitiza strings contra Cross-Site Scripting (XSS).
     * Converte caracteres reservados em entidades HTML seguras.
     * @param {string|any} str
     * @returns {string}
     */
    function escapeHtml(str) {
        if (str === null || str === undefined) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * Ofuscação e proteção para dados sensíveis em localStorage (LGPD Art. 46).
     * Protege atestados médicos, afastamentos e justificativas de ausência
     * contra visualização direta em texto plano no console/DevTools.
     */
    const STORAGE_PREFIX = '__cv_sec_v1__';
    const SALT = 'carverify_lgpd_salt_2026';

    function xorTransform(text, key) {
        let result = '';
        for (let i = 0; i < text.length; i++) {
            result += String.fromCharCode(text.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return result;
    }

    const secureStorage = {
        setItem(key, value) {
            try {
                const serialized = JSON.stringify(value);
                const obfuscated = btoa(encodeURIComponent(xorTransform(serialized, SALT)));
                localStorage.setItem(key, STORAGE_PREFIX + obfuscated);
                return true;
            } catch (e) {
                console.warn('[SECURITY] Falha ao proteger dado no localStorage, gravando padrão:', e);
                try {
                    localStorage.setItem(key, JSON.stringify(value));
                    return true;
                } catch (err) {
                    return false;
                }
            }
        },

        getItem(key, fallback = null) {
            try {
                const raw = localStorage.getItem(key);
                if (!raw) return fallback;

                if (raw.startsWith(STORAGE_PREFIX)) {
                    const encoded = raw.slice(STORAGE_PREFIX.length);
                    const transformed = xorTransform(decodeURIComponent(atob(encoded)), SALT);
                    return JSON.parse(transformed);
                }

                // Compatibilidade retroativa com dados legados
                const parsed = JSON.parse(raw);
                this.setItem(key, parsed); // Migra automaticamente para formato protegido
                return parsed;
            } catch (e) {
                console.warn('[SECURITY] Erro ao recuperar dado seguro para ' + key + ':', e);
                return fallback;
            }
        },

        removeItem(key) {
            try {
                localStorage.removeItem(key);
            } catch (e) {}
        }
    };

    window.CarVerifySecurity = {
        escapeHtml: escapeHtml,
        secureStorage: secureStorage
    };
    window.escapeHtml = escapeHtml;
})();
