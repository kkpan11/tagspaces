/**
 * TagSpaces - universal file and folder organizer
 * Copyright (C) 2023-present TagSpaces UG (haftungsbeschraenkt)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License (version 3) as
 * published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *
 */

import React, { createContext, useEffect, useMemo, useRef } from 'react';
import { useCurrentLocationContext } from '-/hooks/useCurrentLocationContext';
import PlatformIO from '-/services/platform-facade';
import AppConfig from '-/AppConfig';
import {
  extractContainingDirectoryPath,
  getFileLocationFromMetaFile,
} from '@tagspaces/tagspaces-common/paths';
import { locationType } from '@tagspaces/tagspaces-common/misc';
import { PerspectiveIDs } from '-/perspectives';
import { useDirectoryContentContext } from '-/hooks/useDirectoryContentContext';
import { toFsEntry } from '-/services/utils-io';
import { Changed } from '../../main/chokidarWatcher';
import { useEditedEntryContext } from '-/hooks/useEditedEntryContext';

type FSWatcherContextData = {
  ignored: string[];
  stopWatching: () => void;
  folderChanged: (event: string, path: string) => void;
  addToIgnored: (path: string) => void;
  removeFromIgnored: (path: string) => void;
  ignoreByWatcher: (...paths: string[]) => void;
  deignoreByWatcher: (...paths: string[]) => void;
};

export const FSWatcherContext = createContext<FSWatcherContextData>({
  ignored: undefined,
  folderChanged: undefined,
  stopWatching: undefined,
  addToIgnored: undefined,
  removeFromIgnored: undefined,
  ignoreByWatcher: undefined,
  deignoreByWatcher: undefined,
});

export type FSWatcherContextProviderProps = {
  children: React.ReactNode;
};

export const FSWatcherContextProvider = ({
  children,
}: FSWatcherContextProviderProps) => {
  const { currentLocation } = useCurrentLocationContext();
  const {
    currentDirectoryEntries,
    loadDirectoryContent,
    currentDirectoryPath,
    currentDirectoryPerspective,
  } = useDirectoryContentContext();
  const { reflectDeleteEntries, reflectAddEntry, reflectUpdateMeta } =
    useEditedEntryContext();
  const ignored = useRef<string[]>([]);
  const watchingFolderPath = useRef<string>(undefined);

  useEffect(() => {
    if (
      currentLocation &&
      currentLocation.watchForChanges &&
      currentLocation.type !== locationType.TYPE_CLOUD
    ) {
      if (currentDirectoryPath && currentDirectoryPath.length > 0) {
        const depth =
          currentDirectoryPerspective === PerspectiveIDs.KANBAN ? 3 : 1;

        watchFolder(currentDirectoryPath, depth);
      }
    } else {
      stopWatching();
    }
  }, [currentLocation, currentDirectoryPath]);

  function watchFolder(locationPath, depth) {
    console.log('Start watching: ' + locationPath);
    stopWatching();
    watchingFolderPath.current = locationPath;
    PlatformIO.watchFolder(locationPath, depth);
  }

  const folderChanged = useMemo(() => {
    return (event, path): void => {
      console.log(`File ${path} has been ${event}`);
      if (watchingFolderPath.current === undefined) {
        return;
      }
      if (path.endsWith(AppConfig.metaFolder)) {
        // .ts dir created
        return;
      }
      // console.log(`ignored list:` + JSON.stringify(ignored.current));
      const pathParts = path.split(PlatformIO.getDirSeparator());
      for (let i = 0; i < ignored.current.length; i++) {
        if (
          path.startsWith(ignored.current[i]) ||
          pathParts.includes(ignored.current[i])
        ) {
          // ignored.current.splice(i, 1);
          return;
        }
      }

      switch (event) {
        case 'unlink':
        case 'unlinkDir':
          if (
            //currentDirectoryEntries.some((entry) => path === entry.path) &&
            !path.includes(AppConfig.metaFolder)
          ) {
            reflectDeleteEntries(toFsEntry(path, false));
          }
          break;
        case 'add':
          if (!path.includes(AppConfig.metaFolder)) {
            reflectAddEntry(toFsEntry(path, true));
          }
          break;
        case 'addDir':
          if (!path.includes(AppConfig.metaFolder)) {
            reflectAddEntry(toFsEntry(path, false));
          }
          break;
        case 'change':
          console.log(`File ${path} has been changed`);

          // watching for changed sidecar files .ts/file.jpg.json
          if (path.includes(AppConfig.metaFolder)) {
            // todo reload meta for changed file only
            if (path.endsWith(AppConfig.metaFileExt)) {
              // endsWith json
              const filePath = getFileLocationFromMetaFile(
                path,
                PlatformIO.getDirSeparator(),
              );
              reflectUpdateMeta(filePath);
            }
            if (path.endsWith(AppConfig.metaFolderFile)) {
              // endsWith tsm.json
              const directoryPath = getFileLocationFromMetaFile(
                path,
                PlatformIO.getDirSeparator(),
              );
              loadDirectoryContent(
                extractContainingDirectoryPath(
                  directoryPath,
                  PlatformIO.getDirSeparator(),
                ),
                false,
                true,
              );
            }
          }
          // } else { // TODO a separate watcher for the currently opened file should be created
          //   // handle file content changed
          //   dispatch(appActions.reflectUpdateOpenedFileContent(path));
          // }
          break;
        default:
          console.log(event, path);
          break;
      }
    };
  }, [currentDirectoryEntries, ignored.current]);

  useEffect(() => {
    if (AppConfig.isElectron) {
      window.electronIO.ipcRenderer.on('folderChanged', (message: Changed) => {
        const { path, eventName } = message;
        folderChanged(eventName, path);
      });

      return () => {
        window.electronIO.ipcRenderer.removeAllListeners('folderChanged');
      };
    }
  }, [folderChanged]);

  function stopWatching() {
    watchingFolderPath.current = undefined;
  }

  function isWatching() {
    return watchingFolderPath.current !== undefined; //watcher !== undefined; //&& !watcher.closed;
  }

  function addToIgnored(path: string) {
    const index = ignored.current.indexOf(path);
    if (index === -1) {
      ignored.current.push(path);
    }
  }

  function removeFromIgnored(path: string) {
    setTimeout(() => {
      for (let i = 0; i < ignored.current.length; i++) {
        const pathParts = ignored.current[i].split(
          PlatformIO.getDirSeparator(),
        );
        if (path.startsWith(ignored.current[i]) || pathParts.includes(path)) {
          ignored.current.splice(i, 1);
        }
      }
    }, 2000);
  }

  function ignoreByWatcher(...paths) {
    if (isWatching()) {
      for (let i = 0; i < paths.length; i += 1) {
        addToIgnored(paths[i]);
      }
    }
  }

  function deignoreByWatcher(...paths) {
    if (isWatching()) {
      for (let i = 0; i < paths.length; i += 1) {
        removeFromIgnored(paths[i]);
      }
    }
  }

  const context = useMemo(() => {
    return {
      ignored: ignored.current,
      stopWatching,
      addToIgnored,
      folderChanged,
      removeFromIgnored,
      ignoreByWatcher,
      deignoreByWatcher,
    };
  }, [ignored.current]);

  return (
    <FSWatcherContext.Provider value={context}>
      {children}
    </FSWatcherContext.Provider>
  );
};
