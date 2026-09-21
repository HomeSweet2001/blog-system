import { Link, NavLink } from 'react-router-dom';

export default function BlogLogo({ settings, size = 'md', linkTo = '/' }) {
  const name = settings?.blog_name || 'Meu Blog';
  const logo = settings?.logo_url;

  const sizes = {
    sm: 'h-8',
    md: 'h-10',
    lg: 'h-14',
  };

  return (
    <Link to={linkTo} className="flex items-center gap-2.5 no-underline">
      {logo ? (
        <img src={logo} alt={name} className={`${sizes[size]} w-auto max-w-[200px] object-contain`} />
      ) : (
        <span
          className="flex h-9 w-9 items-center justify-center rounded-theme text-base font-black text-white"
          style={{ background: 'var(--c-primary)' }}
        >
          {name.trim().charAt(0).toUpperCase()}
        </span>
      )}
      <span className="font-heading text-lg font-extrabold leading-tight" style={{ color: 'var(--c-text)' }}>
        {name}
      </span>
    </Link>
  );
}

export { NavLink };
