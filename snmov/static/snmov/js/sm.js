$('div#navbarSupportedContent li.nav-item').on('click', function(ev) {

    $(this).parent().find('li.active').removeClass('active');
    $(this).addClass('active');

    });

