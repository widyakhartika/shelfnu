import axios, { AxiosInstance } from 'axios';
import qs from 'qs';
import { env } from '../config/env.config';
import { APPROVER_LEVELS } from '../config/approvers.config';
import { logger } from '../logger';
import type { AssetRequestData, SubmitResult } from '../types';

export class IAssetsClient {
  private readonly http: AxiosInstance;

  constructor(sessionCookie?: string) {
    const cookie = sessionCookie ?? env.IASSETS_SESSION_COOKIE;

    this.http = axios.create({
      baseURL: env.IASSETS_BASE_URL,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Cookie: `__authSession=${cookie}`,
        Origin: env.IASSETS_BASE_URL,
        Referer: `${env.IASSETS_BASE_URL}/assets/requests/new`,
      },
      maxRedirects: 0,
      validateStatus: (status) => status < 500,
    });
  }

  async submitRequest(data: AssetRequestData): Promise<SubmitResult> {
    const payload = {
      intent: 'submit-request',
      organizationId: env.IASSETS_ORGANIZATION_ID,
      assetName: data.assetName,
      categoryId: data.categoryId,
      quantity: data.quantity,
      urgency: data.urgency,
      justification: data.justification,
      'approverLevels[]': APPROVER_LEVELS,
    };

    const body = qs.stringify(payload, { arrayFormat: 'repeat' });

    logger.debug('Submitting asset request to iAssets', {
      assetName: data.assetName,
      urgency: data.urgency,
    });

    const response = await this.http.post('/assets/requests/new.data', body);

    logger.debug('iAssets response', {
      status: response.status,
      location: response.headers['location'],
    });

    if (response.status === 302 || response.status === 200 || response.status === 202) {
      return {
        success: true,
        redirectUrl: response.headers['location'],
      };
    }

    if (response.status === 401 || response.status === 403) {
      return { success: false, error: 'Session expired. Please update the cookie in settings.' };
    }

    return { success: false, error: `Unexpected response: HTTP ${response.status}` };
  }
}
