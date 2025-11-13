import { PlayIcon } from 'lucide-react';

import { InfoTooltip } from '../../components/InfoTooltip';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { DEFAULT_PARAMS } from './constants';
import { ALGORITHM_MODE_DETAILS, OPTIMIZATION_GOAL_DETAILS, PARAMETER_TIPS } from './copy';
import type { AlgorithmMode, ParameterState } from './types';

type ParameterRailProps = {
  params: ParameterState;
  onChange: (next: ParameterState) => void;
  onRun: () => void;
  disabled: boolean;
  isRunning: boolean;
  errorMessage: string | null;
};

export function ParameterRail({
  params,
  onChange,
  onRun,
  disabled,
  isRunning,
  errorMessage,
}: ParameterRailProps) {
  return (
    <aside
      className="rounded-2xl border border-border bg-card p-4 shadow-sm dark:border-white/5"
      data-testid="parameter-rail"
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Parameters</h3>
          <p className="text-xs text-muted-foreground">Runs execute via Supabase Edge Functions.</p>
        </div>
        <Button
          size="icon"
          variant="outline"
          onClick={() => onChange(DEFAULT_PARAMS)}
          title="Reset parameters"
          disabled={isRunning}
        >
          ↺
        </Button>
      </div>

      <div className="mt-4 space-y-4 text-sm">
        <div>
          <div className="flex items-center gap-2">
            <Label htmlFor="algorithm-select">Algorithm Mode</Label>
            <InfoTooltip
              label="Explain algorithm modes"
              content={
                <div className="space-y-2 text-xs">
                  <p>{PARAMETER_TIPS.algorithm}</p>
                  <ul className="list-disc space-y-1 pl-4">
                    {Object.entries(ALGORITHM_MODE_DETAILS).map(([key, detail]) => (
                      <li key={key}>
                        <span className="font-semibold">{detail.label}:</span> {detail.description}
                      </li>
                    ))}
                  </ul>
                </div>
              }
            />
          </div>
          <Select
            value={params.algorithm}
            onValueChange={(value: AlgorithmMode) => onChange({ ...params, algorithm: value })}
          >
            <SelectTrigger id="algorithm-select" className="mt-1">
              <SelectValue placeholder="Select mode" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ALGORITHM_MODE_DETAILS).map(([value, detail]) => (
                <SelectItem key={value} value={value}>
                  {detail.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 rounded-lg border border-border/70 p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">Auto-detect Category Count</p>
                <InfoTooltip
                  label="Explain auto-detect"
                  content={
                    <div className="space-y-1 text-xs">
                      <p>{PARAMETER_TIPS.autoDetect}</p>
                    </div>
                  }
                />
              </div>
              <p className="text-xs text-muted-foreground">Uses elbow/Gap heuristics (not yet wired).</p>
            </div>
            <Switch
              checked={params.useAutoK}
              onCheckedChange={(checked: boolean) => onChange({ ...params, useAutoK: checked })}
              disabled={isRunning}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Label htmlFor="target-k-input">Target Canonical Count</Label>
              <InfoTooltip
                label="Explain target canonical count"
                content={<p className="text-xs">{PARAMETER_TIPS.targetCanonicalCount}</p>}
              />
            </div>
            <Input
              id="target-k-input"
              type="number"
              min={2}
              max={12}
              value={params.targetCanonicalCount}
              onChange={(event) =>
                onChange({ ...params, targetCanonicalCount: Number(event.currentTarget.value) })
              }
              className="mt-1"
              disabled={params.useAutoK || isRunning}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <Label htmlFor="optimization-select">Optimization Goal</Label>
            <InfoTooltip
              label="Explain optimization goals"
              content={
                <div className="space-y-2 text-xs">
                  <p>{PARAMETER_TIPS.optimizationGoal}</p>
                  <ul className="list-disc space-y-1 pl-4">
                    {Object.entries(OPTIMIZATION_GOAL_DETAILS).map(([key, detail]) => (
                      <li key={key}>
                        <span className="font-semibold">{detail.label}:</span> {detail.description}
                      </li>
                    ))}
                  </ul>
                </div>
              }
            />
          </div>
          <Select
            value={params.optimizationGoal}
            onValueChange={(value: ParameterState['optimizationGoal']) =>
              onChange({ ...params, optimizationGoal: value })
            }
          >
            <SelectTrigger id="optimization-select" className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(OPTIMIZATION_GOAL_DETAILS).map(([value, detail]) => (
                <SelectItem key={value} value={value}>
                  {detail.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <Label htmlFor="min-cluster-input">Minimum Cluster Size</Label>
            <InfoTooltip
              label="Explain minimum cluster size"
              content={<p className="text-xs">{PARAMETER_TIPS.minClusterSize}</p>}
            />
          </div>
          <Input
            id="min-cluster-input"
            type="number"
            min={1}
            max={12}
            value={params.minClusterSize}
            onChange={(event) =>
              onChange({ ...params, minClusterSize: Number(event.currentTarget.value) })
            }
            className="mt-1"
            disabled={isRunning}
          />
        </div>
      </div>

      <Button
        className="mt-6 w-full gap-2"
        onClick={onRun}
        disabled={disabled || isRunning}
        variant="default"
      >
        <PlayIcon className="size-4" />
        {isRunning ? 'Running…' : 'Run Analysis'}
      </Button>
      {errorMessage && (
        <p className="mt-3 text-xs text-red-500" role="alert">
          {errorMessage}
        </p>
      )}
    </aside>
  );
}
