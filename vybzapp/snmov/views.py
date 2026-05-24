from django.shortcuts import render, redirect, get_object_or_404, reverse
from django.contrib.auth.decorators import login_required
from django.contrib.admin.views.decorators import staff_member_required
from .models import Product, Comment, Preference, ProductNotification, SiteImage, Order, OrderItem, ShippingAddress, EmailPreference
from .forms import ArticleModelForm, CommentForm, ReachOutForm, ShippingAddressForm, ShippingSelectionForm, CustomUserCreationForm
from snm.forms import ProductNotificationForm
from django.contrib.auth.forms import UserCreationForm, AuthenticationForm
from django.contrib.auth import login, logout, authenticate, get_user_model
from django.contrib.auth import get_user_model

User = get_user_model()
from django.contrib.contenttypes.models import ContentType
from django.contrib import messages
from django.http import JsonResponse
from django.views import generic
from django.core.paginator import Paginator, EmptyPage, PageNotAnInteger
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.urls import reverse_lazy
from django.views.generic.edit import FormView, DeleteView
from django.views import View
from django.db.models import Prefetch
from django.http import HttpRequest
from django.views.decorators.http import require_POST
from dj_shop_cart.cart import get_cart_class, CartItem
import json, inspect, uuid, logging
from uuid import UUID
from django.contrib.contenttypes.models import ContentType
from snmov.utils.cart import get_cart_for_session, get_shipping_rates, get_sender_address
from snmov.utils.canadapost import fulfill_order_shipping_label
from django.conf import settings
import requests
import stripe
from decimal import Decimal
from django.views.decorators.csrf import csrf_exempt
from django.utils import timezone
from django.core.exceptions import ObjectDoesNotExist
from django.contrib.sites.shortcuts import get_current_site
from django.contrib.auth.tokens import default_token_generator



logger = logging.getLogger(__name__)
Cart = get_cart_class()

# Remove or comment out these lines
# user = User.objects.get(username='chris')
# shipping_address = ShippingAddress.objects.get(user=user)

stripe.api_key = settings.STRIPE_SECRET_KEY


class ProductListView(generic.ListView):
    """Product list - Now serves React instead of Django template"""
    model = Product
    template_name = None  # Serve React instead
    context_object_name = 'products'
    paginate_by = 4
    
    def get(self, request, *args, **kwargs):
        """Serve React index.html for product list"""
        import os
        from django.conf import settings
        from django.http import HttpResponse
        
        index_path = os.path.join(settings.BASE_DIR, 'frontend', 'build', 'index.html')
        try:
            with open(index_path, 'r', encoding='utf-8') as f:
                content = f.read()
            return HttpResponse(content, content_type='text/html')
        except FileNotFoundError:
            return HttpResponse('React app not found. Please build the frontend.', status=404)

    def get_queryset(self):
        products = Product.objects.order_by('publish_date')

        # Attach related images using Django's reverse ForeignKey relation
        for product in products:
            product.images_list = product.images.all()  # Fetch related images

        return products  # Return the list of products
    
    def get_context_data(self, **kwargs):
        context = super().get_context_data(**kwargs)
        
        # Add available products for the featured products section
        available_products = Product.objects.filter(available=True)
        
        # Prefetch related SiteImage objects for available products
        image_prefetch = Prefetch(
            'images',
            queryset=SiteImage.objects.exclude(image__isnull=True).exclude(image=''),
            to_attr='product_images'
        )
        
        available_products = available_products.prefetch_related(image_prefetch)
        
        # Add testimonials
        from snmov.models import Testimonials
        testimonials = Testimonials.objects.all()
        
        # Add unavailable products for coming soon section
        unavailable_products = Product.objects.filter(available=False)
        unavailable_pictures = SiteImage.objects.filter(
            product__in=unavailable_products
        ).exclude(image__isnull=True).exclude(image='')
        
        context.update({
            'available_products': available_products,
            'testimonials': testimonials,
            'unavailable_pictures': unavailable_pictures,
        })
        return context



