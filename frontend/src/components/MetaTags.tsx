import { useEffect } from 'react';

interface MetaTagsProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: 'website' | 'article';
  twitterSite?: string;
  twitterImage?: string;
  twitterImageAlt?: string;
}

const MetaTags: React.FC<MetaTagsProps> = ({
  title,
  description,
  keywords,
  image,
  url,
  type = 'website',
  twitterSite = '@justvybz27070',
  twitterImage,
  twitterImageAlt,
}) => {
  useEffect(() => {
    // Get current URL if not provided
    const currentUrl = url || (typeof window !== 'undefined' ? window.location.href : 'https://www.justvybz.com');
    
    // Get full image URL (ensure it's absolute)
    const fullImageUrl = image 
      ? (image.startsWith('http') ? image : `https://www.justvybz.com${image}`)
      : 'https://www.justvybz.com/logo-80x80.svg';
    
    const twitterImageUrl = twitterImage
      ? (twitterImage.startsWith('http') ? twitterImage : `https://www.justvybz.com${twitterImage}`)
      : fullImageUrl;

    // Update title
    if (title) {
      document.title = title;
    }

    // Helper function to update or create meta tag
    const updateMetaTag = (selector: string, attribute: string, value: string) => {
      let element = document.querySelector(selector) as HTMLMetaElement;
      if (!element) {
        element = document.createElement('meta');
        if (selector.includes('property')) {
          const propertyName = selector.match(/property="([^"]+)"/)?.[1];
          if (propertyName) {
            element.setAttribute('property', propertyName);
          }
        } else if (selector.includes('name')) {
          const nameAttr = selector.match(/name="([^"]+)"/)?.[1];
          if (nameAttr) {
            element.setAttribute('name', nameAttr);
          }
        }
        document.head.appendChild(element);
      }
      element.setAttribute(attribute, value);
    };

    // Update basic meta tags
    if (description) {
      updateMetaTag('meta[name="description"]', 'content', description);
    }
    if (keywords) {
      updateMetaTag('meta[name="keywords"]', 'content', keywords);
    }

    // Update Open Graph tags
    if (title) {
      updateMetaTag('meta[property="og:title"]', 'content', title);
    }
    if (description) {
      updateMetaTag('meta[property="og:description"]', 'content', description);
    }
    updateMetaTag('meta[property="og:type"]', 'content', type);
    updateMetaTag('meta[property="og:url"]', 'content', currentUrl);
    updateMetaTag('meta[property="og:image"]', 'content', fullImageUrl);

    // Update Twitter Card tags
    updateMetaTag('meta[name="twitter:card"]', 'content', 'summary_large_image');
    if (twitterSite) {
      updateMetaTag('meta[name="twitter:site"]', 'content', twitterSite);
    }
    if (title) {
      updateMetaTag('meta[name="twitter:title"]', 'content', title);
    }
    if (description) {
      updateMetaTag('meta[name="twitter:description"]', 'content', description);
    }
    updateMetaTag('meta[name="twitter:image"]', 'content', twitterImageUrl);
    if (twitterImageAlt) {
      updateMetaTag('meta[name="twitter:image:alt"]', 'content', twitterImageAlt);
    }

    // Update canonical URL
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', currentUrl);
  }, [title, description, keywords, image, url, type, twitterSite, twitterImage, twitterImageAlt]);

  // This component doesn't render anything
  return null;
};

export default MetaTags;
