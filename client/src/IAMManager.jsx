import React, { useState, useEffect } from 'react';

const IAMManager = () => {
    const [activeTab, setActiveTab] = useState('Roles');

    // State for Roles
    const [roles, setRoles] = useState([]);
    const [newRoleName, setNewRoleName] = useState('');
    const [newRolePolicy, setNewRolePolicy] = useState('{\n  "Version": "2012-10-17",\n  "Statement": [{\n    "Effect": "Allow",\n    "Principal": { "Service": "ec2.amazonaws.com" },\n    "Action": "sts:AssumeRole"\n  }]\n}');
    const [rolePolicies, setRolePolicies] = useState({}); // RoleName -> AttachedPolicies[]

    const [policies, setPolicies] = useState([]);
    const [newPolicyName, setNewPolicyName] = useState('');
    const [newPolicyDoc, setNewPolicyDoc] = useState('{\n  "Version": "2012-10-17",\n  "Statement": [{\n    "Effect": "Allow",\n    "Action": "*",\n    "Resource": "*"\n  }]\n}');
    const [policyDocs, setPolicyDocs] = useState({}); // Arn -> JSON

    // Shared UI state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [attachingPolicy, setAttachingPolicy] = useState(null); // RoleName being edited

    // --- Roles ---
    const fetchRolePolicies = async (roleName) => {
        try {
            const res = await fetch(`/api/iam/roles/${roleName}/policies`);
            if (res.ok) {
                const data = await res.json();
                setRolePolicies(prev => ({ ...prev, [roleName]: data }));
            }
        } catch (err) { console.error(err); }
    };

    const fetchRoles = async () => {
        setLoading(true); setError(null);
        try {
            const res = await fetch('/api/iam/roles');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setRoles(data);
            data.forEach(role => fetchRolePolicies(role.RoleName));
        } catch (err) { setError(err.message); } finally { setLoading(false); }
    };

    const createRole = async () => {
        if (!newRoleName || !newRolePolicy) return;
        try {
            const res = await fetch('/api/iam/roles', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ roleName: newRoleName, assumeRolePolicyDocument: newRolePolicy })
            });
            if (!res.ok) throw new Error((await res.json()).error);
            setNewRoleName(''); fetchRoles();
            alert('Role created');
        } catch (err) { setError(err.message); }
    };

    const deleteRole = async (name) => {
        if (!window.confirm(`Delete role ${name}?`)) return;
        try {
            const res = await fetch(`/api/iam/roles/${name}`, { method: 'DELETE' });
            if (!res.ok) throw new Error((await res.json()).error);
            fetchRoles();
        } catch (err) { setError(err.message); }
    };

    const attachPolicy = async (roleName, policyArn) => {
        try {
            const res = await fetch(`/api/iam/roles/${roleName}/policies`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ policyArn })
            });
            if (!res.ok) throw new Error((await res.json()).error);
            fetchRolePolicies(roleName);
            setAttachingPolicy(null);
        } catch (err) { setError(err.message); }
    };

    const detachPolicy = async (roleName, policyArn) => {
        try {
            const res = await fetch(`/api/iam/roles/${roleName}/policies/${encodeURIComponent(policyArn)}`, { method: 'DELETE' });
            if (!res.ok) throw new Error((await res.json()).error);
            fetchRolePolicies(roleName);
        } catch (err) { setError(err.message); }
    };

    // --- Policies ---
    const fetchPolicies = async () => {
        setLoading(true); setError(null);
        try {
            const res = await fetch('/api/iam/policies');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setPolicies(data);
        } catch (err) { setError(err.message); } finally { setLoading(false); }
    };

    const createPolicy = async () => {
        if (!newPolicyName || !newPolicyDoc) return;
        try {
            const res = await fetch('/api/iam/policies', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ policyName: newPolicyName, policyDocument: newPolicyDoc })
            });
            if (!res.ok) throw new Error((await res.json()).error);
            setNewPolicyName(''); fetchPolicies();
            alert('Policy created');
        } catch (err) { setError(err.message); }
    };

    const deletePolicy = async (arn) => {
        if (!window.confirm(`Delete policy? (ARN: ${arn})`)) return;
        try {
            const res = await fetch(`/api/iam/policies/${encodeURIComponent(arn)}`, { method: 'DELETE' });
            if (!res.ok) throw new Error((await res.json()).error);
            fetchPolicies();
        } catch (err) { setError(err.message); }
    };

    const fetchPolicyDetails = async (arn) => {
        console.log('fetchPolicyDetails called with:', arn);
        if (policyDocs[arn]) {
            console.log('Policy details already exist, clearing...');
            setPolicyDocs(prev => {
                const updated = { ...prev };
                delete updated[arn];
                return updated;
            });
            return;
        }
        try {
            console.log('Fetching policy details from API...');
            const res = await fetch(`/api/iam/policy-detail?arn=${encodeURIComponent(arn)}`);

            if (!res.ok) {
                const text = await res.text();
                throw new Error(`Server returned ${res.status}: ${text.slice(0, 100)}...`);
            }

            const data = await res.json();
            console.log('Received data, updating state with ARN:', arn);
            setPolicyDocs(prev => ({ ...prev, [arn]: data.document }));
        } catch (err) {
            console.error('Fetch error:', err);
            alert(`Error: ${err.message}`);
        }
    };

    // --- Effects ---
    useEffect(() => {
        if (activeTab === 'Roles') fetchRoles();
        if (activeTab === 'Policies') fetchPolicies();
    }, [activeTab]);

    return (
        <div className="iam-manager">
            {error && <div className="text-error" style={{ color: 'var(--error)', marginBottom: '1rem' }}>Error: {error}</div>}

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
                {['Roles', 'Policies'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            background: activeTab === tab ? 'var(--aws-smile)' : 'var(--aws-white)',
                            color: activeTab === tab ? '#000' : 'var(--aws-text-secondary)',
                            fontWeight: activeTab === tab ? 'bold' : 'normal',
                            border: activeTab === tab ? '1px solid var(--aws-smile)' : '1px solid var(--aws-border)',
                            padding: '0.5rem 1.5rem',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {loading && <p className="text-secondary" style={{ marginBottom: '1rem' }}>Loading...</p>}

            {activeTab === 'Roles' && (
                <div className="iam-column">
                    <h2 style={{ marginBottom: '1.5rem', borderBottom: '2px solid var(--aws-smile)', paddingBottom: '0.5rem' }}>Roles</h2>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--aws-border)' }}>
                        <input type="text" placeholder="New Role Name" value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} style={{ flex: 1 }} />
                        <label style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 'bold' }}>Assume Role Policy Document (JSON):</label>
                        <textarea value={newRolePolicy} onChange={(e) => setNewRolePolicy(e.target.value)} style={{ minHeight: '80px', fontFamily: 'monospace', fontSize: '0.8rem' }} />
                        <button onClick={createRole} style={{ alignSelf: 'flex-start' }}>Create Role</button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {roles.map((role) => (
                            <div key={role.RoleId} className="card" style={{ padding: '0.6rem 1.2rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', minWidth: '200px' }}>
                                    <span style={{ fontSize: '1.1rem' }}>🎭</span>
                                    <h3 className="card-title" style={{ fontSize: '1rem', margin: 0 }}>{role.RoleName}</h3>
                                </div>

                                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    <strong>ARN:</strong> {role.Arn}
                                </div>

                                <div style={{ marginLeft: 'auto', display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                                    <div style={{ fontSize: '0.75rem', borderLeft: '1px solid var(--aws-border)', paddingLeft: '1rem' }}>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                                            <strong style={{ fontSize: '0.7rem' }}>Policies:</strong>
                                            {rolePolicies[role.RoleName]?.length > 0 ? (
                                                rolePolicies[role.RoleName].map(p => (
                                                    <span key={p.PolicyArn} style={{ background: 'rgba(0,0,0,0.05)', padding: '2px 6px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        {p.PolicyName}
                                                        <button onClick={() => detachPolicy(role.RoleName, p.PolicyArn)} style={{ padding: 0, fontSize: '10px', background: 'none', color: 'var(--error)', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
                                                    </span>
                                                ))
                                            ) : (
                                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>None</span>
                                            )}

                                            {attachingPolicy === role.RoleName ? (
                                                <div style={{ display: 'flex', gap: '0.4rem', marginLeft: '0.5rem' }}>
                                                    <select style={{ fontSize: '0.7rem', padding: '2px' }} onChange={(e) => attachPolicy(role.RoleName, e.target.value)} defaultValue="">
                                                        <option value="" disabled>Attach...</option>
                                                        {policies.filter(p => !rolePolicies[role.RoleName]?.some(ap => ap.PolicyArn === p.Arn)).map(p => (
                                                            <option key={p.Arn} value={p.Arn}>{p.PolicyName}</option>
                                                        ))}
                                                    </select>
                                                    <button onClick={() => setAttachingPolicy(null)} style={{ fontSize: '9px', padding: '2px 4px' }}>Cancel</button>
                                                </div>
                                            ) : (
                                                <button onClick={() => { setAttachingPolicy(role.RoleName); fetchPolicies(); }} style={{ fontSize: '10px', padding: '2px 6px', marginLeft: '0.5rem' }}>+ Attach</button>
                                            )}
                                        </div>
                                    </div>
                                    <button onClick={() => deleteRole(role.RoleName)} style={{ background: 'var(--error)', color: 'white', border: 'none', padding: '0.3rem 0.6rem', fontSize: '11px', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>
                                </div>
                            </div>
                        ))}
                        {!loading && roles.length === 0 && <p className="text-secondary" style={{ fontSize: '0.9rem' }}>No roles found.</p>}
                    </div>
                </div>
            )}

            {activeTab === 'Policies' && (
                <div className="iam-column">
                    <h2 style={{ marginBottom: '1.5rem', borderBottom: '2px solid var(--aws-smile)', paddingBottom: '0.5rem' }}>Policies</h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--aws-border)' }}>
                        <input type="text" placeholder="New Policy Name" value={newPolicyName} onChange={(e) => setNewPolicyName(e.target.value)} style={{ flex: 1 }} />
                        <label style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 'bold' }}>Policy Document (JSON):</label>
                        <textarea value={newPolicyDoc} onChange={(e) => setNewPolicyDoc(e.target.value)} style={{ minHeight: '80px', fontFamily: 'monospace', fontSize: '0.8rem' }} />
                        <button onClick={createPolicy} style={{ alignSelf: 'flex-start' }}>Create Policy</button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {policies.map((policy) => (
                            <div key={policy.PolicyId} style={{ marginBottom: '0.5rem' }}>
                                <div className="card" style={{ padding: '0.6rem 1.2rem', display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', minWidth: '200px' }}>
                                        <span style={{ fontSize: '1.1rem' }}>📜</span>
                                        <h3 className="card-title" style={{ fontSize: '1rem', margin: 0 }}>{policy.PolicyName}</h3>
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        <strong>ARN:</strong> {policy.Arn}
                                    </div>
                                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
                                        <button onClick={() => fetchPolicyDetails(policy.Arn)} style={{ fontSize: '11px', padding: '0.3rem 0.6rem' }}>
                                            {policyDocs[policy.Arn] ? 'Hide Details' : 'Show Details'}
                                        </button>
                                        <button onClick={() => deletePolicy(policy.Arn)} style={{ background: 'var(--error)', color: 'white', border: 'none', padding: '0.3rem 0.6rem', fontSize: '11px', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>
                                    </div>
                                </div>
                                {policyDocs[policy.Arn] && (
                                    <div style={{ background: 'rgba(0,0,0,0.05)', padding: '1rem', borderRadius: '0 0 8px 8px', border: '1px solid var(--aws-border)', borderTop: 'none', marginTop: '-1px' }}>
                                        <pre style={{ margin: 0, fontSize: '0.75rem', overflowX: 'auto', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                            {policyDocs[policy.Arn]}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        ))}
                        {!loading && policies.length === 0 && <p className="text-secondary" style={{ fontSize: '0.9rem' }}>No custom policies found.</p>}
                    </div>
                </div>
            )}
        </div>
    );
};

export default IAMManager;
