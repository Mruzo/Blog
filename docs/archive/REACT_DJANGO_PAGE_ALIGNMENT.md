# React vs Django Template Alignment Analysis

## Overview
This document compares the React frontend pages (in `vybzapp/frontend/src/pages/`) with the Django templates/views to identify which pages align between both setups and which don't.

---

## ✅ **PAGES THAT ALIGN** (Exist in Both React and Django)

### **Homepage**
- **React**: `Home.tsx` → Route: `/`
- **Django**: `HomePageView` → Template: `templates/home.html` → Route: `/`
- **Status**: ✅ Aligned

### **Product/Store Pages**

#### Product List
- **React**: `ProductList.tsx` → Route: `/product/`
- **Django**: `ProductListView` → Template: `snmov/templates/snmov/list.html` → Route: `/product/`
- **Status**: ✅ Aligned

#### Cart
- **React**: `Cart.tsx` → Route: `/product/cart/`
- **Django**: `view_cart` → Template: `templates/product_cart.html` → Route: `/product/cart/`
- **Status**: ✅ Aligned

#### Checkout
- **React**: `Checkout.tsx` → Route: `/product/cart/checkout/`
- **Django**: `checkout_view` → Template: `templates/checkout.html` → Route: `/product/cart/checkout/`
- **Status**: ✅ Aligned

#### Select Shipping
- **React**: `SelectShipping.tsx` → Route: `/product/cart/shipping/:orderId/`
- **Django**: `select_shipping` → Template: `templates/select_shipping.html` → Route: `/product/cart/shipping/<int:order_id>/`
- **Status**: ✅ Aligned

#### Payment Success
- **React**: `PaymentSuccess.tsx` → Route: `/product/payment/success/`
- **Django**: `payment_success` → Template: `templates/payment_success.html` → Route: `/product/payment/success/`
- **Status**: ✅ Aligned

#### My Orders
- **React**: `MyOrders.tsx` → Route: `/product/my-orders/`
- **Django**: `my_orders` → Template: `templates/snmov/my_orders.html` → Route: `/product/my-orders/`
- **Status**: ✅ Aligned

#### Order Detail
- **React**: `OrderDetail.tsx` → Route: `/product/order/:orderId/`
- **Django**: `order_detail` → Template: `templates/snmov/order_detail.html` → Route: `/product/order/<int:order_id>/`
- **Status**: ✅ Aligned

### **Immersive Comics (3D Comic) Pages**

#### Stories List
- **React**: `Stories.tsx` → Route: `/immersivecomics/` and `/immersivecomics/dashboard/`
- **Django**: `ComicView` → Template: `icvybz/templates/icvybz/titles.html` → Route: `/immersivecomics/`
- **Django**: `UserDashboardView` → Template: `icvybz/templates/icvybz/user_dashboard.html` → Route: `/immersivecomics/dashboard/`
- **Status**: ✅ Aligned (React combines both views)

#### Story Create
- **React**: `StoryCreationWizard` (component) → Route: `/immersivecomics/story/create/`
- **Django**: `StoryCreateView` → Template: `icvybz/templates/icvybz/story_create.html` → Route: `/immersivecomics/story/create/`
- **Status**: ✅ Aligned

#### Story Edit
- **React**: `StoryEdit.tsx` → Route: `/immersivecomics/story/:id/edit/`
- **Django**: `StoryEditView` → Template: `icvybz/templates/icvybz/story_edit.html` → Route: `/immersivecomics/story/<int:pk>/edit/`
- **Status**: ✅ Aligned

#### Story Manage
- **React**: `StoryManage.tsx` → Route: `/immersivecomics/story/:id/manage/`
- **Django**: `StoryManageView` → Template: `icvybz/templates/icvybz/story_manage.html` → Route: `/immersivecomics/story/<int:pk>/manage/`
- **Status**: ✅ Aligned

#### Story Import
- **React**: `StoryImport.tsx` → Route: `/immersivecomics/import/`
- **Django**: `StoryExportImportView` → Template: `icvybz/templates/icvybz/story_export_import.html` → Route: `/immersivecomics/export-import/`
- **Status**: ⚠️ Partially Aligned (Different URL paths: `/import/` vs `/export-import/`)

#### Season Create
- **React**: `SeasonCreate.tsx` → Route: `/immersivecomics/story/:storyId/season/create/`
- **Django**: `SeasonCreateView` → Template: `icvybz/templates/icvybz/season_create.html` → Route: `/immersivecomics/story/<int:story_id>/season/create/`
- **Status**: ✅ Aligned

