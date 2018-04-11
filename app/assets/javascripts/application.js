//= require jquery
//= require bootstrap-sprockets
//= require rails-ujs
//= require bootstrap-datepicker
//= require bootstrap-datepicker/core
//= require_tree .

$('.datepicker input').datepicker({
    format: "yyyy-mm-dd",
    orientation: "bottom auto",
    autoclose: true,
    todayHighlight: true
});