import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const root = process.cwd();
const srcDir = join(root, 'src');

const ignoredDirs = new Set(['node_modules', 'dist', 'coverage', '.git', 'migrations']);
const scannedExtensions = new Set(['.ts', '.js', '.mjs', '.cjs', '.json']);

const patternChecks = [
  {
    name: 'Hardcoded JWT fallback secret',
    regex: /secretKeyDefault/i,
  },
  {
    name: 'Committed OpenAI API key',
    regex: /sk-(?:proj-)?[A-Za-z0-9_-]{20,}/,
  },
  {
    name: 'Committed Google API key',
    regex: /AIza[0-9A-Za-z_-]{20,}/,
  },
  {
    name: 'Inline database URL',
    regex: /DATABASE_URL\s*=\s*['"`][^'"`]+['"`]/,
  },
  {
    name: 'Raw AI response logging',
    regex: /console\.log\(\s*['"`]--- RAW AI RESPONSE/i,
  },
  {
    name: 'Prompt or answer debug logging',
    regex: /console\.log\([^)]*(PROMPT|Payload decoded|Received answers|Selected Module|selectedCardId)/i,
  },
  {
    name: 'Public token regeneration route',
    regex: /@Post\(['"`]\/:id_user['"`]\)(?![\s\S]{0,240}@UseGuards\(AuthGuard\(['"`]jwt['"`]\)\))/,
  },
  {
    name: 'Unsanitized login user response',
    regex: /return\s*\{[\s\S]{0,1200}user:\s*finalUser/,
  },
];

const requiredContentChecks = [
  {
    file: 'src/auth/auth.module.ts',
    text: 'JWT_SECRET must be configured.',
    message: 'JWT secret must fail fast when missing.',
  },
  {
    file: 'src/auth/auth.service.ts',
    text: 'sanitizeUser(finalUser)',
    message: 'Login response must sanitize database user records.',
  },
  {
    file: 'src/users/users.controller.ts',
    text: "Cannot query another user profile.",
    message: 'Email lookup endpoint must block user enumeration.',
  },
  {
    file: 'src/users/users.controller.ts',
    text: "Cannot generate token for another user.",
    message: 'Token regeneration endpoint must be self-only.',
  },
];

function extensionOf(path) {
  const index = path.lastIndexOf('.');
  return index === -1 ? '' : path.slice(index);
}

function walk(dir) {
  const entries = readdirSync(dir);
  const files = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (!ignoredDirs.has(entry)) {
        files.push(...walk(fullPath));
      }
      continue;
    }

    if (scannedExtensions.has(extensionOf(entry))) {
      files.push(fullPath);
    }
  }

  return files;
}

const violations = [];

if (!existsSync(srcDir)) {
  violations.push('src directory was not found.');
} else {
  for (const file of walk(srcDir)) {
    const content = readFileSync(file, 'utf8');
    const displayPath = relative(root, file);

    for (const check of patternChecks) {
      if (check.regex.test(content)) {
        violations.push(`${displayPath}: ${check.name}`);
      }
    }
  }
}

for (const check of requiredContentChecks) {
  const file = join(root, check.file);
  const content = existsSync(file) ? readFileSync(file, 'utf8') : '';

  if (!content.includes(check.text)) {
    violations.push(`${check.file}: ${check.message}`);
  }
}

if (violations.length > 0) {
  console.error('Security check failed:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exit(1);
}

console.log('Security check passed.');
