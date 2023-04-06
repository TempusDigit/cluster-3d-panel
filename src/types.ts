import { DataFrame } from '@grafana/data';

interface ClusterData {
  clusterLabel: string;
  x: number[];
  y: number[];
  z: number[];
}

export interface ChartData {
  clusterData: ClusterData[];
  legendData: DataFrame[];
  fieldNames: string[];
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
