"""
Canadian province/territory name to code conversion
"""
PROVINCE_CODES = {
    # Provinces
    'alberta': 'AB',
    'british columbia': 'BC',
    'manitoba': 'MB',
    'new brunswick': 'NB',
    'newfoundland and labrador': 'NL',
    'northwest territories': 'NT',
    'nova scotia': 'NS',
    'nunavut': 'NU',
    'ontario': 'ON',
    'prince edward island': 'PE',
    'quebec': 'QC',
    'saskatchewan': 'SK',
    'yukon': 'YT',
    # Also handle abbreviations
    'ab': 'AB',
    'bc': 'BC',
    'mb': 'MB',
    'nb': 'NB',
    'nl': 'NL',
    'nt': 'NT',
    'ns': 'NS',
    'nu': 'NU',
    'on': 'ON',
    'pe': 'PE',
    'qc': 'QC',
    'sk': 'SK',
    'yt': 'YT',
}


def normalize_province_code(province_name):
    """
    Convert province name to standard 2-letter code
    
    Args:
        province_name: Province name (e.g., 'Ontario', 'ON', 'ontario')
    
    Returns:
        Standard 2-letter province code (e.g., 'ON')
    """
    if not province_name:
        return ''
    
    # Normalize to lowercase for lookup
    normalized = province_name.strip().lower()
    
    # Return the code if found, otherwise return the original (uppercase)
    return PROVINCE_CODES.get(normalized, province_name.upper()[:2] if len(province_name) >= 2 else province_name.upper())







