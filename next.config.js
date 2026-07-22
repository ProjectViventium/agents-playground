const requestedBuildRef = (process.env.VIVENTIUM_PLAYGROUND_BUILD_REF || "")
  .trim()
  .toLowerCase();
const compiledBuildRef = /^[0-9a-f]{40}$/.test(requestedBuildRef)
  ? requestedBuildRef
  : "unversioned";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  /* VIVENTIUM START
   * Purpose: Bind the advertised playground source identity into the compiled Next artifact.
   * A runtime environment override must not let an older build impersonate a newer component.
   * VIVENTIUM END */
  env: {
    VIVENTIUM_PLAYGROUND_COMPILED_REF: compiledBuildRef,
  },
};

module.exports = nextConfig;
