import React, { useState, useEffect } from 'react';
import S3Manager from './S3Manager';
import SQSManager from './SQSManager';
import DynamoDBManager from './DynamoDBManager';
import IAMManager from './IAMManager';
import SSMManager from './SSMManager';
import { S3Icon, SQSIcon, DynamoDBIcon, IAMIcon, SSMIcon, HomeIcon } from './AwsIcons';

function App() {
    const [activeTab, setActiveTab] = useState('Overview');
    const [config, setConfig] = useState({ region: 'us-east-1', endpoint: 'http://localhost:4566' });
    const [services, setServices] = useState({
        s3: { data: [], loading: true, error: null },
        sqs: { data: [], loading: true, error: null },
        dynamodb: { data: [], loading: true, error: null },
        iamPolicies: { data: [], loading: true, error: null },
        iamRoles: { data: [], loading: true, error: null },
    });

    const fetchConfig = async () => {
        try {
            const response = await fetch('/api/config');
            if (response.ok) {
                const data = await response.json();
                setConfig(data);
            }
        } catch (err) {
            console.error('Failed to fetch config', err);
        }
    };

    const fetchServiceData = async (service, endpoint) => {
        try {
            const response = await fetch(`/api/${endpoint}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `Failed to fetch ${service}`);
            }
            const data = await response.json();
            setServices(prev => ({
                ...prev,
                [service]: { data, loading: false, error: null }
            }));
        } catch (err) {
            setServices(prev => ({
                ...prev,
                [service]: { data: [], loading: false, error: err.message }
            }));
        }
    };

    useEffect(() => {
        fetchConfig();
        fetchServiceData('s3', 's3/buckets');
        fetchServiceData('sqs', 'sqs/queues');
        fetchServiceData('dynamodb', 'dynamodb/tables');
        fetchServiceData('iamPolicies', 'iam/policies');
        fetchServiceData('iamRoles', 'iam/roles');
    }, []);


    const supportedServicesMap = {
        'S3': 'S3',
        'SQS': 'SQS',
        'DynamoDB': 'DynamoDB',
        'IAM': 'IAM',
        'SSM': 'SSM'
    };

    return (
        <div>
            {/* Top Navigation Bar */}
            <header className="aws-top-nav">
                <div className="aws-logo-area" onClick={() => setActiveTab('Overview')}>
                    <span>☁️</span> LocalStack
                </div>

                {/* Search Bar Placeholder */}
                <div style={{ flex: '1', maxWidth: '400px', margin: '0 2rem' }}>
                    <div style={{ background: '#354150', border: '1px solid #545b64', borderRadius: '4px', padding: '4px 8px', display: 'flex', alignItems: 'center', color: '#aab7b8', fontSize: '12px' }}>
                        <span>🔍 Search for services, features, blogs, docs, and more</span>
                        <span style={{ marginLeft: 'auto', background: '#545b64', padding: '2px 4px', borderRadius: '2px', color: '#f2f3f3', fontSize: '10px' }}>Alt+S</span>
                    </div>
                </div>

                <div className="aws-nav-actions">
                    <div className="aws-nav-item">Terminal</div>
                    <div className="aws-nav-item">🔔</div>
                    <div className="aws-nav-item">❓</div>
                    <div className="aws-nav-item">
                        {config.region} ▾
                    </div>
                    <div className="aws-nav-item">
                        root @ localstack ▾
                    </div>
                </div>
            </header>

            <div className="dashboard">
                {/* Left Navigation */}
                <aside className="sidebar">
                    <div className="sidebar-title">LocalStack Home</div>
                    <nav style={{ padding: '0.5rem 0' }}>
                        <div
                            className={`nav-item ${activeTab === 'Overview' ? 'active' : ''}`}
                            onClick={() => setActiveTab('Overview')}
                        >
                            <HomeIcon color={activeTab === 'Overview' ? 'white' : 'var(--aws-text-secondary)'} /> Console Home
                        </div>
                        <div style={{ padding: '1rem', color: 'var(--aws-text-secondary)', fontSize: '12px', fontWeight: 'bold' }}>
                            RECENTLY VISITED
                        </div>
                        {[
                            { id: 'S3', icon: S3Icon },
                            { id: 'SQS', icon: SQSIcon },
                            { id: 'DynamoDB', icon: DynamoDBIcon },
                            { id: 'IAM', icon: IAMIcon },
                            { id: 'SSM', icon: SSMIcon }
                        ].map(tab => (
                            <div
                                key={tab.id}
                                className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <tab.icon color={activeTab === tab.id ? 'white' : 'var(--aws-text-secondary)'} /> {tab.id}
                            </div>
                        ))}
                    </nav>
                </aside>

                {/* Main Content Area */}
                <main className="main-content">
                    {activeTab === 'Overview' ? (
                        <>
                            <div className="aws-page-header">
                                <h2>Console Home</h2>
                            </div>

                            <div className="aws-widget-grid">
                                <div className="aws-widget">
                                    <div className="aws-widget-header">
                                        <h3 className="aws-widget-title">Recently visited</h3>
                                    </div>
                                    <div className="aws-widget-content" style={{ padding: '1rem' }}>
                                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                            {[
                                                { id: 'S3', icon: S3Icon },
                                                { id: 'DynamoDB', icon: DynamoDBIcon },
                                                { id: 'IAM', icon: IAMIcon },
                                                { id: 'SQS', icon: SQSIcon }
                                            ].map(svc => (
                                                <div
                                                    key={svc.id}
                                                    style={{ border: '1px solid var(--aws-border)', borderRadius: '4px', padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', background: 'var(--aws-white)' }}
                                                    onClick={() => setActiveTab(svc.id)}
                                                    className="aws-link"
                                                >
                                                    <svc.icon color="#ec7211" />
                                                    <span style={{ fontWeight: '500' }}>{svc.id}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Resource Summary Widget */}
                                <div className="aws-widget">
                                    <div className="aws-widget-header">
                                        <h3 className="aws-widget-title">AWS Health</h3>
                                    </div>
                                    <div className="aws-widget-content" style={{ padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ fontSize: '32px', color: 'var(--aws-success)' }}>✅</div>
                                        <div>
                                            <div style={{ fontWeight: 'bold' }}>LocalStack is operating normally</div>
                                            <div style={{ color: 'var(--aws-text-secondary)', fontSize: '12px' }}>Endpoint: {config.endpoint}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Resource Status / Metrics Table */}
                            <div className="aws-widget">
                                <div className="aws-widget-header">
                                    <h3 className="aws-widget-title">Resource Summary</h3>
                                </div>
                                <div>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                        <thead>
                                            <tr>
                                                <th>Service</th>
                                                <th>Resource Type</th>
                                                <th>Count</th>
                                                <th>Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {[
                                                { id: 's3', name: 'S3', type: 'Buckets' },
                                                { id: 'sqs', name: 'SQS', type: 'Queues' },
                                                { id: 'dynamodb', name: 'DynamoDB', type: 'Tables' },
                                                { id: 'iamPolicies', name: 'IAM', type: 'Policies' },
                                                { id: 'iamRoles', name: 'IAM', type: 'Roles' },
                                            ].map(svc => {
                                                const serviceData = services[svc.id];
                                                const count = serviceData?.data ? serviceData.data.length : 0;
                                                const status = serviceData.loading ? 'Loading...' : serviceData.error ? 'Error' : 'Operational';
                                                return (
                                                    <tr key={svc.id}>
                                                        <td><a className="aws-link" onClick={() => setActiveTab(supportedServicesMap[svc.name] || 'Overview')}>{svc.name}</a></td>
                                                        <td>{svc.type}</td>
                                                        <td style={{ fontWeight: 'bold' }}>{serviceData.loading ? '-' : count}</td>
                                                        <td>
                                                            <span className={`badge ${serviceData.loading ? 'badge-loading' : serviceData.error ? 'badge-error' : 'badge-success'}`}>
                                                                {status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                        </>
                    ) : (
                        <div>
                            <div className="aws-page-header">
                                <h2>{activeTab} Management</h2>
                            </div>
                            {activeTab === 'S3' && <S3Manager />}
                            {activeTab === 'SQS' && <SQSManager />}
                            {activeTab === 'DynamoDB' && <DynamoDBManager />}
                            {activeTab === 'IAM' && <IAMManager />}
                            {activeTab === 'SSM' && <SSMManager />}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}

export default App;
