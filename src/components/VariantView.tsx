import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CollaboratorCategory,
  MythCollaborator,
  MythCategory,
  MythVariant,
  Mytheme,
  PlotPoint as PlotPointType,
} from '../types/myth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { TimelineView } from './TimelineView';
import { GroupedView } from './GroupedView';
import { GridView } from './GridView';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { LayoutList, Grid3x3, FolderTree, Plus, Loader2, BarChart3 } from 'lucide-react';
import { AddPlotPointDialog } from './AddPlotPointDialog';
import { EditPlotPointDialog } from './EditPlotPointDialog';
import {
  Bar,
  BarChart,
  CartesianGrid,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from './ui/chart';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

interface VariantViewProps {
  variant: MythVariant;
  mythemes: Mytheme[];
  categories: string[];
  canonicalCategories?: MythCategory[];
  collaboratorCategories?: CollaboratorCategory[];
  collaborators: MythCollaborator[];
  onUpdateVariant: (variant: MythVariant) => Promise<void>;
  onCreateCollaboratorCategory?: (name: string) => Promise<CollaboratorCategory>;
  canEdit?: boolean;
  viewerEmail: string;
}

const UNCATEGORIZED_LABEL = 'Uncategorized';

const createLocalId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `plot-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function VariantView({
  variant,
  mythemes,
  categories,
  canonicalCategories = [],
  collaboratorCategories = [],
  collaborators,
  onUpdateVariant,
  onCreateCollaboratorCategory,
  canEdit = true,
  viewerEmail,
}: VariantViewProps) {
  const [activeTab, setActiveTab] = useState('timeline');
  const [showAddPlotPoint, setShowAddPlotPoint] = useState(false);
  const [showEditPlotPoint, setShowEditPlotPoint] = useState(false);
  const [plotPointBeingEdited, setPlotPointBeingEdited] = useState<PlotPointType | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestVariantRef = useRef(variant);

  const canonicalById = useMemo(() => {
    const map = new Map<string, MythCategory>();
    canonicalCategories.forEach((category) => {
      map.set(category.id, category);
    });
    return map;
  }, [canonicalCategories]);

  const canonicalByName = useMemo(() => {
    const map = new Map<string, MythCategory>();
    canonicalCategories.forEach((category) => {
      map.set(category.name.toLowerCase(), category);
    });
    return map;
  }, [canonicalCategories]);

  const normalizedViewerEmail = viewerEmail.toLowerCase();

  const viewerRole = useMemo(() => {
    if (!normalizedViewerEmail) {
      return null;
    }
    const matchingCollaborator = collaborators.find(
      (collaborator) => collaborator.email?.toLowerCase() === normalizedViewerEmail,
    );
    return matchingCollaborator?.role ?? null;
  }, [collaborators, normalizedViewerEmail]);

  useEffect(() => {
    if (viewerRole !== 'owner' && activeTab === 'insights') {
      setActiveTab('timeline');
    }
  }, [activeTab, viewerRole]);

  const tabListClassName =
    viewerRole === 'owner'
      ? 'grid h-auto w-full gap-2 grid-cols-2 sm:grid-cols-4'
      : 'grid h-auto w-full gap-2 grid-cols-3';

  useEffect(() => {
    latestVariantRef.current = variant;
  }, [variant]);

  useEffect(() => {
    if (!canEdit) {
      setShowAddPlotPoint(false);
      setShowEditPlotPoint(false);
      setPlotPointBeingEdited(null);
    }
  }, [canEdit]);

  const persistVariant = async (nextVariant: MythVariant) => {
    const previousVariant = latestVariantRef.current;
    latestVariantRef.current = nextVariant;
    setSaving(true);
    setError(null);
    try {
      await onUpdateVariant(nextVariant);
    } catch (err) {
      latestVariantRef.current = previousVariant;
      setError(err instanceof Error ? err.message : 'Unable to update the variant.');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleUpdatePlotPoint = async (id: string, updates: Partial<PlotPointType>) => {
    if (!canEdit) return;
    const baseVariant = latestVariantRef.current;
    const updatedPlotPoints = baseVariant.plotPoints.map((point) =>
      point.id === id ? { ...point, ...updates } : point,
    );
    await persistVariant({ ...baseVariant, plotPoints: updatedPlotPoints });
  };

  const handleAddPlotPoint = async (text: string, mythemeRefs: string[]) => {
    if (!canEdit) return;
    const baseVariant = latestVariantRef.current;
    const newPlotPoint: PlotPointType = {
      id: createLocalId(),
      text,
      category: UNCATEGORIZED_LABEL,
      order: baseVariant.plotPoints.length + 1,
      mythemeRefs,
      canonicalCategoryId: null,
      collaboratorCategories: [],
    };
    await persistVariant({ ...baseVariant, plotPoints: [...baseVariant.plotPoints, newPlotPoint] });
  };

  const handleRequestEditPlotPoint = (plotPoint: PlotPointType) => {
    if (!canEdit) return;
    setPlotPointBeingEdited(plotPoint);
    setShowEditPlotPoint(true);
  };

  const handleSavePlotPoint = async (updates: {
    text: string;
    category: string;
    mythemeRefs: string[];
  }) => {
    if (!canEdit || !plotPointBeingEdited) {
      return;
    }

    if (!plotPointBeingEdited) {
      return;
    }

    const canonicalCategory = canonicalByName.get(updates.category.toLowerCase()) ?? null;
    const baseVariant = latestVariantRef.current;
    const updatedPlotPoints = baseVariant.plotPoints.map((point) =>
      point.id === plotPointBeingEdited.id ? { ...point, ...updates } : point,
    );

    const normalizedPlotPoints = updatedPlotPoints.map((point) =>
      point.id === plotPointBeingEdited.id
        ? {
            ...point,
            canonicalCategoryId: canonicalCategory
              ? canonicalCategory.id
              : (point.canonicalCategoryId ?? null),
            category: canonicalCategory ? canonicalCategory.name : updates.category,
          }
        : point,
    );

    await persistVariant({ ...baseVariant, plotPoints: normalizedPlotPoints });
    setShowEditPlotPoint(false);
    setPlotPointBeingEdited(null);
  };

  const handleAssignCollaboratorCategory = async (
    plotPointId: string,
    collaboratorCategoryId: string | null,
    categoryName?: string,
  ) => {
    if (!canEdit) {
      return;
    }

    let resolvedCategoryId = collaboratorCategoryId;
    let resolvedName = categoryName?.trim() ?? '';

    if (!resolvedCategoryId && resolvedName) {
      if (onCreateCollaboratorCategory) {
        try {
          const createdCategory = await onCreateCollaboratorCategory(resolvedName);
          resolvedCategoryId = createdCategory.id;
          resolvedName = createdCategory.name;
        } catch (err) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to create the category for this plot point.',
          );
          return;
        }
      }
    }

    if (resolvedCategoryId) {
      const nameFromId = collaboratorCategories.find(
        (category) => category.id === resolvedCategoryId,
      )?.name;
      if (nameFromId) {
        resolvedName = nameFromId;
      }
    }

    const baseVariant = latestVariantRef.current;
    const updatedPlotPoints = baseVariant.plotPoints.map((point) => {
      if (point.id !== plotPointId) {
        return point;
      }

      const otherAssignments = (point.collaboratorCategories ?? []).filter(
        (assignment) => assignment.collaboratorEmail !== normalizedViewerEmail,
      );

      if (resolvedName) {
        otherAssignments.push({
          plotPointId,
          collaboratorCategoryId: resolvedCategoryId ?? '',
          collaboratorEmail: normalizedViewerEmail,
          categoryName: resolvedName,
        });
      }

      return {
        ...point,
        collaboratorCategories: otherAssignments,
      };
    });

    await persistVariant({ ...baseVariant, plotPoints: updatedPlotPoints });
  };

  const handleCloseEditDialog = (open: boolean) => {
    setShowEditPlotPoint(open);
    if (!open) {
      setPlotPointBeingEdited(null);
    }
  };

  const handleDeletePlotPoint = async (id: string) => {
    if (!canEdit) return;
    const baseVariant = latestVariantRef.current;
    const remaining = baseVariant.plotPoints.filter((point) => point.id !== id);
    const reindexed = remaining.map((point, index) => ({
      ...point,
      order: index + 1,
    }));
    await persistVariant({ ...baseVariant, plotPoints: reindexed });
  };

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <h2>{variant.name}</h2>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Source: {variant.source}</p>
          </div>
          <div className="flex items-center gap-3">
            {saving && (
              <span className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </span>
            )}
            <Badge variant="outline">{variant.plotPoints.length} plot points</Badge>
            {canEdit && (
              <Button onClick={() => setShowAddPlotPoint(true)} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Plot Point
              </Button>
            )}
          </div>
        </div>
      </Card>

      {canEdit && (
        <>
          <AddPlotPointDialog
            open={showAddPlotPoint}
            onOpenChange={setShowAddPlotPoint}
            onAdd={handleAddPlotPoint}
            mythemes={mythemes}
            nextOrder={latestVariantRef.current.plotPoints.length + 1}
          />
          <EditPlotPointDialog
            open={showEditPlotPoint && Boolean(plotPointBeingEdited)}
            onOpenChange={handleCloseEditDialog}
            plotPoint={plotPointBeingEdited}
            categories={categories}
            mythemes={mythemes}
            onSave={handleSavePlotPoint}
          />
        </>
      )}

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={tabListClassName}>
          <TabsTrigger value="timeline" className="flex items-center gap-2">
            <LayoutList className="w-4 h-4" />
            Timeline
          </TabsTrigger>
          <TabsTrigger value="grouped" className="flex items-center gap-2">
            <FolderTree className="w-4 h-4" />
            Grouped
          </TabsTrigger>
          <TabsTrigger value="grid" className="flex items-center gap-2">
            <Grid3x3 className="w-4 h-4" />
            Grid
          </TabsTrigger>
          {viewerRole === 'owner' && (
            <TabsTrigger value="insights" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Insights
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="timeline" className="mt-4">
          <TimelineView
            plotPoints={variant.plotPoints}
            mythemes={mythemes}
            onDeletePlotPoint={canEdit ? handleDeletePlotPoint : undefined}
            onEditPlotPoint={canEdit ? handleRequestEditPlotPoint : undefined}
            viewerEmail={viewerEmail}
          />
        </TabsContent>

        <TabsContent value="grouped" className="mt-4">
          <GroupedView
            plotPoints={variant.plotPoints}
            mythemes={mythemes}
            categories={categories}
            onUpdatePlotPoint={canEdit ? handleUpdatePlotPoint : undefined}
            onDeletePlotPoint={canEdit ? handleDeletePlotPoint : undefined}
            onEditPlotPoint={canEdit ? handleRequestEditPlotPoint : undefined}
            canEdit={canEdit}
            collaboratorCategories={collaboratorCategories}
            onAssignCategory={canEdit ? handleAssignCollaboratorCategory : undefined}
            viewerEmail={viewerEmail}
          />
        </TabsContent>

        <TabsContent value="grid" className="mt-4">
          <GridView
            plotPoints={variant.plotPoints}
            mythemes={mythemes}
            categories={categories}
            onDeletePlotPoint={canEdit ? handleDeletePlotPoint : undefined}
            onEditPlotPoint={canEdit ? handleRequestEditPlotPoint : undefined}
            canEdit={canEdit}
            viewerEmail={viewerEmail}
          />
        </TabsContent>

        {viewerRole === 'owner' && (
          <TabsContent value="insights" className="mt-4">
            <VariantInsights
              plotPoints={variant.plotPoints}
              collaborators={collaborators}
              viewerEmail={viewerEmail}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

type VariantInsightsProps = {
  plotPoints: PlotPointType[];
  collaborators: MythCollaborator[];
  viewerEmail: string;
};

function VariantInsights({ plotPoints, collaborators, viewerEmail }: VariantInsightsProps) {
  const totalPlotPoints = plotPoints.length;
  const collaboratorEmails = useMemo(() => {
    const set = new Set<string>();
    collaborators.forEach((collaborator) => {
      if (collaborator.email) {
        set.add(collaborator.email.toLowerCase());
      }
    });
    return Array.from(set).sort();
  }, [collaborators]);

  const collaboratorRoleLookup = useMemo(() => {
    const map = new Map<string, MythCollaborator['role']>();
    collaborators.forEach((collaborator) => {
      if (collaborator.email) {
        map.set(collaborator.email.toLowerCase(), collaborator.role);
      }
    });
    return map;
  }, [collaborators]);

  const getRoleLabel = useCallback(
    (email: string) => {
      const role = collaboratorRoleLookup.get(email);
      if (!role) {
        return 'Contributor';
      }
      return role === 'owner' ? 'Owner' : role.charAt(0).toUpperCase() + role.slice(1);
    },
    [collaboratorRoleLookup],
  );

  const assignmentsByPlotPoint = useMemo(() => {
    return plotPoints.map((plotPoint) => {
      const set = new Set<string>();
      (plotPoint.collaboratorCategories ?? []).forEach((assignment) => {
        if (assignment.collaboratorEmail) {
          set.add(assignment.collaboratorEmail.toLowerCase());
        }
      });
      return set;
    });
  }, [plotPoints]);

  const totalAssignments = assignmentsByPlotPoint.reduce(
    (sum, assignmentSet) => sum + assignmentSet.size,
    0,
  );

  const totalContributors = collaboratorEmails.length;
  const totalCapacity = totalPlotPoints * totalContributors;
  const completionPercentage = totalCapacity
    ? Math.round((totalAssignments / totalCapacity) * 1000) / 10
    : 0;

  const contributorCoverage = useMemo(() => {
    return collaboratorEmails.map((email) => {
      const completed = assignmentsByPlotPoint.filter((set) => set.has(email)).length;
      const percentage = totalPlotPoints ? (completed / totalPlotPoints) * 100 : 0;
      const roleLabel = getRoleLabel(email);
      return {
        email,
        completed,
        percentage: Math.round(percentage * 10) / 10,
        roleLabel,
      };
    });
  }, [assignmentsByPlotPoint, collaboratorEmails, totalPlotPoints, getRoleLabel]);

  const coverageChartData = contributorCoverage.map((item) => ({
    email: item.email,
    label: item.email,
    role: item.roleLabel,
    completed: Math.round(item.percentage * 10) / 10,
  }));

  const assignmentsPerPlotPoint = assignmentsByPlotPoint.map((set) => set.size);
  const averageAssignmentsPerPlotPoint = totalPlotPoints
    ? Math.round((assignmentsPerPlotPoint.reduce((a, b) => a + b, 0) / totalPlotPoints) * 10) / 10
    : 0;

  const coverageForViewer = useMemo(() => {
    const normalized = viewerEmail?.toLowerCase();
    if (!normalized) return null;
    return contributorCoverage.find((item) => item.email === normalized) ?? null;
  }, [contributorCoverage, viewerEmail]);

  const pairwiseAgreements = useMemo(() => {
    const plotPointAssignmentsByEmail = collaboratorEmails.map((email) => {
      const set = new Set<string>();
      plotPoints.forEach((plotPoint) => {
        const assignments = plotPoint.collaboratorCategories ?? [];
        const hasAssignment = assignments.some(
          (assignment) => assignment.collaboratorEmail?.toLowerCase() === email,
        );
        if (hasAssignment) {
          set.add(plotPoint.id);
        }
      });
      return set;
    });

    return collaboratorEmails.map((emailA, indexA) =>
      collaboratorEmails.map((emailB, indexB) => {
        const assignmentsA = plotPointAssignmentsByEmail[indexA];
        const assignmentsB = plotPointAssignmentsByEmail[indexB];
        if (indexA === indexB) {
          return 1;
        }
        const intersection = new Set<string>();
        assignmentsA.forEach((plotPointId) => {
          if (assignmentsB.has(plotPointId)) {
            intersection.add(plotPointId);
          }
        });
        const union = new Set<string>([...assignmentsA, ...assignmentsB]);
        if (union.size === 0) {
          return 0;
        }
        return intersection.size / union.size;
      }),
    );
  }, [collaboratorEmails, plotPoints]);

  const agreementSummary = useMemo(() => {
    if (!pairwiseAgreements.length) {
      return {
        average: 0,
        highest: null as null | { pair: [string, string]; score: number },
      };
    }

    let total = 0;
    let comparisons = 0;
    let bestPair: null | { pair: [string, string]; score: number } = null;

    pairwiseAgreements.forEach((row, rowIndex) => {
      row.forEach((value, columnIndex) => {
        if (rowIndex >= columnIndex) {
          return;
        }
        total += value;
        comparisons += 1;
        if (!bestPair || value > bestPair.score) {
          bestPair = {
            pair: [collaboratorEmails[rowIndex], collaboratorEmails[columnIndex]],
            score: value,
          };
        }
      });
    });

    const averageScore = comparisons ? Math.round((total / comparisons) * 1000) / 10 : 0;

    return {
      average: averageScore,
      highest: bestPair,
    };
  }, [pairwiseAgreements, collaboratorEmails]);

  const completionChartData = [
    {
      name: 'Completion',
      value: completionPercentage,
      fill: 'var(--color-completion)',
    },
  ];

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
      <CardContent className="rounded-lg border border-dashed border-gray-300 bg-gray-50 py-10 text-center text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300">
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
          <ChartContainer config={chartConfig} className="w-full max-w-xs">
            <RadialBarChart
              data={completionChartData}
              startAngle={90}
              endAngle={-270}
              innerRadius="60%"
              outerRadius="100%"
            >
              <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
              <RadialBar
                dataKey="value"
                cornerRadius={16}
                fill="var(--color-completion)"
                background
              />
            </RadialBarChart>
          </ChartContainer>
          <div className="text-center">
            <p className="text-3xl font-semibold">{completionPercentage.toFixed(1)}%</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Avg. assignments per plot point: {averageAssignmentsPerPlotPoint}
            </p>
            {coverageForViewer && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Your coverage: {coverageForViewer.percentage.toFixed(1)}%
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
          <ChartContainer config={chartConfig} className="h-72">
            <BarChart data={coverageChartData}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="label"
                tick={{ fill: 'var(--muted-foreground)' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(value) => `${value}%`}
                tick={{ fill: 'var(--muted-foreground)' }}
              />
              <ChartTooltip
                cursor={{ fill: 'hsl(0 0% 95% / 0.6)' }}
                content={
                  <ChartTooltipContent
                    formatter={(value) => {
                      const numeric =
                        typeof value === 'number' ? value : Number.parseFloat(String(value ?? 0));
                      return <span>{numeric.toFixed(1)}% completion</span>;
                    }}
                    labelFormatter={(label) => {
                      const emailLabel = String(label);
                      const normalizedLabel = emailLabel.toLowerCase();
                      return `${getRoleLabel(normalizedLabel)} · ${emailLabel}`;
                    }}
                  />
                }
              />
              <Bar dataKey="completed" fill="var(--color-coverage)" radius={[8, 8, 0, 0]} />
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
                  {collaboratorEmails.map((email) => (
                    <TableHead key={`head-${email}`} className="text-center">
                      {email}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pairwiseAgreements.map((row, rowIndex) => {
                  const email = collaboratorEmails[rowIndex];
                  return (
                    <TableRow key={`row-${email}`}>
                      <TableCell className="sticky left-0 z-10 bg-background font-medium">
                        <div className="flex flex-col">
                          <span>{email}</span>
                          <span className="text-xs font-normal text-muted-foreground">
                            {getRoleLabel(email)}
                          </span>
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
              <p>{agreementSummary.average.toFixed(1)}%</p>
            </div>
            {agreementSummary.highest && (
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">
                  Most overlapping pair
                </p>
                <p>
                  {agreementSummary.highest.pair[0]} &amp; {agreementSummary.highest.pair[1]} ·
                  {(agreementSummary.highest.score * 100).toFixed(1)}%
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
