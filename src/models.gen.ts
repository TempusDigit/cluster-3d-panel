import { LegendDisplayMode, OptionsWithLegend, OptionsWithTooltip, VizLegendOptions } from '@grafana/ui';

export enum SeriesMapping {
  Auto = 'auto',
  Manual = 'manual',
}

export interface Cluster3DSeriesConfig {
  x?: string;
  y?: string;
  z?: string;
  clusterLabel?: string;
}

export interface RequiredCluster3DOptions extends OptionsWithLegend {
  separateClustersBySeries: boolean;
  seriesMapping: SeriesMapping;
  series?: Cluster3DSeriesConfig;
  pointSize: number;
  // Line width broken: https://github.com/plotly/plotly.js/issues/3796
  // lineWidth: number;
  fillOpacity: number;
}

export interface Cluster3DOptions extends RequiredCluster3DOptions, OptionsWithTooltip {}

export const defaultLegendConfig: VizLegendOptions = {
  displayMode: LegendDisplayMode.List,
  showLegend: true,
  placement: 'right',
  calcs: [],
};

export const defaultSeriesConfig: Cluster3DSeriesConfig = {
  x: 'x',
  y: 'y',
  z: 'z',
  clusterLabel: 'clusterLabel'
}

export const defaultCluster3DConfig: RequiredCluster3DOptions = {
  legend: defaultLegendConfig,
  separateClustersBySeries: false,
  seriesMapping: SeriesMapping.Auto,
  series: defaultSeriesConfig,
  pointSize: 2,
  fillOpacity: 90,
};
