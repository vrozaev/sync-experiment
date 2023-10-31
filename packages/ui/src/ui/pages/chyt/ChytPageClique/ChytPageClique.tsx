import React from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {RouteComponentProps} from 'react-router';
import cn from 'bem-cn-lite';
import moment from 'moment';

import {Button, Loader, Text} from '@gravity-ui/uikit';

import {Page} from '../../../../shared/constants/settings';

import format from '../../../common/hammer/format';

import {useUpdater} from '../../../hooks/use-updater';
import Error from '../../../components/Error/Error';
import Icon from '../../../components/Icon/Icon';
import Label from '../../../components/Label/Label';
import Link from '../../../components/Link/Link';
import MetaTable, {MetaTableItem} from '../../../components/MetaTable/MetaTable';
import StatusLabel from '../../../components/StatusLabel/StatusLabel';

import {chytCliqueLoad, chytResetCurrentClique} from '../../../store/actions/chyt/clique';
import {chytListAction} from '../../../store/actions/chyt/list';
import {
    getChytCliqueData,
    getChytCliqueError,
    getChytCliqueInitialLoading,
} from '../../../store/selectors/chyt/clique';
import {getCluster} from '../../../store/selectors/global';

import {CliqueState} from '../components/CliqueState';

import {ChytPageCliqueTabs} from './ChytPageCliqueTabs';

import './ChytPageClique.scss';

const block = cn('chyt-page-clique');

export function ChytPageClique(props: RouteComponentProps<{alias: string}>) {
    const dispatch = useDispatch();

    const {alias} = props.match.params;
    const update = React.useCallback(() => {
        dispatch(chytCliqueLoad(alias));
    }, [alias]);

    React.useEffect(() => {
        return () => {
            dispatch(chytResetCurrentClique());
        };
    }, [alias]);

    const {yt_operation_state, start_time, finish_time} = useSelector(getChytCliqueData) ?? {};
    const initialLoading = useSelector(getChytCliqueInitialLoading);

    const started = Boolean(start_time && !finish_time);

    useUpdater(update);

    return (
        <div className={block()}>
            <div className={block('header')}>
                <Text variant="header-1">CHYT clique *{alias}</Text>
                <StatusLabel
                    className={block('header-operation-state')}
                    label={yt_operation_state}
                />
                {initialLoading && <Loader className={block('loader')} size="s" />}
                <span className={block('spacer')} />

                <span className={block('header-start-btn')}>
                    <Button
                        disabled={started}
                        onClick={() => {
                            dispatch(chytListAction('start', {alias}));
                        }}
                    >
                        <Icon awesome="play-circle" />
                    </Button>
                </span>

                <Button
                    disabled={!started}
                    onClick={() => {
                        dispatch(chytListAction('stop', {alias}));
                    }}
                >
                    <Icon awesome="stop-circle" />
                </Button>
            </div>
            <ChytCliqueError />
            <ChytCliqueMetaTable />
            <ChytPageCliqueTabs className={block('tabs')} />
        </div>
    );
}

function ChytCliqueError() {
    const error = useSelector(getChytCliqueError);

    return error ? <Error className={block('error')} error={error} /> : null;
}

function ChytCliqueMetaTable() {
    const cluster = useSelector(getCluster);
    const data = useSelector(getChytCliqueData);

    const items: Array<Array<MetaTableItem>> = React.useMemo(() => {
        const {operation_id, pool, state, stage, start_time, finish_time, ctl_attributes} =
            data ?? {};

        const start_time_number = start_time ? moment(start_time).valueOf() : undefined;
        const finish_time_number = finish_time
            ? moment(finish_time).valueOf()
            : start_time_number
            ? Date.now()
            : undefined;

        const duration =
            !start_time_number || !finish_time_number
                ? undefined
                : finish_time_number - start_time_number;

        return [
            [
                {
                    key: 'Id',
                    value: operation_id ? (
                        <Link url={`/${cluster}/${Page.OPERATIONS}/${operation_id}`} routed>
                            {operation_id}
                        </Link>
                    ) : (
                        <div className={block('operation-id')}>{format.NO_VALUE}</div>
                    ),
                },
                {
                    key: 'Pool',
                    value: pool ? pool : format.NO_VALUE,
                },
                {
                    key: 'Instance count',
                    value: format.Number(ctl_attributes?.instance_count),
                },
                {
                    key: 'Total cpu',
                    value: format.Number(ctl_attributes?.total_cpu),
                },
                {
                    key: 'Total memory',
                    value: format.Bytes(ctl_attributes?.total_memory),
                },
            ],
            [
                {key: 'State', value: <CliqueState state={state} />},
                {key: 'Stage', value: stage ? <Label capitalize text={stage} /> : format.NO_VALUE},
                {
                    key: 'Start time',
                    value: format.DateTime(start_time),
                },
                {
                    key: 'Finish time',
                    value: format.DateTime(finish_time),
                },
                {
                    key: 'Duration',
                    value: duration ? format.TimeDuration(duration) : format.NO_VALUE,
                },
            ],
        ];
    }, [data, cluster]);

    return <MetaTable items={items} />;
}
