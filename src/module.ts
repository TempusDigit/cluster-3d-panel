import {
  FieldColorModeId,
  FieldConfigProperty,
  PanelPlugin
} from '@grafana/data';
import { Cluster3DPanel } from './components/Cluster3DPanel';
import { commonOptionsBuilder } from '@grafana/ui';
import { XYZDimsEditor } from 'components/XYZDimsEditor';
import { Cluster3DOptions, SeriesMapping, defaultCluster3DConfig } from 'models.gen';

export const plugin = new PanelPlugin<Cluster3DOptions>(Cluster3DPanel)
  .useFieldConfig({
    disableStandardOptions: [
      FieldConfigProperty.Unit,
      FieldConfigProperty.Min,
      FieldConfigProperty.Max,
      FieldConfigProperty.Decimals,
      FieldConfigProperty.DisplayName,
      FieldConfigProperty.NoValue,
      FieldConfigProperty.Links,
      FieldConfigProperty.Mappings,
      FieldConfigProperty.Thresholds
    ],
    standardOptions: {
      [FieldConfigProperty.Color]: {
        settings: {
          byValueSupport: false,
          bySeriesSupport: true,
          preferThresholdsMode: false,
        },
        defaultValue: {
          mode: FieldColorModeId.PaletteClassic,
        },
      },
    },
  })
  .setPanelOptions((builder) => {
    commonOptionsBuilder.addTooltipOptions(builder, true);
    commonOptionsBuilder.addLegendOptions(builder, false);

    return builder
      .addRadio({
        path: 'seriesMapping',
        name: 'Series mapping',
        defaultValue: defaultCluster3DConfig.seriesMapping,
        settings: {
          options: [
            { value: SeriesMapping.Auto, label: 'Auto' },
            { value: SeriesMapping.Manual, label: 'Manual' },
          ],
        },
      })
      .addCustomEditor({
        id: 'xyPlotConfig',
        path: 'dims',
        name: 'Data',
        editor: XYZDimsEditor,
        showIf: (cfg) => cfg.seriesMapping === 'auto',
      })
      .addFieldNamePicker({
        path: 'series.x',
        name: 'X field',
        showIf: (cfg) => cfg.seriesMapping === 'manual',
      })
      .addFieldNamePicker({
        path: 'series.y',
        name: 'Y field',
        showIf: (cfg) => cfg.seriesMapping === 'manual',
      })
      .addFieldNamePicker({
        path: 'series.z',
        name: 'Z field',
        showIf: (cfg) => cfg.seriesMapping === 'manual',
      })
      .addFieldNamePicker({
        path: 'series.clusterName',
        name: 'Cluster mame field',
        showIf: (cfg) => cfg.seriesMapping === 'manual',
      })
      .addBooleanSwitch({
        name: 'Separate legend by series',
        path: 'legend.separateLegendBySeries',
        category: ['Legend'],
        showIf: (cfg) => cfg.legend.showLegend === true,
      })
      .addSliderInput({
        path: 'pointSize',
        name: 'Point size',
        category: ['Graph styles'],
        defaultValue: defaultCluster3DConfig.pointSize,
        settings: {
          min: 1,
          max: 20,
          step: 1,
          ariaLabelForHandle: 'Point size',
        },
      })
      // Line width broken: https://github.com/plotly/plotly.js/issues/3796
      // .addSliderInput({
      //   path: 'lineWidth',
      //   name: 'Line width',
      //   category: ['Graph styles'],
      //   defaultValue: defualtCluster3DConfig.lineWidth,
      //   settings: {
      //     min: 0,
      //     max: 100,
      //     step: 1,
      //   },
      // })
      .addSliderInput({
        path: 'fillOpacity',
        name: 'Fill opacity',
        category: ['Graph styles'],
        defaultValue: defaultCluster3DConfig.fillOpacity,
        settings: {
          min: 0,
          max: 100,
          step: 1,
        },
      });
  });
