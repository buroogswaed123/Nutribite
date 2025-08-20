import React from 'react';
import styles from '../../assets/styles/login.module.css';

const providers = [
  { label: 'Google', iconClass: 'fa-brands fa-google-plus-g', url: 'https://accounts.google.com/' },
  { label: 'Facebook', iconClass: 'fa-brands fa-facebook-f', url: 'https://www.facebook.com/login' },
  { label: 'X', iconClass: 'fa-brands fa-x-twitter', url: 'https://twitter.com/i/flow/login' },
];

/***
 * SocialIcons JSX:Opens a popup window with the given URL and name.(google, facebook, X)
 * @param {string} url - The URL to open in the popup.
 * @param {string} name - The name of the popup window.
 */
export default function SocialIcons() {
  const openPopup = (url, name) => {
    const width = 500;
    const height = 600;
    const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
    const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);
    const features = `toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=${width},height=${height},top=${top},left=${left}`;
    window.open(url, name, features);
  };

  return (
    <div className={styles.icons}>
      {providers.map((prov) => (
        <a
          key={prov.label}  
          href={prov.url}
          onClick={(e) => {
            e.preventDefault();
            openPopup(prov.url, prov.label);
          }}
          title={`Open ${prov.label} signup`}
          style={{ margin: '0 8px', fontSize: '1rem', color: '#333' }}
        >
          <i className={prov.iconClass}></i>
        </a>
      ))}
    </div>
  );
}
