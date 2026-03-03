import React, { useState, useEffect } from 'react';

const SQSManager = () => {
    const [queues, setQueues] = useState([]);
    const [selectedQueue, setSelectedQueue] = useState(null);
    const [messageBody, setMessageBody] = useState('');
    const [polledMessages, setPolledMessages] = useState([]);
    const [showPollModal, setShowPollModal] = useState(false);
    const [loading, setLoading] = useState(false);
    const [messagesLoading, setMessagesLoading] = useState(false);
    const [error, setError] = useState(null);
    const [newQueueName, setNewQueueName] = useState('');
    const [pollCount, setPollCount] = useState(1);

    const fetchQueues = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch('/api/sqs/queues');
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to fetch queues');
            setQueues(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const createQueue = async () => {
        if (!newQueueName) return;
        try {
            const response = await fetch('/api/sqs/queues', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ queueName: newQueueName }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to create queue');
            setNewQueueName('');
            fetchQueues();
        } catch (err) {
            setError(err.message);
        }
    };

    const deleteQueue = async (url) => {
        if (!window.confirm('Delete this queue?')) return;
        try {
            const response = await fetch(`/api/sqs/queues?queueUrl=${encodeURIComponent(url)}`, { method: 'DELETE' });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to delete queue');
            fetchQueues();
            if (selectedQueue === url) setSelectedQueue(null);
        } catch (err) {
            setError(err.message);
        }
    };

    const sendMessage = async () => {
        if (!messageBody || !selectedQueue) return;
        try {
            const response = await fetch('/api/sqs/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ queueUrl: selectedQueue, messageBody }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to send message');
            setMessageBody('');
            fetchMessages(); // Refresh message list
            fetchQueues(); // Refresh counts
        } catch (err) {
            setError(err.message);
        }
    };

    const pollMessages = async () => {
        if (!selectedQueue) return;
        setMessagesLoading(true);
        try {
            const response = await fetch(`/api/sqs/messages?queueUrl=${encodeURIComponent(selectedQueue)}&maxMessages=${pollCount}&delete=true`);
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to poll messages');
            setPolledMessages(data);
            setShowPollModal(true);
            fetchQueues(); // Refresh queue message count after deletion
        } catch (err) {
            setError(err.message);
        } finally {
            setMessagesLoading(false);
        }
    };

    const purgeQueue = async () => {
        if (!selectedQueue || !window.confirm('Clear all messages from this queue? (Can take up to 60s)')) return;
        setMessagesLoading(true);
        try {
            const response = await fetch('/api/sqs/purge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ queueUrl: selectedQueue }),
            });
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to purge queue');
            }
            fetchQueues();
        } catch (err) {
            setError(err.message);
        } finally {
            setMessagesLoading(false);
        }
    };

    useEffect(() => {
        fetchQueues();
    }, []);

    useEffect(() => {
        if (!selectedQueue) {
            setPolledMessages([]);
            setShowPollModal(false);
        }
    }, [selectedQueue]);


    return (
        <div className="sqs-manager">
            {error && <div className="text-error" style={{ color: 'var(--error)', marginBottom: '1rem' }}>Error: {error}</div>}

            <div style={{ marginBottom: '2rem', background: 'var(--aws-white)', padding: '1rem', border: '1px solid var(--aws-border)', borderRadius: '4px' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '16px' }}>Create Queue</h3>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <input
                        type="text"
                        placeholder="New Queue Name"
                        value={newQueueName}
                        onChange={(e) => setNewQueueName(e.target.value)}
                        style={{ padding: '0.5rem', border: '1px solid var(--aws-border)', borderRadius: '2px', background: 'var(--aws-white)', color: 'var(--aws-text-primary)', flex: 1 }}
                    />
                    <button onClick={createQueue} style={{ background: '#ec7211', color: 'white', border: '1px solid #ec7211' }}>Create Queue</button>
                </div>
            </div>

            <div style={{ marginBottom: '2rem', background: 'var(--aws-white)', padding: '1rem', border: '1px solid var(--aws-border)', borderRadius: '4px' }}>
                <h3 style={{ marginBottom: '1rem', fontSize: '16px' }}>Select Queue</h3>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <select
                        value={selectedQueue || ''}
                        onChange={(e) => setSelectedQueue(e.target.value || null)}
                        style={{ width: '300px', padding: '0.4rem', border: '1px solid var(--aws-border)' }}
                    >
                        <option value="">-- Choose a Queue --</option>
                        {queues.map(q => (
                            <option key={q.url} value={q.url}>{q.url.split('/').pop()}</option>
                        ))}
                    </select>

                    {selectedQueue && (() => {
                        const q = queues.find(x => x.url === selectedQueue);
                        return q ? <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Approx. Messages: <b>{q.messageCount}</b></span> : null;
                    })()}

                    <button onClick={fetchQueues} style={{ background: 'var(--aws-white)', border: '1px solid var(--aws-border)' }}>Refresh List</button>
                    {selectedQueue && (
                        <button
                            onClick={() => deleteQueue(selectedQueue)}
                            style={{ background: 'var(--aws-white)', color: 'var(--error)', border: '1px solid var(--error)' }}
                        >
                            Delete Queue
                        </button>
                    )}
                </div>
                {selectedQueue && (
                    <div style={{ wordBreak: 'break-all', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                        URL: {selectedQueue}
                    </div>
                )}
            </div>

            {selectedQueue && (
                <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'var(--aws-white)', borderRadius: '4px', border: '1px solid var(--aws-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '16px' }}>
                            Managing Queue: {selectedQueue.split('/').pop()}
                            <span style={{ fontWeight: 'normal', color: 'var(--text-secondary)', marginLeft: '0.5rem', fontSize: '14px' }}>
                                (Msgs: {queues.find(q => q.url === selectedQueue)?.messageCount || 0})
                            </span>
                        </h3>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button onClick={fetchQueues} style={{ background: 'var(--aws-white)', border: '1px solid var(--aws-border)' }}>Refresh Detail</button>
                            <button onClick={purgeQueue} style={{ background: 'var(--aws-white)', color: 'var(--error)', border: '1px solid var(--error)' }}>Purge Queue</button>
                            <button onClick={() => setSelectedQueue(null)} style={{ background: 'var(--aws-white)', border: '1px solid var(--aws-border)' }}>Close</button>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                        <textarea
                            value={messageBody}
                            onChange={(e) => setMessageBody(e.target.value)}
                            placeholder="Enter message body to send..."
                            style={{ flex: 1, minHeight: '80px', background: 'var(--aws-white)', border: '1px solid var(--aws-border)', color: 'var(--aws-text-primary)', padding: '0.75rem', borderRadius: '2px' }}
                        />
                        <button onClick={sendMessage} style={{ alignSelf: 'flex-start', background: '#ec7211', color: 'white', border: '1px solid #ec7211' }}>Send</button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', padding: '1.5rem', border: '1px solid var(--aws-border)', background: 'var(--aws-bg)', borderRadius: '4px' }}>
                        <div>
                            <h4 style={{ fontSize: '16px', margin: '0 0 0.5rem 0' }}>Receive messages</h4>
                            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>Poll for messages and automatically remove them.</p>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Max Messages:</label>
                            <input
                                type="number"
                                min="1"
                                max="10"
                                value={pollCount}
                                onChange={(e) => setPollCount(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                                style={{ width: '60px', padding: '0.4rem', border: '1px solid var(--aws-border)', borderRadius: '2px' }}
                            />
                            <button onClick={pollMessages} disabled={messagesLoading} style={{ background: '#ec7211', color: 'white', border: '1px solid #ec7211', opacity: messagesLoading ? 0.7 : 1 }}>
                                {messagesLoading ? 'Polling...' : 'Poll for messages'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showPollModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'var(--aws-white)', width: '80%', maxWidth: '800px', maxHeight: '80vh', borderRadius: '4px', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                        <div style={{ padding: '1rem', borderBottom: '1px solid var(--aws-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '18px' }}>Polled Messages ({polledMessages.length})</h3>
                            <button onClick={() => setShowPollModal(false)} style={{ background: 'transparent', border: 'none', fontSize: '20px', cursor: 'pointer', padding: '0 0.5rem' }}>&times;</button>
                        </div>

                        <div style={{ padding: '1rem', overflowY: 'auto', flex: 1 }}>
                            {polledMessages.length === 0 ? (
                                <p style={{ color: 'var(--text-secondary)' }}>No messages received during this poll window.</p>
                            ) : (
                                <table style={{ minWidth: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead style={{ background: 'var(--aws-bg)' }}>
                                        <tr>
                                            <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--aws-border)', width: '25%' }}>Message ID</th>
                                            <th style={{ padding: '0.75rem', borderBottom: '1px solid var(--aws-border)' }}>Body</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {polledMessages.map((msg, idx) => (
                                            <tr key={idx} style={{ borderBottom: '1px solid var(--aws-border)' }}>
                                                <td style={{ padding: '0.75rem', fontSize: '0.8rem', color: 'var(--text-secondary)', verticalAlign: 'top' }}>{msg.MessageId}</td>
                                                <td style={{ padding: '0.75rem' }}>
                                                    <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem', fontFamily: 'monospace', margin: 0, background: 'var(--aws-bg)', padding: '0.5rem', borderRadius: '2px', border: '1px solid var(--aws-border)' }}>
                                                        {msg.Body}
                                                    </pre>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <div style={{ padding: '1rem', borderTop: '1px solid var(--aws-border)', textAlign: 'right' }}>
                            <button onClick={() => setShowPollModal(false)} style={{ background: 'var(--aws-white)', border: '1px solid var(--aws-border)', padding: '0.5rem 1rem' }}>Close</button>
                        </div>
                    </div>
                </div>
            )}

            {loading && <p className="text-secondary" style={{ marginTop: '1rem' }}>Loading queues...</p>}
            {!loading && queues.length === 0 && <p className="text-secondary" style={{ marginTop: '1rem' }}>No queues found.</p>}
        </div>
    );
};

export default SQSManager;
