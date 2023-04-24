import { Field, FieldColorModeId, FieldConfigProperty, FieldType, PanelPlugin } from '@grafana/data';
import { Cluster3DPanel } from './components/Cluster3DPanel';
import { commonOptionsBuilder } from '@grafana/ui';
import { Cluster3DOptions, SeriesMapping, defaultCluster3DConfig, defaultSeriesConfig } from 'models.gen';

const fieldNamePickerConfig = {
  settings: {
    filter: (field: Field) => field.type === FieldType.number,
  },
  showIf: (cfg: Cluster3DOptions) => cfg.seriesMapping === SeriesMapping.Manual,
};

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
      FieldConfigProperty.Thresholds,
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
    useCustomConfig: (builder) => {
      commonOptionsBuilder.addHideFrom(builder);
    },
  })
  .setPanelOptions((builder) => {
    commonOptionsBuilder.addTooltipOptions(builder, true);
    commonOptionsBuilder.addLegendOptions(builder, false);

    return builder
      .addBooleanSwitch({
        name: 'Separate clusters by series',
        path: 'separateClustersBySeries',
        defaultValue: defaultCluster3DConfig.separateClustersBySeries,
      })
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
      .addFieldNamePicker({
        path: 'series.x',
        name: 'X field',
        defaultValue: defaultSeriesConfig.x,
        ...fieldNamePickerConfig,
      })
      .addFieldNamePicker({
        path: 'series.y',
        name: 'Y field',
        defaultValue: defaultSeriesConfig.y,
        ...fieldNamePickerConfig,
      })
      .addFieldNamePicker({
        path: 'series.z',
        name: 'Z field',
        defaultValue: defaultSeriesConfig.z,
        ...fieldNamePickerConfig,
      })
      .addFieldNamePicker({
        path: 'series.clusterLabel',
        name: 'Cluster name field',
        defaultValue: defaultSeriesConfig.clusterLabel,
        showIf: (cfg: Cluster3DOptions) => cfg.seriesMapping === SeriesMapping.Manual,
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
