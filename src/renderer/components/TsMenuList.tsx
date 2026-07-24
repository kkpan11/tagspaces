/**
 * TagSpaces - universal file and folder organizer
 * Copyright (C) 2024-present TagSpaces GmbH
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

import AppConfig from '-/AppConfig';
import { isDesktopMode } from '-/reducers/settings';
import MenuList, { MenuListProps } from '@mui/material/MenuList';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';

export type TSButtonProps = MenuListProps & {};

function TsMenuList(props: TSButtonProps) {
  const { children, sx, ...rest } = props;
  const desktopMode = useSelector(isDesktopMode);

  // On touch devices the tap / long-press that opens the menu is immediately
  // followed by a synthesized click that lands on the first item rendered under
  // the finger, auto-selecting it. The list mounts when the menu opens, so we
  // ignore pointer events on it for a short window to swallow that ghost click;
  // the menu becomes interactive right after. Desktop is unaffected.
  const [interactive, setInteractive] = useState(!AppConfig.isNativeMobile);
  useEffect(() => {
    if (!AppConfig.isNativeMobile) {
      return undefined;
    }
    const timer = setTimeout(() => setInteractive(true), 350);
    return () => clearTimeout(timer);
  }, []);

  return (
    <MenuList
      dense={desktopMode ? true : false}
      sx={{ ...sx, pointerEvents: interactive ? undefined : 'none' }}
      {...rest}
    >
      {children}
    </MenuList>
  );
}

export default TsMenuList;
