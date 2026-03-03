import React, { useState, useEffect } from 'react';

const S3Manager = ({ onBack }) => {
    const [buckets, setBuckets] = useState([]);
    const [selectedBucket, setSelectedBucket] = useState(null);
    const [objects, setObjects] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [newBucketName, setNewBucketName] = useState('');
    const [uploading, setUploading] = useState(false);

    const fetchBuckets = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/s3/buckets');
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to fetch buckets');
            setBuckets(data);
        } catch (err) {
            setError(err.message);
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const createBucket = async () => {
        if (!newBucketName) return;
        try {
            await fetch('/api/s3/buckets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bucketName: newBucketName }),
            });
            setNewBucketName('');
            fetchBuckets();
        } catch (err) {
            console.error(err);
        }
    };

    const deleteBucket = async (name) => {
        if (!window.confirm(`Delete bucket ${name}?`)) return;
        try {
            await fetch(`/api/s3/buckets/${name}`, { method: 'DELETE' });
            fetchBuckets();
        } catch (err) {
            console.error(err);
        }
    };

    const fetchObjects = async (bucketName) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/s3/buckets/${bucketName}/objects`);
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to fetch objects');
            setObjects(data);
            setSelectedBucket(bucketName);
        } catch (err) {
            setError(err.message);
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const uploadFile = async (e) => {
        const file = e.target.files[0];
        if (!file || !selectedBucket) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            await fetch(`/api/s3/buckets/${selectedBucket}/objects`, {
                method: 'POST',
                body: formData,
            });
            fetchObjects(selectedBucket);
        } catch (err) {
            console.error(err);
        } finally {
            setUploading(false);
        }
    };

    const deleteObject = async (key) => {
        try {
            await fetch(`/api/s3/buckets/${selectedBucket}/objects/${encodeURIComponent(key)}`, { method: 'DELETE' });
            fetchObjects(selectedBucket);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => {
        fetchBuckets();
    }, []);

    return (
        <div className="s3-manager">
            {error && <div className="text-error" style={{ color: 'var(--error)', marginBottom: '1rem' }}>Error: {error}</div>}

            <div style={{ marginBottom: '2rem', background: 'var(--aws-white)', padding: '1rem', border: '1px solid var(--aws-border)', borderRadius: '4px' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '16px' }}>Create Bucket</h3>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <input
                        type="text"
                        placeholder="New Bucket Name"
                        value={newBucketName}
                        onChange={(e) => setNewBucketName(e.target.value)}
                        style={{ padding: '0.5rem', border: '1px solid var(--aws-border)', borderRadius: '2px', background: 'var(--aws-white)', color: 'var(--aws-text-primary)', flex: 1 }}
                    />
                    <button onClick={createBucket} style={{ background: '#ec7211', color: 'white', border: '1px solid #ec7211' }}>Create Bucket</button>
                </div>
            </div>

            <div style={{ marginBottom: '2rem', background: 'var(--aws-white)', padding: '1rem', border: '1px solid var(--aws-border)', borderRadius: '4px' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '16px' }}>Select Bucket</h3>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <select
                        value={selectedBucket || ''}
                        onChange={(e) => {
                            if (e.target.value) fetchObjects(e.target.value);
                            else setSelectedBucket(null);
                        }}
                        style={{ width: '300px', padding: '0.4rem', border: '1px solid var(--aws-border)' }}
                    >
                        <option value="">-- Choose a Bucket --</option>
                        {buckets.map(bucket => (
                            <option key={bucket.Name} value={bucket.Name}>{bucket.Name}</option>
                        ))}
                    </select>

                    {selectedBucket && (() => {
                        const b = buckets.find(x => x.Name === selectedBucket);
                        return b ? <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Created: {new Date(b.CreationDate).toLocaleDateString()}</span> : null;
                    })()}

                    <button onClick={fetchBuckets} style={{ background: 'var(--aws-white)' }}>Refresh List</button>
                    {selectedBucket && (
                        <button
                            onClick={() => {
                                deleteBucket(selectedBucket);
                                setSelectedBucket(null);
                            }}
                            style={{ background: 'var(--aws-white)', color: 'var(--error)', border: '1px solid var(--error)' }}
                        >
                            Delete Bucket
                        </button>
                    )}
                </div>
            </div>

            {loading && <p className="text-secondary" style={{ marginBottom: '1rem' }}>Loading...</p>}

            {selectedBucket && !loading && (
                <div className="s3-detail" style={{ background: 'var(--aws-white)', padding: '1rem', border: '1px solid var(--aws-border)', borderRadius: '4px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h3>Objects in {selectedBucket} ({objects.length})</h3>
                        <div>
                            <input type="file" id="fileUpload" hidden onChange={uploadFile} />
                            <label htmlFor="fileUpload" style={{ padding: '0.4rem 0.8rem', background: '#ec7211', color: 'white', border: '1px solid #ec7211', borderRadius: '2px', cursor: 'pointer', fontSize: '14px' }}>
                                {uploading ? 'Uploading...' : 'Upload'}
                            </label>
                        </div>
                    </div>

                    <div style={{ border: '1px solid var(--aws-border)' }}>
                        <table style={{ minWidth: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead style={{ background: 'var(--aws-bg)' }}>
                                <tr>
                                    <th style={{ padding: '0.5rem', borderBottom: '1px solid var(--aws-border)' }}>Name</th>
                                    <th style={{ padding: '0.5rem', borderBottom: '1px solid var(--aws-border)' }}>Last modified</th>
                                    <th style={{ padding: '0.5rem', borderBottom: '1px solid var(--aws-border)' }}>Size</th>
                                    <th style={{ padding: '0.5rem', borderBottom: '1px solid var(--aws-border)', width: '120px' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {objects.length === 0 ? (
                                    <tr><td colSpan="4" style={{ padding: '1rem', color: 'var(--text-secondary)' }}>No objects found.</td></tr>
                                ) : (
                                    objects.map(obj => (
                                        <tr key={obj.Key} style={{ borderBottom: '1px solid var(--aws-border)' }}>
                                            <td style={{ padding: '0.5rem', fontFamily: 'monospace', fontSize: '0.9rem', color: '#007eb9' }}>{obj.Key}</td>
                                            <td style={{ padding: '0.5rem', fontSize: '0.9rem' }}>{new Date(obj.LastModified).toLocaleDateString()}</td>
                                            <td style={{ padding: '0.5rem', fontSize: '0.9rem' }}>{(obj.Size / 1024).toFixed(2)} KB</td>
                                            <td style={{ padding: '0.5rem' }}>
                                                <button onClick={() => window.open(`/api/s3/buckets/${selectedBucket}/objects/${encodeURIComponent(obj.Key)}`)} style={{ background: 'var(--aws-white)', border: '1px solid var(--aws-border)', padding: '0.2rem 0.5rem', marginRight: '0.5rem', fontSize: '12px' }}>Download</button>
                                                <button onClick={() => deleteObject(obj.Key)} style={{ background: 'var(--aws-white)', color: 'var(--error)', border: '1px solid var(--error)', padding: '0.2rem 0.5rem', fontSize: '12px' }}>Delete</button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default S3Manager;
