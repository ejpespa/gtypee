let lastOrgUnitPath = '/';

export function getLastOrgUnitPath(): string {
  return lastOrgUnitPath;
}

export function setLastOrgUnitPath(path: string): void {
  lastOrgUnitPath = path || '/';
}