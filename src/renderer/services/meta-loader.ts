import { TS } from '-/tagspaces.namespace';
import PlatformIO from '-/services/platform-facade';
import { getMetaForEntry } from '-/services/utils-io';
import {
  getMetaFileLocationForDir,
  getMetaFileLocationForFile,
  getThumbFileLocationForDirectory,
  getThumbFileLocationForFile,
} from '@tagspaces/tagspaces-common/paths';
import AppConfig from '-/AppConfig';

export function loadCurrentDirMeta(
  directoryPath: string,
  dirEntries: TS.FileSystemEntry[],
  pageFiles?: TS.FileSystemEntry[],
): Promise<TS.FileSystemEntry[]> {
  return PlatformIO.listMetaDirectoryPromise(directoryPath)
    .then((meta) => {
      const dirEntriesPromises = dirEntries
        .filter((entry) => !entry.isFile)
        .map((entry) => getEnhancedDir(entry));
      const files = pageFiles
        ? pageFiles
        : dirEntries.filter((entry) => entry.isFile);
      const fileEntriesPromises = getFileEntriesPromises(files, meta);
      const thumbs = getThumbs(files, meta);
      return getEntries([
        ...dirEntriesPromises,
        ...fileEntriesPromises,
        ...thumbs,
      ]);
    })
    .catch((ex) => {
      console.log(ex);
      return undefined;
    });
}

function getEntries(metaPromises): Promise<TS.FileSystemEntry[]> {
  const catchHandler = (error) => undefined;
  return Promise.all(metaPromises.map((promise) => promise.catch(catchHandler)))
    .then((entries: TS.FileSystemEntry[]) => {
      return entries;
    })
    .catch((err) => {
      console.log('err updateEntries:', err);
      return undefined;
    });
}

function getFileEntriesPromises(
  pageFiles: TS.FileSystemEntry[],
  meta: Array<any>,
): Promise<TS.FileSystemEntry>[] {
  return pageFiles.map((entry) => {
    const metaFilePath = getMetaFileLocationForFile(
      entry.path,
      PlatformIO.getDirSeparator(),
    );
    if (
      // check if metaFilePath exist in listMetaDirectory content
      meta.some((metaFile) => metaFilePath.endsWith(metaFile.path)) &&
      // !checkEntryExist(entry.path) &&
      entry.path.indexOf(
        AppConfig.metaFolder + PlatformIO.getDirSeparator(),
      ) === -1
    ) {
      return getMetaForEntry(entry, metaFilePath); /*Promise.resolve({
          [entry.path]: getMetaForEntry(entry, metaFilePath)
        });*/
    }
    return Promise.resolve(entry); //Promise.resolve({ [entry.path]: undefined });
  });
}

function getThumbs(
  pageFiles: TS.FileSystemEntry[],
  meta: Array<any>,
): Promise<TS.FileSystemEntry>[] {
  return pageFiles.map((entry) =>
    Promise.resolve(setThumbForEntry(entry, meta)),
  );
}

function setThumbForEntry(
  entry: TS.FileSystemEntry,
  meta: Array<any>,
): TS.FileSystemEntry {
  const thumbEntry = { ...entry, tags: [] };
  let thumbPath = getThumbFileLocationForFile(
    entry.path,
    PlatformIO.getDirSeparator(),
    false,
  );
  if (thumbPath && meta.some((metaFile) => thumbPath.endsWith(metaFile.path))) {
    thumbEntry.thumbPath = thumbPath;
    if (PlatformIO.haveObjectStoreSupport() || PlatformIO.haveWebDavSupport()) {
      if (thumbPath && thumbPath.startsWith('/')) {
        thumbPath = thumbPath.substring(1);
      }

      thumbPath = PlatformIO.getURLforPath(thumbPath, 604800);
      if (thumbPath) {
        thumbEntry.thumbPath = thumbPath;
      }
    }
  }
  return thumbEntry;
}

export function getEnhancedDir(
  entry: TS.FileSystemEntry,
): Promise<TS.FileSystemEntry> {
  if (!entry) {
    return Promise.resolve(undefined);
  }
  if (entry.isFile) {
    return Promise.reject(
      new Error('getEnhancedDir accept dir only:' + entry.path),
    );
  }
  if (entry.name === AppConfig.metaFolder) {
    return Promise.resolve(undefined);
  }
  return PlatformIO.listMetaDirectoryPromise(entry.path).then((meta) => {
    const metaFilePath = getMetaFileLocationForDir(
      entry.path,
      PlatformIO.getDirSeparator(),
    );
    const thumbDirPath = getThumbFileLocationForDirectory(
      entry.path,
      PlatformIO.getDirSeparator(),
    );
    let enhancedEntry;
    if (meta.some((metaFile) => thumbDirPath.endsWith(metaFile.path))) {
      const thumbPath =
        PlatformIO.haveObjectStoreSupport() || PlatformIO.haveWebDavSupport()
          ? PlatformIO.getURLforPath(thumbDirPath)
          : thumbDirPath;
      enhancedEntry = { ...entry, thumbPath };
    }
    if (
      meta.some((metaFile) => metaFilePath.endsWith(metaFile.path)) &&
      entry.path.indexOf(
        AppConfig.metaFolder + PlatformIO.getDirSeparator(),
      ) === -1
    ) {
      return getMetaForEntry(enhancedEntry || entry, metaFilePath);
    }
    return enhancedEntry;
  });
}
