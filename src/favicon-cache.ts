
const FAVICON_CACHE_PREFIX = "favicon_";
const FALLBACK_ICON = "default-icon.png";

const pendingFetches = new Map<string, Promise<string>>();

const getDomain = (url: string): string | null => {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname;
  } catch (e) {
    return null;
  }
};

const fetchAndCacheFavicon = async (domain: string): Promise<string> => {
  const googleFaviconUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  try {
    const response = await fetch(googleFaviconUrl);
    if (!response.ok) throw new Error("Network response was not ok");

    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Cache the result
        const cacheKey = `${FAVICON_CACHE_PREFIX}${domain}`;
        chrome.storage.local.set({ [cacheKey]: result }).catch(err => {
            console.warn("Failed to cache favicon", err);
        });
        resolve(result);
      };
      reader.onerror = () => reject(new Error("Failed to read blob"));
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn(`Failed to fetch favicon for ${domain}`, error);
    // On failure, return the remote URL as a fallback so the browser tries to load it directly
    return googleFaviconUrl;
  }
};

export const getFaviconUrl = async (url: string): Promise<string> => {
  const domain = getDomain(url);
  if (!domain) return FALLBACK_ICON;

  const cacheKey = `${FAVICON_CACHE_PREFIX}${domain}`;

  try {
    const result = await new Promise<{ [key: string]: string }>((resolve) => {
      chrome.storage.local.get([cacheKey], (items) => {
        resolve(items as { [key: string]: string });
      });
    });

    if (result && result[cacheKey]) {
      return result[cacheKey];
    }
  } catch (e) {
    console.warn("Error reading from storage", e);
  }

  // Check if already fetching
  if (pendingFetches.has(domain)) {
    return pendingFetches.get(domain)!;
  }

  // Fetch and cache
  const fetchPromise = fetchAndCacheFavicon(domain).finally(() => {
    pendingFetches.delete(domain);
  });

  pendingFetches.set(domain, fetchPromise);

  return fetchPromise;
};
