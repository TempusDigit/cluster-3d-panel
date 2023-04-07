import { DataFrame, Field, FieldType, ArrayVector, getFieldDisplayName, FALLBACK_COLOR, FieldConfigSource } from '@grafana/data';
import { Cluster3DSeriesConfig, SeriesMapping } from 'models.gen';
import { ChartData, Cluster3DTooltipData } from 'types';

const REQUIRED_FIELD_COUNT = 4;

// make code shorter, use switches, arrays etc. and make it simpler
export function mapSeries(series: DataFrame[], explicitSeries: Cluster3DSeriesConfig, mappingType: SeriesMapping): DataFrame[] {
  // if (!series.length || (!mappedFieldNames.x && !mappedFieldNames.y && !mappedFieldNames.z && !mappedFieldNames.clusterLabel)) {
  //   return [];
  // }

  if (!series.length || series.some((serie) => serie.fields.length < REQUIRED_FIELD_COUNT)) {
    return [];
  }

  let copy: Field;

  let xField: Field | null = null;
  let yField: Field | null = null;
  let zField: Field | null = null;
  let clusterLabelField: Field | null = null;

  const seriesIndexUsed: boolean[] = new Array(series[0].fields.length).fill(false);

  for (const frame of series) {
    for (const field of frame.fields) {
      const name = getFieldDisplayName(field, series[0], series);

      let f: Field | null = null;

      switch (field.type) {
        case FieldType.string:
          f = field;
          break;

        case FieldType.number:
          copy = {
            ...field,
            values: new ArrayVector(
              field.values.toArray().map((v) => {
                if (!(Number.isFinite(v) || v == null)) {
                  return null;
                }

                return v;
              })
            ),
          };

          f = copy;
          break;
      }

      if (!f) {
        continue;
      }

      if (name === explicitSeries.x && f.type === FieldType.number) {
        xField = f;
        seriesIndexUsed[f.state?.seriesIndex!] = true;
      }

      if (name === explicitSeries.y && f.type === FieldType.number) {
        yField = f;
        seriesIndexUsed[f.state?.seriesIndex!] = true;
      }

      if (name === explicitSeries.z && f.type === FieldType.number) {
        zField = f;
        seriesIndexUsed[f.state?.seriesIndex!] = true;
      }

      if (name === explicitSeries.clusterLabel) {
        clusterLabelField = f;
        seriesIndexUsed[f.state?.seriesIndex!] = true;
      }
    }
  }

  const possiblyNullfields = [xField, yField, zField, clusterLabelField];
  const fields: Field[] = [];
  // if (fields.filter(field => field).length !== REQUIRED_FIELD_COUNT) {
  //   if (mappingType === SeriesMapping.Auto) {
  //     fields.forEach((field, index) => {
  //       if (!field) {
  //         const firstUnusedIndex = seriesIndexUsed.indexOf(false);
  //         fields[index] = series[0].fields[firstUnusedIndex];
  //         seriesIndexUsed[firstUnusedIndex] = true;
  //       }
  //     });
  //   } else {
  //     return [];
  //   }
  // }

  for (let i = 0; i < possiblyNullfields.length; i++) {
    if (possiblyNullfields[i]) {
      fields.push(possiblyNullfields[i]!);
    }
    else {
      if (mappingType === SeriesMapping.Auto) {
        const firstUnusedIndex = seriesIndexUsed.indexOf(false);
        fields.push(series[0].fields[firstUnusedIndex]);
        seriesIndexUsed[firstUnusedIndex] = true;
      } else {
        return [];
      }
    }
  }

  const frame: DataFrame = {
    ...series[0],
    fields: fields,
  };

  return [frame];
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

export function formatData(dataValid: boolean, series: DataFrame[], separateLegendBySeries: boolean, fieldConfig: FieldConfigSource<any>): ChartData {
  if (dataValid) {
    const localChartData = new Map<string, { x: number[], y: number[], z: number[] }>();
    series.forEach(serie => {
      serie.fields[3].values.toArray().forEach((clusterLabel, i) => {
        if (separateLegendBySeries) {
          clusterLabel = serie.refId + clusterLabel;
        }
        if (!localChartData.get(clusterLabel)) {
          localChartData.set(clusterLabel, { x: [], y: [], z: [] });
        }
        const xyz = localChartData.get(clusterLabel);
        xyz?.x.push(serie.fields[0].values.get(i));
        xyz?.y.push(serie.fields[1].values.get(i));
        xyz?.z.push(serie.fields[2].values.get(i));
      });
    });
    const clusterData = Array.from(localChartData, (entry) => {
      return { clusterLabel: entry[0], x: entry[1].x, y: entry[1].y, z: entry[1].z };
    }).sort((a, b) => a.clusterLabel > b.clusterLabel ? 1 : -1);
    const legendData: DataFrame[] = [{
      fields: clusterData.map((cluster, index) => {
        return {
          name: '' + cluster.clusterLabel, type: FieldType.number, config: { color: getFieldColor(cluster.clusterLabel, fieldConfig) }, values: new ArrayVector(), state: { seriesIndex: index }
        }
      }), length: 0
    }];
    return { clusterData, legendData, fieldNames: series[0].fields.map(field => field.name) };
  }
  return { clusterData: [], legendData: [], fieldNames: [] };
}

export function getTooltipData(eventPoint: any, legendColors: Map<string, string>, fieldNames: string[]): Cluster3DTooltipData {
  return {
    color: legendColors.get(eventPoint.data.name.toString()) ?? FALLBACK_COLOR,
    label: eventPoint.data.name,
    x: { fieldName: fieldNames[0], value: eventPoint.x },
    y: { fieldName: fieldNames[1], value: eventPoint.y },
    z: { fieldName: fieldNames[2], value: eventPoint.z },
  };
}
