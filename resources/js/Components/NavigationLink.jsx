import React from 'react';
import { Link } from '@inertiajs/react';

/**
 * NavigationLink / Breadcrumb Component
 * 
 * @param {Array} links - Array of objects { label: string, href: string }
 * @param {string} className - Additional CSS classes
 */
const NavigationLink = ({ links = [], className = "" }) => {
    return (
        <div className={`breadcrumb ${className}`}>
            {links.map((link, index) => {
                const isLast = index === links.length - 1;
                
                return (
                    <React.Fragment key={index}>
                        {isLast || (!link.href && !link.onClick) ? (
                            <span>{link.label}</span>
                        ) : link.onClick ? (
                            <a 
                                href="#"
                                onClick={(e) => { e.preventDefault(); link.onClick(); }} 
                                className="breadcrumb-item"
                            >
                                {link.label}
                            </a>
                        ) : (
                            <Link href={link.href}>
                                {link.label}
                            </Link>
                        )}
                        {!isLast && <span>/</span>}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

export default NavigationLink;
