import { HideSeriesConfig, LegendDisplayMode, LegendPlacement, SeriesVisibilityChangeBehavior, SeriesVisibilityChangeMode, VizLegendItem } from '@grafana/ui';

export interface ClusterData {
  clusterLabel: string;
  x: number[];
  y: number[];
  z: number[];
}

interface Cluster3DTooltipDisplayField {
  fieldName: string;
  value: number;
}

export interface Cluster3DTooltipData {
  color: string;
  label: string;
  x: Cluster3DTooltipDisplayField;
  y: Cluster3DTooltipDisplayField;
  z: Cluster3DTooltipDisplayField;
}

export interface Cluster3DTooltipTableProps {
  tooltipData: Cluster3DTooltipData;
}

export interface VisibleClustersData {
  clusterLabels: Map<string, null>;
  hideConfig: HideSeriesConfig;
}

export interface VizLegendBaseProps<T> {
  placement: LegendPlacement;
  className?: string;
  items: Array<VizLegendItem<T>>;
  seriesVisibilityChangeBehavior?: SeriesVisibilityChangeBehavior;
  onLabelClick?: (item: VizLegendItem<T>, event: React.MouseEvent<HTMLButtonElement>) => void;
  itemRenderer?: (item: VizLegendItem<T>, index: number) => JSX.Element;
  onLabelMouseOver?: (
    item: VizLegendItem,
    event: React.MouseEvent<HTMLButtonElement> | React.FocusEvent<HTMLButtonElement>
  ) => void;
  onLabelMouseOut?: (
    item: VizLegendItem,
    event: React.MouseEvent<HTMLButtonElement> | React.FocusEvent<HTMLButtonElement>
  ) => void;
  readonly?: boolean;
}

export interface VizLegendTableProps<T> extends VizLegendBaseProps<T> {
  sortBy?: string;
  sortDesc?: boolean;
  onToggleSort?: (sortBy: string) => void;
}

export interface LegendProps<T = any> extends VizLegendBaseProps<T>, VizLegendTableProps<T> {
  displayMode: LegendDisplayMode;
  onToggleSeriesVisibility: (label: string, mode: SeriesVisibilityChangeMode) => void;
}
