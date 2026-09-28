// vpn-payg-frontend/src/services/authService.ts
import { api } from './api';
import { Role } from '../types';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  role: Role;
  name?: string;
  language?: string;           // Persisted user language preference (e.g. 'en', 'fa', 'ru')
  billing_currency?: 'IRT' | 'USD'; // Immutable billing currency (Option B)
  is_active: boolean;          // Admin account status (True = Active, False = Admin Locked)
  is_self_suspended?: boolean; // Client self-service VPN pause status
  must_change_password?: boolean;
  status_toggled_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SignupResult {
  message: string;
  disclaimer: string;
  user: UserProfile;
  recovery_keys: string[];
}

export interface RecoveryKeysResult {
  message: string;
  count: number;
  keys: string[];
}

export interface TelegramLinkInfo {
  telegram_link: string;
  token: string;
  is_connected: boolean;
  telegram_id?: string;
}

export interface NotificationSettings {
  notify_low_balance: boolean;
  low_balance_threshold: number; // In Toman
  notify_server_outage: boolean;
  notify_topup_approval: boolean;
  notify_settlement: boolean;
}

export interface SellerPaymentInstructions {
  shetab_card_number?: string;
  cardholder_name?: string;
  payment_instructions?: string;
  bank_cards?: BankCardItem[];
}

export interface SellerNotificationSettings {
  notify_client_topup: boolean;
  notify_client_out_of_credit: boolean;
  notify_admin_debt_limit: boolean;
  debt_limit_threshold: number; // In Toman
}

export interface BankCardItem {
  id: string;
  card_number: string;
  cardholder_name: string;
  bank_name: string;
  memo?: string;
}

export interface CryptoWalletItem {
  id: string;
  network: string; // 'TRON (TRC20)' | 'TON'
  address: string;
  label?: string;
  memo?: string;
}

export interface SystemSettings {
  brand_name: string;
  default_currency: string;
  default_language: string;
  default_theme: string;
  timezone: string;
  default_signup_gift_credit: number;
  min_topup_amount: number;
  new_region_min_topup_amount: number;
  existing_region_min_topup_amount: number;
  region_grace_period_days: number;
  refund_cooldown_days: number;
  safety_cutoff_threshold: number;
  max_negative_balance: number | null;
  default_signup_gift_credit_usd?: number;
  new_region_min_topup_amount_usd?: number;
  existing_region_min_topup_amount_usd?: number;
  safety_cutoff_threshold_usd?: number;
  max_negative_balance_usd?: number | null;
  usd_to_irt_exchange_rate?: number;
  client_status_cooldown_minutes: number;
  route_replace_cooldown_days: number;
  disable_client_route_replacement: boolean;
  low_balance_threshold: number;
  is_maintenance_mode: boolean;
  maintenance_message: string;
  billing_sync_interval: number;
  xui_request_timeout: number;
  bot_username?: string;
  bot_token?: string;
  notify_seller_settlement: boolean;
  notify_server_offline: boolean;
  notify_seller_debt_warning: boolean;
  notify_low_balance_warning: boolean;
  bank_cards: BankCardItem[];
  crypto_wallets: CryptoWalletItem[];
  admin_payment_instructions?: string;
}

function formatRole(roleStr: string): Role {
  if (!roleStr) return 'Client';
  const lower = roleStr.toLowerCase();
  if (lower === 'admin') return 'Admin';
  return 'Client';
}

