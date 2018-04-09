//= require jquery
//= require bootstrap-sprockets
//= require rails-ujs
//= require bootstrap-datepicker
//= require bootstrap-datepicker/core
//= require_tree .

$('.input-daterange input').each(function() {
    $(this).datepicker('clearDates');
});

$('.datepicker input').datepicker({
    format: "yyyy-mm-dd",
    orientation: "bottom auto",
    autoclose: true,
    todayHighlight: true,
    datesDisabled: ['04/06/2018', '04/21/2018']
});