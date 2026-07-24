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
 */

import AppConfig from '-/AppConfig';
import {
  AddExistingFileIcon,
  AudioRecordIcon,
  DownloadIcon,
  HTMLFileIcon,
  LinkFileIcon,
  MarkdownFileIcon,
  NewFileIcon,
  NewFolderIcon,
  SmallArrowRightIcon,
  TakePictureIcon,
  TemplateFileIcon,
} from '-/components/CommonIcons';
import { useDownloadUrlDialogContext } from '-/components/dialogs/hooks/useDownloadUrlDialogContext';
import { BetaLabel, ProLabel } from '-/components/HelperComponents';
import InfoIcon from '-/components/InfoIcon';
import TsMenuList from '-/components/TsMenuList';
import { Pro } from '-/pro';
import { isHideProFeatures } from '-/reducers/settings';
import { TS } from '-/tagspaces.namespace';
import Divider from '@mui/material/Divider';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { useState } from 'react';
import { useSelector } from 'react-redux';

interface Props {
  onClose: () => void;
  t: (txt: string) => string;
  createNewFile?: (fileType?: TS.FileType) => void;
  createNewAudio?: () => void;
  showCreateDirectoryDialog?: () => void;
  addExistingFile?: () => void;
  cameraTakePicture?: () => void;
}

/**
 * The "New ▸" entry of the directory context menu: a single parent item that
 * opens a submenu holding every create/add action (new text/markdown/rich-text/
 * link/template/audio file, new subfolder, add from device). Encapsulates its
 * own submenu anchor state so getDirectoryMenuItems stays a flat array builder.
 * Mirrors the hover-opened submenu pattern in FileMenu's "Open with".
 */
