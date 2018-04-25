//= require jquery
//= require bootstrap-sprockets
//= require rails-ujs
//= require jquery-fileupload/basic
//= require cloudinary/jquery.cloudinary
//= require attachinary
//= require lavahotel.js
//= require contact-form-7.js
// require_tree .

$(function() { $('#mydiv').show(); });

$(function() {
    jQuery.datepicker.setDefaults({
        "closeText": "Close",
        "currentText": "Today",
        "monthNames": ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
        "monthNamesShort": ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        "nextText": "Next",
        "prevText": "Previous",
        "dayNames": ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        "dayNamesShort": ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        "dayNamesMin": ["S", "M", "T", "W", "T", "F", "S"],
        "dateFormat": "MM d, yy",
        "firstDay": 1,
        "isRTL": false
    });
});

 
var hotel_booking_i18n = {
    "invalid_email": "Your email address is invalid.",
    "no_payment_method_selected": "Please select your payment method.",
    "confirm_tos": "Please accept our Terms and Conditions.",
    "no_rooms_selected": "Please select at least one the room.",
    "empty_customer_title": "Please select your title.",
    "empty_customer_first_name": "Please enter your first name.",
    "empty_customer_last_name": "Please enter your last name.",
    "empty_customer_address": "Please enter your address.",
    "empty_customer_city": "Please enter your city name.",
    "empty_customer_state": "Please enter your state.",
    "empty_customer_postal_code": "Please enter your postal code.",
    "empty_customer_country": "Please select your country.",
    "empty_customer_phone": "Please enter your phone number.",
    "customer_email_invalid": "Your email is invalid.",
    "customer_email_not_match": "Your email does not match with existing email! Ok to create a new customer information.",
    "empty_check_in_date": "Please select check in date.",
    "empty_check_out_date": "Please select check out date.",
    "check_in_date_must_be_greater": "Check in date must be greater than the current.",
    "check_out_date_must_be_greater": "Check out date must be greater than the check in.",
    "enter_coupon_code": "Please enter coupon code.",
    "review_rating_required": "Please select a rating.",
    "waring": {
        "room_select": "Please select room number.",
        "try_again": "Please try again!"
    },
    "date_time_format": "MM dd, yy",
    "monthNames": ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    "monthNamesShort": ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    "dayNames": ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    "dayNamesShort": ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    "dayNamesMin": ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
    "date_start": "1",
    "view_cart": "View Cart",
    "cart_url": "http:\/\/lava.themespirit.com\/demo-2\/view-cart\/"
};
var hotel_booking_i18n = {
    "invalid_email": "Your email address is invalid.",
    "no_payment_method_selected": "Please select your payment method.",
    "confirm_tos": "Please accept our Terms and Conditions.",
    "no_rooms_selected": "Please select at least one the room.",
    "empty_customer_title": "Please select your title.",
    "empty_customer_first_name": "Please enter your first name.",
    "empty_customer_last_name": "Please enter your last name.",
    "empty_customer_address": "Please enter your address.",
    "empty_customer_city": "Please enter your city name.",
    "empty_customer_state": "Please enter your state.",
    "empty_customer_postal_code": "Please enter your postal code.",
    "empty_customer_country": "Please select your country.",
    "empty_customer_phone": "Please enter your phone number.",
    "customer_email_invalid": "Your email is invalid.",
    "customer_email_not_match": "Your email does not match with existing email! Ok to create a new customer information.",
    "empty_check_in_date": "Please select check in date.",
    "empty_check_out_date": "Please select check out date.",
    "check_in_date_must_be_greater": "Check in date must be greater than the current.",
    "check_out_date_must_be_greater": "Check out date must be greater than the check in.",
    "enter_coupon_code": "Please enter coupon code.",
    "review_rating_required": "Please select a rating.",
    "waring": {
        "room_select": "Please select room number.",
        "try_again": "Please try again!"
    },
    "date_time_format": "MM dd, yy",
    "monthNames": ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
    "monthNamesShort": ["Jan", "Feb", "Mar", "Apr", "Maj", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    "dayNames": ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    "dayNamesShort": ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    "dayNamesMin": ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
    "date_start": "1",
    "view_cart": "View Cart",
    "cart_url": "http:\/\/lava.themespirit.com\/demo-2\/view-cart\/"
}; 

WebFont.load({
    google: {
        families: ['Hind:400,500,600,300,700:cyrillic,cyrillic-ext,devanagari,greek,greek-ext,khmer,latin,latin-ext,vietnamese,hebrew,arabic,bengali,gujarati,tamil,telugu,thai', 'Lobster Two:400,700:cyrillic,cyrillic-ext,devanagari,greek,greek-ext,khmer,latin,latin-ext,vietnamese,hebrew,arabic,bengali,gujarati,tamil,telugu,thai']
    }
});
WebFont.load({
    google: {
        families: ['Hind:400,500,600,300,700:cyrillic,cyrillic-ext,devanagari,greek,greek-ext,khmer,latin,latin-ext,vietnamese,hebrew,arabic,bengali,gujarati,tamil,telugu,thai', 'Lobster Two:400,700:cyrillic,cyrillic-ext,devanagari,greek,greek-ext,khmer,latin,latin-ext,vietnamese,hebrew,arabic,bengali,gujarati,tamil,telugu,thai']
    }
});
document.body.className = document.body.className.replace("siteorigin-panels-before-js", "");