@staff_member_required
def article_create_view(request):
    form = ArticleModelForm(request.POST or None, request.FILES or None)
    if form.is_valid():
        obj = form.save(commit=False)
        obj.user = request.user
        obj.save()
        form = ArticleModelForm()

    return render(request,
                  template_name='form.html',
                  context={'form': form}
                  )


class ProductDetailView(View):
    template_name = "product_detail.html"

    def get(self, request, slug):
        product = get_object_or_404(Product, slug=slug)
        images = product.images.all()  # Use the related_name to get all images

        context = {
            'object': product,
            'meta': product.as_meta(),
            'images': images,
        }
        return render(request, self.template_name, context)


def add_product(request, product_id):
    try:
        # Convert product_id to UUID and validate
        product_uuid = UUID(str(product_id).strip())  # Validate as a UUID
        
        # Retrieve product by its UUID
        product = get_object_or_404(Product, uuid=product_uuid)

        # Get the current cart from the session
        cart = request.session.get('cart', {})

        # Check if the product is already in the cart
        if str(product_uuid) not in cart:
            cart[str(product_uuid)] = {'quantity': 0}

        # Increment the product quantity
        cart[str(product_uuid)]['quantity'] += 1

        # Save the updated cart back to the session
        request.session['cart'] = cart

        # Calculate the total count of items in the cart
        cart_count = sum(item['quantity'] for item in cart.values())

        # Prepare the updated cart data for the response
        cart_items = []
        total_price = 0

        for product_uuid, item in cart.items():
            product = Product.objects.get(uuid=product_uuid)
            quantity = item['quantity']
            unit_price = product.get_discounted_price()
            item_total = unit_price * quantity
            total_price += item_total

            cart_items.append({
                'uuid': str(product.uuid),
                'title': product.title,
                'price': round(unit_price, 2),
                'quantity': quantity,
                'item_total': round(item_total, 2),
            })
        print(f"Cart Items:{cart_items}")
        # Return a success response with the updated cart data
        return JsonResponse({
            'success': True,
            'cart_count': cart_count,
            'total_price': total_price,
            'cart_items': cart_items,
            'message': f'Added {product.title} to the cart.'
        })
    except ValueError:
        # Handle invalid UUIDs
        return JsonResponse({'success': False, 'error': 'Invalid product ID'}, status=400)
    except Product.DoesNotExist:
        # Handle missing products
        return JsonResponse({'success': False, 'error': 'Product not found'}, status=404)
    except Exception as e:
        # Handle unexpected errors
        return JsonResponse({'success': False, 'error': str(e)}, status=500)



def view_cart(request):
    cart = request.session.get('cart', {})
    cart_items = []
    cart_count = 0  # Initialize cart count

    for product_id, details in cart.items():
        try:
            # Ensure product_id is processed as a valid UUID
            product_uuid = uuid.UUID(str(product_id).strip())
            
            # Retrieve the product using the UUID
            product = Product.objects.get(uuid=product_uuid)
            quantity = details.get('quantity', 1)
            unit_price = product.get_discounted_price()
            total_price_per_product = unit_price * quantity

            # Add to cart count
            cart_count += quantity

            cart_items.append({
                'uuid': product_uuid,
                'title': product.title,
                'price': round(unit_price, 2),  # optionally cast for templates
                'quantity': quantity,
                'total': round(total_price_per_product, 2),
            })
        except ValueError:
            # Handle invalid UUID
            print(f"Invalid product ID (not a UUID): {product_id}")
            continue
        except Product.DoesNotExist:
            # Handle product not found in the database
            print(f"Product not found for ID: {product_id}")
            continue

    # Calculate total cart price
    total_price = sum(item['total'] for item in cart_items)

    # Set quantity range based on cart_count, ensuring at least [1, 10]
    quantity_range = range(1, max(cart_count + 1, 4))

    context = {
        'cart_items': cart_items,  # List of items with full details
        'total_price': total_price,  # Total price for all items in the cart
        'cart_count': cart_count,  # Total number of items in the cart
        'quantity_range': quantity_range,  # Range for quantity dropdown
    }
    # print(product.get_discounted_price())
    return render(request, 'product_cart.html', context)


