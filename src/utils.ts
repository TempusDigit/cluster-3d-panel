import { DataFrame, Field, FieldType, ArrayVector, getFieldDisplayName, FALLBACK_COLOR, FieldConfigSource, FieldDisplay, fieldMatchers } from '@grafana/data';
import { SeriesVisibilityChangeMode } from '@grafana/ui';
import { Cluster3DSeriesConfig, SeriesMapping, defaultSeriesConfig } from 'models.gen';
import { Data } from 'plotly.js';
import tinycolor from 'tinycolor2';
import { Cluster3DTooltipData, ClusterData, VisibleClustersData } from 'types';

/**
 * Denotes how many fields are required for the visualization to work. The first three fields represent x, y and z values (in order) and the last field represents the cluster label.
*/
const REQUIRED_FIELD_COUNT = 4;

/**
 * Finds indexes of fields that should be used.
 * 
 * @remarks
 * If `mappingType` is `SeriesMapping.Auto`, searches for fields with names "x", "y", "z", "clusterLabel" (the seriesConfig object
 * is `{ x: "x", y: "y", z: "z", clusterLabel: "clusterLabel" }` by default) and stores the indexes of those fields in an array.
 * If some fields are missing, the first unused field is taken. This could lead to a problem if the chosen field type is not numeric or of string type.
 * 
 * If `mappingType` is `SeriesMapping.Manual`, searches for user specified field names. For example, the user has selected the x field to be the field "aaa" from the data
 * (the seriesConfig object should be `{ x: "aaa", .... }`), the method searches for this field name and stores the index. If the any of the user specified fields are not found,
 * an empty array is returned.
 * 
 * @returns Returns indexes of fields that should be used or an empty array.
 */
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
      }
      if (name === seriesConfig.y) {
        usedFieldIndexes[1] = i;
        fieldIndexUsed[i] = true;
      }
      if (name === seriesConfig.z) {
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
        // A check for field type might be required here.
        usedFieldIndexes[i] = firstUnusedIndex;
        fieldIndexUsed[firstUnusedIndex] = true;
      } else {
        return [];
      }
    }
  }
  return usedFieldIndexes;
}

/**
 * Gets fields based on mapping.
 * 
 * @remarks
 * Fields that should be used are found with `getMappedFieldIndexes(...)`, which returns the indexes of the fields. Then the `series` object is filtered to only select elements with 
 * those indexes. Fields that are numeric are also formatted.
 * 
 * @returns Returns a `DataFrame` containing fields that match the `SeriesConfig`.
 */
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
        // Maybe return only some properties as not all data is required?
        fields.push(formattedField);
      }
    }
    mappedSeries.push({
      // Maybe return only some properties as not all data is required?
      ...frame,
      fields: fields,
    });
  }
  return mappedSeries;
}

/**
 * Reformats multiple series with `clusterLabel` fields into array of data separated by cluster labels.
 * 
 * @remarks
 * The field that has been mapped (designated) as the `clusterLabel` field of a serie is iterated over and each unique `clusterLabel` value is put into a hashmap with the
 * `cluster label` as the key. The mapped x, y and z values are appened as values to that key. This is done for each serie as there can be multiple data sources.
 */
