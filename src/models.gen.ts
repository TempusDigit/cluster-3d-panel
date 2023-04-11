import { AxisConfig, HideableFieldConfig, LegendDisplayMode, OptionsWithTooltip, SingleStatBaseOptions, VizLegendOptions } from '@grafana/ui';

export interface Cluster3DLegendOptions extends VizLegendOptions {
  separateLegendBySeries: boolean;
}

export enum SeriesMapping {
  Auto = 'auto',
  Manual = 'manual',
}

export interface Cluster3DSeriesConfig extends HideableFieldConfig, AxisConfig {
  x?: string;
  y?: string;
  z?: string;
  clusterLabel?: string;
}

export interface RequiredCluster3DOptions {
  legend: Cluster3DLegendOptions;
  seriesMapping: SeriesMapping;
  series?: Cluster3DSeriesConfig;
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

export const defaultSeriesConfig: Cluster3DSeriesConfig = {
  x: 'x',
  y: 'y',
  z: 'z',
  clusterLabel: 'clusterLabel'
}

export const defaultCluster3DConfig: RequiredCluster3DOptions = {
  legend: defaultLegendConfig,
  seriesMapping: SeriesMapping.Auto,
  series: defaultSeriesConfig,
  pointSize: 2,
  fillOpacity: 90,
};
