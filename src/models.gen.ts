import { LegendDisplayMode, OptionsWithTooltip, SingleStatBaseOptions, VizLegendOptions } from '@grafana/ui';

export enum SeriesMapping {
  Auto = 'auto',
  Manual = 'manual',
}

export interface Cluster3DLegendOptions extends VizLegendOptions {
  separateLegendBySeries: boolean;
}

export interface RequiredCluster3DOptions {
  seriesMapping: SeriesMapping;
  legend: Cluster3DLegendOptions;
  pointSize: number;
  // Line width broken: https://github.com/plotly/plotly.js/issues/3796
  // lineWidth: number;
  fillOpacity: number;
}

export interface Cluster3DOptions extends RequiredCluster3DOptions, OptionsWithTooltip, SingleStatBaseOptions {}

export const defaultLegendConfig: Cluster3DLegendOptions = {
  displayMode: LegendDisplayMode.List,
  showLegend: true,
  placement: 'right',
  calcs: [],
  separateLegendBySeries: false
};

export const defaultCluster3DConfig: RequiredCluster3DOptions = {
  seriesMapping: SeriesMapping.Auto,
  legend: defaultLegendConfig,
  pointSize: 2,
  fillOpacity: 90,
};

import { HideableFieldConfig, AxisConfig } from '@grafana/schema';

export interface XYZSeriesConfig extends HideableFieldConfig, AxisConfig {
  x?: string;
  y?: string;
  z?: string;
}

export interface XYZDimensionConfig {
  frame: number;
  x?: string; // name | first
}

export interface XYZChartOptions {
  pointColor: string;
  pointSize: number;
  themeColor?: string;
  hudBgColor?: string;

  seriesMapping: 'auto' | 'manual' | undefined;
  dims?: XYZDimensionConfig;
  series?: XYZSeriesConfig;
}

export const defualtXyzChartConfig: XYZChartOptions = {
  pointColor: 'red',
  pointSize: 5,
  seriesMapping: 'auto',
};