def update_quantity(request, item_id):
    # Retrieve the cart from session (ensuring it exists)
    cart = request.session.get('cart', {})

    # Ensure item_id is a string (since session keys are strings)
    item_id = str(item_id).strip()

    # Debugging print statements
    print(f"Cart items before update: {cart}")
    print(f"Cart item id: {item_id}")

    # Check if the item exists in the cart
    if item_id in cart:
        if request.method == 'POST':
            try:
                # Parse JSON data from request body
                data = json.loads(request.body)
                quantity = int(data.get('quantity', 1))
                print(f"Cart item quantity: {quantity}")

                # Ensure quantity is a valid number (greater than zero)
                if quantity <= 0:
                    return JsonResponse({'success': False, 'error': 'Quantity must be at least 1'}, status=400)

                # Update the quantity
                cart[item_id]['quantity'] = quantity

                # Save updated cart back to session
                request.session['cart'] = cart
                request.session.modified = True

                # Get product details
                try:
                    product = Product.objects.get(uuid=item_id)
                except Product.DoesNotExist:
                    return JsonResponse({'success': False, 'error': 'Product not found'}, status=404)

                # Calculate total price for this product and cart total
                product_total = product.get_discounted_price() * quantity
                # cart_total = sum(
                #     Product.objects.get(uuid=pid).get_discounted_price() * details['quantity']
                #     for pid, details in cart.items()
                # )
                products = Product.objects.filter(uuid__in=cart.keys())
                product_map = {str(p.uuid): p for p in products}

                cart_total = sum(
                    product_map[pid].get_discounted_price() * details['quantity']
                    for pid, details in cart.items()
)

                # Calculate the updated cart count
                cart_count = sum(item['quantity'] for item in cart.values())

                return JsonResponse({
                    'success': True,
                    'product_total': float(product_total),
                    'cart_total': float(cart_total),
                    'cart_count': cart_count,  # Include the updated cart count
                    'message': 'Quantity updated successfully.'
                })

            except json.JSONDecodeError:
                return JsonResponse({'success': False, 'error': 'Invalid JSON data'}, status=400)
            except ValueError:
                return JsonResponse({'success': False, 'error': 'Invalid quantity'}, status=400)

    return JsonResponse({'success': False, 'error': 'Item not found in cart'}, status=404)



@require_POST
def remove_product(request: HttpRequest, item_id):
    try:
        # Ensure item_id is a valid UUID
        product_uuid = uuid.UUID(str(item_id).strip())

        # Get the cart from the session
        cart = request.session.get("cart", {})

        # Remove the product if it exists
        if str(product_uuid) in cart:
            del cart[str(product_uuid)]  # Remove item from cart

        # Save updated cart back to session
        request.session["cart"] = cart

    except ValueError:
        # Handle invalid UUID case
        pass  # Optionally, add a message for error handling

    return redirect("snmov:view_cart")  # Redirect back to the cart page

@login_required
def checkout_view(request):
    app_name = 'snmov'

    cart_data = get_cart_for_session(request)
    cart_items = cart_data.get('cart_items', [])

    if request.method == 'POST':
        form = ShippingAddressForm(request.POST)
        if form.is_valid():
            shipping = form.save(commit=False)
            shipping.save()

            order = Order.objects.create(customer=request.user, shipping_address=shipping)

            # ✅ Add items to the order
            for item in cart_items:
                try:
                    product = Product.objects.get(uuid=item['uuid'])
                except Product.DoesNotExist:
                    continue
                OrderItem.objects.create(
                    order=order,
                    product=product,
                    quantity=item['quantity']
                )

            return redirect('snmov:select_shipping', order_id=order.id)

    else:
        initial_data = {
            'full_name': request.user.get_full_name(),
            'email': request.user.email
        }
        form = ShippingAddressForm(initial=initial_data)

    return render(request, 'checkout.html', {
        'form': form,
        'cart_items': cart_items,
        'total_price': "{:.2f}".format(cart_data.get('total_price', 0)),
    })



