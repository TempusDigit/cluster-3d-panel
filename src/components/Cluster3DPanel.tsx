import React, { useCallback, useMemo, useRef } from 'react';
import { DataFrame, FALLBACK_COLOR, FieldDisplay, getFieldDisplayValues, GrafanaTheme2, PanelProps } from '@grafana/data';
import { Cluster3DTooltipData, ClusterData, VisibleClustersData } from 'types';
import { HideSeriesConfig, SeriesVisibilityChangeBehavior, SeriesVisibilityChangeMode, TooltipDisplayMode, useStyles2, useTheme2, VizLayout, VizLegendItem, VizLegendOptions } from '@grafana/ui';
import { Figure } from 'react-plotly.js';
import Plotly, { Camera, Data, PlotHoverEvent } from 'plotly.js/dist/plotly-custom.min.js';
import createPlotlyComponent from 'react-plotly.js/factory';
import { PanelDataErrorView } from '@grafana/runtime';
import { css } from '@emotion/css';
import { useTooltip, useTooltipInPortal } from '@visx/tooltip';
import Cluster3DTooltipTable from './Cluster3DTooltipTable';
import { Cluster3DOptions, defaultLegendConfig } from 'models.gen';
import { getClusterData, getFieldNames, getLegendData, getPlotlyData, getTooltipData, getVisibleClusterData, mapSeries } from 'utils';
import { seriesVisibilityConfigFactory } from 'SeriesVisibilityConfigFactory';
import { VizLegend } from './copied/VizLegend';

interface Props extends PanelProps<Cluster3DOptions> { }

const Plot = createPlotlyComponent(Plotly);