function NewSubMenu(props: Props) {
  const {
    onClose,
    t,
    createNewFile,
    createNewAudio,
    showCreateDirectoryDialog,
    addExistingFile,
    cameraTakePicture,
  } = props;
  const hideProFeatures: boolean = useSelector(isHideProFeatures);
  const { openDownloadUrl } = useDownloadUrlDialogContext();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  // Run a create action and dismiss the whole menu chain.
  const run = (action: () => void) => {
    setAnchorEl(null);
    onClose();
    action();
  };

  return (
    <>
      <MenuItem
        data-tid="createNewSubmenuTID"
        onClick={(e) => setAnchorEl(e.currentTarget)}
        onMouseEnter={(e) => setAnchorEl(e.currentTarget)}
      >
        <ListItemIcon>
          <NewFileIcon />
        </ListItemIcon>
        <ListItemText primary={t('core:new')} />
        <SmallArrowRightIcon fontSize="small" />
      </MenuItem>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
        // Desktop: let the submenu's modal backdrop pass pointer events through
        // to the parent menu so its other items stay clickable while this
        // hover-opened submenu is shown (the paper re-enables clicks). Since it
        // opens on hover, close it again on hover-out. On touch there is no
        // hover, so keep a normal modal backdrop — tapping outside dismisses it.
        slotProps={
          AppConfig.isNativeMobile
            ? undefined
            : {
                root: { sx: { pointerEvents: 'none' } },
                paper: {
                  sx: { pointerEvents: 'auto' },
                  onMouseLeave: () => setAnchorEl(null),
                },
              }
        }
      >
        <TsMenuList>
          {createNewFile && [
            <MenuItem
              key="createNewTextFile"
              data-tid="createNewTextFileTID"
              onClick={() => run(() => createNewFile('txt'))}
            >
              <ListItemIcon>
                <NewFileIcon />
              </ListItemIcon>
              <ListItemText primary={t('core:createTextFile')} />
            </MenuItem>,
            <MenuItem
              key="createNewMarkdownFile"
              data-tid="createNewMarkdownFileTID"
              onClick={() => run(() => createNewFile('md'))}
            >
              <ListItemIcon>
                <MarkdownFileIcon />
              </ListItemIcon>
              <ListItemText primary={t('core:createMarkdown')} />
              <InfoIcon tooltip={t('core:createMarkdownTitle')} />
            </MenuItem>,
            <MenuItem
              key="createHTMLTextFile"
              data-tid="createHTMLTextFileTID"
              onClick={() => run(() => createNewFile('html'))}
            >
              <ListItemIcon>
                <HTMLFileIcon />
              </ListItemIcon>
              <ListItemText primary={t('core:createRichTextFile')} />
              <InfoIcon tooltip={t('core:createNoteTitle')} />
            </MenuItem>,
            <MenuItem
              key="createNewLinkFile"
              data-tid="createNewLinkFileTID"
              onClick={() => run(() => createNewFile('url'))}
            >
              <ListItemIcon>
                <LinkFileIcon />
              </ListItemIcon>
              <ListItemText primary={t('core:createLinkFile')} />
            </MenuItem>,
            !hideProFeatures && (
              <MenuItem
                key="createNewFromTemplate"
                data-tid="createNewFromTemplateTID"
                disabled={!Pro}
                onClick={() => run(() => createNewFile())}
              >
                <ListItemIcon>
                  <TemplateFileIcon />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <>
                      {t('core:createNewFromTemplate')}
                      {!Pro && <ProLabel />}
                    </>
                  }
                />
              </MenuItem>
            ),
          ]}
          {createNewAudio && !hideProFeatures && (
            <MenuItem
              key="createNewAudio"
              data-tid="createNewAudioTID"
              disabled={!Pro}
              onClick={() => run(() => createNewAudio())}
            >
              <ListItemIcon>
                <AudioRecordIcon />
              </ListItemIcon>
              <ListItemText
                primary={
                  <>
                    {t('core:newAudioRecording')}
                    {!Pro && <ProLabel />}
                  </>
                }
              />
            </MenuItem>
          )}
          {showCreateDirectoryDialog && [
            <Divider key="newSubDirectoryDivider" />,
            <MenuItem
              key="newSubDirectory"
              data-tid="newSubDirectory"
              onClick={() => run(() => showCreateDirectoryDialog())}
            >
              <ListItemIcon>
                <NewFolderIcon />
              </ListItemIcon>
              <ListItemText primary={t('core:newSubdirectory')} />
            </MenuItem>,
          ]}
          {addExistingFile && (
            <MenuItem
              key="addExistingFile"
              data-tid="addExistingFile"
              onClick={() => run(() => addExistingFile())}
            >
              <ListItemIcon>
                <AddExistingFileIcon />
              </ListItemIcon>
              <ListItemText primary={t('core:addFiles')} />
            </MenuItem>
          )}
          {/* Native mobile only: the WebView file chooser can't open the
              camera, so this is a dedicated trigger for the Capacitor camera
              plugin. Only wired in on Capacitor (see DirectoryMenu). */}
          {cameraTakePicture && (
            <MenuItem
              key="cameraTakePicture"
              data-tid="cameraTakePictureTID"
              onClick={() => run(() => cameraTakePicture())}
            >
              <ListItemIcon>
                <TakePictureIcon />
              </ListItemIcon>
              <ListItemText primary={t('core:cameraTakePicture')} />
            </MenuItem>
          )}
          {/* Web can't bypass browser CORS/CSP — the download only saves into
              the location on desktop and native mobile, so hide it elsewhere.
              Pro feature: enabled on Pro (BETA), disabled with a PRO badge on
              Lite, and hidden entirely on Lite when Pro teasers are hidden. */}
          {(AppConfig.isElectron || AppConfig.isNativeMobile) &&
            (Pro || !hideProFeatures) && (
              <MenuItem
                key="newFromDownloadURL"
                data-tid="newFromDownloadURLTID"
                disabled={!Pro}
                onClick={() => run(() => openDownloadUrl())}
              >
                <ListItemIcon>
                  <DownloadIcon />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <>
                      {t('core:newFromDownloadURL')}
                      {Pro ? <BetaLabel /> : <ProLabel />}
                    </>
                  }
                />
              </MenuItem>
            )}
        </TsMenuList>
      </Menu>
    </>
  );
}

export default NewSubMenu;
