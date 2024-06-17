import _ from 'lodash';
import axios from 'axios';

import type {Request, Response} from 'express';
import {UNEXPECTED_PIPE_AXIOS_RESPONSE, pipeAxiosResponse, sendAndLogError} from '../utils';
import {getUserYTApiSetup} from '../components/requestsSetup';
import {getPreloadedClusterUiConfig} from '../components/cluster-params';

export async function strawberryProxyApi(req: Request, res: Response) {
    try {
        await strawberryProxyApiImpl(req, res);
    } catch (e: any) {
        await sendAndLogError(req.ctx, res, 500, e, {
            method: 'nodejs',
            query: req.query,
            page: req.headers.referer,
        });
    }
}

async function strawberryProxyApiImpl(req: Request, res: Response) {
    const {action, engine, ytAuthCluster: cluster} = req.params;
    const ALLOWED_ACTIONS = new Set([
        'list',
        'create',
        'remove',
        'start',
        'stop',
        'get_brief_info',
        'describe_options',
        'edit_options',
        'get_speclet',
    ]);

    if (!engine) {
        return sendAndLogError(req.ctx, res, 400, new Error('api type is not defined'));
    }

    const isChyt = engine === 'chyt';

    if (!ALLOWED_ACTIONS.has(action)) {
        return sendAndLogError(
            req.ctx,
            res,
            400,
            new Error(`${isChyt ? 'CHYT' : 'SPYT'} action - '${action}', is not supported`),
        );
    }

    const isDeveloper = req.query.isDeveloper === 'true';

    const {chyt_controller_base_url, livy_controller_base_url} = await getPreloadedClusterUiConfig(
        cluster,
        req.ctx,
        isDeveloper,
    );

    const baseUrl = isChyt ? chyt_controller_base_url : livy_controller_base_url;

    if (!baseUrl) {
        const parameter = isChyt ? 'chyt_controller_base_url' : 'livy_controller_base_url';
        return sendAndLogError(
            req.ctx,
            res,
            500,
            new Error(`//sys/@ui_config/${parameter} is not defined`),
        );
    }
    const {ctx} = req;

    const {authHeaders} = getUserYTApiSetup(cluster, req);
    const headers = {
        ...ctx.getMetadata(),
        'accept-encoding': 'gzip',
        ...authHeaders,
        accept: 'application/json',
    };

    return axios
        .request({
            url: `${baseUrl}/${cluster}/${action}`,
            method: 'POST',
            headers,
            data: req.body,
            timeout: 100000,
            responseType: 'stream',
        })
        .then(async (response) => {
            const pipedSize = await pipeAxiosResponse(ctx, res, response);
            if (!pipedSize) {
                throw new Error(UNEXPECTED_PIPE_AXIOS_RESPONSE);
            }
        });
}
