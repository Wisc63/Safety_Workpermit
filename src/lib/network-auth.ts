import { execSync } from 'child_process';

const SHARE = '\\192.168.42.41\Public';
const USER = 'smpcplc\ee-center';
const PASSWORD = 'Smpc@ee123';

export function ensureNetworkAccess() {
  try {
    execSync(`net use "${SHARE}" /user:"${USER}" "${PASSWORD}" /persistent:no`, { stdio: 'pipe' });
  } catch {
    // Already connected or non-fatal — proceed
  }
}
