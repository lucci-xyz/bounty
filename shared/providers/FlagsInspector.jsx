'use client';

import { Fragment } from 'react';
import { FlagDefinitions, FlagValues } from 'flags/react';

/**
 * Displays feature flag definitions and their current values.
 *
 * @param {object} props
 * @param {object} [props.definitions] - Flag definitions.
 * @param {object} [props.values] - Flag values.
 * @returns {JSX.Element|null}
 */
export function FlagsInspector({ definitions, values }) {
  // Check if definitions or values exist
  const hasDefinitions = Boolean(definitions && Object.keys(definitions).length > 0);
  const hasValues = Boolean(values && Object.keys(values).length > 0);

  // Nothing to show if neither are present
  if (!hasDefinitions && !hasValues) {
    return null;
  }

  // Render flag definitions and/or values
  return (
    <Fragment>
      {hasDefinitions ? <FlagDefinitions definitions={definitions} /> : null}
      {hasValues ? <FlagValues values={values} /> : null}
    </Fragment>
  );
}

