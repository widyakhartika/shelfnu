import { Context, SessionFlavor } from 'grammy';
import { ConversationFlavor } from '@grammyjs/conversations';

export type Urgency = 'LOW' | 'MEDIUM' | 'HIGH';

export interface AssetRequestData {
  assetName: string;
  categoryId: string;
  categoryLabel: string;
  quantity: number;
  urgency: Urgency;
  justification: string;
}

export interface SessionData {
  // reserved for future session state
}

export type BotContext = Context & SessionFlavor<SessionData> & ConversationFlavor;

export interface IAssetsRequestPayload {
  intent: 'submit-request';
  organizationId: string;
  assetName: string;
  categoryId: string;
  quantity: number;
  urgency: Urgency;
  justification: string;
  'approverLevels[]': string[];
}

export interface SubmitResult {
  success: boolean;
  redirectUrl?: string;
  error?: string;
}
