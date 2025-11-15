import { useCallback, useMemo, type CSSProperties } from 'react';
import {
  CartesianGrid,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
  Bar,
  BarChart,
  ResponsiveContainer,
} from 'recharts';

import { MythCollaborator, PlotPoint as PlotPointType } from '../types/myth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from './ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

type VariantInsightCoverageStat = {
  email: string;
  completed: number;
  percentage: number;
  role: MythCollaborator['role'] | null;
};

export type VariantInsightMetrics = {
  totalPlotPoints: number;
  collaboratorEmails: string[];
  totalAssignments: number;
  totalContributors: number;
  totalCapacity: number;
  completionPercentage: number;
  averageAssignmentsPerPlotPoint: number;
  coverageByCollaborator: VariantInsightCoverageStat[];
  pairwiseAgreements: number[][];
  agreementSummary: {
    average: number;
    highest: null | { pair: [string, string]; score: number };
  };
};

const roundToDecimal = (value: number, precision = 1) => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

const normalizeEmail = (email?: string | null) =>
  typeof email === 'string' && email.trim().length > 0 ? email.trim().toLowerCase() : null;

const getInitials = (label: string) =>
  label
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase())
    .join('')
    .slice(0, 2) || '??';

const getRoleLabelFromAssignment = (role: MythCollaborator['role'] | null) => {
  if (!role) {
    return 'Contributor';
  }
  return role === 'owner' ? 'Owner' : role.charAt(0).toUpperCase() + role.slice(1);
};

export const computeVariantInsightMetrics = (
  plotPoints: PlotPointType[],
  collaborators: MythCollaborator[],
): VariantInsightMetrics => {
  const totalPlotPoints = plotPoints.length;
  const collaboratorEmails = Array.from(
    new Set(
      collaborators
        .map((collaborator) => normalizeEmail(collaborator.email))
        .filter((email): email is string => Boolean(email)),
    ),
  ).sort();

  const collaboratorEmailSet = new Set(collaboratorEmails);
  const roleLookup = new Map<string, MythCollaborator['role']>();
  collaboratorEmails.forEach((email) => roleLookup.set(email, null));
  collaborators.forEach((collaborator) => {
    const normalized = normalizeEmail(collaborator.email);
    if (!normalized) return;
    roleLookup.set(normalized, collaborator.role);
  });

  const assignmentsByPlotPoint: Array<Set<string>> = [];
  const assignmentsByEmail = new Map<string, Set<string>>();
  collaboratorEmails.forEach((email) => assignmentsByEmail.set(email, new Set<string>()));

  plotPoints.forEach((plotPoint) => {
    const seenForPoint = new Set<string>();
    (plotPoint.collaboratorCategories ?? []).forEach((assignment) => {
      const normalized = normalizeEmail(assignment.collaboratorEmail);
      if (!normalized || !collaboratorEmailSet.has(normalized)) {
        return;
      }
      seenForPoint.add(normalized);
      assignmentsByEmail.get(normalized)?.add(plotPoint.id);
    });
    assignmentsByPlotPoint.push(seenForPoint);
  });

  const totalAssignments = assignmentsByPlotPoint.reduce(
    (sum, assignmentSet) => sum + assignmentSet.size,
    0,
  );
  const totalContributors = collaboratorEmails.length;
  const totalCapacity = totalPlotPoints * totalContributors;
  const completionPercentage = totalCapacity
    ? Math.min(roundToDecimal((totalAssignments / totalCapacity) * 100), 100)
    : 0;

  const averageAssignmentsPerPlotPoint = totalPlotPoints
    ? roundToDecimal(totalAssignments / totalPlotPoints)
    : 0;

  const coverageByCollaborator: VariantInsightCoverageStat[] = collaboratorEmails.map((email) => {
    const completed = assignmentsByEmail.get(email)?.size ?? 0;
    const percentage = totalPlotPoints
      ? Math.min(roundToDecimal((completed / totalPlotPoints) * 100), 100)
      : 0;
    return {
      email,
      completed,
      percentage,
      role: roleLookup.get(email) ?? null,
    };
  });

  const pairwiseAgreements = collaboratorEmails.map((emailA) =>
    collaboratorEmails.map((emailB) => {
      if (emailA === emailB) {
        return 1;
      }
      const assignmentsA = assignmentsByEmail.get(emailA) ?? new Set<string>();
      const assignmentsB = assignmentsByEmail.get(emailB) ?? new Set<string>();
      if (assignmentsA.size === 0 && assignmentsB.size === 0) {
        return 0;
      }
      let intersection = 0;
      assignmentsA.forEach((plotPointId) => {
        if (assignmentsB.has(plotPointId)) {
          intersection += 1;
        }
      });
      const union = new Set<string>([...assignmentsA, ...assignmentsB]);
      const unionSize = union.size;
      return unionSize ? intersection / unionSize : 0;
    }),
  );

  let totalAgreement = 0;
  let comparisons = 0;
  let highest: VariantInsightMetrics['agreementSummary']['highest'] = null;

  pairwiseAgreements.forEach((row, rowIndex) => {
    row.forEach((value, columnIndex) => {
      if (rowIndex >= columnIndex) {
        return;
      }
      totalAgreement += value;
      comparisons += 1;
      if (!highest || value > highest.score) {
        highest = {
          pair: [collaboratorEmails[rowIndex], collaboratorEmails[columnIndex]],
          score: value,
        };
      }
    });
  });

  const averageAgreement = comparisons
    ? Math.min(roundToDecimal((totalAgreement / comparisons) * 100), 100)
    : 0;

  return {
    totalPlotPoints,
    collaboratorEmails,
    totalAssignments,
    totalContributors,
    totalCapacity,
    completionPercentage,
    averageAssignmentsPerPlotPoint,
    coverageByCollaborator,
    pairwiseAgreements,
    agreementSummary: {
      average: averageAgreement,
      highest,
    },
  };
};

