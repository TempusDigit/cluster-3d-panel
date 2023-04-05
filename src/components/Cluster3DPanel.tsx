import React, {
  useCallback,
  useMemo,
  useRef
} from 'react';
import {
  ArrayVector,
  DataFrame,
  FALLBACK_COLOR,
  FieldConfigSource,
  FieldDisplay,
  FieldType,
  getFieldDisplayValues,
  GrafanaTheme2,
  PanelProps
} from '@grafana/data';
import {
  Cluster3DLegendOptions,
  Cluster3DOptions,
  Cluster3DTooltipData
} from 'types';
import {
  TooltipDisplayMode,
  useStyles2,
  useTheme2,
  VizLayout,
  VizLegend,
  VizLegendItem
} from '@grafana/ui';
import { LegendDisplayMode } from '@grafana/schema';
import Plot, { Figure } from 'react-plotly.js';
import { PanelDataErrorView } from '@grafana/runtime';
import { css } from '@emotion/css';
import {
  useTooltip,
  useTooltipInPortal
} from '@visx/tooltip';
import {
  Camera,
  PlotHoverEvent
} from 'plotly.js';
import tinycolor from 'tinycolor2';
import Cluster3DTooltipTable from './Cluster3DTooltipTable';

interface Props extends PanelProps<Cluster3DOptions> { }

const getStyles = (theme: GrafanaTheme2) => {
  return {
    container: css`
      width: 100%;
      height: 100%;
      // display: flex;
      // align-items: center;
      // justify-content: center;
    `,
    tooltipPortal: css`
      overflow: hidden;
      background: ${theme.colors.background.secondary};
      box-shadow: ${theme.shadows.z2};
      max-width: 800px;
      padding: ${theme.spacing(1)};
      border-radius: ${theme.shape.borderRadius()};
      z-index: ${theme.zIndex.tooltip};
    `,
    resetCameraButton: css`
      position: absolute;
      right: 0;
      z-index: ${theme.zIndex.tooltip};
    `,
  };
};

const defaultLegendOptions: Cluster3DLegendOptions = {
  displayMode: LegendDisplayMode.List,
  showLegend: true,
  placement: 'right',
  calcs: [],
  separateLegendBySeries: false,
};

