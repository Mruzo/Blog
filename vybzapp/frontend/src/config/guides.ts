export interface GuideConfig {
  id: string;
  name: string;
  route: string; // Route that triggers this guide
  /** Single summary for the current page (replaces multi-step tour) */
  summary: string;
  showOnFirstVisit?: boolean; // Auto-show on first visit?
  showOnce?: boolean; // Only show once per user?
  /** If set, pathname must include this string (e.g. "/manage/" for story manage page) */
  pathContains?: string;
}

export const guides: GuideConfig[] = [
  {
    id: 'stories-page',
    name: 'Stories',
    route: '/immersivecomics/',
    showOnFirstVisit: true,
    showOnce: true,
    summary: 'Browse published comic stories here. Use the floating "+" button to create your own story, or the menu for feedback and help.',
  },
  {
    id: 'story-create-draft',
    name: 'Story Details',
    route: '/immersivecomics/story/create/story/',
    showOnFirstVisit: false,
    summary: 'It could be a lengthy process, so feel free to use **Save Draft** at the top right corner.',
  },
  {
    id: 'story-creation',
    name: 'Story Creation',
    route: '/immersivecomics/story/create/',
    showOnFirstVisit: true,
    showOnce: true,
    summary: 'Create your immersive 3D comic in steps: title & description, characters, season, episodes, dialogues, 3D model upload, then preview and publish.',
  },
  {
    id: 'my-studio',
    name: 'My Studio',
    route: '/immersivecomics/my-studio/',
    showOnFirstVisit: false,
    summary: 'This is your studio. **Give it a name**, **build stories**, **advance your draft stories**, **invite collaborators** to build with you',
  },
  {
    id: 'season-edit',
    name: 'Season Edit',
    route: '/immersivecomics/season/',
    pathContains: '/edit/',
    showOnFirstVisit: false,
    summary: 'Name your **Season**, describe the **Story**, upload your **3D model**, and choose to **make it public**, or **keep it private**.',
  },
  {
    id: 'episodes-page',
    name: 'Episodes',
    route: '/immersivecomics/season/',
    pathContains: '/episodes/',
    showOnFirstVisit: false,
    summary: 'Add episodes to your season, and **dynamically add the dialogue**. Just select the episode of interest, and add your dialogue.',
  },
  {
    id: 'episode-management',
    name: 'Episode Management',
    route: '/immersivecomics/season/',
    showOnFirstVisit: false,
    summary: 'Manage episodes in this season. Add or edit episodes, then add dialogues and set camera positions for each scene.',
  },
  {
    id: 'story-manage',
    name: 'Story Management',
    route: '/immersivecomics/story/',
    pathContains: '/manage/',
    showOnFirstVisit: false,
    summary: 'This is where you update your **story name**, **description**, and **characters**. Here, you can also **add, preview, and edit seasons** to your series. Just select a season, and hit **Preview Mode** or **Edit Mode** below.\n\b\n**Edit Mode**\n**Camera Orbit** — **Azimuth**, **Polar**, **Radius**: position the camera around the target (horizontal angle, vertical angle, distance in metres).\n**Camera Target** — **X**, **Y**, **Z**: the point the camera looks at. X moves left/right, Y moves up/down, Z moves forward/back.',
  },
  {
    id: 'story-management',
    name: 'Story Management',
    route: '/immersivecomics/story/',
    showOnFirstVisit: false,
    summary: 'Edit your story details, manage seasons and episodes, and manage characters. Use the sections below to navigate.',
  },
  {
    id: 'order-statuses',
    name: 'Order Status Guide',
    route: '/product/order',
    showOnFirstVisit: false,
    summary:
      
      '**Pending** — order created but not finalized yet (usually payment not confirmed). You can cancel automatically.\n' +
      '**Payment received** — payment confirmed; queued for fulfillment.\n' +
      '**Processing** — fulfillment has started. You can request cancellation and our team will confirm.\n' +
      '**Label created** — shipping label generated; shipment is close to dispatch.\n' +
      '**Shipped** — with the carrier.\n' +
      '**Delivered** — delivered.\n' +
      '**Cancelled** — cancelled and will not ship.\n' +
      '**Failed** — payment or fulfillment failure; support may follow up.\n' +
      '**Invoice** — downloadable after payment is completed and the order has shipped (Shipped/Delivered).\n' +
      '**Promo codes** — when applied, the code and discount appear in your order totals and on the invoice PDF (merchandise, promo, shipping, tax, total).',
  },
  {
    id: 'my-orders-statuses',
    name: 'My Orders — Status Guide',
    route: '/product/my-orders/',
    showOnFirstVisit: false,
    summary:
      
      '**Pending** — order created but not finalized yet (usually payment not confirmed). You can cancel automatically.\n' +
      '**Payment received** — payment confirmed; queued for fulfillment.\n' +
      '**Processing** — fulfillment has started. You can request cancellation and our team will confirm.\n' +
      '**Label created** — shipping label generated; shipment is close to dispatch.\n' +
      '**Shipped** — with the carrier.\n' +
      '**Delivered** — delivered.\n' +
      '**Cancelled** — cancelled and will not ship.\n' +
      '**Failed** — payment or fulfillment failure; support may follow up.\n' +
      '**Invoice** — downloadable after payment is completed and the order has shipped (Shipped/Delivered).\n' +
      '**Promo codes** — applied promos show on each order card and in order details (merchandise, promo, tax, total).',
  },
  {
    id: 'checkout-promo',
    name: 'Checkout — Promo code',
    route: '/product/cart/checkout/',
    showOnFirstVisit: false,
    summary:
      'Optional **Promo code** applies to **merchandise** (after product sale prices), before shipping and tax.\n' +
      'If the code is valid, it is stored on your order and shown consistently on **order details**, **My Orders**, and the **invoice PDF**.',
  },
];

// Helper function to find guide by route
export const findGuideByRoute = (pathname: string): GuideConfig | undefined => {
  return guides.find(guide => {
    // Exact match
    if (pathname === guide.route) {
      return true;
    }
    
    // Stories page guide: also match dashboard (same content)
    if (guide.id === 'stories-page') {
      if (pathname === '/immersivecomics' || pathname === '/immersivecomics/' ||
          pathname === '/immersivecomics/dashboard' || pathname === '/immersivecomics/dashboard/') {
        return true;
      }
      return false;
    }

    if (guide.id === 'my-orders-statuses') {
      return pathname === '/product/my-orders' || pathname === '/product/my-orders/';
    }

    // pathContains (e.g. /story/:id/manage/): must start with route and include the substring
    if (guide.pathContains && pathname.startsWith(guide.route) && pathname.includes(guide.pathContains)) {
      return true;
    }
    
    // For routes that end with '/', check exact or pathname starts with route + one segment
    if (guide.route.endsWith('/')) {
      const routeWithoutSlash = guide.route.slice(0, -1);
      if (pathname === routeWithoutSlash || pathname === guide.route) {
        return true;
      }
      return false;
    }
    
    // For routes without trailing slash, check if pathname starts with route + '/'
    if (pathname.startsWith(guide.route + '/') || pathname === guide.route) {
      return true;
    }
    
    // Prefix match: pathname starts with route, and if pathContains is set, pathname must include it
    if (pathname.startsWith(guide.route) && (!guide.pathContains || pathname.includes(guide.pathContains))) {
      return true;
    }
    
    return false;
  });
};

// Helper function to get all guides for a route
export const getGuidesForRoute = (pathname: string): GuideConfig[] => {
  return guides.filter(guide => {
    return pathname === guide.route || pathname.startsWith(guide.route);
  });
};
