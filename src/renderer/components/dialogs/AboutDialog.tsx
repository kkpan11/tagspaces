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
import LogoIcon from '-/assets/icons/icon.png';
import TextLogoIcon from '-/assets/images/text-logo.svg';
import DraggablePaper from '-/components/DraggablePaper';
import TsButton from '-/components/TsButton';
import TranslucentDialog from '-/components/dialogs/components/TranslucentDialog';
import TsDialogActions from '-/components/dialogs/components/TsDialogActions';
import TsDialogTitle from '-/components/dialogs/components/TsDialogTitle';
import { BuyProDialogContext } from '-/components/dialogs/hooks/BuyProDialogContextProvider';
import { useLicenseDialogContext } from '-/components/dialogs/hooks/useLicenseDialogContext';
import { useThirdPartyLibsDialogContext } from '-/components/dialogs/hooks/useThirdPartyLibsDialogContext';
import { Pro } from '-/pro';
import { getLastVersionPromise, openURLExternally } from '-/services/utils-io';
import versionMeta from '-/version.json';
import { Box } from '@mui/material';
import DialogContent from '@mui/material/DialogContent';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Links from 'assets/links';
import { useContext, useState } from 'react';
import { useTranslation } from 'react-i18next';
import semver from 'semver';

interface Props {
  open: boolean;
  onClose: () => void;
}

let buildID = versionMeta.commitId;
if (buildID && buildID.length >= 11) {
  buildID = buildID.slice(0, 11);
}

const productName = versionMeta.name + (Pro ? ' Pro' : '');
document.title = productName + ' ' + versionMeta.version;

