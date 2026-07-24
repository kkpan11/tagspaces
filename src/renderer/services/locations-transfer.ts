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

import { TS } from '-/tagspaces.namespace';

/**
 * Sanitizes a location into the plain shape that is written to an
 * export/backup file. Only known, serializable properties are copied over so
 * that transient/runtime fields never leak into the exported data.
 */
export function prepareLocationForExport(
  location: TS.S3Location,
): TS.S3Location {
  const preparedLocation: TS.S3Location = {
    isDefault: location.isDefault,
    name: location.name,
    uuid: location.uuid,
    type: location.type,
  };
  if (location.endpointURL) {
    preparedLocation.endpointURL = location.endpointURL;
  }
  if (location.accessKeyId) {
    preparedLocation.accessKeyId = location.accessKeyId;
  }
  if (location.secretAccessKey) {
    preparedLocation.secretAccessKey = location.secretAccessKey;
  }
  if (location.bucketName) {
    preparedLocation.bucketName = location.bucketName;
  }
  if (location.region) {
    preparedLocation.region = location.region;
  }
  if (location.hasOwnProperty('isDefault')) {
    preparedLocation.isDefault = location.isDefault;
  }
  if (location.hasOwnProperty('isReadOnly')) {
    preparedLocation.isReadOnly = location.isReadOnly;
  }
  if (location.hasOwnProperty('disableIndexing')) {
    preparedLocation.disableIndexing = location.disableIndexing;
  }
  if (location.hasOwnProperty('fullTextIndex')) {
    preparedLocation.fullTextIndex = location.fullTextIndex;
  }
  if (location.hasOwnProperty('watchForChanges')) {
    preparedLocation.watchForChanges = location.watchForChanges;
  }
  if (location.hasOwnProperty('isNotEditable')) {
    preparedLocation.isNotEditable = location.isNotEditable;
  }
  if (location.hasOwnProperty('reloadOnFocus')) {
    preparedLocation.reloadOnFocus = location.reloadOnFocus;
  }
  if (location.hasOwnProperty('disableThumbnailGeneration')) {
    preparedLocation.disableThumbnailGeneration =
      location.disableThumbnailGeneration;
  }
  if (location.hasOwnProperty('persistTagsInSidecarFile')) {
    preparedLocation.persistTagsInSidecarFile =
      location.persistTagsInSidecarFile;
  }
  if (location.creationDate) {
    preparedLocation.creationDate = location.creationDate;
  }
  if (location.ignorePatternPaths) {
    preparedLocation.ignorePatternPaths = location.ignorePatternPaths;
  }
  if (location.path) {
    preparedLocation.path = location.path;
  }
  if (location.maxIndexAge) {
    preparedLocation.maxIndexAge = location.maxIndexAge;
  }
  if (location.autoOpenedFilename) {
    preparedLocation.autoOpenedFilename = location.autoOpenedFilename;
  }
  if (location.maxLoops) {
    preparedLocation.maxLoops = location.maxLoops;
  }
  return preparedLocation;
}
