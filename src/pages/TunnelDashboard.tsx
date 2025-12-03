import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface TunnelStatus {
  session_status: string;
  account: string;
  version: string;
  region: string;
  latency: string;
  web_interface: string;
  forwarding: string;
  connections: {
    ttl: number;
    opn: number;
    rt1: number;
    rt5: number;
    p50: number;
    p90: number;
  };
  system_stats: {
    cpu_percent: number;
    memory_percent: number;
    memory_used: number;
    memory_total: number;
    bytes_sent: number;
    bytes_recv: number;
    uptime: number;
  };
  http_requests: HttpRequest[];
  last_updated: string;
}

interface HttpRequest {
  id: number;
  method: string;
  path: string;
  status: number;
  timestamp: string;
  response_time: number;
  size: number;
}

const TunnelDashboard: React.FC = () => {
  const [tunnelStatus, setTunnelStatus] = useState<TunnelStatus | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadInitialData();
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const loadInitialData = async () => {
    try {
      const response = await fetch('/api/tunnel/status');
      if (!response.ok) {
        throw new Error('Failed to load tunnel status');
      }
      const data = await response.json();
      setTunnelStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const connectWebSocket = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/tunnel/ws`;
    
    wsRef.current = new WebSocket(wsUrl);
    
    wsRef.current.onopen = () => {
      setIsConnected(true);
      setError(null);
    };
    
    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'stats_update') {
        setTunnelStatus(prev => prev ? {
          ...prev,
          connections: data.data.connections,
          system_stats: data.data.system_stats
        } : null);
      } else if (data.type === 'request_update') {
        setTunnelStatus(prev => prev ? {
          ...prev,
          http_requests: data.data.requests
        } : null);
      }
    };
    
    wsRef.current.onclose = () => {
      setIsConnected(false);
      // Attempt to reconnect after 5 seconds
      setTimeout(connectWebSocket, 5000);
    };
    
    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setError('WebSocket connection error');
    };
  };

  const simulateRequest = async () => {
    try {
      const response = await fetch('/api/tunnel/simulate-request', {
        method: 'POST'
      });
      if (!response.ok) {
        throw new Error('Failed to simulate request');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const getStatusText = (status: number): string => {
    switch (status) {
      case 200: return 'OK';
      case 404: return 'Not Found';
      case 500: return 'Internal Server Error';
      default: return 'Unknown';
    }
  };

  const getStatusClass = (status: number): string => {
    switch (status) {
      case 200: return 'status-200';
      case 404: return 'status-404';
      case 500: return 'status-500';
      default: return 'status-unknown';
    }
  };

  const formatUptime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (error) {
    return (
      <div className="tunnel-dashboard">
        <div className="error-container">
          <h2>❌ Connection Error</h2>
          <p>{error}</p>
          <button onClick={loadInitialData} className="retry-btn">
            Retry Connection
          </button>
          <button onClick={() => navigate('/')} className="home-btn">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!tunnelStatus) {
    return (
      <div className="tunnel-dashboard">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading tunnel status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tunnel-dashboard">
      <div className="dashboard-header">
        <h1>🚀 Cloudflare Tunnel Dashboard</h1>
        <div className="connection-status">
          <span className={`status-indicator ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          </span>
        </div>
      </div>

      <div className="status-grid">
        <div className="status-card">
          <h3>Session Status</h3>
          <div className="status-item">
            <span className="status-label">Session Status:</span>
            <span className="status-value online">{tunnelStatus.session_status}</span>
          </div>
          <div className="status-item">
            <span className="status-label">Account:</span>
            <span className="status-value">{tunnelStatus.account}</span>
          </div>
          <div className="status-item">
            <span className="status-label">Version:</span>
            <span className="status-value">{tunnelStatus.version}</span>
          </div>
          <div className="status-item">
            <span className="status-label">Region:</span>
            <span className="status-value">{tunnelStatus.region}</span>
          </div>
          <div className="status-item">
            <span className="status-label">Latency:</span>
            <span className="status-value">{tunnelStatus.latency}</span>
          </div>
          <div className="status-item">
            <span className="status-label">Web Interface:</span>
            <span className="status-value">{tunnelStatus.web_interface}</span>
          </div>
          <div className="status-item">
            <span className="status-label">Forwarding:</span>
            <span className="status-value">{tunnelStatus.forwarding}</span>
          </div>
        </div>

        <div className="status-card">
          <h3>Connections</h3>
          <div className="connections-grid">
            <div className="connection-item">
              <div className="connection-label">ttl</div>
              <div className="connection-value">{tunnelStatus.connections.ttl}</div>
            </div>
            <div className="connection-item">
              <div className="connection-label">opn</div>
              <div className="connection-value">{tunnelStatus.connections.opn}</div>
            </div>
            <div className="connection-item">
              <div className="connection-label">rt1</div>
              <div className="connection-value">{tunnelStatus.connections.rt1.toFixed(2)}</div>
            </div>
            <div className="connection-item">
              <div className="connection-label">rt5</div>
              <div className="connection-value">{tunnelStatus.connections.rt5.toFixed(2)}</div>
            </div>
            <div className="connection-item">
              <div className="connection-label">p50</div>
              <div className="connection-value">{tunnelStatus.connections.p50.toFixed(2)}</div>
            </div>
            <div className="connection-item">
              <div className="connection-label">p90</div>
              <div className="connection-value">{tunnelStatus.connections.p90.toFixed(2)}</div>
            </div>
          </div>
        </div>

        <div className="status-card">
          <h3>System Stats</h3>
          <div className="system-stats">
            <div className="stat-item">
              <div className="stat-label">CPU Usage</div>
              <div className="stat-value">{tunnelStatus.system_stats.cpu_percent.toFixed(1)}%</div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${tunnelStatus.system_stats.cpu_percent}%` }}
                ></div>
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Memory Usage</div>
              <div className="stat-value">{tunnelStatus.system_stats.memory_percent.toFixed(1)}%</div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${tunnelStatus.system_stats.memory_percent}%` }}
                ></div>
              </div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Uptime</div>
              <div className="stat-value">{formatUptime(tunnelStatus.system_stats.uptime)}</div>
            </div>
            <div className="stat-item">
              <div className="stat-label">Bytes Sent</div>
              <div className="stat-value">{formatBytes(tunnelStatus.system_stats.bytes_sent)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="requests-section">
        <div className="requests-header">
          <h3>HTTP Requests</h3>
          <button className="simulate-btn" onClick={simulateRequest}>
            Simulate Request
          </button>
        </div>
        <div className="requests-list">
          {tunnelStatus.http_requests.slice(0, 20).map((request) => (
            <div key={request.id} className="request-item">
              <span className="request-method">{request.method}</span>
              <span className="request-path">{request.path}</span>
              <span className={`request-status ${getStatusClass(request.status)}`}>
                {request.status} {getStatusText(request.status)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="dashboard-footer">
        <p>Last updated: {new Date(tunnelStatus.last_updated).toLocaleString()}</p>
        <button onClick={() => navigate('/')} className="back-btn">
          Back to Home
        </button>
      </div>
    </div>
  );
};

export default TunnelDashboard;
