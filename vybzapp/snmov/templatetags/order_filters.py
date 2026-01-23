from django import template
from decimal import Decimal

register = template.Library()

@register.filter
def multiply(value, arg):
    """Multiply the value by the argument and format to 2 decimal places"""
    try:
        result = float(value) * float(arg)
        return '{:.2f}'.format(result)
    except (ValueError, TypeError):
        return '0.00'

@register.filter
def format_price(value):
    """Format a price value to 2 decimal places"""
    try:
        return '{:.2f}'.format(float(value))
    except (ValueError, TypeError):
        return '0.00' 