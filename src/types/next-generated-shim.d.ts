// Shim for Next.js generated type imports pointing to a non-existent page.js.
// The build type-checker under .next/types sometimes references
// '../../../../../../../src/app/(blank)/assetdata/assets/[id]/page.js'
// and '../../app/(blank)/assetdata/assets/[id]/page.js'.
// We declare ambient modules for these specifiers so TypeScript doesn't error.

declare module '../../../../../../../src/app/(blank)/assetdata/assets/[id]/page.js' {
  export const metadata: any;
  const Page: any;
  export default Page;
}

declare module '../../app/(blank)/assetdata/assets/[id]/page.js' {
  export const metadata: any;
  const Page: any;
  export default Page;
}

// Broad fallbacks for any Next.js generated page.js import shapes under these roots
declare module '../../app/*/page.js' {
  const Page: any;
  export default Page;
}

declare module '../../../../../../../src/app/*/page.js' {
  const Page: any;
  export default Page;
}

// Very broad fallbacks for any app .js import under these roots
declare module '../../app/*' {
  const Mod: any;
  export = Mod;
}

declare module '../../../../../../../src/app/*' {
  const Mod: any;
  export = Mod;
}
