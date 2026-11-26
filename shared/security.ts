export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function escapeXml(value: string): string {
  return escapeHtml(value);
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function isSafeDestinationUrl(
  url: string,
  options: { allowRelative?: boolean; allowEmpty?: boolean } = { allowRelative: true, allowEmpty: false }
): boolean {
  const trimmed = url.trim();
  if (!trimmed) return Boolean(options.allowEmpty);
  if (trimmed.startsWith('/')) {
    return Boolean(options.allowRelative) && !trimmed.startsWith('//');
  }
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function sanitizeHref(url?: string | null): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (!trimmed) return undefined;
  return isSafeDestinationUrl(trimmed, { allowRelative: true, allowEmpty: false }) ? trimmed : undefined;
}

export function sanitizeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  let str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function parseCsvLine(line: string): string[] {
  const cols: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      cols.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  cols.push(current.trim());
  return cols;
}

export function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function shouldReleaseInventoryOnCancel(previousOrderStatus: string): boolean {
  return !['payment_failed', 'cancelled', 'refunded'].includes(previousOrderStatus);
}

export interface SecurityPolicyConfig {
  sessionTimeoutMinutes?: number;
  maxLoginAttempts?: number;
  lockoutMinutes?: number;
  minPasswordLength?: number;
  requireStrongPassword?: boolean;
  requireEmailVerification?: boolean;
}

export function validatePasswordAgainstPolicy(
  password: string,
  policy?: SecurityPolicyConfig | null
): { valid: boolean; message?: string } {
  const minLen = Math.min(32, Math.max(6, Number(policy?.minPasswordLength ?? 8)));
  if (password.length < minLen) {
    return {
      valid: false,
      message: `Password must be at least ${minLen} characters long.`,
    };
  }
  if (policy?.requireStrongPassword) {
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    if (!hasUpper || !hasLower || !hasDigit || !hasSpecial) {
      return {
        valid: false,
        message:
          'Strong password policy requires uppercase, lowercase, numeric, and special characters.',
      };
    }
  }
  return { valid: true };
}

export function computeSessionTtl(
  sessionTimeoutMinutes?: number | null
): { expiresInSeconds: number; maxAgeMs: number } {
  const minutes = Math.min(43200, Math.max(15, Number(sessionTimeoutMinutes || 10080)));
  const expiresInSeconds = Math.round(minutes * 60);
  return {
    expiresInSeconds,
    maxAgeMs: expiresInSeconds * 1000,
  };
}
