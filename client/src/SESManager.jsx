import React, { useState, useEffect } from 'react';

const SESManager = () => {
    const [identities, setIdentities] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [newEmail, setNewEmail] = useState('');

    const fetchIdentities = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/ses/identities');
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to fetch identities');
            setIdentities(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const verifyIdentity = async () => {
        if (!newEmail) return;
        try {
            const response = await fetch('/api/ses/identities', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: newEmail }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to verify identity');
            setNewEmail('');
            fetchIdentities();
        } catch (err) {
            setError(err.message);
        }
    };

    const deleteIdentity = async (email) => {
        if (!window.confirm(`Delete identity ${email}?`)) return;
        try {
            const response = await fetch(`/api/ses/identities/${encodeURIComponent(email)}`, { method: 'DELETE' });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to delete identity');
            fetchIdentities();
        } catch (err) {
            setError(err.message);
        }
    };

    useEffect(() => {
        fetchIdentities();
    }, []);

    return (
        <div className="ses-manager">
            {error && <div className="text-error" style={{ color: 'var(--error)', marginBottom: '1rem' }}>Error: {error}</div>}

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
                <input
                    type="email"
                    placeholder="Email to Verify"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', color: 'white', padding: '0.5rem 1rem', borderRadius: '8px', flex: 1 }}
                />
                <button onClick={verifyIdentity}>Verify Email</button>
            </div>

            <div className="card-grid">
                {identities.map((email) => (
                    <div key={email} className="card" style={{ padding: '1.5rem' }}>
                        <div className="card-header">
                            <div className="card-icon">📧</div>
                            <h3 className="card-title">{email}</h3>
                        </div>
                        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                            <button onClick={() => deleteIdentity(email)} style={{ background: 'var(--error)' }}>Delete</button>
                        </div>
                    </div>
                ))}
            </div>

            {loading && <p className="text-secondary">Loading...</p>}
            {!loading && identities.length === 0 && <p className="text-secondary">No identities found.</p>}
        </div>
    );
};

export default SESManager;
