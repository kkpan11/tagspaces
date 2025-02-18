/**
 * TagSpaces - universal file and folder organizer
 * Copyright (C) 2023-present TagSpaces GmbH
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

import React, {
  createContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import { extractContainingDirectoryPath } from '@tagspaces/tagspaces-common/paths';
import { TS } from '-/tagspaces.namespace';
import { useCurrentLocationContext } from '-/hooks/useCurrentLocationContext';
import useFirstRender from '-/utils/useFirstRender';

type SelectedEntryContextData = {
  selectedEntries: TS.FileSystemEntry[];
  lastSelectedEntryPath: string;
  setSelectedEntries(entries: TS.FileSystemEntry[]);
  selectEntry(entry: TS.FileSystemEntry, select?: boolean);
};

export const SelectedEntryContext = createContext<SelectedEntryContextData>({
  selectedEntries: undefined,
  lastSelectedEntryPath: undefined,
  setSelectedEntries: undefined,
  selectEntry: undefined,
});

export type SelectedEntryContextProviderProps = {
  children: React.ReactNode;
};

export const SelectedEntryContextProvider = ({
  children,
}: SelectedEntryContextProviderProps) => {
  const { currentLocationId } = useCurrentLocationContext();
  const selectedEntries = useRef<TS.FileSystemEntry[]>([]);
  const firstRender = useFirstRender();
  const [ignored, forceUpdate] = useReducer((x) => x + 1, 0, undefined);

  useEffect(() => {
    if (!firstRender && !currentLocationId) {
      setSelectedEntries([]);
    }
  }, [currentLocationId]);

  //const lastSelectedEntry = useRef<TS.FileSystemEntry>(undefined);

  /*function getLastSelectedEntry() {
    if (selectedEntries && selectedEntries.length > 0) {
      return selectedEntries[selectedEntries.length - 1];
    }
    return undefined;
  }*/
  const setSelectedEntries = (entries: TS.FileSystemEntry[]) => {
    selectedEntries.current = entries ? entries : [];
    forceUpdate();
  };

  const selectEntry = (entry: TS.FileSystemEntry, select: boolean = true) => {
    if (select) {
      if (!selectedEntries.current.some((e) => e.path === entry.path)) {
        // exclude current folder from selection
        const currentFolder = extractContainingDirectoryPath(entry.path);
        const currentSelected = selectedEntries.current.filter((data) => {
          const parentFolder = extractContainingDirectoryPath(data.path);
          return parentFolder === currentFolder;
        });
        selectedEntries.current = [...currentSelected, entry];
      }
    } else {
      //deselect
      selectedEntries.current = selectedEntries.current.filter(
        (data) => data.path !== entry.path,
      );
    }
    forceUpdate();
  };

  const lastSelectedEntryPath = useMemo(() => {
    if (selectedEntries.current && selectedEntries.current.length > 0) {
      return selectedEntries.current[selectedEntries.current.length - 1].path;
    }
    return undefined;
  }, [selectedEntries.current]);

  const context = useMemo(() => {
    return {
      selectedEntries: selectedEntries.current,
      lastSelectedEntryPath,
      setSelectedEntries,
      selectEntry,
    };
  }, [selectedEntries.current]);

  return (
    <SelectedEntryContext.Provider value={context}>
      {children}
    </SelectedEntryContext.Provider>
  );
};
