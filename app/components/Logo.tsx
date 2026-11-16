import { asset } from '~/lib/asset'
import { SITE } from '~/lib/site'

// The client's wordmark: a one-color script on a transparent background
// (public/images/logo.png, her 500px file with the empty margins cropped).
// Set the height with a class; the width follows. `white` flattens it to white
// for use over a photo, which only works because the file is one flat color.
export function Logo({ className = '', white = false }: { className?: string; white?: boolean }) {
  return (
    <img
      src={asset('/images/logo.png')}
      alt={SITE.name}
      width={445}
      height={152}
      className={`w-auto transition-[filter] duration-300 ${white ? 'brightness-0 invert' : ''} ${className}`}
    />
  )
}
