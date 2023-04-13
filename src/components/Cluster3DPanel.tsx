import React, { useMemo, useRef } from 'react';
import { DataFrame, FALLBACK_COLOR, FieldDisplay, getFieldDisplayValues, GrafanaTheme2, PanelProps } from '@grafana/data';
import { Cluster3DTooltipData, ClusterData, HiddenClustersData } from 'types';
import { HideSeriesConfig, SeriesVisibilityChangeBehavior, TooltipDisplayMode, useStyles2, useTheme2, VizLayout, VizLegend, VizLegendItem, VizLegendOptions } from '@grafana/ui';
import Plot, { Figure } from 'react-plotly.js';
import { PanelDataErrorView } from '@grafana/runtime';
import { css } from '@emotion/css';
import { useTooltip, useTooltipInPortal } from '@visx/tooltip';
import { Camera, Data, PlotHoverEvent } from 'plotly.js';
import Cluster3DTooltipTable from './Cluster3DTooltipTable';
import { Cluster3DOptions, defaultLegendConfig } from 'models.gen';
import { getClusterData, getFieldNames, getHiddenClusterData, getLegendData, getPlotlyData, getTooltipData, mapSeries } from 'utils';

interface Props extends PanelProps<Cluster3DOptions> { }

const getStyles = (theme: GrafanaTheme2) => {
  return {
    container: css`
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
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
    // resetCameraButton: css`
    //   position: absolute;
    //   right: 0;
    //   z-index: ${theme.zIndex.tooltip};
    // `,
  };
};

export const Cluster3DPanel: React.FC<Props> = (props: Props) => {
  const { data, id, fieldConfig, timeZone, replaceVariables, width, height, options } = props;
  const series = useMemo(() => mapSeries(data.series, options.series!, options.seriesMapping), [data.series, options.series, options.seriesMapping]);
  const dataValid = series.length > 0;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const hiddenClustersData = useMemo<HiddenClustersData>(() => getHiddenClusterData(fieldConfig), [fieldConfig]);
  const clusterData = useMemo<ClusterData[]>(() => getClusterData(dataValid, series, hiddenClustersData, options.separateClustersBySeries),
    [dataValid, series, hiddenClustersData, options.separateClustersBySeries]);
  const legendData = useMemo<DataFrame[]>(() => getLegendData(dataValid, clusterData, fieldConfig), [dataValid, clusterData, fieldConfig]);
  const fieldNames = useMemo<string[]>(() => getFieldNames(dataValid, series[0]), [dataValid, series]);
  const theme = useTheme2();
  const fieldDisplayValues = useMemo(() => getFieldDisplayValues({
    fieldConfig,
    reduceOptions: { calcs: defaultLegendConfig.calcs },
    data: legendData,
    // data: series,
    theme: theme,
    replaceVariables,
    timeZone,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [fieldConfig, legendData, theme]);
  const legend = useMemo(() => getLegend(options.legend, fieldDisplayValues, hiddenClustersData), [options.legend, fieldDisplayValues, hiddenClustersData]);
  const plotlyData = useMemo<Data[]>(() => getPlotlyData(dataValid, clusterData, fieldDisplayValues, options.fillOpacity, options.pointSize),
    [dataValid, clusterData, fieldDisplayValues, options.fillOpacity, options.pointSize]);
  const styles = useStyles2(getStyles);
  const tooltip = useTooltip<Cluster3DTooltipData>();
  const { containerRef, TooltipInPortal } = useTooltipInPortal({ detectBounds: true });
  const initialCamera = useRef<Partial<Camera>>();
  // let [camera, setCamera] = useState<Partial<Camera>>();
  const camera = useRef<Partial<Camera>>();
  const pointNumber = useRef<number>();

  const onPlotlyPointHover = (event: PlotHoverEvent) => {
    const eventPoint = event.points[0] as any;
    if (pointNumber.current !== eventPoint.pointNumber) {
      console.log(eventPoint.bbox.x0);
      console.log(eventPoint);
      tooltip.showTooltip({
        tooltipLeft: eventPoint.bbox.x0,
        tooltipTop: eventPoint.bbox.y0,
        tooltipData: getTooltipData(eventPoint, legendColors, fieldNames),
      });
      pointNumber.current = eventPoint.pointNumber;
    }
  };

  if (!dataValid) {
    return <PanelDataErrorView panelId={id} fieldConfig={fieldConfig} data={data} />;
  }

  const legendColors = new Map(
    fieldDisplayValues.map(fieldDisplayValue => {
      return [fieldDisplayValue.display.title ?? '', fieldDisplayValue.display.color ?? FALLBACK_COLOR];
    }),
  );
  const tickFont = {
    family: theme.typography.fontFamily,
    size: theme.typography.fontSize,
  };
  const axisSettings = {
    color: theme.colors.text.primary,
    tickfont: tickFont,
  };
  const showTooltip = options.tooltip.mode !== TooltipDisplayMode.None && tooltip.tooltipOpen;

  const onPlotlyUpdate = (figure: Figure) => {
    if (figure.layout.scene?.camera !== undefined) {
      if (initialCamera.current === undefined) {
        initialCamera.current = { ...figure.layout.scene.camera };
      }
      camera.current = figure.layout.scene.camera;
    }
  }

  const onPlotlyPointUnhover = () => {
    tooltip.hideTooltip();
    pointNumber.current = undefined;
  };

  // const handleOnClickResetCamera = () => {
  //   setCamera({ ...initialCamera.current });
  // }

  return (
    <>
      {/* {JSON.stringify(options)} */}
      <VizLayout width={width} height={height} legend={legend}>
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
                      title: fieldNames[0],
                      ...axisSettings,
                    },
                    yaxis: {
                      title: fieldNames[1],
                      ...axisSettings,
                    },
                    zaxis: {
                      title: fieldNames[2],
                      ...axisSettings,
                    },
                    // camera
                    ...(camera.current !== undefined && { ...camera.current }),
                  },
                }}
                config={{
                  displayModeBar: false,
                }}
                data={plotlyData}
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
    </>
  );
};

function getLegend(legendOptions: VizLegendOptions, displayValues: FieldDisplay[], hiddenClustersData: HiddenClustersData) {
  const localLegendOptions = legendOptions ?? defaultLegendConfig;

  if (localLegendOptions.showLegend === false) {
    return undefined;
  }

  const legendItems: VizLegendItem[] = displayValues
    .map<VizLegendItem | undefined>((value: FieldDisplay) => {
      // is null coalescing required here?
      const display = value.display;
      const label = display.title ?? '';
      let hideFrom: HideSeriesConfig | undefined;
      if (hiddenClustersData.clusterLabels.has(label)) {
        hideFrom = hiddenClustersData.hideConfig;
      }
      // console.log(hideFrom, Boolean(hideFrom?.viz));
      if (hideFrom?.legend) {
        return undefined;
      }
      return {
        color: display.color ?? FALLBACK_COLOR,
        label,
        yAxis: 1,
        disabled: Boolean(hideFrom?.viz),
      };
    }).filter((item): item is VizLegendItem => !!item);

  return (
    <VizLegend
      items={legendItems}
      seriesVisibilityChangeBehavior={SeriesVisibilityChangeBehavior.Hide}
      placement={legendOptions.placement}
      displayMode={legendOptions.displayMode}
    />
  );
}
