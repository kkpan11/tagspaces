/**
 * TagSpaces - universal file and folder organizer
 * Copyright (C) 2017-present TagSpaces GmbH
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
import LoadingLazy from '-/components/LoadingLazy';
import { useSelector } from 'react-redux';
import { isFirstRun } from '-/reducers/settings';
import AppConfig from '-/AppConfig';

type OnboardingDialogContextData = {
  openOnboardingDialog: () => void;
  closeOnboardingDialog: () => void;
};

export const OnboardingDialogContext =
  createContext<OnboardingDialogContextData>({
    openOnboardingDialog: undefined,
    closeOnboardingDialog: undefined,
  });

export type OnboardingDialogContextProviderProps = {
  children: React.ReactNode;
};

const OnboardingDialog = React.lazy(
  () =>
    import(/* webpackChunkName: "OnboardingDialog" */ '../OnboardingDialog'),
);

export const OnboardingDialogContextProvider = ({
  children,
}: OnboardingDialogContextProviderProps) => {
  const firstRun: boolean = useSelector(isFirstRun);
  const open = useRef<boolean>(firstRun);

  const [ignored, forceUpdate] = useReducer((x) => x + 1, 0, undefined);

  useEffect(() => {
    if (AppConfig.isElectron) {
      window.electronIO.ipcRenderer.on('toggle-onboarding-dialog', () => {
        openDialog();
      });

      return () => {
        if (window.electronIO.ipcRenderer) {
          window.electronIO.ipcRenderer.removeAllListeners(
            'toggle-onboarding-dialog',
          );
        }
      };
    }
  }, []);

  function openDialog() {
    open.current = true;
    forceUpdate();
  }

  function closeDialog() {
    open.current = false;
    forceUpdate();
  }

  function OnboardingDialogAsync(props) {
    return (
      <React.Suspense fallback={<LoadingLazy />}>
        <OnboardingDialog {...props} />
      </React.Suspense>
    );
  }

  const context = useMemo(() => {
    return {
      openOnboardingDialog: openDialog,
      closeOnboardingDialog: closeDialog,
    };
  }, []);

  return (
    <OnboardingDialogContext.Provider value={context}>
      <OnboardingDialogAsync open={open.current} onClose={closeDialog} />
      {children}
    </OnboardingDialogContext.Provider>
  );
};
