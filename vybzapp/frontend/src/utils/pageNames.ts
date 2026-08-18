/** Readable page label for feedback context (pathname → display name). */
export function getPageName(pathname: string): string {
  if (pathname === '/' || pathname === '/home') return 'Home';
  if (pathname === '/immersivecomics/' || pathname === '/immersivecomics/dashboard/') return 'Stories';
  if (pathname.includes('/immersivecomics/story/create')) return 'Story Creation';
  if (pathname.includes('/immersivecomics/story/') && pathname.includes('/manage')) return 'Story Management';
  if (pathname.includes('/immersivecomics/story/') && pathname.includes('/edit')) return 'Story Edit';
  if (pathname.includes('/immersivecomics/story/') && pathname.includes('/characters')) return 'Character Management';
  if (pathname.includes('/immersivecomics/story/') && pathname.includes('/collaborators')) return 'Story Collaborators';
  if (pathname.includes('/immersivecomics/story/') && pathname.includes('/season/create')) return 'Season Creation';
  if (pathname.includes('/immersivecomics/season/') && pathname.includes('/edit')) return 'Season Edit';
  if (pathname.includes('/immersivecomics/season/') && pathname.includes('/episodes')) return 'Episode Management';
  if (pathname === '/immersivecomics/my-studio/') return 'My Studio';
  if (pathname.includes('/immersivecomics/studios/')) return 'Studios';
  if (pathname.includes('/immersivecomics/studio/') && pathname.includes('/edit')) return 'Studio Edit';
  if (pathname.includes('/immersivecomics/import/')) return 'Story Import';
  if (pathname.includes('/studios/') && !pathname.includes('/edit')) return 'Studio Detail';

  if (pathname === '/product/') return 'Product Store';
  if (pathname === '/product/cart/') return 'Shopping Cart';
  if (pathname.includes('/product/cart/checkout')) return 'Checkout';
  if (pathname.includes('/product/cart/shipping/')) return 'Select Shipping';
  if (pathname.includes('/product/payment/success')) return 'Payment Success';
  if (pathname === '/product/my-orders/') return 'My Orders';
  if (pathname.includes('/product/order/')) return 'Order Detail';

  if (pathname === '/login/') return 'Login';
  if (pathname === '/register/') return 'Register';
  if (pathname.includes('/password-reset/')) return 'Password Reset';
  if (pathname.includes('/password-reset-confirm/')) return 'Password Reset Confirm';
  if (pathname.includes('/password-reset-complete/')) return 'Password Reset Complete';

  if (pathname === '/contact/') return 'Contact';

  const segments = pathname.split('/').filter((s) => s);
  if (segments.length > 0) {
    const lastSegment = segments[segments.length - 1];
    return lastSegment
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  return 'Unknown Page';
}

/**
 * Routes where the 3D viewer Next/Prev controls sit near the bottom-right.
 * Feedback rail shifts up so it does not compete with those controls.
 */
export function isViewerPage(pathname: string): boolean {
  if (pathname.includes('/immersivecomics/story/') && pathname.includes('/manage')) {
    return true;
  }
  // Wizard preview step: /immersivecomics/story/create/preview/
  if (pathname.includes('/immersivecomics/story/create') && pathname.includes('/preview')) {
    return true;
  }
  return false;
}