#### Season Edit
- **React**: `SeasonEdit.tsx` → Route: `/immersivecomics/season/:seasonId/edit/`
- **Django**: `SeasonEditView` → Template: `icvybz/templates/icvybz/season_edit.html` → Route: `/immersivecomics/season/<int:pk>/edit/`
- **Status**: ✅ Aligned

#### Episode Manage
- **React**: `EpisodeManage.tsx` → Route: `/immersivecomics/season/:seasonId/episodes/`
- **Django**: `EpisodeManageView` → Template: `icvybz/templates/icvybz/episode_manage.html` → Route: `/immersivecomics/episode/<int:pk>/manage/`
- **Status**: ⚠️ Partially Aligned (Different URL patterns: season-based vs episode-based)

#### Character Manage
- **React**: `CharacterManage.tsx` → Route: `/immersivecomics/story/:storyId/characters/`
- **Django**: `CharacterCreateView` → Template: `icvybz/templates/icvybz/character_create.html` → Route: `/immersivecomics/story/<int:story_id>/character/create/`
- **Status**: ⚠️ Partially Aligned (React has manage page, Django only has create)

### **Studio Pages**

#### Studios List
- **React**: `Studios.tsx` → Route: `/immersivecomics/studios/`
- **Django**: `StudioListView` → Template: `icvybz/templates/icvybz/studio_list.html` (inferred) → Route: `/immersivecomics/studios/`
- **Status**: ✅ Aligned

#### Studio Detail
- **React**: `StudioDetail.tsx` → Route: `/studios/:id/`
- **Django**: `StudioDetailView` → Template: `icvybz/templates/icvybz/studio_detail.html` (inferred) → Route: `/immersivecomics/studio/<int:pk>/`
- **Status**: ⚠️ Partially Aligned (Different URL paths: `/studios/` vs `/immersivecomics/studio/`)

#### My Studio
- **React**: `MyStudio.tsx` → Route: `/immersivecomics/my-studio/`
- **Django**: `MyStudioView` → Template: `icvybz/templates/icvybz/my_studio.html` (inferred) → Route: `/immersivecomics/my-studio/`
- **Status**: ✅ Aligned

#### Studio Edit
- **React**: `StudioEdit.tsx` → Route: `/immersivecomics/studio/:id/edit/`
- **Django**: `StudioUpdateView` → Template: `icvybz/templates/icvybz/studio_edit.html` (inferred) → Route: `/immersivecomics/studio/<int:pk>/edit/`
- **Status**: ✅ Aligned

---

## ❌ **PAGES ONLY IN REACT** (No Django Template Equivalent)

1. **StoryCollaborators** (Component)
   - Route: `/immersivecomics/story/:id/collaborators/`
   - **Status**: No Django template equivalent found

2. **NotFound** (404 Page)
   - Route: `*` (catch-all)
   - **Status**: Django has `custom_404` view but uses different template path

---

## ❌ **PAGES ONLY IN DJANGO** (No React Equivalent)

### **Immersive Comics Pages**

1. **Season Detail**
   - **Django**: `SeasonDetailView` → Template: `icvybz/templates/icvybz/season_detail.html` → Route: `/immersivecomics/seasons/<int:pk>/`
   - **React**: ❌ No equivalent page

2. **Episode Detail**
   - **Django**: `EpisodeDetailView` → Template: `icvybz/templates/icvybz/episode_detail.html` → Route: `/immersivecomics/seasons/<int:season_id>/episodes/<int:pk>/`
   - **React**: ❌ No equivalent page (viewing published episodes)

3. **Episode Preview** (Staff Only)
   - **Django**: `EpisodePreviewView` → Template: `icvybz/templates/icvybz/episode_preview.html` → Route: `/immersivecomics/seasons/<int:season_id>/episodes/<int:pk>/preview/`
   - **React**: ❌ No equivalent page

4. **Episode Analytics**
   - **Django**: `EpisodeAnalyticsView` → Template: `icvybz/templates/icvybz/episode_analytics.html` → Route: `/immersivecomics/analytics/`
   - **React**: ❌ No equivalent page

5. **Season Analytics**
   - **Django**: `SeasonAnalyticsView` → Template: `icvybz/templates/icvybz/season_analytics.html` (inferred) → Route: `/immersivecomics/seasons/<int:pk>/analytics/`
   - **React**: ❌ No equivalent page

6. **Episode Create**
   - **Django**: `EpisodeCreateView` → Template: `icvybz/templates/icvybz/episode_create.html` → Route: `/immersivecomics/season/<int:season_id>/episode/create/`
   - **React**: ❌ No equivalent page (handled in EpisodeManage?)