function AboutDialog(props: Props) {
  const { t } = useTranslation();
  const { openLicenseDialog } = useLicenseDialogContext();
  const { openThirdPartyLibsDialog } = useThirdPartyLibsDialogContext();
  const { openBuyProDialog } = useContext(BuyProDialogContext);

  // On Capacitor mobile the upgrade CTA opens the in-app StoreKit / Play
  // Billing sheet (both stores forbid linking out from the purchase flow).
  // Desktop and web keep the external products page. Mirrors ProTeaserDialog.
  const onUpgradeClick = AppConfig.isCapacitor
    ? () => openBuyProDialog?.()
    : () => openURLExternally(Links.links.productsOverview, true);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [newVersion, setNewVersion] = useState('');
  const { open, onClose } = props;
  const tsType = Pro ? 'PRO' : 'LITE';

  function checkForUpdates() {
    if (updateAvailable) {
      // On mobile the app is updated through the store, so route there
      // instead of the desktop downloads page.
      if (AppConfig.isCapacitoriOS) {
        openURLExternally(Links.links.appStoreApp, true);
      } else if (AppConfig.isCapacitorAndroid) {
        openURLExternally(Links.links.playStoreApp, true);
      } else {
        openURLExternally(Links.links.downloadURL, true);
      }
    } else {
      getLastVersionPromise()
        .then((lastVersion) => {
          console.log('Last version on server: ' + lastVersion);
          const cleanedLastVersion = semver.coerce(lastVersion);
          // const cleanedCurrentVersion = '3.0.2'
          const cleanedCurrentVersion = semver.coerce(versionMeta.version);
          if (
            semver.valid(cleanedLastVersion) &&
            semver.gt(cleanedLastVersion, cleanedCurrentVersion)
          ) {
            setUpdateAvailable(true);
            setNewVersion(cleanedLastVersion.version);
          } else {
            setNewVersion(versionMeta.version);
          }
          return true;
        })
        .catch((error) => {
          console.log('Error while checking for update: ' + error);
        });
    }
  }

  let versionInfo = t('core:checkForUpdates');
  if (newVersion && newVersion.length > 1) {
    if (updateAvailable) {
      versionInfo = t('getNewVersion', { newVersion });
    } else {
      versionInfo = t('latestVersion', { productName });
    }
  }

  let privacyURL = Links.links.privacyURL;
  if (AppConfig.isWeb) {
    privacyURL = '';
  }
  if (AppConfig.ExtPrivacyURL) {
    privacyURL = AppConfig.ExtPrivacyURL;
  }

  let imprintURL = Links.links.imprintURL;
  if (AppConfig.isWeb) {
    imprintURL = '';
  }
  if (AppConfig.ExtImprintURL) {
    imprintURL = AppConfig.ExtImprintURL;
  }

  const theme = useTheme();
  const smallScreen = useMediaQuery(theme.breakpoints.down('md'));
  return (
    <TranslucentDialog
      open={open}
      onClose={onClose}
      fullScreen={smallScreen}
      keepMounted
      scroll="paper"
      PaperComponent={smallScreen ? Paper : DraggablePaper}
      aria-labelledby="draggable-dialog-title"
    >
      <TsDialogTitle
        dialogTitle={
          <Box sx={{ display: 'flex' }}>
            <img
              style={{
                maxHeight: 26,
                maxWidth: 200,
                marginRight: 10,
              }}
              src={TextLogoIcon}
              alt="Application Text Logo"
            />
          </Box>
        }
        onClose={onClose}
        closeButtonTestId="closeAboutDialogTID"
      />
      <DialogContent sx={{ overflowY: 'auto' }}>
        <img
          alt="TagSpaces logo"
          src={LogoIcon}
          style={{ float: 'left', marginRight: 10, width: 120, height: 120 }}
        />
        <Typography
          title={t('core:buildOnPlatformTooltip', {
            buildTime: versionMeta.buildTime,
            userAgent: navigator.userAgent,
            // userAgent contains '/' which i18next would HTML-escape to
            // &#x2F;; this string is rendered as plain text by the tooltip
            // (React escapes it anyway), so disabling escaping is safe here.
            interpolation: { escapeValue: false },
          })}
          component="span"
          variant="subtitle1"
        >
          {t('core:versionLabel')}&nbsp;
          {tsType}&nbsp;{versionMeta.version}
          &nbsp;{t('core:buildIdLabel')}&nbsp;
          {buildID}
        </Typography>
        <br />
        <br />
        <Typography id="aboutContent" variant="body1">
          <strong>
            {productName}
            &nbsp;
          </strong>
          {t('core:madePossibleByTagSpaces')}
          <br />
          <TsButton
            sx={{ marginTop: '5px' }}
            onClick={() => openThirdPartyLibsDialog()}
          >
            {t('core:softwareAcknowledgements')}
          </TsButton>
          <br />
          {!Pro && (
            <span>
              This program is free software: you can redistribute it and/or
              modify it under the terms of the GNU Affero General Public License
              (version 3) as published by the Free Software Foundation.
            </span>
          )}
          <br />
          This program is distributed in the hope that it will be useful, but
          WITHOUT ANY WARRANTY; without even the implied warranty of
          MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the License
          for more details.
          <br />
          <br />
          {imprintURL && (
            <TsButton
              sx={{ marginRight: AppConfig.defaultSpaceBetweenButtons }}
              variant="text"
              onClick={() => {
                openURLExternally(imprintURL, true);
              }}
            >
              {t('core:imprint')}
            </TsButton>
          )}
          {privacyURL && (
            <TsButton
              sx={{ marginRight: AppConfig.defaultSpaceBetweenButtons }}
              variant="text"
              onClick={() => {
                openURLExternally(privacyURL, true);
              }}
            >
              {t('core:privacyPolicy')}
            </TsButton>
          )}
          <TsButton
            sx={{ marginRight: AppConfig.defaultSpaceBetweenButtons }}
            variant="text"
            onClick={() => {
              openURLExternally(Links.links.changelogURL, true);
            }}
          >
            {t('core:changelog')}
          </TsButton>
          <TsButton
            sx={{ marginRight: AppConfig.defaultSpaceBetweenButtons }}
            variant="text"
            data-tid="openLicenseDialog"
            onClick={() => openLicenseDialog()}
          >
            {t('core:license')}
          </TsButton>
          <TsButton
            sx={{ marginRight: AppConfig.defaultSpaceBetweenButtons }}
            variant="text"
            data-tid="openSourceCode"
            onClick={() => {
              openURLExternally(Links.links.sourceCodeURL, true);
            }}
          >
            {t('core:sourceCode')}
          </TsButton>
        </Typography>
      </DialogContent>
      <TsDialogActions
        // Stacked column uses `gap` for spacing; disable MUI's default
        // sibling margin-left, which would otherwise nudge the OK button right.
        disableSpacing={smallScreen}
        sx={{
          justifyContent: 'space-between',
          // On phones the dialog is fullScreen — stack the actions vertically
          // (full-width) so the long version label can't crowd/truncate, with
          // the primary OK at the bottom. Desktop keeps the single row.
          flexDirection: smallScreen ? 'column' : 'row',
          alignItems: smallScreen ? 'stretch' : 'center',
          gap: smallScreen ? 1 : 0,
        }}
      >
        <Box
          sx={{
            display: 'flex',
            flexDirection: smallScreen ? 'column' : 'row',
            alignItems: smallScreen ? 'stretch' : 'center',
            gap: smallScreen ? 1 : 0,
            width: smallScreen ? '100%' : 'auto',
          }}
        >
          {!Pro && (
            <TsButton
              data-tid="upgradeToProButton"
              title={t('core:upgradeToProButton')}
              fullWidth={smallScreen}
              onClick={onUpgradeClick}
              sx={{
                marginRight: smallScreen
                  ? 0
                  : AppConfig.defaultSpaceBetweenButtons,
              }}
            >
              {t('core:upgradeToProButton')}
            </TsButton>
          )}
          <TsButton
            data-tid="checkForUpdates"
            title={t('core:checkForNewVersion')}
            fullWidth={smallScreen}
            onClick={checkForUpdates}
          >
            {versionInfo}
          </TsButton>
        </Box>
        <TsButton
          data-tid="closeAboutDialog"
          variant="contained"
          fullWidth={smallScreen}
          onClick={onClose}
        >
          {t('core:ok')}
        </TsButton>
      </TsDialogActions>
    </TranslucentDialog>
  );
}

export default AboutDialog;
