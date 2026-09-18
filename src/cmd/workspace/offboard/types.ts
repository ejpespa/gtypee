export interface OffboardUserOptions {
  email: string;
  dryRun?: boolean | undefined;
  wipeDevices?: boolean | undefined;
  transferDriveTo?: string | undefined;
  removeFromGroups?: boolean | undefined;
  forceAdminOffboard?: boolean | undefined;
}

export interface OffboardStepResult {
  name: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  detail?: string | undefined;
  error?: string | undefined;
}

export interface OffboardSummary {
  email: string;
  dryRun: boolean;
  success: boolean;
  completedAt: string;
  steps: OffboardStepResult[];
}

export interface TargetUserInfo {
  id: string;
  primaryEmail: string;
  isAdmin: boolean;
}

export interface OffboardPipelineDeps {
  getCallerEmail: () => Promise<string>;
  getTargetUser: (email: string) => Promise<TargetUserInfo>;
  countActiveAdmins?: (() => Promise<number>) | undefined;
  demoteAdmin?: ((email: string) => Promise<{ success: boolean; error?: string | undefined }>) | undefined;
  containUser: (email: string) => Promise<{ success: boolean; error?: string | undefined }>;
  evictSessionsAndTokens: (email: string) => Promise<{ success: boolean; tokensRevoked?: number | undefined; error?: string | undefined }>;
  wipeUserDevices?: ((email: string) => Promise<{ wipedCount: number; error?: string | undefined }>) | undefined;
  transferDriveFiles?: ((sourceEmail: string, destEmail: string) => Promise<{ success: boolean; transferId?: string | undefined; error?: string | undefined }>) | undefined;
  removeFromAllGroups?: ((email: string) => Promise<{ removedCount: number; error?: string | undefined }>) | undefined;
  onStepUpdate?: ((step: OffboardStepResult) => void) | undefined;
}
