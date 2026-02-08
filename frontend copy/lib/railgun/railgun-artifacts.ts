import { ArtifactStore } from '@railgun-community/wallet';
import { createRailgunDatabase } from './railgun-database';

/**
 * Creates a browser-compatible artifact store for Railgun SDK
 * Manages persistent storage of ZK proof artifact files (~50MB total)
 * @returns ArtifactStore instance with get, store, and exists methods
 */
export const createBrowserArtifactStore = (): ArtifactStore => {
  const db = createRailgunDatabase();

  const get = async (path: string) => {
    return new Promise<string | Buffer | null>((resolve, reject) => {
      db.get(`artifact-${path}`, (err: any, value: any) => {
        if (err) {
          if (err.message && err.message.includes('Key not found')) {
            resolve(null);
          } else {
            reject(err);
          }
        } else {
          resolve(value);
        }
      });
    });
  };

  const store = async (dir: string, path: string, item: string | Uint8Array) => {
    return new Promise<void>((resolve, reject) => {
      db.put(`artifact-${path}`, item, (err: any) => {
        if (err) reject(err);
        else resolve();
      });
    });
  };

  const exists = async (path: string) => {
    return new Promise<boolean>((resolve) => {
      db.get(`artifact-${path}`, (err: any) => {
        resolve(!err);
      });
    });
  };

  return new ArtifactStore(get, store, exists);
};