export function getClusterData(dataValid: boolean, series: DataFrame[], separateClustersBySeries: boolean): ClusterData[] {
  if (dataValid) {
    const localChartData = new Map<string, { x: number[], y: number[], z: number[] }>();
    series.forEach(serie => {
      // serie.fields[3] because the series has been mapped to only have 4 fields and so the last one (index 3 counting from 0) is the cluster labal field.
      serie.fields[3].values.toArray().forEach((clusterLabel: string | number, i) => {
        clusterLabel = clusterLabel.toString();
        if (separateClustersBySeries) {
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
    return Array.from(localChartData, (entry) => {
      return { clusterLabel: entry[0], x: entry[1].x, y: entry[1].y, z: entry[1].z };
    }).sort((a, b) => a.clusterLabel > b.clusterLabel ? 1 : -1);
  }
  return [];
}

/**
 * Gets the color of a field from the panel options object.
 * 
 * @remarks
 * There is a standard Grafana method for this. However, the standard method matches overrides assigned to field values straight from the data source. The cluster 3d panel transforms 
 * the data and stores it inside the panel. This means you have to extract the overrides manually.
 * 
 * @returns
 * The field color from the panel overrides or a default value that informs grafana to assign a color from the default color palette.
 */
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

/**
 * Creates a `DataFrame[]` where each field name corresponds to a cluster label.
 * 
 * @remarks
 * The values are left empty as the returned DataFrame[] is only used to generate the Grafana legend which only uses the field names. 
 */
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

/**
 * @remarks
 * This method is used to get field labels of the mapped series for the 3D plot axis labels. The returned field names are also used to display field names in the point hover tooltip.
 * 
 * @returns
 * Returns field names of the first series.
 */
export function getFieldNames(dataValid: boolean, firstSeries: DataFrame): string[] {
  if (dataValid) {
    return firstSeries.fields.map(field => field.name);
  }
  return [];
}

/**
 * Finds which fields are visible and the `hideConfig` object which determines if the field should be displayed in the plot and/or legend.
 * 
 * @remarks
 * The hide series overrides are not matched to the transformed data that the panel uses so the visibility data needs to be extraced manually.
 * 
 * @returns
 * Returns a hashmap of visible field names as keys and the `hideConfig` object.
 */
export function getVisibleClusterData(fieldConfig: FieldConfigSource<any>, clusterData: ClusterData[]): VisibleClustersData {
  for (const override of fieldConfig.overrides) {
    const info = fieldMatchers.get(override.matcher.id);
    if (info) {
      for (const prop of override.properties) {
        if (prop.id === "custom.hideFrom") {
          return { clusterLabels: new Map(override.matcher.options.names.map((name: string) => [name, null])), hideConfig: prop.value };
        }
      }
    }
  }
  return { clusterLabels: new Map(clusterData.map(cluster => [cluster.clusterLabel, null])), hideConfig: fieldConfig.defaults.custom.hideFrom };
}

/**
 * Unrolls `clusterData` and other values into a plotly `Data` array.
 */
export function getPlotlyData(
  dataValid: boolean,
  clusterData: ClusterData[],
  fieldDisplayValues: FieldDisplay[],
  visibleClustersData: VisibleClustersData,
  fillOpacity: number,
  pointSize: number
): Data[] {
  if (dataValid) {
    return clusterData.map((cluster, index) => {
      const color = fieldDisplayValues[index].display.color;
      return {
        type: "scatter3d",
        name: cluster.clusterLabel,
        x: cluster.x,
        y: cluster.y,
        z: cluster.z,
        visible: visibleClustersData.clusterLabels.has(cluster.clusterLabel),
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

/**
 * Constructs tooltip data from Plotly hover event data and manually matched legend colors.
 */
export function getTooltipData(eventPoint: any, legendColors: Map<string, string>, fieldNames: string[]): Cluster3DTooltipData {
  return {
    color: legendColors.get(eventPoint.data.name.toString()) ?? FALLBACK_COLOR,
    label: eventPoint.data.name,
    x: { fieldName: fieldNames[0], value: eventPoint.x },
    y: { fieldName: fieldNames[1], value: eventPoint.y },
    z: { fieldName: fieldNames[2], value: eventPoint.z },
  };
};

/**
 * Method copied straight from Grafana source code which is required by the `VizLegend` component.
 */
export function mapMouseEventToMode(event: React.MouseEvent): SeriesVisibilityChangeMode {
  if (event.ctrlKey || event.metaKey || event.shiftKey) {
    return SeriesVisibilityChangeMode.AppendToSelection;
  }
  return SeriesVisibilityChangeMode.ToggleSelection;
};
