import {useState} from 'react';
import type {BookConfig} from '../config/bookSchema.js';
import {readerTitle} from '../config/displayMetadata.js';
import {Icon, type IconName} from './Icon';

interface Props { config: BookConfig | null; home?: boolean; }

type FooterSlot = {name: string; icon: IconName; href?: string};

export function ReaderFooter({config, home = false}: Props) {
  const [publisherLogoFailed, setPublisherLogoFailed] = useState(false);
  const publisher = config?.publisher;
  const brandLogo = publisher?.logo || (home ? config?.branding?.logo : undefined);
  const hasPublisher = Boolean(publisher?.name || publisher?.logo || publisher?.website);
  const social = (type: 'website' | 'facebook' | 'instagram' | 'linkedin' | 'x') =>
    config?.socialLinks.find((entry) => entry.type === type)?.href;
  const slots: FooterSlot[] = [
    {name: 'Website', icon: 'website', href: social('website') || publisher?.website},
    {name: 'Facebook', icon: 'facebook', href: social('facebook')},
    {name: 'Instagram', icon: 'instagram', href: social('instagram')},
    {name: 'LinkedIn', icon: 'linkedin', href: social('linkedin')},
    {name: 'X', icon: 'x', href: social('x')},
    {name: 'Privacy', icon: 'privacy', href: config?.legal?.privacy},
    {name: 'Terms', icon: 'terms', href: config?.legal?.terms},
    {name: 'Source repository', icon: 'source', href: config?.project?.repositoryUrl},
  ];
  if (!home && !hasPublisher && !slots.some((slot) => slot.href)) return null;
  const publisherName = publisher?.name || (home ? readerTitle(config) : 'Publisher');

  return (
    <footer className={'reader-footer' + (home ? ' home-footer' : '')}>
      <div className="footer-publisher">
        {brandLogo && !publisherLogoFailed && <img src={brandLogo} alt="" onError={() => setPublisherLogoFailed(true)} />}
        {publisher?.website ? <a href={publisher.website} target="_blank" rel="noopener noreferrer">{publisherName}</a>
          : <span>{publisherName}</span>}
      </div>
      <nav className="footer-links" aria-label="Publication links">
        {slots.filter((slot) => home || slot.href).map((slot) => slot.href ? (
          <a key={slot.name} href={slot.href} aria-label={slot.name} title={slot.name}
            target="_blank" rel="noopener noreferrer"><Icon name={slot.icon} size={17} /></a>
        ) : (
          <span key={slot.name} className="inactive-slot" title={`${slot.name} link not configured`} aria-hidden="true">
            <Icon name={slot.icon} size={17} />
          </span>
        ))}
      </nav>
    </footer>
  );
}