export const Cluster3DPanel: React.FC<Props> = (props: Props) => {
  const { data, id, fieldConfig, timeZone, replaceVariables, width, height, options } = props;

  const requiredFieldLength = 4;
  if (!data.series.length || data.series.some((serie) => serie.fields.length < requiredFieldLength)) {
    return <PanelDataErrorView panelId={id} fieldConfig={fieldConfig} data={data} />;
  }

  const chartData: { clusterData: Array<{ clusterLabel: string, x: number[], y: number[], z: number[] }>, legendData: DataFrame[], fieldNames: string[] } = useMemo(
    () => formatData(data.series, options.legend.separateLegendBySeries, fieldConfig), [data, options.legend.separateLegendBySeries]
  );
  const theme = useTheme2();
  const fieldDisplayValues = useMemo(() => getFieldDisplayValues({
    fieldConfig,
    reduceOptions: { calcs: options.legend.calcs },
    data: chartData.legendData,
    theme: theme,
    replaceVariables,
    timeZone,
  }), [fieldConfig, chartData.legendData, theme]);
  const legendColors = new Map(
    fieldDisplayValues.map(fieldDisplayValue => {
      return [fieldDisplayValue.display.title ?? '', fieldDisplayValue.display.color ?? FALLBACK_COLOR];
    }),
  );
  const styles = useStyles2(getStyles);
  const tickFont = {
    family: theme.typography.fontFamily,
    size: theme.typography.fontSize,
  };
  const axisSettings = {
    color: theme.colors.text.primary,
    tickfont: tickFont,
  };
  const tooltip = useTooltip<Cluster3DTooltipData>();
  const { containerRef, TooltipInPortal } = useTooltipInPortal({
    detectBounds: true,
    scroll: true,
  });
  const showTooltip = options.tooltip.mode !== TooltipDisplayMode.None && tooltip.tooltipOpen;
  const initialCamera = useRef<Partial<Camera>>();
  // let [camera, setCamera] = useState<Partial<Camera>>();
  const camera = useRef<Partial<Camera>>();
  const pointNumber = useRef<number>();

  const onPlotlyUpdate = (figure: Figure) => {
    if (figure.layout.scene?.camera !== undefined) {
      if (initialCamera.current === undefined) {
        initialCamera.current = { ...figure.layout.scene.camera };
      }
      camera.current = figure.layout.scene.camera;
    }
  }

  const onPlotlyPointHover = useCallback(
    (event: PlotHoverEvent) => {
      const eventPoint = event.points[0] as any;
      if (pointNumber.current !== eventPoint.pointNumber) {
        tooltip.showTooltip({
          tooltipLeft: eventPoint.bbox.x0,
          tooltipTop: eventPoint.bbox.y0,
          tooltipData: getTooltipData(eventPoint, legendColors, chartData.fieldNames),
        });
        pointNumber.current = eventPoint.pointNumber;
      }
    },
    [tooltip]
  );

  const onPlotlyPointUnhover = () => {
    tooltip.hideTooltip();
    pointNumber.current = undefined;
  };

  // const handleOnClickResetCamera = () => {
  //   setCamera({ ...initialCamera.current });
  // }

  return (
    <VizLayout width={width} height={height} legend={getLegend(props, fieldDisplayValues)}>
      {(vizWidth: number, vizHeight: number) => {
        return (
          <div className={styles.container} ref={containerRef}>
            {/* <div style={{ position: "relative" }}>
              <LinkButton
                // Legend could be to the right and there is no space between the button and the legend! Add spacing.
                // This is also breaks layout when you open F12 as it shrinks the view, but it doesn't grow back?
                className={styles.resetCameraButton}
                icon={"home"}
                tooltip={"Reset camera"}
                onClick={handleOnClickResetCamera}
              />
            </div> */}
            <Plot
              useResizeHandler
              layout={{
                width: vizWidth,
                height: vizHeight,
                autosize: true,
                paper_bgcolor: "transparent",
                // Plot resets on first color change. https://github.com/plotly/plotly.py/issues/3951.
                // Possible solution at the end here: https://github.com/plotly/plotly.js/issues/6359.
                // Explanation what this does: https://community.plotly.com/t/preserving-ui-state-like-zoom-in-dcc-graph-with-uirevision-with-dash/15793.
                uirevision: "true",
                showlegend: false,
                margin: {
                  t: 0,
                  r: 0,
                  b: 0,
                  l: 0,
                },
                scene: {
                  xaxis: {
                    title: chartData.fieldNames[0],
                    ...axisSettings,
                  },
                  yaxis: {
                    title: chartData.fieldNames[1],
                    ...axisSettings,
                  },
                  zaxis: {
                    title: chartData.fieldNames[2],
                    ...axisSettings,
                  },
                  // camera
                  ...(camera.current !== undefined && { ...camera.current }),
                },
              }}
              config={{
                displayModeBar: false,
              }}
              data={
                ...chartData.clusterData.map((data, index) => {
                  return {
                    type: "scatter3d",
                    name: data.clusterLabel,
                    x: data.x,
                    y: data.y,
                    z: data.z,
                    mode: "markers",
                    marker: {
                      line: {
                        color: fieldDisplayValues[index].display.color,
                        // Line width broken: https://github.com/plotly/plotly.js/issues/3796
                        width: 1,
                        // width: options.lineWidth,
                      },
                      color: tinycolor(fieldDisplayValues[index].display.color).setAlpha(options.fillOpacity / 100).toRgbString(),
                      size: options.pointSize,
                    },
                    hoverinfo: 'none',
                  }
                })
              }
              onUpdate={onPlotlyUpdate}
              onHover={onPlotlyPointHover}
              onUnhover={onPlotlyPointUnhover}
            />
            {showTooltip ? (
              <TooltipInPortal
                key={Math.random()}
                top={tooltip.tooltipTop}
                className={styles.tooltipPortal}
                left={tooltip.tooltipLeft}
                unstyled={true}
                applyPositionStyle={true}
              >
                <Cluster3DTooltipTable tooltipData={tooltip.tooltipData!} />
              </TooltipInPortal>
            ) : null}
          </div>
        );
      }}
    </VizLayout>
  );
};

function formatData(series: DataFrame[], separateLegendBySeries: boolean, fieldConfig: FieldConfigSource<any>) {
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
        // Čia values turėtų būti x y z masyvai, tačiau reducer taikoma ant vieno lauko. Ar padaryti, kad legendoje rodytų tris values prie kiekvieno label? Ar droppinti feature ir padaryti, kad nerodytų šito option?
        // name: '' + cluster.clusterLabel, type: FieldType.number, config: { color: getFieldColor(cluster.clusterLabel, fieldConfig) }, values: new ArrayVector([0, 1, 2, 3]), state: { seriesIndex: index }
        name: '' + cluster.clusterLabel, type: FieldType.number, config: { color: getFieldColor(cluster.clusterLabel, fieldConfig) }, values: new ArrayVector(), state: { seriesIndex: index }
      }
    }), length: 0
  }];
  return { clusterData, legendData, fieldNames: series[0].fields.map(field => field.name) };
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

function getLegend(props: Props, displayValues: FieldDisplay[]) {
  const legendOptions = props.options.legend ?? defaultLegendOptions;

  if (legendOptions.showLegend === false) {
    return undefined;
  }

  const legendItems: VizLegendItem[] = displayValues
    .map<VizLegendItem>((value: FieldDisplay) => {
      const display = value.display;
      return {
        color: display.color ?? FALLBACK_COLOR,
        label: display.title ?? '',
        yAxis: 1,
      };
    });

  return (
    <VizLegend
      items={legendItems}
      placement={legendOptions.placement}
      displayMode={legendOptions.displayMode}
    />
  );
}

function getTooltipData(eventPoint: any, legendColors: Map<string, string>, fieldNames: string[]) {
  return {
    color: legendColors.get(eventPoint.data.name.toString()) ?? FALLBACK_COLOR,
    label: eventPoint.data.name,
    x: { fieldName: fieldNames[0], value: eventPoint.x },
    y: { fieldName: fieldNames[1], value: eventPoint.y },
    z: { fieldName: fieldNames[2], value: eventPoint.z },
  };
}
