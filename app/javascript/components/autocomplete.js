function autocomplete() {
  document.addEventListener("DOMContentLoaded", function() {
    var listingAddress = document.getElementById('listing_address');

    if (listingAddress) {
      var autocomplete = new google.maps.places.Autocomplete(listingAddress, { types: [ 'geocode' ] });
      google.maps.event.addDomListener(listingAddress, 'keydown', function(e) {
        if (e.key === "Enter") {
          e.preventDefault(); // Do not submit the form on Enter.
        }
      });
    }
  });
}

export { autocomplete };