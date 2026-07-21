/* VIVENTIUM START
 * Purpose: Publish an exact identity for the explicitly selected classic playground.
 * The parent launcher uses this to prevent a stale or unrelated listener from being
 * mistaken for the requested Viventium playground.
 * VIVENTIUM END */
import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(_request: NextApiRequest, response: NextApiResponse) {
  response.setHeader('Cache-Control', 'no-store');
  response.status(200).json({
    schema_version: 1,
    product: 'viventium-playground',
    status: 'ok',
    surface: 'classic-playground',
    variant: 'classic',
    source_ref: process.env.VIVENTIUM_PLAYGROUND_BUILD_REF ?? 'unversioned',
  });
}