type VariantInsightsProps = {
  plotPoints: PlotPointType[];
  collaborators: MythCollaborator[];
  viewerEmail: string;
};

export function VariantInsights({ plotPoints, collaborators, viewerEmail }: VariantInsightsProps) {
  const normalizedViewerEmail = useMemo(() => normalizeEmail(viewerEmail), [viewerEmail]);
  const {
    totalPlotPoints,
    collaboratorEmails,
    totalAssignments,
    totalContributors,
    totalCapacity,
    completionPercentage,
    averageAssignmentsPerPlotPoint,
    coverageByCollaborator,
    pairwiseAgreements,
    agreementSummary,
  } = useMemo(
    () => computeVariantInsightMetrics(plotPoints, collaborators),
    [plotPoints, collaborators],
  );

  const collaboratorInfoByEmail = useMemo(() => {
    const map = new Map<
      string,
      { name: string; avatarUrl: string | null; role: MythCollaborator['role'] | null }
    >();
    collaborators.forEach((collaborator) => {
      const normalized = normalizeEmail(collaborator.email);
      if (!normalized) return;
      map.set(normalized, {
        name: collaborator.displayName?.trim() || collaborator.email,
        avatarUrl: collaborator.avatarUrl ?? null,
        role: collaborator.role ?? null,
      });
    });
    return map;
  }, [collaborators]);

  const roleByEmail = useMemo(() => {
    const map = new Map<string, MythCollaborator['role'] | null>();
    coverageByCollaborator.forEach((item) => {
      map.set(item.email, item.role ?? null);
    });
    return map;
  }, [coverageByCollaborator]);

  const getRoleLabel = useCallback(
    (normalizedEmail: string | null) => {
      if (!normalizedEmail) {
        return 'Contributor';
      }
      const role =
        roleByEmail.get(normalizedEmail) ??
        collaboratorInfoByEmail.get(normalizedEmail)?.role ??
        null;
      if (!role) {
        return 'Contributor';
      }
      return role === 'owner' ? 'Owner' : role.charAt(0).toUpperCase() + role.slice(1);
    },
    [roleByEmail, collaboratorInfoByEmail],
  );

  const getDisplayName = useCallback(
    (normalizedEmail: string | null) =>
      normalizedEmail
        ? (collaboratorInfoByEmail.get(normalizedEmail)?.name ?? normalizedEmail)
        : 'Contributor',
    [collaboratorInfoByEmail],
  );

  const coverageForViewer = useMemo(() => {
    if (!normalizedViewerEmail) {
      return null;
    }
    return coverageByCollaborator.find((item) => item.email === normalizedViewerEmail) ?? null;
  }, [coverageByCollaborator, normalizedViewerEmail]);

  const coverageChartData = useMemo(
    () =>
      coverageByCollaborator.map((item) => ({
        normalizedEmail: item.email,
        displayName: getDisplayName(item.email),
        role: getRoleLabel(item.email),
        percentage: item.percentage,
        completedCount: item.completed,
      })),
    [coverageByCollaborator, getDisplayName, getRoleLabel],
  );

  const completionChartData = useMemo(
    () => [
      {
        name: 'Completion',
        value: completionPercentage,
        fill: 'var(--color-completion)',
      },
    ],
    [completionPercentage],
  );

  const chartConfig = {
    completion: {
      label: 'Completion',
      color: 'hsl(160 94% 35%)',
    },
    coverage: {
      label: 'Coverage',
      color: 'hsl(221 83% 53%)',
    },
  } as const;

  const getAgreementCellStyle = (value: number): CSSProperties => {
    const lightness = 92 - value * 40;
    const backgroundColor = `hsl(160 70% ${lightness}%)`;
    const textColor = value > 0.6 ? 'hsl(160 20% 20%)' : 'inherit';
    return {
      backgroundColor,
      color: textColor,
    };
  };

  if (!totalPlotPoints || !collaboratorEmails.length) {
    return (
      <CardContent className="border border-dashed border-gray-300 bg-gray-50 py-10 text-center text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300">
        Add collaborators and plot point categorizations to see progress insights.
      </CardContent>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Overall Categorization Progress</CardTitle>
          <CardDescription>
            {totalAssignments} of {totalCapacity} assignments completed across {totalPlotPoints}
            {' plot points and '}
            {totalContributors} contributor{totalContributors === 1 ? '' : 's'}.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col items-center gap-6">
          <ChartContainer
            config={chartConfig}
            className="w-full max-w-xs aspect-square min-h-[260px]"
          >
            <RadialBarChart
              data={completionChartData}
              startAngle={90}
              endAngle={-270}
              innerRadius="60%"
              outerRadius="100%"
            >
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar dataKey="value" fill="var(--color-completion)" background />
            </RadialBarChart>
          </ChartContainer>
          <div className="text-center">
            <p className="text-3xl font-semibold font-robot">{completionPercentage.toFixed(1)}%</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Avg. assignments per plot point:{' '}
              <span className="font-robot">{averageAssignmentsPerPlotPoint.toFixed(1)}</span>
            </p>
            {coverageForViewer && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Your coverage:{' '}
                <span className="font-robot">{coverageForViewer.percentage.toFixed(1)}%</span>
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Contributor Coverage</CardTitle>
          <CardDescription>
            Completion percentage indicates the share of plot points each contributor has
            categorized.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-72 w-full min-w-0">
            <BarChart data={coverageChartData}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="displayName"
                tick={{ fill: 'var(--muted-foreground)' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                dataKey="percentage"
                tickFormatter={(value) => `${value}%`}
                tick={{ fill: 'var(--muted-foreground)' }}
                domain={[0, 100]}
              />
              <ChartTooltip
                cursor={{ fill: 'hsl(0 0% 95% / 0.6)' }}
                content={
                  <ChartTooltipContent
                    formatter={(value, _name, item) => {
                      const numeric =
                        typeof value === 'number' ? value : Number.parseFloat(String(value ?? 0));
                      const completedCount = Number(item?.payload?.completedCount ?? 0);
                      return (
                        <div className="flex flex-col gap-0.5">
                          <span>{numeric.toFixed(1)}% completion</span>
                          <span className="text-muted-foreground">
                            {completedCount} / {totalPlotPoints} plot points
                          </span>
                        </div>
                      );
                    }}
                    labelFormatter={(_label, payload) => {
                      const normalizedLabel =
                        (payload?.[0]?.payload?.normalizedEmail as string | undefined) ?? '';
                      const displayName = getDisplayName(normalizedLabel);
                      return `${getRoleLabel(normalizedLabel)} · ${displayName}`;
                    }}
                  />
                }
              />
              <Bar dataKey="percentage" fill="var(--color-coverage)" />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Pairwise Categorization Agreement</CardTitle>
          <CardDescription>
            Jaccard similarity of plot point coverage between collaborators. Higher values indicate
            more overlap in categorized plot points.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 z-10 bg-background">Contributor</TableHead>
                  {collaboratorEmails.map((email) => {
                    const displayName = getDisplayName(email);
                    const initials = getInitials(displayName);
                    const avatarUrl = collaboratorInfoByEmail.get(email)?.avatarUrl ?? null;
                    return (
                      <TableHead key={`head-${email}`} className="text-center">
                        <div className="flex flex-col items-center gap-1">
                          <Avatar className="h-8 w-8 border border-gray-200 text-xs font-semibold dark:border-gray-600">
                            <AvatarImage src={avatarUrl ?? undefined} alt={displayName} />
                            <AvatarFallback>{initials}</AvatarFallback>
                          </Avatar>
                          <span className="text-[0.65rem] font-medium text-gray-700 dark:text-gray-200">
                            {displayName}
                          </span>
                        </div>
                      </TableHead>
                    );
                  })}
                </TableRow>
              </TableHeader>
              <TableBody className="font-robot">
                {pairwiseAgreements.map((row, rowIndex) => {
                  const email = collaboratorEmails[rowIndex];
                  const displayName = getDisplayName(email);
                  const initials = getInitials(displayName);
                  const avatarUrl = collaboratorInfoByEmail.get(email)?.avatarUrl ?? null;
                  return (
                    <TableRow key={`row-${email}`}>
                      <TableCell className="sticky left-0 z-10 bg-background font-medium">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8 border border-gray-200 text-xs font-semibold dark:border-gray-600">
                            <AvatarImage src={avatarUrl ?? undefined} alt={displayName} />
                            <AvatarFallback>{initials}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col">
                            <span>{displayName}</span>
                            <span className="text-xs font-normal text-muted-foreground">
                              {getRoleLabel(email)}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      {row.map((value, columnIndex) => (
                        <TableCell
                          key={`cell-${email}-${columnIndex}`}
                          className="text-center text-sm"
                          style={getAgreementCellStyle(value)}
                        >
                          {(value * 100).toFixed(0)}%
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-4 text-sm text-gray-600 dark:text-gray-300 md:grid-cols-2">
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">Average similarity</p>
              <p className="font-robot">{agreementSummary.average.toFixed(1)}%</p>
            </div>
            {agreementSummary.highest && (
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  Most overlapping pair
                </p>
                <p>
                  <span className="font-robot">
                    {getDisplayName(agreementSummary.highest.pair[0])}
                  </span>{' '}
                  &amp;{' '}
                  <span className="font-robot">
                    {getDisplayName(agreementSummary.highest.pair[1])}
                  </span>{' '}
                  ·
                  <span className="font-robot">
                    {(agreementSummary.highest.score * 100).toFixed(1)}%
                  </span>
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
