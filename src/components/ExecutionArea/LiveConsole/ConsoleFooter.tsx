import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Download, 
  ScrollText, 
  Activity, 
  Wifi, 
  WifiOff,
  Keyboard,
  Info
} from 'lucide-react';
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ConsoleFooterProps {
  autoScroll: boolean;
  onAutoScrollToggle: (enabled: boolean) => void;
  logCount: number;
  filteredCount: number;
  onExport: () => void;
  onShowHelp: () => void;
  isConnected?: boolean;
  isRunning?: boolean;
}

export const ConsoleFooter: React.FC<ConsoleFooterProps> = ({
  autoScroll,
  onAutoScrollToggle,
  logCount,
  filteredCount,
  onExport,
  onShowHelp,
  isConnected = true,
  isRunning = false
}) => {
  const exportFormats = [
    { label: 'JSON', value: 'json' },
    { label: 'CSV', value: 'csv' },
    { label: 'TXT', value: 'txt' }
  ];

  const keyboardShortcuts = [
    { key: 'Ctrl+F', description: 'Search logs' },
    { key: 'Ctrl+E', description: 'Export logs' },
    { key: 'Ctrl+K', description: 'Clear logs' },
    { key: '↑/↓', description: 'Navigate entries' },
    { key: 'Enter', description: 'Expand/collapse entry' },
    { key: 'Esc', description: 'Clear selection' }
  ];

  return (
    <div className="bg-gray-800 border-t border-gray-700 p-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {isConnected ? (
                <Wifi className="w-3 h-3 text-green-500" />
              ) : (
                <WifiOff className="w-3 h-3 text-red-500" />
              )}
              <span className="text-xs text-gray-400">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            {isRunning && (
              <div className="flex items-center gap-1">
                <Activity className="w-3 h-3 text-blue-500 animate-pulse" />
                <span className="text-xs text-gray-400">Running</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
            <ScrollText className="w-3 h-3" />
            <span>
              Showing {filteredCount} of {logCount} logs
            </span>
            {filteredCount < logCount && (
              <Badge variant="secondary" className="text-xs">
                {logCount - filteredCount} filtered
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="auto-scroll" className="text-xs text-gray-400">
              Auto-scroll
            </label>
            <Switch
              id="auto-scroll"
              checked={autoScroll}
              onCheckedChange={onAutoScrollToggle}
              className="scale-75"
            />
          </div>

          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onExport}
                    className="h-6 text-gray-400 hover:text-white hover:bg-gray-700"
                  >
                    <Download className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Export logs (Ctrl+E)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onShowHelp}
                    className="h-6 text-gray-400 hover:text-white hover:bg-gray-700"
                  >
                    <Keyboard className="w-3 h-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <div className="space-y-1">
                    <p className="font-medium">Keyboard Shortcuts</p>
                    {keyboardShortcuts.map(({ key, description }) => (
                      <div key={key} className="flex justify-between gap-3 text-xs">
                        <span className="font-mono">{key}</span>
                        <span>{description}</span>
                      </div>
                    ))}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </div>
  );
};