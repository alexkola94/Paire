import React, { useCallback, useEffect, useState } from 'react';
import { usePlaidLink } from 'react-plaid-link';
import { openBankingService } from '../services/openBanking';
import './PlaidConnect.css'; // Assuming we create a CSS file or use inline styles for now

const PlaidConnect = ({ onLinkSuccess, className = "" }) => {
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    // Initialize Link Token
    useEffect(() => {
        const createToken = async () => {
            setLoading(true);
            try {
                const linkToken = await openBankingService.createLinkToken();
                setToken(linkToken);
            } catch (error) {
                console.error('Failed to create link token', error);
            } finally {
                setLoading(false);
            }
        };
        createToken();
    }, []);

    const onSuccess = useCallback(async (publicToken, metadata) => {
        try {
            await openBankingService.exchangePublicToken(publicToken, metadata);
            if (onLinkSuccess) onLinkSuccess();
        } catch (err) {
            console.error("Failed to exchange token", err);
            // Handle error (show toast etc)
        }
    }, [onLinkSuccess]);

    const config = {
        token,
        onSuccess,
    };

    const { open, ready } = usePlaidLink(config);

    return (
        <button
            onClick={() => open()}
            disabled={!ready || loading}
            className={`plaid-connect-button ${className}`}
            style={{
                backgroundColor: '#000',
                color: '#fff',
                padding: '10px 20px',
                border: 'none',
                borderRadius: '5px',
                cursor: ready && !loading ? 'pointer' : 'not-allowed',
                opacity: ready && !loading ? 1 : 0.7,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 500
            }}
        >
            {loading ? 'Initializing...' : 'Connect a Bank'}
        </button>
    );
};

export default PlaidConnect;
