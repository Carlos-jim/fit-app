declare module "expo-file-system" {
  export const documentDirectory: string;
  export const cacheDirectory: string;

  export interface FileSystemCopyOptions {
    from: string;
    to: string;
  }

  export function copyAsync(options: FileSystemCopyOptions): Promise<void>;
  export function getInfoAsync(
    fileUri: string,
    options?: { md5?: boolean; size?: boolean },
  ): Promise<{
    exists: boolean;
    uri: string;
    size?: number;
    isDirectory?: boolean;
    md5?: string;
  }>;
  export function deleteAsync(fileUri: string, options?: { idempotent?: boolean }): Promise<void>;
  export function readAsStringAsync(
    fileUri: string,
    options?: { encoding?: "utf8" | "base64" },
  ): Promise<string>;
  export function writeAsStringAsync(
    fileUri: string,
    contents: string,
    options?: { encoding?: "utf8" | "base64" },
  ): Promise<void>;
  export function makeDirectoryAsync(
    fileUri: string,
    options?: { intermediates?: boolean },
  ): Promise<void>;
}
