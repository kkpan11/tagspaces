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

import AppConfig from '-/AppConfig';
import {
  CloseIcon,
  ExportIcon,
  FilterIcon,
  HelpIcon,
  ImportIcon,
  LocalLocationIcon,
  MoreMenuIcon,
  UpdateIndexIcon,
} from '-/components/CommonIcons';
import TsIconButton from '-/components/TsIconButton';
import TsMenuList from '-/components/TsMenuList';
import { useCurrentLocationContext } from '-/hooks/useCurrentLocationContext';
import { useLocationIndexContext } from '-/hooks/useLocationIndexContext';
import { Pro } from '-/pro';
import { isDesktopMode } from '-/reducers/settings';
import { openURLExternally } from '-/services/utils-io';
import { TS } from '-/tagspaces.namespace';
import { Divider } from '@mui/material';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Links from 'assets/links';
import { useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSelector } from 'react-redux';
import SidePanelTitle from '../SidePanelTitle';

interface Props {
  exportLocations: () => void;
  importLocations: () => void;
  showCreateLocationDialog: () => void;
  toggleFilter: () => void;
  filterActive: boolean;
}

function LocationManagerMenu(props: Props) {
  const {
    exportLocations,
    importLocations,
    showCreateLocationDialog,
    toggleFilter,
    filterActive,
  } = props;
  const { t } = useTranslation();
  const desktopMode = useSelector(isDesktopMode);

  const { createLocationsIndexes } = useLocationIndexContext();
  const { closeAllLocations } = useCurrentLocationContext();
  //const { openLinkDialog } = useLinkDialogContext();
  const [locationManagerMenuAnchorEl, setLocationManagerMenuAnchorEl] =
    useState<null | HTMLElement>(null);
  const workSpacesContext = Pro?.contextProviders?.WorkSpacesContext
    ? useContext<TS.WorkSpacesContextData>(
        Pro.contextProviders.WorkSpacesContext,
      )
    : undefined;

  const currentWorkSpace =
    workSpacesContext && workSpacesContext.getCurrentWorkSpace
      ? workSpacesContext?.getCurrentWorkSpace()
      : undefined;

  const menuItems = [];
  if (!AppConfig.ExtLocationsReadOnly) {
    menuItems.push(
      <MenuItem
        key="locationManagerMenuCreateLocation"
        data-tid="locationManagerMenuCreateLocation"
        onClick={() => {
          setLocationManagerMenuAnchorEl(null);
          showCreateLocationDialog();
        }}
      >
        <ListItemIcon>
          <LocalLocationIcon />
        </ListItemIcon>
        <ListItemText primary={t('core:createLocationTitle')} />
      </MenuItem>,
    );
    menuItems.push(<Divider key={`divider-${menuItems.length}`} />);
  }

  // Export/Import locations are free features available in every build.
  menuItems.push(
    <MenuItem
      key="locationManagerMenuExportLocationsTID"
      data-tid="locationManagerMenuExportLocationsTID"
      onClick={() => {
        setLocationManagerMenuAnchorEl(null);
        exportLocations();
      }}
    >
      <ListItemIcon>
        <ExportIcon />
      </ListItemIcon>
      <ListItemText primary={t('core:exportLocationTitle')} />
    </MenuItem>,
  );
  if (!AppConfig.ExtLocationsReadOnly) {
    menuItems.push(
      <MenuItem
        key="locationManagerMenuImportLocations"
        data-tid="locationManagerMenuImportLocationsTID"
        onClick={() => {
          setLocationManagerMenuAnchorEl(null);
          importLocations();
        }}
      >
        <ListItemIcon>
          <ImportIcon />
        </ListItemIcon>
        <ListItemText primary={t('core:importLocationTitle')} />
      </MenuItem>,
    );
    menuItems.push(<Divider key={`divider-${menuItems.length}`} />);
  }

  menuItems.push(
    <MenuItem
      key="locationManagerMenuCloseAll"
      data-tid="locationManagerMenuCloseAll"
      onClick={() => {
        setLocationManagerMenuAnchorEl(null);
        closeAllLocations();
      }}
    >
      <ListItemIcon>
        <CloseIcon />
      </ListItemIcon>
      <ListItemText primary={t('core:closeAllLocations')} />
    </MenuItem>,
  );

  menuItems.push(
    <MenuItem
      key="updateAllLocationIndexes"
      data-tid="updateAllLocationIndexes"
      onClick={() => {
        setLocationManagerMenuAnchorEl(null);
        createLocationsIndexes(true, currentWorkSpace);
      }}
    >
      <ListItemIcon>
        <UpdateIndexIcon />
      </ListItemIcon>
      <ListItemText primary={t('core:updateAllLocationIndexes')} />
    </MenuItem>,
  );
  menuItems.push(<Divider key={`divider-${menuItems.length}`} />);
  menuItems.push(
    <MenuItem
      key="locationManagerMenuHelp"
      data-tid="locationManagerMenuHelp"
      onClick={() => {
        setLocationManagerMenuAnchorEl(null);
        openURLExternally(Links.documentationLinks.locations, true);
      }}
    >
      <ListItemIcon>
        <HelpIcon />
      </ListItemIcon>
      <ListItemText primary={t('core:help')} />
    </MenuItem>,
  );

  return (
    <>
      <SidePanelTitle
        title={t('core:locationManager')}
        titleAdornment={
          desktopMode ? (
            <TsIconButton
              size="small"
              data-tid="locationManagerFilterTID"
              tooltip={t('core:filterLocations')}
              onClick={toggleFilter}
              sx={{
                marginTop: '8px',
                marginLeft: '6px',
                width: 18,
                height: 18,
                padding: '2px',
                borderRadius: '4px',
                border: '1px dashed',
                borderColor: filterActive ? 'text.primary' : 'text.disabled',
                color: filterActive ? 'text.primary' : 'text.disabled',
                '&:hover': {
                  borderColor: 'text.primary',
                  color: 'text.primary',
                },
              }}
            >
              <FilterIcon sx={{ fontSize: 13 }} />
            </TsIconButton>
          ) : null
        }
        menuButton={
          <TsIconButton
            data-tid="locationManagerMenu"
            onClick={(event) =>
              setLocationManagerMenuAnchorEl(event.currentTarget)
            }
          >
            <MoreMenuIcon />
          </TsIconButton>
        }
      />
      <Menu
        anchorEl={locationManagerMenuAnchorEl}
        open={Boolean(locationManagerMenuAnchorEl)}
        onClose={() => {
          setLocationManagerMenuAnchorEl(null);
        }}
      >
        <TsMenuList>{menuItems}</TsMenuList>
      </Menu>
    </>
  );
}
export default LocationManagerMenu;
