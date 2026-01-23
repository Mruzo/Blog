# Product Pages Test Plan

## Overview
This document outlines all buttons, links, and navigation paths from `/product/` and related pages.

## Routes Defined in App.tsx

1. `/product/` - ProductList (main product page)
2. `/product/cart/` - Cart page
3. `/product/cart/checkout/` - Checkout page
4. `/product/cart/shipping/:orderId/` - SelectShipping page
5. `/product/payment/success/` - PaymentSuccess page
6. `/product/my-orders/` - MyOrders page
7. `/product/order/:orderId/` - OrderDetail page

## Navigation Flow & Buttons

### 1. ProductList (`/product/`)
**Buttons/Links:**
- ✅ "Add to cart" button (per product) - Calls `handleAddToCart()` which adds to cart via context
- ✅ No direct navigation links visible (products are displayed)

**Navigation Context:**
- Cart icon in header navigates to `/product/cart/`
- "Store" link in navigation navigates to `/product/`

### 2. Cart (`/product/cart/`)
**Buttons/Links:**
- ✅ "Back" button (BackButton) → `/product/`
- ✅ "Proceed to Checkout" button (Link) → `/product/cart/checkout/` ✅ FIXED
- ✅ "Clear Cart" button - Calls `handleClearCart()`
- ✅ Quantity dropdown - Calls `handleUpdateQuantity()`
- ✅ Remove item button - Calls `handleRemoveItem()`
- ✅ "Continue shopping" link (empty cart) → `/product/`

### 3. Checkout (`/product/cart/checkout/`)
**Buttons/Links:**
- ✅ "Back" button (BackButton) → `/product/cart/`
- ✅ "View Shipping Rates" button (form submit) → `/product/cart/shipping/:orderId/` ✅ FIXED
- ✅ Redirects to `/product/cart/` if cart is empty

### 4. SelectShipping (`/product/cart/shipping/:orderId/`)
**Buttons/Links:**
- ✅ "Back" button (BackButton) → `/product/cart/`
- ✅ "Select" button (per shipping rate) - Redirects to Stripe checkout (external)
- ✅ After Stripe checkout, redirects to `/product/payment/success/?session_id=...`

### 5. PaymentSuccess (`/product/payment/success/`)
**Buttons/Links:**
- ✅ "Continue Shopping" button → `/product/`
- ✅ "View My Orders" button → `/product/my-orders/`
- ✅ "Continue Shopping" button (error state) → `/product/`

### 6. MyOrders (`/product/my-orders/`)
**Buttons/Links:**
- ✅ "Start Shopping" button (empty state) → `/product/`
- ✅ "View Details" button (per order) → `/product/order/:orderId/`
- ✅ "Cancel Order" button (processing orders only) - Shows message

### 7. OrderDetail (`/product/order/:orderId/`)
**Buttons/Links:**
- ✅ "Back" button (BackButton) → `/product/my-orders/`
- ✅ "Cancel Order" button (processing orders only) - Shows message
- ✅ "Continue Shopping" button → `/product/`

## Fixed Issues

### Route Mismatches Fixed:
1. ✅ **Cart.tsx line 136**: Changed `/product/checkout/` → `/product/cart/checkout/`
2. ✅ **Checkout.tsx line 65**: Changed `/product/shipping/${orderId}/` → `/product/cart/shipping/${orderId}/`
3. ✅ **BackButton.tsx**: Updated path checks to include `/cart/` prefix

## Testing Checklist

### Manual Testing
- [ ] Navigate to `/product/` - products load correctly
- [ ] Click "Add to cart" - product added, message shown
- [ ] Click cart icon in header - navigates to `/product/cart/`
- [ ] In Cart page, click "Proceed to Checkout" - navigates to `/product/cart/checkout/`
- [ ] In Checkout page, fill form and submit - navigates to `/product/cart/shipping/:orderId/`
- [ ] In SelectShipping page, select shipping rate - redirects to Stripe
- [ ] After payment, verify redirect to `/product/payment/success/`
- [ ] In PaymentSuccess, click "Continue Shopping" - navigates to `/product/`
- [ ] In PaymentSuccess, click "View My Orders" - navigates to `/product/my-orders/`
- [ ] In MyOrders, click "View Details" - navigates to `/product/order/:orderId/`
- [ ] In OrderDetail, click "Back" - navigates to `/product/my-orders/`
- [ ] In OrderDetail, click "Continue Shopping" - navigates to `/product/`
- [ ] All BackButton components work correctly

### Unit Tests Needed
- [ ] ProductList component renders correctly
- [ ] Cart component renders and handles actions
- [ ] Checkout component validates form and navigates correctly
- [ ] SelectShipping component loads rates and selects correctly
- [ ] PaymentSuccess component displays order details
- [ ] MyOrders component lists orders correctly
- [ ] OrderDetail component displays order details correctly
- [ ] Navigation links work correctly in all components

### Integration Tests Needed
- [ ] Complete purchase flow: Product → Cart → Checkout → Shipping → Payment → Success
- [ ] Order history flow: MyOrders → OrderDetail
- [ ] Back button navigation in all flows
- [ ] Empty cart handling
- [ ] Error states (API failures, network errors)

## API Endpoints Used

1. `GET /api/products/` - ProductList
2. `POST /api/cart/add/` - Add to cart (via CartContext)
3. `GET /api/cart/` - Get cart (via CartContext)
4. `POST /api/checkout/` - Create order
5. `GET /api/orders/:orderId/shipping/` - Get shipping rates
6. `POST /api/orders/:orderId/select-shipping/` - Select shipping rate
7. `GET /api/payment/success/?session_id=...` - Get order after payment
8. `GET /api/orders/` - Get user orders (MyOrders - needs implementation)
9. `GET /api/orders/:orderId/` - Get order details (OrderDetail - needs implementation)

## Notes

- MyOrders and OrderDetail currently use mock data - need to connect to real API
- Cart functionality uses CartContext - verify context methods work correctly
- All external navigation (Stripe) should redirect back to `/product/payment/success/`
- BackButton component auto-generates labels based on path patterns