def get_rate_by_id(rates, rate_id):
    return next((r for r in rates if r.get("object_id") == rate_id), None)


@login_required
def select_shipping(request, order_id):
    order = get_object_or_404(Order, id=order_id, customer=request.user)

    if request.method == 'GET':
        try:
            # Fetch and sort rates
            rates_raw = get_shipping_rates(order)
            rates = [dict(rate) for rate in rates_raw]
            
            # Convert amounts to Decimal for proper sorting
            for rate in rates:
                rate["amount"] = Decimal(str(rate.get("amount", "0.00")))
            
            # Sort rates by amount
            rates = sorted(rates, key=lambda r: r["amount"])

            cart_total = order.calculate_total_value() or Decimal("0.00")

            # Calculate totals with shipping and convert back to float for template
            for rate in rates:
                shipping_cost = rate["amount"]
                rate["amount"] = float(shipping_cost)  # Convert back to float for display
                rate["total_with_shipping"] = float(cart_total + shipping_cost)

            request.session['shipping_rates'] = rates

        except Exception as e:
            return render(request, 'select_shipping.html', {
                "order": order,
                "rates": [],
                "error": f"Error fetching shipping rates: {str(e)}"
            })

        return render(request, 'select_shipping.html', {
            "order": order,
            "rates": rates,
            "cart_total": float(cart_total)
        })

    if request.method == 'POST':
        selected_rate_id = request.POST.get('rate_id')
        session_rates = request.session.get('shipping_rates', [])
        selected_rate = get_rate_by_id(session_rates, selected_rate_id)

        if not selected_rate:
            return render(request, 'select_shipping.html', {
                "order": order,
                "rates": session_rates,
                "error": "Selected shipping rate not found."
            })

        # Save selected shipping info to order
        order.shipping_rate_id = selected_rate_id
        order.shipping_cost = Decimal(selected_rate['amount'])
        order.save()

        # Build Stripe line items
        line_items = [
            {
                'price_data': {
                    'currency': 'cad',
                    'product_data': {'name': item.product.title},
                    'unit_amount': int(item.product.get_discounted_price() * 100),
                },
                'quantity': item.quantity,
            }
            for item in order.orderitem_set.all()
        ]
        line_items.append({
            'price_data': {
                'currency': 'cad',
                'product_data': {'name': 'Shipping'},
                'unit_amount': int(order.shipping_cost * 100),
            },
            'quantity': 1,
        })

        checkout_session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=line_items,
            mode='payment',
            success_url=request.build_absolute_uri(reverse('snmov:payment_success'))+ '?session_id={CHECKOUT_SESSION_ID}',
            cancel_url=request.build_absolute_uri(reverse('snmov:checkout')),
            customer_email=request.user.email,
            metadata={'order_id': order.id},
        )

        return redirect(checkout_session.url, code=303)