const getStyles = (theme: GrafanaTheme2) => {
  return {
    container: css`
      width: 100%;
      height: 100%;
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
  const { data, id, fieldConfig, timeZone, replaceVariables, width, height, options, onFieldConfigChange } = props;
  // Filters fields down to four that represent x, y, z and clusterLabel fields (user can choose which field is selected as each).
  const series = useMemo(() => mapSeries(data.series, options.series!, options.seriesMapping), [data.series, options.series, options.seriesMapping]);
  // Further methods require a non empty series array.
  const dataValid = series.length > 0;
  // Joined series into one array and each element in array holds the points of one cluster. useMemo is used so that the value is recalculated only if one of the dependencies changes
  // instead of every render.
  const clusterData = useMemo<ClusterData[]>(() => getClusterData(dataValid, series, options.separateClustersBySeries),
    [dataValid, series, options.separateClustersBySeries]);
  // Unique cluster labels.
  const legendData = useMemo<DataFrame[]>(() => getLegendData(dataValid, clusterData, fieldConfig), [dataValid, clusterData, fieldConfig]);
  // The display names of x, y, z and clusterLabel fields. For example, user can select a field named "G" as the x field, so that axis should display "G".
  const fieldNames = useMemo<string[]>(() => getFieldNames(dataValid, series[0]), [dataValid, series]);
  const theme = useTheme2();
  // Formats data for use with Grafana UI components.
  const fieldDisplayValues = useMemo(() => getFieldDisplayValues({
    fieldConfig,
    reduceOptions: { calcs: defaultLegendConfig.calcs },
    data: legendData,
    theme: theme,
    replaceVariables,
    timeZone,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [fieldConfig, legendData, theme]);

  // This method is taken from the PanelWraper component, which applies series visibility changes to the original data and which is not exposed to a panel directly. Therefore, it
  // needed to be copied here to apply visibility changes to transformed data.
  const onToggleSeriesVisibility = useCallback((label: string, mode: SeriesVisibilityChangeMode) => {
    onFieldConfigChange(seriesVisibilityConfigFactory(label, mode, fieldConfig, legendData));
  }, [onFieldConfigChange, fieldConfig, legendData]);

  // Extracts which clusters should be shown from the overrides.
  const visibleClustersData = useMemo<VisibleClustersData>(() => getVisibleClusterData(fieldConfig, clusterData), [fieldConfig, clusterData]);
  const legend = useMemo(() => getLegend(options.legend, fieldDisplayValues, visibleClustersData, onToggleSeriesVisibility),
    [options.legend, fieldDisplayValues, visibleClustersData, onToggleSeriesVisibility]);
  // Formats a ClusterData array into a plotly Data array.
  const plotlyData = useMemo<Data[]>(() => getPlotlyData(dataValid, clusterData, fieldDisplayValues, visibleClustersData, options.fillOpacity, options.pointSize),
    [dataValid, clusterData, fieldDisplayValues, visibleClustersData, options.fillOpacity, options.pointSize]);
  const styles = useStyles2(getStyles);
  // Grafana tooltip hook.
  const tooltip = useTooltip<Cluster3DTooltipData>();
  const { containerRef, TooltipInPortal } = useTooltipInPortal({ detectBounds: true });
  const initialCamera = useRef<Partial<Camera>>();
  const camera = useRef<Partial<Camera>>();

  const mouseOverPlotlyPlot = useRef<boolean>(false);
  const lastHoverPointNumber = useRef<number>();

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
  const PLOT_SPACING = Number(theme.spacing(1).split('p')[0]);
  const showTooltip = options.tooltip.mode !== TooltipDisplayMode.None && tooltip.tooltipOpen;

  const onMouseEnter = () => {
    mouseOverPlotlyPlot.current = true;
  };

  const onMouseLeave = () => {
    mouseOverPlotlyPlot.current = false;
  };

  const onMouseMoveOverPlotlyPoint = (eventPoint: any) => {
    tooltip.showTooltip({
      tooltipLeft: eventPoint.bbox.x0,
      tooltipTop: eventPoint.bbox.y0,
      tooltipData: getTooltipData(eventPoint, legendColors, fieldNames),
    });
  };

  const onPlotlyPointHover = (event: PlotHoverEvent) => {
    const eventPoint = event.points[0] as any;
    // Hovering over a Plotly point and moving the mouse repeatedly fires the event which in turn rerenders the component as the Grafana tooltip is shown. Storing the last hovered
    // point and checking if it's different on a point hover prevents the rerender loop. A check on the div component if the mouse is over it is required as a panel can exist in two
    // places at the same time (different instances) - in the dashboard and in the edit mode and the Plotly chart in the dashboard would react to events, even though the mouse is
    // hovering over a Plotly chart in the edit mode.
    if (lastHoverPointNumber.current !== eventPoint.pointNumber && mouseOverPlotlyPlot.current) {
      lastHoverPointNumber.current = eventPoint.pointNumber;
      onMouseMoveOverPlotlyPoint(eventPoint);
    }
  };

  /**
   * Tries to save Plotly camera position.
   * 
   * @remarks
   * Plotly has an issue with zooming.
   */
  const onPlotlyUpdate = (figure: Readonly<Figure>) => {
    if (figure.layout.scene?.camera !== undefined) {
      if (initialCamera.current === undefined) {
        initialCamera.current = { ...figure.layout.scene.camera };
      }
      camera.current = figure.layout.scene.camera;
    }
  };

  const onPlotlyPointUnhover = () => {
    lastHoverPointNumber.current = undefined;
    tooltip.hideTooltip();
  };

  // const handleOnClickResetCamera = () => {
  //   setCamera({ ...initialCamera.current });
  // }

  // The VizLayout component is required so that the legend is rendered and is positioned correctly.
  return (
    <VizLayout width={width} height={height} legend={legend}>
      {(vizWidth: number, vizHeight: number) => {
        const plotlyWidth = vizWidth - PLOT_SPACING;
        const plotlyHeight = vizHeight - PLOT_SPACING;
        return (
          <div className={styles.container} ref={containerRef} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
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
                autosize: true,
                paper_bgcolor: 'transparent',
                // Plot resets on first color change. https://github.com/plotly/plotly.py/issues/3951.
                // Possible solution at the end here: https://github.com/plotly/plotly.js/issues/6359.
                // Explanation what this does: https://community.plotly.com/t/preserving-ui-state-like-zoom-in-dcc-graph-with-uirevision-with-dash/15793.
                uirevision: 'true',
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
              style={{ position: 'relative', top: PLOT_SPACING, width: plotlyWidth, height: plotlyHeight }}
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

/**
 * Creates the Grafana legend component.
 * 
 * @remarks
 * Standard Grafana panels seem to write their own getLegend method.
 */
function getLegend(
  legendOptions: VizLegendOptions,
  displayValues: FieldDisplay[],
  visibleClustersData: VisibleClustersData,
  onToggleSeriesVisibility: (label: string, mode: SeriesVisibilityChangeMode) => void
) {
  const localLegendOptions = legendOptions ?? defaultLegendConfig;

  if (localLegendOptions.showLegend === false) {
    return undefined;
  }

  const legendItems: VizLegendItem[] = displayValues
    .map<VizLegendItem | undefined>((value: FieldDisplay) => {
      const display = value.display;
      const label = display.title ?? '';
      let hideFrom: HideSeriesConfig | undefined;
      if (!visibleClustersData.clusterLabels.has(label)) {
        hideFrom = visibleClustersData.hideConfig;
      }
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

  // The VizLegend component and the components it used needed to be copied (they are in the components/copied folder) because the onToggleSeriesVisibility property needed to be added.
  // It was added, because otherwise the component would use a method of the same name from the panel wrapper which only works on the original data whereas we need to work on the
  // data that has been transformed.
  return (
    <VizLayout.Legend placement={legendOptions.placement} width={legendOptions.width}>
      <VizLegend
        items={legendItems}
        seriesVisibilityChangeBehavior={SeriesVisibilityChangeBehavior.Hide}
        placement={legendOptions.placement}
        displayMode={legendOptions.displayMode}
        onToggleSeriesVisibility={onToggleSeriesVisibility}
      />
    </VizLayout.Legend>
  );
}
