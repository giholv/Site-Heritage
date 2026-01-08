import React from 'react';

interface LinkProps {
  href: string;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
}

export const Link: React.FC<LinkProps> = ({ href, className = '', children, onClick }) => {
  return (
    <a 
      href={href} 
      className={className}
      onClick={(e) => {
        if (href.startsWith('#')) {
          e.preventDefault();
          const element = document.querySelector(href);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
          }
        }
        onClick?.();
      }}
    >
      {children}
    </a>
  );
};