@login_required
def payment_success(request):
    session_id = request.GET.get("session_id")
    if not session_id:
        return redirect("snmov:checkout")

    try:
        stripe.api_key = settings.STRIPE_SECRET_KEY
        session = stripe.checkout.Session.retrieve(session_id)

        order_id = session.metadata.get("order_id")
        order = get_object_or_404(Order, id=order_id, customer=request.user)

        # Save Stripe payment intent ID
        order.stripe_payment_intent_id = session.payment_intent
        order.status = "ORDERED"  # Update order status first

        try:
            shipping_info = fulfill_order_shipping_label(order)
            
            # Update order with shipping information
            order.label_url = shipping_info["label_url"]
            order.tracking_number = shipping_info["tracking_number"]
            order.shipping_provider = shipping_info["carrier"]
            
            # Update order status to reflect successful label creation
            order.status = "PROCESSING"
            
            messages.success(request, "Order placed successfully! Shipping label has been created.")
        except Exception as e:
            logger.error(f"Failed to create shipping label for order {order.id}: {str(e)}")
            messages.warning(request, "Order placed successfully, but there was an issue creating the shipping label. Our team will handle this manually.")
            # Don't update status to PROCESSING if label creation failed
        
        # Save the order regardless of shipping label status
        order.save()

        # Clean up session
        request.session.pop("cart", None)
        request.session.pop("shipping_rates", None)
        request.session.modified = True

        return render(request, 'payment_success.html', {
            "order": order,
            "shipping_success": order.label_url is not None
        })

    except Exception as e:
        logger.error(f"Error processing payment success: {str(e)}")
        messages.error(request, "There was an issue processing your order. Please contact support.")
        return redirect("snmov:checkout")



@require_POST
def empty_cart(request: HttpRequest):
    cart = Cart.new(request)
    cart.empty()
    return JsonResponse({"message": "Cart emptied successfully"})

@login_required
def add_comment_to_article(request, slug):
    post = get_object_or_404(Article, slug=slug)
    if request.method == "POST":
        form = CommentForm(request.POST)
        if form.is_valid():
            comment = form.save(commit=False)
            comment.user_name = request.user
            comment.comment_post = post
            comment.save()
            messages.success(request, 'Thank You!')
            return redirect(article_detail_view, slug=post.slug)
    else:
        form = CommentForm()

    return render(request,
                  template_name='snmov/formc.html',
                  context={"title": f"Comment on {post.title}", "form": form}
                  )


@login_required
def article_preference(request, slug, value):
    if request.method == "POST":
        object = get_object_or_404(Article, slug=slug)
        obj = ""
        valueobj = ""

        try:
            obj = Preference.objects.get(user=request.user, post=object)
            valueobj = obj.value  # value of userpreference
            value = int(value)

            if valueobj != value:
                obj.delete()
                upref = Preference()
                upref.user = request.user  # current logged in user
                upref.post = object
                upref.value = value

                if value == 1 and valueobj != 1:
                    object.likes += 1
                    object.dislikes -= 1
                elif value == 2 and valueobj != 2:
                    object.dislikes += 1
                    object.likes -= 1
                upref.save()
                object.save()

                return render(request,
                              template_name='snmov/home.html',
                              context={'object': object, 'slug': slug}
                              )
            elif valueobj == value:
                obj.delete()

                if value == 1:
                    object.likes -= 1
                elif value == 2:
                    object.dislikes -= 1

                object.save()

                return render(request,
                              template_name='snmov/home.html',
                              context={'object': object, 'slug': slug}
                              )

        except Preference.DoesNotExist:
            upref = Preference()
            upref.user = request.user
            upref.post = object
            upref.value = value
            value = int(value)

            if value == 1:
                object.likes += 1
            elif value == 2:
                object.dislikes += 1
            upref.save()
            object.save()

            return render(request,
                          template_name='snmov/home.html',
                          context={'object': object, 'slug': slug})

    else:
        objects = get_object_or_404(Article, slug=slug)

        return render(request,
                      template_name='snmov/home.html',
                      context={'objects': objects, 'slug': slug}
                      )


@staff_member_required
def article_update_view(request, slug):
    obj = get_object_or_404(Article, slug=slug)
    form = ArticleModelForm(request.POST or None, instance=obj)

    if form.is_valid():
        form.save()

    return render(request,
                  template_name='form.html',
                  context={'title': f"Update {obj.title}", "form": form}
                  )


