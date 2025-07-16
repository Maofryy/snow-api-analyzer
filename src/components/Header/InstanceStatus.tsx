
import React, { useState, useEffect } from 'react';
import { useBenchmark } from '../../contexts/BenchmarkContext';
import { getAuthStatus, isDevelopmentMode } from '../../services/authService';
import { getTokenInfo } from '../../utils/tokenManager';
import { Badge } from '../ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';

export function InstanceStatus() {
  const { state } = useBenchmark();
  const { instance } = state;
  const authStatus = getAuthStatus();
  const showInstanceUrl = isDevelopmentMode();
  const [tokenInfo, setTokenInfo] = useState<any>(null);

  useEffect(() => {
    if (authStatus.isSessionAuth) {
      // Update token info periodically
      const updateTokenInfo = () => {
        const info = getTokenInfo();
        setTokenInfo(info);
      };

      updateTokenInfo();
      const interval = setInterval(updateTokenInfo, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [authStatus.isSessionAuth]);

  const getTokenStatus = () => {
    if (!tokenInfo) return 'unknown';
    
    const now = Date.now();
    const tokenAge = now - tokenInfo.fetchedAt;
    const maxAge = 5 * 60 * 1000; // 5 minutes
    
    if (tokenAge > maxAge) return 'expired';
    if (tokenAge > maxAge * 0.8) return 'expiring';
    return 'valid';
  };

  const getTokenStatusColor = (status: string) => {
    switch (status) {
      case 'valid': return 'text-green-600';
      case 'expiring': return 'text-yellow-600';
      case 'expired': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const formatTokenAge = (fetchedAt: number) => {
    const ageMs = Date.now() - fetchedAt;
    const ageMinutes = Math.floor(ageMs / 60000);
    const ageSeconds = Math.floor((ageMs % 60000) / 1000);
    
    if (ageMinutes > 0) {
      return `${ageMinutes}m ${ageSeconds}s ago`;
    }
    return `${ageSeconds}s ago`;
  };

  return (
    <div className="flex items-center space-x-4 font-mono">
      {showInstanceUrl && (
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Instance:</span>
          <code className="bg-code-bg px-2 py-1 rounded text-sm border">
            {instance.url || 'Not configured'}
          </code>
        </div>
      )}
      
      <div className="flex items-center space-x-2">
        <span className="text-sm text-gray-600">
          {authStatus.isSessionAuth ? 'Session:' : 'Status:'}
        </span>
        <div className="flex items-center space-x-1">
          <div className={`status-dot ${instance.connected ? 'status-connected' : 'status-disconnected'}`}></div>
          <span className={`text-sm ${instance.connected ? 'text-success' : 'text-error'}`}>
            {instance.connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {authStatus.isSessionAuth && (
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600">Mode:</span>
          <Badge variant="secondary" className="text-xs">
            {authStatus.mode}
          </Badge>
        </div>
      )}

      {authStatus.isSessionAuth && tokenInfo && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">Token:</span>
                <Badge 
                  variant={getTokenStatus() === 'valid' ? 'default' : 'destructive'}
                  className="text-xs"
                >
                  {getTokenStatus()}
                </Badge>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-sm">
                <div>Status: {getTokenStatus()}</div>
                <div>Fetched: {formatTokenAge(tokenInfo.fetchedAt)}</div>
                {tokenInfo.expiresAt && (
                  <div>Expires: {new Date(tokenInfo.expiresAt).toLocaleString()}</div>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
