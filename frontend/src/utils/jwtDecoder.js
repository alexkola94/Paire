/**
 * Decode user information from JWT token
 * @param {string} token - JWT access token
 * @param {string} email - User's email address
 * @returns {Object} User object with id, email, username, and twoFactorEnabled
 */
export const decodeUserFromToken = (token, email) => {
    try {
        // Decode JWT payload (middle part between the two dots)
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => `%${(`00` + c.charCodeAt(0).toString(16)).slice(-2)}`)
                .join('')
        );

        const payload = JSON.parse(jsonPayload);

        // Extract user ID from various possible claim names
        const userId =
            payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
            payload.sub ||
            payload.user_id ||
            payload.id;

        // Extract username from various possible claim names
        const username =
            payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] ||
            payload.name ||
            payload.username ||
            email;

        // Extract 2FA status from token
        const twoFactorEnabled = payload.two_factor_enabled === 'true' || payload.two_factor_enabled === true;

        return {
            id: userId,
            email: email,
            username: username,
            twoFactorEnabled: twoFactorEnabled,
        };
    } catch (error) {
        console.error('Error decoding JWT:', error);
        // Return a minimal user object with email
        return {
            id: null,
            email: email,
            username: email,
            twoFactorEnabled: false,
        };
    }
};