@staff_member_required
def article_delete_view(request, slug):

    obj = get_object_or_404(Article, slug=slug)
    template_name = 'snmov/delete.html'
    if request.method == "POST":
        obj.delete()
        return redirect("/article")

    return render(request,
                  template_name,
                  context={"object": obj}
                  )


def comment_delete_view(request, slug, pk):
    obj = get_object_or_404(Comment, comment_post__slug=slug, pk=pk)
    template_name = 'snmov/deletec.html'
    if request.method == 'POST':
        obj.user = request.user
        obj.delete()
        messages.info(request, 'Comment deleted')
        return redirect('article_detail', obj.comment_post.slug)
    return render(request, template_name, {'obj': obj})


def logout_request(request):
    logout(request)
    messages.info(request, "Logged out successfully!")
    return redirect('/')


def validate_username(request):
    username = request.GET.get('username', None)
    data = {
        'is_taken': User.objects.filter(username__iexact=username).exists()
    }
    if data['is_taken']:
        data['error_message'] = 'A user with this username already exists.'
    return JsonResponse(data)

def cancel_order(request, order_id):
    """
    Cancels an order and its associated shipping label if one exists.
    """
    try:
        order = get_object_or_404(Order, id=order_id, customer=request.user)
        
        # Only allow cancellation of orders that haven't been shipped
        if order.status in ['SHIPPED', 'DELIVERED']:
            messages.error(request, "Cannot cancel an order that has already been shipped or delivered.")
            return redirect('order_detail', order_id=order_id)

        # Canada Post label void/refund is not automated here; handle in Canada Post
        # merchant tools if the label was already purchased.

        # Update order status and clear shipping-related fields
        order.status = 'CANCELLED'
        order.shipping_label_error = None
        order.save()

        messages.success(request, "Order has been successfully cancelled.")
        return redirect('order_detail', order_id=order_id)

    except Exception as e:
        logger.error(f"Error cancelling order {order_id}: {str(e)}")
        messages.error(request, "There was an error cancelling your order. Please try again or contact support.")
        return redirect('order_detail', order_id=order_id)


@login_required
def email_preferences(request):
    """User email preferences management page"""
    try:
        preferences = EmailPreference.objects.get(user=request.user)
    except EmailPreference.DoesNotExist:
        preferences = EmailPreference.objects.create(user=request.user)
    
    if request.method == 'POST':
        # Update preferences
        preferences.marketing_emails = request.POST.get('marketing_emails') == 'on'
        preferences.product_notifications = request.POST.get('product_notifications') == 'on'
        preferences.order_updates = request.POST.get('order_updates') == 'on'
        preferences.cart_reminders = request.POST.get('cart_reminders') == 'on'
        preferences.collaboration_notifications = request.POST.get('collaboration_notifications') == 'on'
        preferences.newsletter = request.POST.get('newsletter') == 'on'
        preferences.save()
        
        messages.success(request, "Your email preferences have been updated.")
        return redirect('snmov:email_preferences')
    
    return render(request, 'snmov/email_preferences.html', {
        'preferences': preferences
    })


