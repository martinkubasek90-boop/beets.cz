import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { defaultFveAdminConfig, mergeFveAdminConfig, type FveAdminConfig } from '@/lib/fve-admin-config-shared';

const CONFIG_PATH = path.join(process.cwd(), 'data', 'fve-admin-config.json');

export async function getFveAdminConfig(): Promise<FveAdminConfig> {
  try {
    const raw = await readFile(CONFIG_PATH, 'utf8');
    return mergeFveAdminConfig(JSON.parse(raw));
  } catch {
    return defaultFveAdminConfig;
  }
}

export async function saveFveAdminConfig(config: FveAdminConfig): Promise<FveAdminConfig> {
  const merged = mergeFveAdminConfig(config);
  await mkdir(path.dirname(CONFIG_PATH), { recursive: true });
  await writeFile(CONFIG_PATH, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');
  return merged;
}
