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

import React from 'react';

/**
 * Auth boundary / seam.
 *
 * This component previously hosted the AWS Amplify (Cognito) authentication UI.
 * The Amplify SDK has been removed; TsAuth is now a pass-through that simply
 * renders its children. It is intentionally kept as the mount point for a future
 * auth provider: a replacement would render its sign-in UI here and, once
 * authenticated, call `loggedIn()` from `useUserContext()` to populate
 * `currentUser` (which drives the account avatar/popover in MobileNavigation).
 */
const TsAuth: React.FC<any> = (props) => {
  return props.children;
};

export default TsAuth;