export const authService = {
  async checkUsernameAvailability(username: string): Promise<boolean> {
    const data = await api.get<{ available: boolean }>(
      `/api/iam/auth/check-username?username=${encodeURIComponent(username)}`
    );
    return data.available;
  },

  async checkEmailAvailability(email: string): Promise<boolean> {
    const data = await api.get<{ available: boolean }>(
      `/api/iam/auth/check-email?email=${encodeURIComponent(email)}`
    );
    return data.available;
  },

  async login(identifier: string, password: string): Promise<{ user: UserProfile; message: string }> {
    const data = await api.post<{ user: any; message: string }>('/api/iam/auth/login', {
      identifier,
      password,
    });

    return {
      message: data.message,
      user: {
        id: String(data.user.id),
        username: data.user.username,
        email: data.user.email,
        role: formatRole(data.user.role),
        name: data.user.name,
        language: data.user.language || 'en',
        billing_currency: (data.user.billing_currency || 'IRT').toUpperCase() as 'IRT' | 'USD',
        is_active: Boolean(data.user.is_active ?? true),
        must_change_password: Boolean(data.user.must_change_password ?? false),
        status_toggled_at: data.user.status_toggled_at,
        created_at: data.user.created_at,
        updated_at: data.user.updated_at,
      },
    };
  },

  async signup(
    username: string,
    email: string,
    password: string,
    confirm_password: string,
    language?: string,
    billing_currency: 'IRT' | 'USD' = 'IRT'
  ): Promise<SignupResult> {
    const data = await api.post<any>('/api/iam/auth/register', {
      username,
      email,
      password,
      confirm_password,
      language: language || 'en',
      billing_currency: billing_currency || 'IRT',
    });

    return {
      message: data.message,
      disclaimer: data.disclaimer,
      user: {
        id: String(data.user.id),
        username: data.user.username,
        email: data.user.email,
        role: formatRole(data.role),
        name: data.name,
        is_active: Boolean(data.user.is_active ?? true),
        must_change_password: Boolean(data.user.must_change_password ?? false),
        status_toggled_at: data.status_toggled_at,
        created_at: data.created_at,
        updated_at: data.updated_at,
      },
      recovery_keys: data.recovery_keys || [],
    };
  },

  async requestPasswordResetEmail(email: string): Promise<string> {
    const data = await api.post<{ message: string }>('/api/iam/auth/password-reset/request-email', { email });
    return data.message;
  },

  async confirmPasswordReset(
    recovery_key: string,
    new_password: string,
    confirm_password: string
  ): Promise<string> {
    const data = await api.post<{ message: string }>('/api/iam/auth/password-reset/confirm', {
      recovery_key,
      new_password,
      confirm_password,
    });
    return data.message;
  },

  async getMe(): Promise<UserProfile> {
    const data = await api.get<any>('/api/iam/auth/me');
    return {
      id: String(data.id),
      username: data.username,
      email: data.email,
      role: formatRole(data.role),
      name: data.name,
      language: data.language || 'en',
      billing_currency: (data.billing_currency || 'IRT').toUpperCase() as 'IRT' | 'USD',
      is_active: Boolean(data.is_active ?? true),
      must_change_password: Boolean(data.must_change_password ?? false),
      status_toggled_at: data.status_toggled_at,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  },

  async updateProfile(profileData: { email?: string; name?: string; language?: string }): Promise<UserProfile> {
    const data = await api.put<any>('/api/iam/users/me', profileData);
    return {
      id: String(data.id),
      username: data.username,
      email: data.email,
      role: formatRole(data.role),
      name: data.name,
      language: data.language || 'en',
      billing_currency: (data.billing_currency || 'IRT').toUpperCase() as 'IRT' | 'USD',
      is_active: Boolean(data.is_active ?? true),
      must_change_password: Boolean(data.must_change_password ?? false),
      status_toggled_at: data.status_toggled_at,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
  },

  async changePassword(old_password: string, new_password: string, confirm_password: string): Promise<string> {
    const data = await api.post<{ message: string }>('/api/iam/users/me/password', {
      old_password,
      new_password,
      confirm_password,
    });
    return data.message;
  },

  async updateLanguage(language: string): Promise<string> {
    const res = await api.patch<{ message: string; language: string }>(
      `/api/iam/users/me/language?language=${encodeURIComponent(language)}`
    );
    return res.language;
  },

  async toggleStatus(): Promise<{ message: string; is_active: boolean; is_self_suspended: boolean; status_toggled_at: string }> {
    const res = await api.post<any>('/api/iam/users/me/toggle-status');
    return res;
  },

  async getRecoveryKeys(password: string): Promise<RecoveryKeysResult> {
    return await api.post<RecoveryKeysResult>('/api/iam/users/me/recovery-keys/view', { password });
  },

  async regenerateRecoveryKeys(password: string): Promise<RecoveryKeysResult> {
    return await api.post<RecoveryKeysResult>('/api/iam/users/me/recovery-keys/regenerate', { password });
  },

  async logout(): Promise<void> {
    await api.post('/api/iam/auth/logout').catch(() => {});
  },

  // =========================================================================================
  // --- TELEGRAM & NOTIFICATIONS (IAM Service Identity) ---
  // =========================================================================================
  async getTelegramLink(): Promise<TelegramLinkInfo> {
    return await api.get<TelegramLinkInfo>('/api/iam/users/me/telegram-link');
  },

  async revokeTelegramToken(): Promise<TelegramLinkInfo> {
    return await api.post<TelegramLinkInfo>('/api/iam/users/me/telegram-link/revoke');
  },

  async disconnectTelegram(): Promise<{ message: string }> {
    return await api.post<{ message: string }>('/api/iam/users/me/telegram/disconnect');
  },

  // --- CLIENT PREFERENCES (Notification Service) ---
  async getNotificationSettings(): Promise<NotificationSettings> {
    return await api.get<NotificationSettings>('/api/notifications/settings/client-preferences');
  },

  async updateNotificationSettings(settings: Partial<NotificationSettings>): Promise<NotificationSettings> {
    return await api.put<NotificationSettings>('/api/notifications/settings/client-preferences', settings);
  },

  // --- SELLER PREFERENCES (Notification Service & Billing Service) ---
  async getSellerNotificationSettings(): Promise<SellerNotificationSettings> {
    return await api.get<SellerNotificationSettings>('/api/notifications/settings/seller-preferences');
  },

  async updateSellerNotificationSettings(settings: Partial<SellerNotificationSettings>): Promise<SellerNotificationSettings> {
    return await api.put<SellerNotificationSettings>('/api/notifications/settings/seller-preferences', settings);
  },

  async getSellerPaymentInstructions(): Promise<SellerPaymentInstructions> {
    return await api.get<SellerPaymentInstructions>('/api/billing/settings/seller-instructions');
  },

  async updateSellerPaymentInstructions(data: SellerPaymentInstructions): Promise<SellerPaymentInstructions> {
    return await api.put<SellerPaymentInstructions>('/api/billing/settings/seller-instructions', data);
  },

  // --- ADMIN SETTINGS (Merges Config Service & Billing Service) ---
  async getAdminSettings(): Promise<SystemSettings> {
    const [configRes, financeRes, tgBotRes] = await Promise.all([
      api.get<any>('/api/config/public'),
      api.get<any>('/api/billing/settings/admin-financials'),
      api.get<any>('/api/notifications/settings/telegram-bot').catch(() => null)
    ]);

    return {
      brand_name: configRes.brand_name || 'PAYG VPN',
      default_currency: configRes.default_currency || 'IRT',
      default_language: configRes.default_language || 'en',
      default_theme: configRes.default_theme || 'dark',
      timezone: configRes.timezone || 'Asia/Tehran',
      is_maintenance_mode: Boolean(configRes.is_maintenance_mode),
      maintenance_message: configRes.maintenance_message || '',
      billing_sync_interval: Number(configRes.billing_sync_interval) || 5,
      xui_request_timeout: Number(configRes.xui_request_timeout ?? 15.0),
      client_status_cooldown_minutes: Number(configRes.client_status_cooldown_minutes ?? 60),
      route_replace_cooldown_days: Number(configRes.route_replace_cooldown_days ?? 0),
      disable_client_route_replacement: Boolean(configRes.disable_client_route_replacement ?? false),
      default_signup_gift_credit: financeRes.default_signup_gift_credit ?? 20000.0,
      default_signup_gift_credit_usd: Number(financeRes.default_signup_gift_credit_usd ?? 0.50),
      min_topup_amount: financeRes.new_region_min_topup_amount ?? 50000.0,
      new_region_min_topup_amount: financeRes.new_region_min_topup_amount ?? 50000.0,
      new_region_min_topup_amount_usd: Number(financeRes.new_region_min_topup_amount_usd ?? 2.00),
      existing_region_min_topup_amount: financeRes.existing_region_min_topup_amount ?? 10000.0,
      existing_region_min_topup_amount_usd: Number(financeRes.existing_region_min_topup_amount_usd ?? 1.00),
      region_grace_period_days: financeRes.region_grace_period_days ?? 3,
      refund_cooldown_days: financeRes.refund_cooldown_days ?? 30,
      safety_cutoff_threshold: financeRes.safety_cutoff_threshold ?? 50.0,
      safety_cutoff_threshold_usd: Number(financeRes.safety_cutoff_threshold_usd ?? 0.01),
      max_negative_balance: financeRes.max_negative_balance !== undefined ? financeRes.max_negative_balance : null,
      max_negative_balance_usd: financeRes.max_negative_balance_usd !== undefined ? financeRes.max_negative_balance_usd : null,
      usd_to_irt_exchange_rate: Number(financeRes.usd_to_irt_exchange_rate ?? 90000.0),
      low_balance_threshold: financeRes.existing_region_min_topup_amount ?? 10000.0,
      bank_cards: financeRes.admin_bank_cards || [],
      crypto_wallets: financeRes.admin_crypto_wallets || [],
      admin_payment_instructions: financeRes.admin_payment_instructions || '',
      bot_username: tgBotRes?.bot_username || 'PAYG_VPN_Bot',
      bot_token: tgBotRes?.bot_token || '',
      notify_seller_settlement: true,
      notify_server_offline: true,
      notify_seller_debt_warning: true,
      notify_low_balance_warning: true,
    };
  },

  async updateAdminSettings(settings: Partial<SystemSettings>): Promise<SystemSettings> {
    const cooldownMins = settings.client_status_cooldown_minutes ?? 60;
    const timeoutSecs = settings.xui_request_timeout ?? 15.0;
    await Promise.all([
      api.put<any>('/api/config/admin', {
        brand_name: settings.brand_name,
        default_currency: settings.default_currency,
        default_language: settings.default_language,
        default_theme: settings.default_theme,
        timezone: settings.timezone,
        billing_sync_interval: settings.billing_sync_interval,
        xui_request_timeout: timeoutSecs,
        client_status_cooldown_minutes: cooldownMins,
        route_replace_cooldown_days: settings.route_replace_cooldown_days ?? 0,
        disable_client_route_replacement: settings.disable_client_route_replacement ?? false,
        is_maintenance_mode: settings.is_maintenance_mode,
        maintenance_message: settings.maintenance_message
      }),
      api.post<any>(`/api/iam/users/internal/cooldown-sync?minutes=${cooldownMins}`).catch(() => {}),
      api.post<any>('/api/node/servers/internal/policy-sync', {
        route_replace_cooldown_days: settings.route_replace_cooldown_days ?? 0,
        disable_client_route_replacement: settings.disable_client_route_replacement ?? false,
        xui_request_timeout: timeoutSecs
      }).catch(() => {}),
      api.post<any>(`/api/traffic/internal/policy-sync?xui_request_timeout=${timeoutSecs}`).catch(() => {}),
      api.put<any>('/api/billing/settings/admin-financials', {
        default_signup_gift_credit: settings.default_signup_gift_credit,
        default_signup_gift_credit_usd: settings.default_signup_gift_credit_usd,
        new_region_min_topup_amount: settings.new_region_min_topup_amount,
        new_region_min_topup_amount_usd: settings.new_region_min_topup_amount_usd,
        existing_region_min_topup_amount: settings.existing_region_min_topup_amount,
        existing_region_min_topup_amount_usd: settings.existing_region_min_topup_amount_usd,
        region_grace_period_days: settings.region_grace_period_days,
        refund_cooldown_days: settings.refund_cooldown_days,
        safety_cutoff_threshold: settings.safety_cutoff_threshold,
        safety_cutoff_threshold_usd: settings.safety_cutoff_threshold_usd,
        max_negative_balance: settings.max_negative_balance,
        max_negative_balance_usd: settings.max_negative_balance_usd,
        usd_to_irt_exchange_rate: settings.usd_to_irt_exchange_rate,
        admin_bank_cards: settings.bank_cards,
        admin_crypto_wallets: settings.crypto_wallets,
        admin_payment_instructions: settings.admin_payment_instructions
      }),
      api.put<any>('/api/notifications/settings/telegram-bot', {
        bot_username: settings.bot_username,
        bot_token: settings.bot_token
      }).catch(() => {})
    ]);

    return this.getAdminSettings();
  },

  // --- BROADCASTS (Config Service) ---
  async sendEmailBroadcast(message: string): Promise<{ message: string }> {
    return await api.post<{ message: string }>('/api/config/admin/broadcast', { message });
  },

  async sendTelegramBroadcast(message: string): Promise<{ message: string }> {
    return await api.post<{ message: string }>('/api/config/admin/broadcast', { message });
  },
};