def unsubscribe(request, token):
    """Unsubscribe page with token validation"""
    try:
        preferences = EmailPreference.objects.get(unsubscribe_token=token)
        user = preferences.user
    except EmailPreference.DoesNotExist:
        messages.error(request, "Invalid unsubscribe link. Please contact support if you continue to receive unwanted emails.")
        return redirect('homepage')
    
    # If user is logged in and matches the token, redirect to preferences page
    if request.user.is_authenticated and request.user == user:
        return redirect('snmov:email_preferences')
    
    # Handle unsubscribe action
    if request.method == 'POST':
        action = request.POST.get('action')
        
        if action == 'unsubscribe_all':
            # Unsubscribe from all non-essential emails
            preferences.marketing_emails = False
            preferences.product_notifications = False
            preferences.order_updates = False
            preferences.cart_reminders = False
            preferences.collaboration_notifications = False
            preferences.newsletter = False
            preferences.save()
            
            messages.success(request, f"You have been unsubscribed from all non-essential emails. You will still receive important account and order-related emails.")
            return redirect('snmov:unsubscribe', token=token)
        
        elif action == 'update_preferences':
            # Update specific preferences
            preferences.marketing_emails = request.POST.get('marketing_emails') == 'on'
            preferences.product_notifications = request.POST.get('product_notifications') == 'on'
            preferences.order_updates = request.POST.get('order_updates') == 'on'
            preferences.cart_reminders = request.POST.get('cart_reminders') == 'on'
            preferences.collaboration_notifications = request.POST.get('collaboration_notifications') == 'on'
            preferences.newsletter = request.POST.get('newsletter') == 'on'
            preferences.save()
            
            messages.success(request, "Your email preferences have been updated.")
            return redirect('snmov:unsubscribe', token=token)
    
    return render(request, 'snmov/unsubscribe.html', {
        'preferences': preferences,
        'user': user
    })

@login_required
def my_orders(request):
    """
    Display user's orders with filtering and sorting options
    """
    status_filter = request.GET.get('status', '')
    sort_by = request.GET.get('sort', '-order_date')  # Default sort by newest

    orders = Order.objects.filter(customer=request.user)
    
    # Apply status filter if specified
    if status_filter and status_filter != 'all':
        orders = orders.filter(status=status_filter)
    
    # Apply sorting
    orders = orders.order_by(sort_by)

    # Paginate results
    paginator = Paginator(orders, 10)  # Show 10 orders per page
    page = request.GET.get('page')
    try:
        orders = paginator.page(page)
    except PageNotAnInteger:
        orders = paginator.page(1)
    except EmptyPage:
        orders = paginator.page(paginator.num_pages)

    context = {
        'orders': orders,
        'status_choices': Order.STATUS_CHOICES,
        'current_status': status_filter,
        'current_sort': sort_by,
    }
    
    return render(request, 'snmov/my_orders.html', context)

@login_required
def order_detail(request, order_id):
    """
    Display detailed information about a specific order
    """
    order = get_object_or_404(Order, id=order_id, customer=request.user)
    return render(request, 'snmov/order_detail.html', {'order': order})

def get_sender_address():
    """
    Get the sender's shipping address (admin user Chris)
    Returns a dictionary with the sender's address details
    """
    try:
        User = get_user_model()
        admin_user = User.objects.get(username='chris')
        shipping_address = ShippingAddress.objects.get(user=admin_user)
        
        return {
            "name": f"{admin_user.first_name} {admin_user.last_name}",
            "street1": shipping_address.address_line_1,
            "street2": shipping_address.address_line_2,
            "city": shipping_address.city,
            "state": shipping_address.state,
            "zip": shipping_address.postal_code,
            "country": shipping_address.country_code,
            "email": admin_user.email,
        }
    except (User.DoesNotExist, ObjectDoesNotExist) as e:
        # Log the error and return a default address from settings
        logger.error(f"Failed to get sender address: {str(e)}")
        return {
            "name": settings.DEFAULT_SENDER_NAME,
            "street1": settings.DEFAULT_SENDER_STREET1,
            "street2": settings.DEFAULT_SENDER_STREET2,
            "city": settings.DEFAULT_SENDER_CITY,
            "state": settings.DEFAULT_SENDER_STATE,
            "zip": settings.DEFAULT_SENDER_ZIP,
            "country": settings.DEFAULT_SENDER_COUNTRY,
            "email": settings.DEFAULT_FROM_EMAIL,
        }

