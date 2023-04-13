import { DataFrame, Field, FieldType, ArrayVector, getFieldDisplayName, FALLBACK_COLOR, FieldConfigSource, FieldDisplay, fieldMatchers } from '@grafana/data';
import { Cluster3DSeriesConfig, SeriesMapping, defaultSeriesConfig } from 'models.gen';
import { Data } from 'plotly.js';
import tinycolor from 'tinycolor2';
import { Cluster3DTooltipData, ClusterData, HiddenClustersData } from 'types';

const REQUIRED_FIELD_COUNT = 4;

function getMappedFieldIndexes(series: DataFrame[], seriesConfig: Cluster3DSeriesConfig, mappingType: SeriesMapping): number[] {
  const usedFieldIndexes: number[] = new Array(REQUIRED_FIELD_COUNT).fill(null);
  const fieldIndexUsed: boolean[] = new Array(series[0].fields.length).fill(false);
  for (let i = 0; i < series[0].fields.length; i++) {
    const field = series[0].fields[i];
    const name = getFieldDisplayName(field, series[0], series);
    if (field.type === FieldType.number) {
      if (name === seriesConfig.x) {
        usedFieldIndexes[0] = i;
        fieldIndexUsed[i] = true;
      } else if (name === seriesConfig.y) {
        usedFieldIndexes[1] = i;
        fieldIndexUsed[i] = true;
      } else if (name === seriesConfig.z) {
        usedFieldIndexes[2] = i;
        fieldIndexUsed[i] = true;
      }
    }
    if (name === seriesConfig.clusterLabel && (field.type === FieldType.number || field.type === FieldType.string)) {
      usedFieldIndexes[3] = i;
      fieldIndexUsed[i] = true;
    }
  }
  for (let i = 0; i < usedFieldIndexes.length; i++) {
    if (usedFieldIndexes[i] == null) {
      if (mappingType === SeriesMapping.Auto) {
        const firstUnusedIndex = fieldIndexUsed.indexOf(false);
        usedFieldIndexes[i] = firstUnusedIndex;
        fieldIndexUsed[firstUnusedIndex] = true;
      } else {
        return [];
      }
    }
  }
  return usedFieldIndexes;
}

export function mapSeries(series: DataFrame[], seriesConfig: Cluster3DSeriesConfig, mappingType: SeriesMapping): DataFrame[] {
  if (!series.length || series.some((serie) => serie.fields.length < REQUIRED_FIELD_COUNT)) {
    return [];
  }

  let localSeriesConfig = seriesConfig;
  if (mappingType === SeriesMapping.Auto) {
    localSeriesConfig = defaultSeriesConfig;
  } else if (!(localSeriesConfig.x && localSeriesConfig.y && localSeriesConfig.z && localSeriesConfig.clusterLabel)) {
    return [];
  }

  const mappedFieldIndexes = getMappedFieldIndexes(series, localSeriesConfig, mappingType);
  if (!mappedFieldIndexes.length) {
    return [];
  }

  let mappedSeries: DataFrame[] = [];
  let fields: Field[];

  for (const frame of series) {
    fields = [];
    for (const fieldIndex of mappedFieldIndexes) {
      const field = frame.fields[fieldIndex];
      let formattedField: Field | null = null;
      switch (field.type) {
        case FieldType.number:
          formattedField = {
            ...field,
            values: new ArrayVector(
              field.values.toArray().map((value) => {
                if (!(Number.isFinite(value) || value == null)) {
                  return null;
                }
                return value;
              })
            ),
          };
          break;
        case FieldType.string:
          formattedField = field;
          break;
      }
      if (formattedField) {
        // Čia gal galima atiduoti tik dalį duomenų, kiti duomenys gal nereikalingi
        fields.push(formattedField);
      }
    }
    mappedSeries.push({
      // Čia gal galima atiduoti tik dalį duomenų, kiti duomenys gal nereikalingi
      ...frame,
      fields: fields,
    });
  }
  return mappedSeries;
}

