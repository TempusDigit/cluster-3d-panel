import {
  VizLegendOptions,
  SingleStatBaseOptions
} from '@grafana/schema';
import { OptionsWithTooltip } from '@grafana/ui';

export interface Cluster3DLegendOptions extends VizLegendOptions {
  separateLegendBySeries: boolean;
}

export interface Cluster3DOptions extends OptionsWithTooltip, SingleStatBaseOptions {
  legend: Cluster3DLegendOptions;
  pointSize: number;
  // Line width broken: https://github.com/plotly/plotly.js/issues/3796
  // lineWidth: number;
  fillOpacity: number;
}

export interface Cluster3DTooltipDisplayField {
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
