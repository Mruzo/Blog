$('div#navbarSupportedContent li.nav-item').on('click', function(ev) {

    $(this).parent().find('li.active').removeClass('active');
    $(this).addClass('active');

    });

$(document).ready(function(){
   $('.toast').toast('show');
   });

$(window).scroll(function(){
    var scroll = $(window).scrollTop(),
    dh = $(document).height(),
    wh = $(window).height();
    scrollPercent = (scroll / (dh-wh)) * 100;
    $('#progressbar').css('height', scrollPercent + '%');
});