'use client'

import { PublicClientApplication, Configuration, AccountInfo, AuthenticationResult, SilentRequest, RedirectRequest, InteractionRequiredAuthError } from '@azure/msal-browser';

type DriveItem = {
  id: string;
  name: string;
  size?: number;
  folder?: any;
  file?: any;
};

class OneDriveService {
  private static instance: OneDriveService;
  private pca: PublicClientApplication | null = null;
  private account: AccountInfo | null = null;
  private initialized = false;

  private graphScopes = ['User.Read', 'Files.Read', 'Files.Read.All', 'offline_access'];

  private constructor() {}

  static getInstance(): OneDriveService {
    if (!OneDriveService.instance) {
      OneDriveService.instance = new OneDriveService();
    }
    return OneDriveService.instance;
  }

  private getConfig(): Configuration {
    const clientId = process.env.NEXT_PUBLIC_MSAL_CLIENT_ID || '';
    const redirectUri = process.env.NEXT_PUBLIC_MSAL_REDIRECT_URI || (typeof window !== 'undefined' ? window.location.origin : '');
    if (!clientId) {
      throw new Error('Missing NEXT_PUBLIC_MSAL_CLIENT_ID env var for OneDrive authentication');
    }
    return {
      auth: {
        clientId,
        authority: 'https://login.microsoftonline.com/common',
        redirectUri,
        navigateToLoginRequestUrl: true
      },
      cache: {
        cacheLocation: 'localStorage',
        storeAuthStateInCookie: true
      }
    } as Configuration;
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    this.pca = new PublicClientApplication(this.getConfig());
    // MSAL v3 requires initialize() before any other API calls
    await this.pca.initialize();
    const result = await this.pca.handleRedirectPromise();
    if (result) {
      this.account = result.account;
      this.pca.setActiveAccount(result.account);
    } else {
      const acc = this.pca.getActiveAccount() || (this.pca.getAllAccounts()[0] || null);
      if (acc) this.pca.setActiveAccount(acc);
      this.account = this.pca.getActiveAccount();
    }
    this.initialized = true;
  }

  isSignedIn(): boolean {
    return !!this.account;
  }

  getUsername(): string | null {
    return this.account?.username || null;
  }

  async login(): Promise<void> {
    if (!this.pca) await this.init();
    const request: RedirectRequest = { scopes: this.graphScopes, redirectStartPage: typeof window !== 'undefined' ? window.location.href : undefined };
    await this.pca!.loginRedirect(request);
  }

  private async acquireToken(): Promise<string> {
    if (!this.pca) await this.init();
    if (!this.account) throw new Error('Not signed in');
    const req: SilentRequest = { scopes: this.graphScopes, account: this.account };
    try {
      const res = await this.pca!.acquireTokenSilent(req);
      return res.accessToken;
    } catch (err: any) {
      if (err instanceof InteractionRequiredAuthError) {
        await this.pca!.acquireTokenRedirect({ scopes: this.graphScopes });
        throw new Error('Redirecting for authentication');
      }
      throw err;
    }
  }

  async getUserProfile(): Promise<{ displayName?: string; userPrincipalName?: string } | null> {
    try {
      const token = await this.acquireToken();
      const res = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }

  private makeChildrenUrl(path: string): string {
    if (!path || path === '/' || path === '') {
      return 'https://graph.microsoft.com/v1.0/me/drive/root/children?$top=200';
    }
    // Ensure path starts with '/'
    const normalized = path.startsWith('/') ? path : `/${path}`;
    const encoded = encodeURI(normalized);
    return `https://graph.microsoft.com/v1.0/me/drive/root:${encoded}:/children?$top=200`;
  }

  private makeContentUrl(path: string): string {
    // Ensure path starts with '/'
    const start = path.startsWith('/') ? path : `/${path}`;
    // Collapse duplicate slashes
    const normalized = start.replace(/\/+/, '/');
    const encoded = encodeURI(normalized);
    return `https://graph.microsoft.com/v1.0/me/drive/root:${encoded}:/content`;
  }

  async listChildren(path: string): Promise<Array<{ name: string; isDir: boolean; size?: number; id: string }>> {
    const token = await this.acquireToken();
    const url = this.makeChildrenUrl(path);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error('Failed to list OneDrive files');
    const data = await res.json();
    const items: DriveItem[] = data.value || [];
    const entries = items.map((i) => ({
      id: i.id,
      name: i.name,
      isDir: !!i.folder,
      size: i.folder ? undefined : i.size
    }));
    // Folders first, then by name
    entries.sort((a, b) => (a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1));
    return entries;
  }

  async readFile(path: string): Promise<Uint8Array> {
    const token = await this.acquireToken();
    const url = this.makeContentUrl(path);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`Failed to read OneDrive file: ${res.status} ${res.statusText}`);
    const buf = await res.arrayBuffer();
    return new Uint8Array(buf);
  }
}

export const oneDrive = OneDriveService.getInstance();
