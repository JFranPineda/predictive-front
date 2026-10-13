import clsx from 'clsx';

import logo from './brand/industrie-ampel.jpeg';

/**
 * The product's logo, the same for every customer. The artwork carries its
 * own red frame, so it needs no plate on the dark theme.
 */
export function BrandLogo({ className }: { className?: string }) {
  return (
    <span className={clsx('inline-block overflow-hidden rounded-md', className)}>
      <img src={logo} alt="Industrie Ampel" className="block h-auto w-full" width={704} height={299} />
    </span>
  );
}
