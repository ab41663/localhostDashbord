import React, { useState, useEffect } from 'react';

const DynamoDBManager = () => {
    const [tables, setTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [itemsLoading, setItemsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Create Table State
    const [newTableName, setNewTableName] = useState('');
    const [partitionKey, setPartitionKey] = useState('id');
    const [partitionKeyType, setPartitionKeyType] = useState('S');
    const [sortKey, setSortKey] = useState('');
    const [sortKeyType, setSortKeyType] = useState('S');
    const [gsis, setGsis] = useState([]);

    // Search & Item State
    const [searchPKey, setSearchPKey] = useState('');
    const [searchPValue, setSearchPValue] = useState('');
    const [newItemJson, setNewItemJson] = useState('{\n  "id": "123",\n  "name": "example"\n}');

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalTitle, setModalTitle] = useState('');
    const [modalBuffer, setModalBuffer] = useState('');

    // Selection State
    const [selectedRecordIndex, setSelectedRecordIndex] = useState(null);

    const fetchTables = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/dynamodb/tables');
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to fetch tables');
            setTables(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const createTable = async () => {
        if (!newTableName || !partitionKey) {
            alert("Table Name and Partition Key are required.");
            return;
        }
        try {
            const body = {
                tableName: newTableName,
                partitionKey,
                partitionKeyType,
                sortKey: sortKey || undefined,
                sortKeyType,
                gsis: gsis.length > 0 ? gsis : undefined
            };
            const response = await fetch('/api/dynamodb/tables', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to create table');
            setNewTableName('');
            setSortKey('');
            setGsis([]);
            fetchTables();
            alert(`Table ${newTableName} created successfully.`);
        } catch (err) {
            setError(err.message);
            alert("Error: " + err.message);
        }
    };

    const addGsi = () => {
        setGsis([...gsis, { indexName: '', partitionKey: '', partitionKeyType: 'S', sortKey: '', sortKeyType: 'S' }]);
    };

    const removeGsi = (index) => {
        setGsis(gsis.filter((_, i) => i !== index));
    };

    const updateGsi = (index, field, value) => {
        const newGsis = [...gsis];
        newGsis[index][field] = value;
        setGsis(newGsis);
    };

    const deleteTable = async (name) => {
        if (!window.confirm(`Delete table ${name}?`)) return;
        try {
            const response = await fetch(`/api/dynamodb/tables/${name}`, { method: 'DELETE' });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to delete table');
            fetchTables();
            if (selectedTable === name) setSelectedTable(null);
        } catch (err) {
            setError(err.message);
        }
    };

    const scanItems = async () => {
        if (!selectedTable) return;
        setItemsLoading(true);
        setSelectedRecordIndex(null);
        try {
            const response = await fetch(`/api/dynamodb/tables/${selectedTable}/items`);
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to scan items');
            setItems(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setItemsLoading(false);
        }
    };

    const searchItems = async () => {
        if (!selectedTable || !searchPKey || !searchPValue) return;
        setItemsLoading(true);
        setSelectedRecordIndex(null);
        try {
            const response = await fetch(`/api/dynamodb/tables/${selectedTable}/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ partitionKey: searchPKey, partitionValue: searchPValue })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Search failed');
            setItems(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setItemsLoading(false);
        }
    };

    const saveItemRecord = async () => {
        if (!selectedTable || !modalBuffer) return;
        try {
            const itemObj = JSON.parse(modalBuffer);
            const response = await fetch(`/api/dynamodb/tables/${selectedTable}/items`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ item: itemObj })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to save item');

            // alert('Item saved successfully (Added/Updated)'); -- Removing noisy alerts
            setNewItemJson(modalBuffer);
            scanItems();
            setIsModalOpen(false);
        } catch (err) {
            setError(err.message);
            alert("Error saving item: " + err.message);
        }
    };

    const openCreateModal = () => {
        setModalTitle('Create New Item');
        setModalBuffer(newItemJson);
        setIsModalOpen(true);
    };

    const openEditModal = (item) => {
        setModalTitle('Edit Item');
        setModalBuffer(JSON.stringify(item, null, 2));
        setIsModalOpen(true);
    };

    const deleteItem = async (item) => {
        if (!window.confirm('Delete this item? Note: All partition/sort keys must be provided.')) return;
        try {
            // Prompt user for the key fields if they aren't obvious, but for localstack UI, we'll try to infer the key or let the user supply it.
            // For a robust UI, we'd know the schema. Here we'll just send the whole item as the key (often works if it only has keys, otherwise fails).
            // Let's ask the user to input the key JSON specifically for deletion to be safe.
            const keyStr = window.prompt("Enter complete Key object as JSON for deletion (e.g., {\"id\": \"123\"}):\n(Defaulting to current item structure)", JSON.stringify(item));
            if (!keyStr) return;
            const keyObj = JSON.parse(keyStr);

            const response = await fetch(`/api/dynamodb/tables/${selectedTable}/items`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ key: keyObj })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to delete item');
            scanItems();
        } catch (err) {
            setError(err.message);
            alert("Error: " + err.message);
        }
    };

    useEffect(() => {
        fetchTables();
    }, []);

    useEffect(() => {
        if (selectedTable) {
            scanItems();
        } else {
            setItems([]);
        }
    }, [selectedTable]);

    return (
        <div className="dynamodb-manager">
            {error && <div className="text-error" style={{ color: 'var(--error)', marginBottom: '1rem' }}>Error: {error}</div>}

            <div className="card" style={{ marginBottom: '2rem' }}>
                <div className="card-header"><h3 className="card-title">Create New Table</h3></div>
                <div className="card-content">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Table Name</label>
                            <input type="text" placeholder="e.g. users-table" value={newTableName} onChange={(e) => setNewTableName(e.target.value)} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Partition Key</label>
                            <div style={{ display: 'flex', gap: '4px' }}>
                                <input type="text" placeholder="e.g. id" value={partitionKey} onChange={(e) => setPartitionKey(e.target.value)} style={{ flex: 1 }} />
                                <select value={partitionKeyType} onChange={(e) => setPartitionKeyType(e.target.value)} style={{ width: '80px' }}>
                                    <option value="S">String</option>
                                    <option value="N">Number</option>
                                    <option value="B">Binary</option>
                                </select>
                            </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: '12px', fontWeight: 'bold' }}>Sort Key (Optional)</label>
                            <div style={{ display: 'flex', gap: '4px' }}>
                                <input type="text" placeholder="e.g. timestamp" value={sortKey} onChange={(e) => setSortKey(e.target.value)} style={{ flex: 1 }} />
                                <select value={sortKeyType} onChange={(e) => setSortKeyType(e.target.value)} style={{ width: '80px' }}>
                                    <option value="S">String</option>
                                    <option value="N">Number</option>
                                    <option value="B">Binary</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--aws-border)', paddingTop: '1rem', marginTop: '1rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h4 style={{ fontSize: '14px' }}>Global Secondary Indexes (GSIs)</h4>
                            <button onClick={addGsi} style={{ fontSize: '12px', padding: '2px 8px' }}>+ Add GSI</button>
                        </div>

                        {gsis.map((gsi, index) => (
                            <div key={index} style={{ background: '#f9f9f9', padding: '1rem', borderRadius: '4px', marginBottom: '10px', border: '1px solid var(--aws-border)' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.8rem' }}>
                                    <div>
                                        <label style={{ fontSize: '11px', display: 'block' }}>Index Name</label>
                                        <input type="text" value={gsi.indexName} onChange={e => updateGsi(index, 'indexName', e.target.value)} style={{ width: '100%', fontSize: '12px' }} />
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '11px', display: 'block' }}>GSI Partition Key</label>
                                        <div style={{ display: 'flex', gap: '2px' }}>
                                            <input type="text" value={gsi.partitionKey} onChange={e => updateGsi(index, 'partitionKey', e.target.value)} style={{ flex: 1, fontSize: '12px' }} />
                                            <select value={gsi.partitionKeyType} onChange={e => updateGsi(index, 'partitionKeyType', e.target.value)} style={{ fontSize: '11px' }}>
                                                <option value="S">S</option>
                                                <option value="N">N</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '11px', display: 'block' }}>GSI Sort Key (Opt)</label>
                                        <div style={{ display: 'flex', gap: '2px' }}>
                                            <input type="text" value={gsi.sortKey} onChange={e => updateGsi(index, 'sortKey', e.target.value)} style={{ flex: 1, fontSize: '12px' }} />
                                            <select value={gsi.sortKeyType} onChange={e => updateGsi(index, 'sortKeyType', e.target.value)} style={{ fontSize: '11px' }}>
                                                <option value="S">S</option>
                                                <option value="N">N</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                                        <button onClick={() => removeGsi(index)} style={{ color: 'var(--error)', border: '1px solid var(--error)', fontSize: '11px', width: '100%' }}>Remove</button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                        <button className="primary" onClick={createTable}>Create Table</button>
                    </div>
                </div>
            </div>

            <div style={{ marginBottom: '2rem', background: 'var(--aws-white)', padding: '1rem', border: '1px solid var(--aws-border)', borderRadius: '4px' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '16px' }}>Select Table</h3>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <select
                        value={selectedTable || ''}
                        onChange={(e) => setSelectedTable(e.target.value || null)}
                        style={{ width: '300px' }}
                    >
                        <option value="">-- Choose a Table --</option>
                        {tables.map(name => (
                            <option key={name} value={name}>{name}</option>
                        ))}
                    </select>
                    <button onClick={fetchTables} style={{ background: 'var(--aws-white)' }}>Refresh List</button>
                    {selectedTable && (
                        <button onClick={() => deleteTable(selectedTable)} style={{ background: 'var(--aws-white)', color: 'var(--error)', border: '1px solid var(--error)' }}>
                            Delete Table
                        </button>
                    )}
                </div>
            </div>

            {selectedTable && (
                <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--glass-bg)', borderRadius: '12px', border: '1px solid var(--glass-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3>Browsing Table: {selectedTable}</h3>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={scanItems} style={{ background: 'var(--aws-white)', border: '1px solid var(--aws-border)' }}>Scan (Refresh)</button>
                            <button
                                onClick={openCreateModal}
                                style={{ background: '#ec7211', color: 'white', border: '1px solid #ec7211' }}
                            >
                                Create item
                            </button>
                            <button onClick={() => setSelectedTable(null)} style={{ background: 'var(--aws-white)', border: '1px solid var(--aws-border)' }}>Close</button>
                        </div>
                    </div>

                    <div style={{ marginBottom: '2rem', maxWidth: '800px' }}>
                        {/* Search Panel */}
                        <div style={{ padding: '0', borderRadius: '0' }}>
                            <h4 style={{ marginBottom: '1rem', color: '#ec7211', fontSize: '14px' }}>Search / Filter Items</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <input type="text" placeholder="Attribute Name (e.g., id, key6)" value={searchPKey} onChange={e => setSearchPKey(e.target.value)} style={{ padding: '0.5rem', border: '1px solid var(--aws-border)', borderRadius: '2px', background: 'var(--aws-white)' }} />
                                <input type="text" placeholder="Attribute Value (e.g., 123, test)" value={searchPValue} onChange={e => setSearchPValue(e.target.value)} style={{ padding: '0.5rem', border: '1px solid var(--aws-border)', borderRadius: '2px', background: 'var(--aws-white)' }} />
                                <button onClick={searchItems} style={{ marginTop: '0.5rem', background: 'var(--aws-white)', color: 'var(--aws-text-primary)' }}>Find Match</button>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h4 style={{ margin: 0 }}>Records ({items.length})</h4>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                                disabled={selectedRecordIndex === null}
                                onClick={() => openEditModal(items[selectedRecordIndex])}
                                style={{
                                    opacity: selectedRecordIndex === null ? 0.5 : 1,
                                    color: 'var(--aws-blue)',
                                    borderColor: 'var(--aws-blue)',
                                    display: selectedRecordIndex === null ? 'none' : 'block'
                                }}
                            >
                                Edit Selected
                            </button>
                            <button
                                disabled={selectedRecordIndex === null}
                                onClick={() => deleteItem(items[selectedRecordIndex])}
                                style={{
                                    opacity: selectedRecordIndex === null ? 0.5 : 1,
                                    color: 'var(--error)',
                                    borderColor: 'var(--error)',
                                    display: selectedRecordIndex === null ? 'none' : 'block'
                                }}
                            >
                                Delete Selected
                            </button>
                        </div>
                    </div>
                    <div style={{ height: '300px', resize: 'vertical', overflowY: 'auto', overflowX: 'hidden', marginTop: '1rem', border: '1px solid var(--aws-border)', background: 'var(--aws-white)', display: 'flex', flexDirection: 'column' }}>
                        {itemsLoading ? (
                            <p className="text-secondary" style={{ padding: '1rem' }}>Loading items...</p>
                        ) : items.length > 0 ? (
                            <div style={{ flex: 1, overflowX: 'auto' }}>
                                <table style={{ minWidth: '100%', borderCollapse: 'collapse', textAlign: 'left', background: 'var(--aws-white)' }}>
                                    <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#fafafa', boxShadow: '0 2px 2px -1px rgba(0,0,0,0.1)' }}>
                                        <tr>
                                            <th style={{ width: '40px', textAlign: 'center' }}>Select</th>
                                            {Array.from(new Set(items.flatMap(Object.keys))).map(key => (
                                                <th key={key}>{key}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((item, idx) => (
                                            <tr
                                                key={idx}
                                                onClick={() => setSelectedRecordIndex(idx)}
                                                style={{
                                                    cursor: 'pointer',
                                                    background: selectedRecordIndex === idx ? '#f2f8ff' : 'inherit'
                                                }}
                                            >
                                                <td style={{ textAlign: 'center' }}>
                                                    <input
                                                        type="radio"
                                                        checked={selectedRecordIndex === idx}
                                                        onChange={() => setSelectedRecordIndex(idx)}
                                                    />
                                                </td>
                                                {Array.from(new Set(items.flatMap(Object.keys))).map(key => (
                                                    <td key={key}>
                                                        {typeof item[key] === 'object' ? JSON.stringify(item[key]) : String(item[key] ?? '')}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-secondary" style={{ padding: '1rem' }}>No records found in this table.</p>
                        )}
                    </div>
                </div>
            )}

            {loading && <p className="text-secondary">Loading tables...</p>}
            {!loading && tables.length === 0 && <p className="text-secondary">No tables found.</p>}

            {/* Modal for Creating/Editing Items */}
            {isModalOpen && (
                <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
                    <div className="modal-container" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{modalTitle}</h3>
                            <button className="modal-close" onClick={() => setIsModalOpen(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <p style={{ marginBottom: '1rem', color: 'var(--aws-text-secondary)', fontSize: '13px' }}>
                                Edit the item JSON below. Ensure the partition key and any sort keys are correctly specified.
                            </p>
                            <textarea
                                value={modalBuffer}
                                onChange={e => setModalBuffer(e.target.value)}
                                style={{
                                    width: '100%',
                                    height: '350px',
                                    fontFamily: 'monospace',
                                    fontSize: '13px',
                                    padding: '1rem',
                                    background: '#f8f8f8'
                                }}
                            />
                        </div>
                        <div className="modal-footer">
                            <button onClick={() => setIsModalOpen(false)}>Cancel</button>
                            <button className="primary" onClick={saveItemRecord}>Save Item</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DynamoDBManager;