def register(request):
    if request.method == 'POST':
        form = CustomUserCreationForm(request.POST)
        if form.is_valid():
            # Check terms acceptance
            if not request.POST.get('terms', False):
                messages.error(request, 'You must accept the Terms of Service and Privacy Policy to register.')
                return render(request, 'register.html', {'form': form})

            # Create user but don't activate yet
            user = form.save(commit=False)
            user.is_active = False
            user.save()
            
            # Generate verification token
            token = default_token_generator.make_token(user)
            user.email_verification_token = token
            user.email_verification_sent_at = timezone.now()
            user.save()
            
            # Build verification URL
            current_site = get_current_site(request)
            verification_url = f"{request.scheme}://{current_site.domain}{reverse('verify_email', kwargs={'user_id': user.id, 'token': token})}"
            
            # Prepare email context
            context = {
                'user': user,
                'verification_url': verification_url,
                'logo_url': f"{request.scheme}://{current_site.domain}/static/snmov/img/logo.png",
                'site_url': f"{request.scheme}://{current_site.domain}",
            }
            
            # Send verification email
            html_message = render_to_string('emails/verification_email.html', context)
            plain_message = render_to_string('emails/verification_email.txt', context)
            
            try:
                send_mail(
                    subject='Verify Your Email - Justvybz',
                    message=plain_message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    html_message=html_message,
                    fail_silently=False,
                )
                messages.success(request, 'Please check your email to verify your account.')
            except Exception as e:
                messages.error(request, 'There was an error sending the verification email. Please try again.')
                user.delete()  # Delete the user if email sending fails
                return render(request, 'register.html', {'form': form})
            
            return redirect('home')
    else:
        form = CustomUserCreationForm()
    
    return render(request, 'register.html', {
        'form': form,
        'title': 'Create Your Account'
    })

def verify_email(request, user_id, token):
    User = get_user_model()
    try:
        user = User.objects.get(id=user_id)
        
        # Check if token is valid and not expired (24 hours)
        if (user.email_verification_token == token and 
            user.email_verification_sent_at and 
            (timezone.now() - user.email_verification_sent_at).days < 1):
            
            user.is_active = True
            user.is_email_verified = True
            user.email_verification_token = None
            user.email_verification_sent_at = None
            user.save()
            
            # Log the user in
            login(request, user)
            
            return render(request, 'snmov/email_verification.html', {'success': True})
        else:
            error_message = "The verification link has expired." if user.email_verification_sent_at else "Invalid verification link."
            return render(request, 'snmov/email_verification.html', {
                'success': False,
                'error_message': error_message
            })
            
    except User.DoesNotExist:
        return render(request, 'snmov/email_verification.html', {
            'success': False,
            'error_message': "User not found."
        })

def resend_verification(request):
    if not request.user.is_authenticated:
        messages.error(request, 'Please log in to resend the verification email.')
        return redirect('login')
        
    if request.user.is_email_verified:
        messages.info(request, 'Your email is already verified.')
        return redirect('home')
        
    # Generate new verification token
    token = default_token_generator.make_token(request.user)
    request.user.email_verification_token = token
    request.user.email_verification_sent_at = timezone.now()
    request.user.save()
    
    # Build verification URL
    current_site = get_current_site(request)
    verification_url = f"{request.scheme}://{current_site.domain}{reverse('verify_email', kwargs={'user_id': request.user.id, 'token': token})}"
    
    # Prepare email context
    context = {
        'user': request.user,
        'verification_url': verification_url,
        'logo_url': f"{request.scheme}://{current_site.domain}/static/snmov/img/logo.png",
        'site_url': f"{request.scheme}://{current_site.domain}",
    }
    
    # Send verification email
    html_message = render_to_string('emails/verification_email.html', context)
    plain_message = render_to_string('emails/verification_email.txt', context)
    
    try:
        send_mail(
            subject='Verify Your Email - Justvybz',
            message=plain_message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[request.user.email],
            html_message=html_message,
            fail_silently=False,
        )
        messages.success(request, 'Verification email has been resent. Please check your inbox.')
    except Exception as e:
        messages.error(request, 'There was an error sending the verification email. Please try again.')
    
    return redirect('home')