export function getHiddenClusterData(fieldConfig: FieldConfigSource<any>): HiddenClustersData {
  for (const override of fieldConfig.overrides) {
    const info = fieldMatchers.get(override.matcher.id);
    if (info) {
      for (const prop of override.properties) {
        if (prop.id === "custom.hideFrom") {
          return { clusterLabels: new Map(override.matcher.options.names.map((name: string) => [name, null])), hideConfig: prop.value};
        }
      }
    }
  }
  return { clusterLabels: new Map(), hideConfig: fieldConfig.defaults.custom.hideFrom };
}

export function getClusterData(dataValid: boolean, series: DataFrame[], hiddenClustersData: HiddenClustersData, separateClustersBySeries: boolean): ClusterData[] {
  if (dataValid) {
    const localChartData = new Map<string, { x: number[], y: number[], z: number[], visible: boolean }>();
    series.forEach(serie => {
      serie.fields[3].values.toArray().forEach((clusterLabel, i) => {
        if (separateClustersBySeries) {
          clusterLabel = serie.refId + clusterLabel;
        }
        if (!localChartData.get(clusterLabel)) {
          localChartData.set(clusterLabel, { x: [], y: [], z: [], visible: !hiddenClustersData.clusterLabels.has(clusterLabel) });
        }
        const xyz = localChartData.get(clusterLabel);
        xyz?.x.push(serie.fields[0].values.get(i));
        xyz?.y.push(serie.fields[1].values.get(i));
        xyz?.z.push(serie.fields[2].values.get(i));
      });
    });
    return Array.from(localChartData, (entry) => {
      return { clusterLabel: entry[0], x: entry[1].x, y: entry[1].y, z: entry[1].z, visible: entry[1].visible };
    }).sort((a, b) => a.clusterLabel > b.clusterLabel ? 1 : -1);
  }
  return [];
}

function getFieldColor(displayName: string, fieldConfig: FieldConfigSource) {
  for (const override of fieldConfig.overrides) {
    if (override.matcher.id === "byName" && override.matcher.options === displayName.toString()) {
      for (const prop of override.properties) {
        if (prop.id === "color" && prop.value) {
          return prop.value;
        }
      }
    }
  }
  return fieldConfig.defaults.color;
}

export function getLegendData(dataValid: boolean, clusterData: ClusterData[], fieldConfig: FieldConfigSource<any>): DataFrame[] {
  if (dataValid) {
    return [{
      fields: clusterData.map((cluster, index) => {
        return {
          name: '' + cluster.clusterLabel, type: FieldType.number, config: { color: getFieldColor(cluster.clusterLabel, fieldConfig) }, values: new ArrayVector(), state: { seriesIndex: index }
        }
      }), length: 0
    }];
  }
  return [];
}

export function getFieldNames(dataValid: boolean, firstSeries: DataFrame): string[] {
  if (dataValid) {
    return firstSeries.fields.map(field => field.name);
  }
  return [];
}

export function getPlotlyData(dataValid: boolean, clusterData: ClusterData[], fieldDisplayValues: FieldDisplay[], fillOpacity: number, pointSize: number): Data[] {
  if (dataValid) {
    return clusterData.map((cluster, index) => {
      const color = fieldDisplayValues[index].display.color;
      return {
        type: "scatter3d",
        name: cluster.clusterLabel,
        x: cluster.x,
        y: cluster.y,
        z: cluster.z,
        visible: cluster.visible,
        mode: "markers",
        marker: {
          line: {
            color: color,
            // Line width broken: https://github.com/plotly/plotly.js/issues/3796
            width: 1,
            // width: options.lineWidth,
          },
          color: tinycolor(color).setAlpha(fillOpacity / 100).toRgbString(),
          size: pointSize,
        },
        hoverinfo: 'none',
      };
    });
  }
  return [];
};

export function getTooltipData(eventPoint: any, legendColors: Map<string, string>, fieldNames: string[]): Cluster3DTooltipData {
  return {
    color: legendColors.get(eventPoint.data.name.toString()) ?? FALLBACK_COLOR,
    label: eventPoint.data.name,
    x: { fieldName: fieldNames[0], value: eventPoint.x },
    y: { fieldName: fieldNames[1], value: eventPoint.y },
    z: { fieldName: fieldNames[2], value: eventPoint.z },
  };
}