7. **Episode Edit**
   - **Django**: `EpisodeEditView` → Template: `icvybz/templates/icvybz/episode_edit.html` (inferred) → Route: `/immersivecomics/episode/<int:pk>/edit/`
   - **React**: ❌ No equivalent page (handled in EpisodeManage?)

8. **Dialogue Create**
   - **Django**: `DialogueCreateView` → Template: `icvybz/templates/icvybz/dialogue_create.html` → Route: `/immersivecomics/episode/<int:episode_id>/dialogue/create/`
   - **React**: ❌ No equivalent page (handled in EpisodeManage?)

9. **Dialogue Edit**
   - **Django**: `DialogueEditView` → Template: `icvybz/templates/icvybz/dialogue_edit.html` (inferred) → Route: `/immersivecomics/dialogue/<int:pk>/edit/`
   - **React**: ❌ No equivalent page (handled in EpisodeManage?)

10. **Dialogue Delete**
    - **Django**: `DialogueDeleteView` → Route: `/immersivecomics/dialogue/<int:pk>/delete/`
    - **React**: ❌ No equivalent page (handled in EpisodeManage?)

11. **Story Delete**
    - **Django**: `StoryDeleteView` → Route: `/immersivecomics/story/<int:pk>/delete/`
    - **React**: ❌ No equivalent page (possibly handled in StoryManage?)

12. **Scene Detail**
    - **Django**: Template: `icvybz/templates/icvybz/scene_detail.html`
    - **React**: ❌ No equivalent page

13. **Episode List**
    - **Django**: Template: `icvybz/templates/icvybz/episode_list.html`
    - **React**: ❌ No equivalent page

14. **Season List**
    - **Django**: Template: `icvybz/templates/icvybz/season_list.html`
    - **React**: ❌ No equivalent page

15. **Studio Create**
    - **Django**: `StudioCreateView` → Route: `/immersivecomics/studio/create/`
    - **React**: ❌ No equivalent page (possibly handled in MyStudio?)

16. **Audio Track Management**
    - **Django**: 
      - `AudioTrackListView` → Route: `/immersivecomics/audio/`
      - `AudioTrackCreateView` → Route: `/immersivecomics/audio/create/`
      - `AudioTrackUpdateView` → Route: `/immersivecomics/audio/<int:pk>/edit/`
      - `AudioTrackDeleteView` → Route: `/immersivecomics/audio/<int:pk>/delete/`
    - **React**: ❌ No equivalent pages

### **Product/Store Pages**

1. **Product Detail** (Individual Product Page)
   - **Django**: `ProductDetailView` → Template: `product_detail.html` (inferred) → Route: `/product/<slug:slug>/`
   - **React**: ❌ No equivalent page

2. **Order Cancel**
   - **Django**: `cancel_order` → Route: `/product/order/<int:order_id>/cancel/`
   - **React**: ❌ No equivalent page (possibly handled in OrderDetail?)

### **Site-Wide Pages**

1. **About**
   - **Django**: `about_page` → Template: `templates/about.html` → Route: `/about/`
   - **React**: ❌ No equivalent page

2. **Privacy Policy**
   - **Django**: `privacy_page` → Template: `templates/privacy.html` → Route: `/privacy/`
   - **React**: ❌ No equivalent page

3. **Terms of Use**
   - **Django**: `terms_page` → Template: `templates/terms.html` → Route: `/terms/`
   - **React**: ❌ No equivalent page

4. **Cookie Policy**
   - **Django**: `cookie_page` → Template: `templates/cookie_policy.html` → Route: `/cookies/`
   - **React**: ❌ No equivalent page

5. **Contact**
   - **Django**: `contact_page` → Template: `templates/form.html` → Route: `/contact/`
   - **React**: ❌ No equivalent page

6. **Login**
   - **Django**: `LoginView` → Template: `snmov/templates/snmov/login.html` → Route: `/login/`
   - **React**: ❌ No equivalent page (handled via API?)

7. **Register**
   - **Django**: `register_view` → Template: `templates/register.html` → Route: `/register/`
   - **React**: ❌ No equivalent page (handled via API?)

8. **Password Reset Flow**
   - **Django**: 
     - `PasswordResetView` → Template: `snmov/templates/snmov/password_reset.html` → Route: `/password-reset/`
     - `PasswordResetDoneView` → Template: `snmov/templates/snmov/password_reset_done.html` → Route: `/password-reset/done/`
     - `PasswordResetConfirmView` → Template: `snmov/templates/snmov/password_reset_confirm.html` → Route: `/password-reset-confirm/<uidb64>/<token>/`
     - `PasswordResetCompleteView` → Template: `snmov/templates/snmov/password_reset_complete.html` → Route: `/password-reset-complete/`
   - **React**: ❌ No equivalent pages

