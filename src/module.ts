import {
  FieldColorModeId,
  FieldConfigProperty,
  PanelPlugin
} from '@grafana/data';
import { Cluster3DOptions } from './types';
import { Cluster3DPanel } from './components/Cluster3DPanel';
import { commonOptionsBuilder } from '@grafana/ui';

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
      .addBooleanSwitch({
        name: 'Separate legend by series',
        path: 'legend.separateLegendBySeries',
        category: ['Legend'],
        showIf: (c) => c.legend.showLegend === true,
      })
      .addSliderInput({
        path: 'pointSize',
        name: 'Point size',
        category: ['Graph styles'],
        defaultValue: 2,
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
      //   defaultValue: 1,
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
        defaultValue: 90,
        settings: {
          min: 0,
          max: 100,
          step: 1,
        },
      });
  });
