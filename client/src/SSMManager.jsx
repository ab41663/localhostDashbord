import React, { useState, useEffect } from 'react';

const SSMManager = () => {
    const [parameters, setParameters] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [newName, setNewName] = useState('');
    const [newValue, setNewValue] = useState('');
    const [newType, setNewType] = useState('String');

    const fetchParameters = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/ssm/parameters');
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to fetch parameters');
            setParameters(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const saveParameter = async () => {
        if (!newName || !newValue) return;
        try {
            const response = await fetch('/api/ssm/parameters', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName, value: newValue, type: newType }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to save parameter');
            setNewName('');
            setNewValue('');
            fetchParameters();
        } catch (err) {
            setError(err.message);
        }
    };

    const deleteParameter = async (name) => {
        if (!window.confirm(`Delete parameter ${name}?`)) return;
        try {
            const response = await fetch(`/api/ssm/parameters/${encodeURIComponent(name)}`, { method: 'DELETE' });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to delete parameter');
            fetchParameters();
        } catch (err) {
            setError(err.message);
        }
    };

    useEffect(() => {
        fetchParameters();
    }, []);

    return (
        <div className="ssm-manager">
            {error && <div className="text-error" style={{ color: 'var(--error)', marginBottom: '1rem' }}>Error: {error}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '1rem', marginBottom: '2rem' }}>
                <input
                    type="text"
                    placeholder="Name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', color: 'white', padding: '0.5rem 1rem', borderRadius: '8px' }}
                />
                <input
                    type="text"
                    placeholder="Value"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', color: 'white', padding: '0.5rem 1rem', borderRadius: '8px' }}
                />
                <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', color: 'white', padding: '0.5rem 1rem', borderRadius: '8px' }}
                >
                    <option value="String">String</option>
                    <option value="StringList">StringList</option>
                    <option value="SecureString">SecureString</option>
                </select>
                <div style={{ gridColumn: 'span 3' }}>
                    <button onClick={saveParameter} style={{ width: '100%' }}>Save Parameter</button>
                </div>
            </div>

            <div className="card-grid">
                {parameters.map((param) => (
                    <div key={param.Name} className="card" style={{ padding: '1.5rem' }}>
                        <div className="card-header">
                            <div className="card-icon">⚙️</div>
                            <h3 className="card-title">{param.Name}</h3>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                            Type: {param.Type} | Version: {param.Version}
                        </div>
                        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                            <button onClick={() => deleteParameter(param.Name)} style={{ background: 'var(--error)' }}>Delete</button>
                        </div>
                    </div>
                ))}
            </div>

            {loading && <p className="text-secondary">Loading...</p>}
            {!loading && parameters.length === 0 && <p className="text-secondary">No parameters found.</p>}
        </div>
    );
};

export default SSMManager;