9. **Email Verification**
   - **Django**: `verify_email` → Template: `snmov/templates/snmov/email_verification.html` → Route: `/verify_email/<int:user_id>/<str:token>/`
   - **React**: ❌ No equivalent page

10. **Invalid Link**
    - **Django**: `invalidlink_view` → Template: `templates/invalid_link.html` → Route: `/verify/invalid_link/`
    - **React**: ❌ No equivalent page

11. **Article Create** (Staff Only)
    - **Django**: `article_create_view` → Route: `/new-article/`
    - **React**: ❌ No equivalent page

12. **Article Update** (Staff Only)
    - **Django**: `article_update_view` → Route: `/product/<str:slug>/edit/`
    - **React**: ❌ No equivalent page

13. **Article Delete** (Staff Only)
    - **Django**: `article_delete_view` → Route: `/product/<str:slug>/delete/`
    - **React**: ❌ No equivalent page

14. **Custom 404**
    - **Django**: `custom_404` → Template: `templates/404.html`
    - **React**: `NotFound.tsx` (different implementation)

15. **Custom 500**
    - **Django**: `custom_500` → Template: `templates/500.html`
    - **React**: ❌ No equivalent page

---

## 📊 **Summary Statistics**

### **Total Pages Comparison**

| Category | React Pages | Django Templates | Aligned | Partially Aligned | Missing in React | Missing in Django |
|----------|-------------|------------------|---------|-------------------|------------------|-------------------|
| **Homepage** | 1 | 1 | 1 | 0 | 0 | 0 |
| **Product/Store** | 7 | 8 | 6 | 0 | 1 | 2 |
| **Immersive Comics** | 11 | 25+ | 7 | 3 | 0 | 15+ |
| **Studio** | 4 | 4 | 3 | 1 | 0 | 1 |
| **Site-Wide** | 1 | 15+ | 0 | 1 | 0 | 15+ |
| **TOTAL** | **24** | **53+** | **17** | **5** | **1** | **33+** |

### **Key Findings**

1. **✅ Well-Aligned Areas:**
   - Product/Store pages (cart, checkout, orders) - 6 out of 7 pages aligned
   - Story management (create, edit, manage) - fully aligned
   - Season management (create, edit) - fully aligned
   - Basic studio management - mostly aligned

2. **⚠️ Partially Aligned:**
   - Story Import/Export (different URL paths)
   - Episode Management (different URL patterns)
   - Character Management (React has manage, Django only has create)
   - Studio Detail (different URL paths)

3. **❌ Missing in React:**
   - **Episode viewing** (EpisodeDetailView) - critical for viewing published episodes
   - **Analytics pages** (EpisodeAnalyticsView, SeasonAnalyticsView)
   - **Episode/Season viewing pages** (SeasonDetailView)
   - **Dialogue management** (create, edit, delete) - may be handled in EpisodeManage
   - **Individual Product Detail page**
   - **All site-wide pages** (About, Privacy, Terms, Contact, Login, Register, Password Reset)
   - **Audio track management** (create, edit, delete)

4. **❌ Missing in Django (but in React):**
   - StoryCollaborators page (may be handled via API)

---

## 🎯 **Recommendations**

### **High Priority - Missing Critical Pages in React:**

1. **Episode Detail View** - Essential for viewing published episodes
2. **Season Detail View** - For browsing seasons
3. **Product Detail Page** - For viewing individual products
4. **Login/Register Pages** - Currently handled via API, but may need UI

### **Medium Priority:**

1. **Analytics Pages** - For content creators
2. **Site-Wide Pages** - About, Privacy, Terms, Contact, Cookie Policy
3. **Password Reset Flow** - Complete user authentication flow
4. **Episode Preview** - For staff/preview purposes

### **Low Priority:**

1. **Audio Track Management** - If not actively used
2. **Article Management** - Staff-only features
3. **Dialogue Management** - May be handled within EpisodeManage

---

## 📝 **Notes**

- Some Django templates may be inferred from view classes (e.g., `studio_detail.html`, `episode_edit.html`) but weren't confirmed in the template directory listing
- The React app appears to handle some functionality via API calls rather than dedicated pages (e.g., authentication, collaboration)
- Some Django views may be combined into single React pages (e.g., Stories.tsx combines ComicView and UserDashboardView)
- URL patterns differ slightly between React and Django (e.g., `/studios/:id/` vs `/immersivecomics/studio/<int:pk>/`)

---

**Last Updated**: Based on codebase review of React routes in `App.tsx` and Django URLs in `snm/urls.py`, `snmov/urls.py`, and `icvybz/urls.py`

