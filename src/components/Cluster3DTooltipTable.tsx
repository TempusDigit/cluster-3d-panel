import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';
import { SeriesIcon, useStyles2 } from '@grafana/ui';
import React from 'react';
import { Cluster3DTooltipTableProps } from 'types';

const getSeriesTableRowStyles = (theme: GrafanaTheme2) => {
    return {
        tooltipHeader: css`
          display: flex;
          align-items: center;
          justify-content: center;
        `,
        icon: css`
          margin-right: ${theme.spacing(1)};
        `,
        iconLabel: css`
          font-weight: initial;
        `,
        label: css`
          word-break: break-all;
        `,
        value: css`
          padding-left: ${theme.spacing(2)};
        `,
    };
};

/**
 * Creates custom layout for Grafana tooltip.
 */
const Cluster3DTooltipTable = ({ tooltipData }: Cluster3DTooltipTableProps) => {
    const styles = useStyles2(getSeriesTableRowStyles);

    return (
        <table>
            <thead>
                <tr>
                    <th colSpan={2}>
                        <div className={styles.tooltipHeader}>
                            <SeriesIcon color={tooltipData.color} className={styles.icon} />
                            <div className={styles.iconLabel}>{tooltipData.label}</div>
                        </div>
                    </th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td className={styles.label}>{tooltipData.x.fieldName}</td>
                    <td className={styles.value}>{tooltipData.x.value}</td>
                </tr>
                <tr>
                    <td className={styles.label}>{tooltipData.y.fieldName}</td>
                    <td className={styles.value}>{tooltipData.y.value}</td>
                </tr>
                <tr>
                    <td className={styles.label}>{tooltipData.z.fieldName}</td>
                    <td className={styles.value}>{tooltipData.z.value}</td>
                </tr>
            </tbody>
        </table>
    );
};

export default Cluster3DTooltipTable;
