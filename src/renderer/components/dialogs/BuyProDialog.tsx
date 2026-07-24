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

// In-app purchase sheet for the Capacitor mobile apps. Shown when the
// user taps "Compare and Upgrade" inside the ProTeaserDialog on iOS or
// Android. Drives the StoreKit / Play Billing purchase via the iap
// service. Both stores forbid linking out from the purchase flow, so
// this sheet replaces the external URL CTA used on desktop.

import AppConfig from '-/AppConfig';
import TsButton from '-/components/TsButton';
import TsDialogTitle from '-/components/dialogs/components/TsDialogTitle';
import {
  getProProduct,
  IAPProduct,
  isIapAvailable,
  presentCodeRedemption,
  purchasePro,
  restoreProPurchase,
} from '-/services/iap';
import { openURLExternally } from '-/services/utils-io';
import FolderTwoToneIcon from '@mui/icons-material/FolderTwoTone';
import HistoryTwoToneIcon from '@mui/icons-material/HistoryTwoTone';
import ViewKanbanTwoToneIcon from '@mui/icons-material/ViewKanbanTwoTone';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import {
  Alert,
  Box,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  Link,
  Stack,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import Links from 'assets/links';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  open: boolean;
  onClose: () => void;
}

function BuyProDialog(props: Props) {
  const { open, onClose } = props;
  const { t } = useTranslation();
  const theme = useTheme();
  const smallScreen = useMediaQuery(theme.breakpoints.down('md'));

  const [product, setProduct] = useState<IAPProduct | null>(null);
  const [loadingProduct, setLoadingProduct] = useState<boolean>(false);
  const [purchaseInFlight, setPurchaseInFlight] = useState<boolean>(false);
  const [restoreInFlight, setRestoreInFlight] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{
    kind: 'info' | 'error' | 'success';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    if (!isIapAvailable()) return;
    let cancelled = false;
    setLoadingProduct(true);
    setStatusMessage(null);
    getProProduct()
      .then((p) => {
        if (cancelled) return;
        setProduct(p);
      })
      .catch(() => {
        if (cancelled) return;
        setProduct(null);
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingProduct(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  async function onBuyClick() {
    setPurchaseInFlight(true);
    setStatusMessage(null);
    try {
      const result = await purchasePro();
      if (result.success) {
        setStatusMessage({
          kind: 'success',
          text: t('peri:purchaseCompleteReloading'),
        });
        // The verify→finish listener in iap.ts triggers a reload shortly.
        return;
      }
      if (result.cancelled) {
        setStatusMessage(null);
        return;
      }
      setStatusMessage({
        kind: 'error',
        text: result.error ?? t('peri:purchaseFailed'),
      });
    } finally {
      setPurchaseInFlight(false);
    }
  }

  async function onRestoreClick() {
    setRestoreInFlight(true);
    setStatusMessage(null);
    try {
      const result = await restoreProPurchase();
      if (result.restored) {
        setStatusMessage({
          kind: 'success',
          text: t('peri:restoreCompleteReloading'),
        });
        return;
      }
      setStatusMessage({
        kind: 'info',
        text: t('peri:noPurchaseFoundToRestore'),
      });
    } finally {
      setRestoreInFlight(false);
    }
  }

  const priceLine =
    product?.price ||
    (loadingProduct ? t('core:loading') : t('peri:priceUnavailable'));

  const buyDisabled =
    purchaseInFlight || restoreInFlight || loadingProduct || !product;

  const proFeatures = [
    { Icon: ViewKanbanTwoToneIcon, label: t('peri:buyProFeaturePerspectives') },
    // { Icon: AutoAwesomeTwoToneIcon, label: t('peri:buyProFeatureAI') },
    { Icon: HistoryTwoToneIcon, label: t('peri:buyProFeatureRevisions') },
    { Icon: FolderTwoToneIcon, label: t('peri:buyProFeatureFolderColor') },
  ];

  // Billing-free build (e.g. the self-hosted Lite Android APK): the purchase
  // plugin is stripped, so there is no store to drive. Instead of a dead
  // "price unavailable" sheet, tell the user Pro is purchasable only in the
  // Google Play edition and link them there. See services/iap.ts.
  if (!isIapAvailable()) {
    return (
      <Dialog
        open={open}
        onClose={onClose}
        fullScreen={smallScreen}
        fullWidth
        maxWidth="xs"
        keepMounted
        scroll="paper"
        aria-labelledby="buy-pro-dialog-title"
      >
        <TsDialogTitle
          dialogTitle={''}
          closeButtonTestId="closeBuyProDialogTID"
          onClose={onClose}
        />
        <DialogContent sx={{ paddingTop: 0 }}>
          <Stack
            spacing={2.5}
            sx={{ alignItems: 'center', textAlign: 'center' }}
          >
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                color: theme.palette.primary.contrastText,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <WorkspacePremiumRoundedIcon sx={{ fontSize: 38 }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {t('peri:tagSpacesPro')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('peri:proOnlyOnGooglePlay')}
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions
          sx={{
            paddingLeft: 'max(16px, env(safe-area-inset-left))',
            paddingRight: 'max(16px, env(safe-area-inset-right))',
            paddingTop: 1,
            paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
            gap: 1,
            flexDirection: 'column',
            alignItems: 'stretch',
          }}
        >
          <TsButton
            data-tid="openGooglePlayTID"
            variant="contained"
            onClick={() =>
              openURLExternally(Links.links.googlePlayListing, true)
            }
            sx={{ minHeight: 52, fontWeight: 600 }}
          >
            {t('peri:openGooglePlay')}
          </TsButton>
          <TsButton
            data-tid="closeBuyProInfoTID"
            variant="text"
            onClick={onClose}
          >
            {t('core:closeButton')}
          </TsButton>
        </DialogActions>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onClose={purchaseInFlight ? undefined : onClose}
      fullScreen={smallScreen}
      fullWidth
      maxWidth="xs"
      keepMounted
      scroll="paper"
      aria-labelledby="buy-pro-dialog-title"
    >
      <TsDialogTitle
        dialogTitle={''}
        closeButtonTestId="closeBuyProDialogTID"
        onClose={purchaseInFlight ? undefined : onClose}
      />
      <DialogContent sx={{ paddingTop: 0 }}>
        <Stack spacing={2.5}>
          {/* Hero header with Pro branding */}
          <Box
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              color: theme.palette.primary.contrastText,
              borderRadius: AppConfig.defaultCSSRadius,
              padding: 3,
              textAlign: 'center',
            }}
          >
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                backgroundColor: 'rgba(255, 255, 255, 0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
              }}
            >
              <WorkspacePremiumRoundedIcon sx={{ fontSize: 38 }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {t('peri:tagSpacesPro')}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9, marginTop: 0.5 }}>
              {t('peri:buyProSubtitle')}
            </Typography>
          </Box>

          {/* Feature checklist */}
          <Stack spacing={1.5} sx={{ paddingX: 0.5 }}>
            {proFeatures.map((feature, index) => (
              <Box
                key={index}
                sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}
              >
                <feature.Icon
                  sx={{ color: 'primary.main', fontSize: 26, flexShrink: 0 }}
                />
                <Typography variant="body2">{feature.label}</Typography>
              </Box>
            ))}
          </Stack>

          {/* Price emphasis */}
          <Box
            sx={{
              textAlign: 'center',
              padding: 2,
              borderRadius: AppConfig.defaultCSSRadius,
              backgroundColor: alpha(theme.palette.primary.main, 0.08),
            }}
          >
            <Typography
              variant="h4"
              data-tid="buyProPriceTID"
              sx={{ fontWeight: 700 }}
            >
              {priceLine}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t('peri:oneTimePurchase')}
            </Typography>
          </Box>

          {statusMessage && (
            <Alert severity={statusMessage.kind}>{statusMessage.text}</Alert>
          )}

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ textAlign: 'center' }}
          >
            {t('peri:familySharingNote')}{' '}
            <Link
              component="button"
              type="button"
              onClick={() => openURLExternally(Links.links.privacyURL, true)}
              underline="hover"
            >
              {t('core:privacyPolicy')}
            </Link>
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions
        sx={{
          // env(safe-area-inset-*) keeps buttons clear of the iPhone home
          // indicator and Android gesture-nav strip on fullScreen mobile.
          paddingLeft: 'max(16px, env(safe-area-inset-left))',
          paddingRight: 'max(16px, env(safe-area-inset-right))',
          paddingTop: 1,
          paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
          gap: 1,
          flexDirection: 'column',
          alignItems: 'stretch',
        }}
      >
        <TsButton
          data-tid="buyProConfirmTID"
          variant="contained"
          onClick={onBuyClick}
          disabled={buyDisabled}
          sx={{
            minHeight: 52,
            fontWeight: 600,
            fontSize: '15px',
            ...(buyDisabled
              ? {}
              : {
                  background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                }),
          }}
        >
          {purchaseInFlight ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            t('peri:buyProAction', { price: product?.price ?? '' })
          )}
        </TsButton>
        <Box
          sx={{
            display: 'flex',
            gap: 1,
            justifyContent: 'center',
            flexWrap: 'wrap',
          }}
        >
          <TsButton
            data-tid="buyProRestoreTID"
            variant="text"
            onClick={onRestoreClick}
            disabled={purchaseInFlight || restoreInFlight}
          >
            {restoreInFlight ? (
              <CircularProgress size={18} />
            ) : (
              t('peri:restorePurchases')
            )}
          </TsButton>
          <TsButton
            data-tid="buyProRedeemTID"
            variant="text"
            onClick={() => presentCodeRedemption()}
            disabled={purchaseInFlight || restoreInFlight}
          >
            {t('peri:redeemCode')}
          </TsButton>
        </Box>
      </DialogActions>
    </Dialog>
  );
}

export default BuyProDialog;
