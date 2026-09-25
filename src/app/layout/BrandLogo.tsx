import clsx from 'clsx';

import logo from './brand/1a-mig.jpeg';

/**
 * The service provider's logo, the same for every customer.
 *
 * The artwork ships with a white background. On the dark theme it sits on a
 * white plate, so the white reads as intended rather than as a missing
 * transparency; a transparent version would let the plate go.
 */
export function BrandLogo({ className }: { className?: string }) {
  return (
    <span className={clsx('inline-block rounded-md bg-white p-1', className)}>
      <img src={logo} alt="1A-MIG" className="block h-auto w-full" width={502} height={104} />
    </span>
  );
}
