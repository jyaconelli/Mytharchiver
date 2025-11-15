import { LoaderCircleIcon, PlayIcon } from 'lucide-react';

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
import { getParameterEnforcement, type EnforcementLevel } from './enforcement';
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
  const enforcement = getParameterEnforcement(params.algorithm);
  const autoDetectStatus = enforcement.autoDetect;
  const targetStatus = enforcement.targetCanonicalCount;
  const optimizationStatus = enforcement.optimizationGoal;
  const minClusterStatus = enforcement.minClusterSize;

  return (
    <aside
      className="border border-border bg-card p-4 shadow-sm dark:border-white/5"
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
          <div className="flex items-center gap-2 justify-between">
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

        <div className="space-y-2 border-2 border-dashed border-border/70 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-sm font-medium">
              <ParameterIndicator level={autoDetectStatus} />
              <p>Auto Category Count</p>
            </div>
            <InfoTooltip
              label="Explain auto-detect"
              content={
                <div className="space-y-1 text-xs">
                  <p>{PARAMETER_TIPS.autoDetect}</p>
                </div>
              }
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Sweeps elbow + Gap heuristics to pick a stable category count automatically.
            </p>
            <Switch
              checked={params.useAutoK && autoDetectStatus !== 'na'}
              onCheckedChange={(checked: boolean) => onChange({ ...params, useAutoK: checked })}
              disabled={isRunning || autoDetectStatus === 'na'}
            />
          </div>
          <div>
            <div className="flex items-center gap-1 justify-between">
              <div className="flex items-center gap-1">
                <ParameterIndicator level={targetStatus} />
                <Label htmlFor="target-k-input">Target Canonical Count</Label>
              </div>
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
              disabled={params.useAutoK || isRunning || targetStatus === 'na'}
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <ParameterIndicator level={optimizationStatus} />
              <Label htmlFor="optimization-select">Optimization Goal</Label>
            </div>
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
            disabled={isRunning || optimizationStatus === 'na'}
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <ParameterIndicator level={minClusterStatus} />
              <Label htmlFor="min-cluster-input">Minimum Cluster Size</Label>
            </div>
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
            disabled={isRunning || minClusterStatus === 'na'}
          />
        </div>
      </div>

      <Button
        className={`mt-6 w-full hover:bg-black/70`}
        onClick={onRun}
        disabled={disabled || isRunning}
        variant="default"
      >
        {isRunning ? (
          <LoaderCircleIcon className="size-4 animate-spin" />
        ) : (
          <PlayIcon className="size-4" />
        )}
        {isRunning ? 'Running…' : 'Run Analysis'}
      </Button>
      <ParameterLegend />
      {errorMessage && (
        <p className="mt-3 text-xs text-red-500" role="alert">
          {errorMessage}
        </p>
      )}
    </aside>
  );
}

const INDICATOR_META: Record<EnforcementLevel, { colorClass: string; label: string }> = {
  strict: {
    colorClass: 'bg-emerald-500',
    label: 'Strictly enforced',
  },
  influence: {
    colorClass: 'bg-amber-400',
    label: 'Heuristic influence only',
  },
  na: {
    colorClass: 'bg-slate-400 dark:bg-slate-500',
    label: 'Not used by this mode',
  },
};

function ParameterIndicator({ level }: { level: EnforcementLevel }) {
  const meta = INDICATOR_META[level];
  return (
    <span
      className={`inline-flex h-2 w-2 ${meta.colorClass}`}
      title={meta.label}
      aria-label={meta.label}
    />
  );
}

function ParameterLegend() {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
      {Object.entries(INDICATOR_META).map(([level, meta]) => (
        <div key={level} className="flex items-center gap-2">
          <ParameterIndicator level={level as EnforcementLevel} />
          <span>{meta.label}</span>
        </div>
      ))}
    </div>
  );
}
