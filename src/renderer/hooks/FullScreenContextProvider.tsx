/*
Copyright (c) 2024-present The TagSpaces GmbH. All rights reserved.
*/

import React, {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import AppConfig from '-/AppConfig';
import fscreen from 'fscreen';
import { useOpenedEntryContext } from '-/hooks/useOpenedEntryContext';

type FullScreenContextData = {
  isFullscreen: boolean;
  setFullscreen: (fullScreen: boolean) => void;
  toggleFullScreen: (element: HTMLDivElement) => void;
};

export const FullScreenContext = createContext<FullScreenContextData>({
  isFullscreen: undefined,
  setFullscreen: undefined,
  toggleFullScreen: undefined,
});

export type FullScreenContextProviderProps = {
  children: React.ReactNode;
};

export const FullScreenContextProvider = ({
  children,
}: FullScreenContextProviderProps) => {
  const { openedEntry } = useOpenedEntryContext();
  const [isFullscreen, setFullscreen] = useState<boolean>(false);

  // On iOS the native (element) Fullscreen API leaves WKWebView with a stale
  // status-bar inset after exit — the whole app ends up shifted/short and it
  // can't be corrected reliably from JS. So on iOS we don't use the native API
  // at all: we just flip `isFullscreen` and FileView styles its container as a
  // fixed, full-viewport overlay (CSS fullscreen). No native frame change → no
  // inset bug. Everywhere else keeps the real Fullscreen API via fscreen.
  const useCssFullscreen = AppConfig.isCapacitoriOS;

  const toggleFullScreen = useCallback(
    (element: HTMLDivElement) => {
      if (!openedEntry.isFile) {
        return;
      }
      if (useCssFullscreen) {
        setFullscreen((prev) => !prev);
        return;
      }
      if (isFullscreen) {
        fscreen.exitFullscreen();
      } else {
        fscreen.requestFullscreen(element); //fileViewerContainer.current);
      }
    },
    [isFullscreen, openedEntry.isFile, useCssFullscreen],
  );

  // Safety: drop CSS fullscreen when no file is open (entry closed), so it can't
  // get stuck on. File navigation (prev/next) keeps a file open, so fullscreen
  // persists across it — matching the native behaviour.
  useEffect(() => {
    if (useCssFullscreen && !openedEntry?.isFile) {
      setFullscreen(false);
    }
  }, [openedEntry?.isFile, useCssFullscreen]);

  const context = useMemo(() => {
    return {
      isFullscreen,
      setFullscreen,
      toggleFullScreen,
    };
  }, [isFullscreen]);

  return (
    <FullScreenContext.Provider value={context}>
      {children}
    </FullScreenContext.Provider>
  );
};
