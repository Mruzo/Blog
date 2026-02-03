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
    summary: 'This is where you update your **story name**, **description**, and **characters**. Here, you can also **add, preview, and edit seasons** to your series. Just select a season, and hit **Preview Mode** or **Edit Mode** below.',
  },
  {
    id: 'story-management',
    name: 'Story Management',
    route: '/immersivecomics/story/',
    showOnFirstVisit: false,
    summary: 'Edit your story details, manage seasons and episodes, and manage characters. Use the sections below to navigate.',
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
