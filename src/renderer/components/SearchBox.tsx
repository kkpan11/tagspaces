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

import React, { useState } from 'react';
import Popover from '@mui/material/Popover';
import SearchPopover from '-/components/SearchPopover';
import SearchAutocomplete from '-/components/SearchAutocomplete';

interface Props {
  open: boolean;
}

function SearchBox(props: Props) {
  const [anchorSearch, setAnchorSearch] = useState<HTMLButtonElement | null>(
    null,
  );

  return (
    <>
      <SearchAutocomplete open={props.open} setAnchorSearch={setAnchorSearch} />
      {props.open && (
        <Popover
          open={Boolean(anchorSearch)}
          anchorEl={anchorSearch}
          onClose={() => setAnchorSearch(null)}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          slotProps={{
            paper: {
              style: {
                overflow: 'hidden',
                height: 720,
                // background: alpha(theme.palette.background.default, 0.95),
                // backdropFilter: 'blur(5px)',
              },
            },
          }}
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          style={{
            // @ts-ignore
            WebkitAppRegion: 'no-drag',
          }}
        >
          <SearchPopover onClose={() => setAnchorSearch(null)} />
        </Popover>
      )}
    </>
  );
}

export default SearchBox;
